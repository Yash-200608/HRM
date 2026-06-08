import { randomBytes } from 'node:crypto';
import { createPublicId } from '../../common/security/id';
import { createPasswordHash, createTokenHash, verifyPassword, verifyTokenHash } from '../../common/security/crypto';
import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';
import { withTransaction } from '../../common/db/transaction';
import { env } from '../../config/env';
import { signAccessToken } from './jwt.service';
import { operatorRepository } from './operator.repository';
import { organizationRepository } from '../organizations/organization.repository';
import { sessionRepository } from './session.repository';
import type { AuthPrincipal } from '../../common/types/auth';
import { sendTransactionalEmail } from '../../integrations/resend';
import { buildEmailVerificationTemplate, buildPasswordResetTemplate } from './operator-email-templates';
import { metrics } from '../../common/observability/metrics';

function createTokenMaterial(prefix: string) {
  const tokenId = createPublicId(prefix);
  const tokenSecret = randomBytes(24).toString('hex');
  return {
    tokenId,
    tokenSecret,
    token: `${tokenId}.${tokenSecret}`,
  };
}

function sessionExpiryFromNow() {
  return new Date(Date.now() + env.SESSION_MAX_AGE_HOURS * 60 * 60 * 1000);
}

async function sendVerificationEmail(operator: { email: string; fullName: string; token: string }) {
  if (!operator.token) {
    return { delivered: false, skipped: true as const, reason: 'missing_token' as const };
  }

  const template = buildEmailVerificationTemplate({
    fullName: operator.fullName,
    token: operator.token,
  });

  return sendTransactionalEmail({
    to: operator.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

async function sendPasswordResetEmail(operator: { email: string; fullName: string; token: string }) {
  if (!operator.token) {
    return { delivered: false, skipped: true as const, reason: 'missing_token' as const };
  }

  const template = buildPasswordResetTemplate({
    fullName: operator.fullName,
    token: operator.token,
  });

  return sendTransactionalEmail({
    to: operator.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

export const operatorService = {
  create: async (input: {
    email: string;
    fullName: string;
    password: string;
    role: 'ADMIN' | 'USER';
    organizationId?: string;
    emailVerifiedAt?: Date | null;
  }) => {
    const existing = await operatorRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError('Operator already exists', 409, ErrorCodes.Conflict);
    }

    if (input.role === 'USER' && !input.organizationId) {
      throw new AppError('Organization required for user operators', 400, ErrorCodes.ValidationFailed);
    }

    if (input.organizationId) {
      const organization = await organizationRepository.findById(input.organizationId);
      if (!organization) {
        throw new AppError('Organization not found', 404, ErrorCodes.NotFound);
      }
    }

    return operatorRepository.create({
      publicId: createPublicId('op'),
      email: input.email,
      fullName: input.fullName,
      passwordHash: createPasswordHash(input.password),
      role: input.role,
      organization: input.organizationId ?? null,
      status: 'ACTIVE',
      emailVerifiedAt: input.emailVerifiedAt ?? (input.role === 'ADMIN' ? new Date() : null),
      emailVerificationTokenId: null,
      emailVerificationTokenHash: null,
      emailVerificationTokenExpiresAt: null,
      passwordResetTokenId: null,
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
      lastLoginAt: null,
    });
  },
  login: async (input: { email: string; password: string }, options?: { userAgent?: string; ipAddress?: string }) => {
    const operator = await operatorRepository.findByEmail(input.email);
    if (!operator) {
      throw new AppError('Invalid credentials', 401, ErrorCodes.Unauthorized);
    }

    if (operator.status !== 'ACTIVE') {
      throw new AppError('Operator is suspended', 403, ErrorCodes.Forbidden);
    }

    if (!operator.emailVerifiedAt) {
      throw new AppError('Email not verified', 403, ErrorCodes.EmailNotVerified);
    }

    if (!verifyPassword(input.password, operator.passwordHash)) {
      throw new AppError('Invalid credentials', 401, ErrorCodes.Unauthorized);
    }

    const principal: AuthPrincipal = {
      kind: operator.role === 'ADMIN' ? 'admin' : 'user',
      subject: String(operator._id),
      organizationId: operator.organization ? String(operator.organization) : undefined,
      roles: [operator.role.toLowerCase()],
    };

    const sessionId = createPublicId('ses');
    const tokenId = createPublicId('jwt');
    const tokenVersion = 1;
    const expiresAt = sessionExpiryFromNow();

    const session = await withTransaction(async (session) => {
      const createdSession = await sessionRepository.create(
        {
          sessionId,
          operator: operator._id,
          organization: operator.organization ?? null,
          kind: principal.kind,
          roles: principal.roles ?? [],
          tokenId,
          tokenVersion,
          status: 'ACTIVE',
          deviceInfo: {
            userAgent: options?.userAgent ?? null,
            ipAddress: options?.ipAddress ?? null,
          },
          ipAddress: options?.ipAddress ?? null,
          userAgent: options?.userAgent ?? null,
          lastSeenAt: new Date(),
          expiresAt,
        },
        { session },
      );

      await operatorRepository.updateById(String(operator._id), { lastLoginAt: new Date() }, { session });
      return createdSession;
    });

    metrics.increment('auth_login_success_total', { role: principal.kind });

    return {
      operator,
      session,
      token: signAccessToken(
        {
          ...principal,
          sessionId,
          tokenId,
          tokenVersion,
        },
        '8h',
        {
          secret: principal.kind === 'admin' ? env.ADMIN_JWT_SECRET : env.JWT_SECRET,
          sessionId,
          tokenId,
          tokenVersion,
        },
      ),
      principal: {
        ...principal,
        sessionId,
        tokenId,
        tokenVersion,
      },
    };
  },
  list: (role: 'ADMIN' | 'USER') => operatorRepository.listByRole(role),
  listSessions: (operatorId: string) => sessionRepository.listByOperatorId(operatorId),
  logout: async (sessionId: string) => sessionRepository.revokeBySessionId(sessionId, 'LOGGED_OUT'),
  logoutAll: async (operatorId: string) => sessionRepository.revokeAllByOperatorId(operatorId, 'LOGGED_OUT'),
  revokeSession: async (operatorId: string, sessionId: string) => {
    const session = await sessionRepository.findBySessionId(sessionId);
    if (!session || String(session.operator) !== operatorId) {
      throw new AppError('Session not found', 404, ErrorCodes.NotFound);
    }

    return sessionRepository.revokeBySessionId(sessionId, 'ADMIN_REVOKED');
  },
  updateStatus: async (id: string, status: 'ACTIVE' | 'SUSPENDED') => {
    const operator = await operatorRepository.updateById(id, { status });
    if (status === 'SUSPENDED') {
      await sessionRepository.revokeAllByOperatorId(id, 'OPERATOR_SUSPENDED');
    }
    return operator;
  },
  clearVerificationState: async (operatorId: string) => {
    const operator = await operatorRepository.findById(operatorId);
    if (!operator) {
      throw new AppError('Operator not found', 404, ErrorCodes.NotFound);
    }

    const updated = await operatorRepository.updateById(String(operator._id), {
      emailVerifiedAt: null,
      emailVerificationTokenId: null,
      emailVerificationTokenHash: null,
      emailVerificationTokenExpiresAt: null,
    });

    return {
      cleared: true,
      operator: updated,
    };
  },
  revokePasswordReset: async (operatorId: string) => {
    const operator = await operatorRepository.findById(operatorId);
    if (!operator) {
      throw new AppError('Operator not found', 404, ErrorCodes.NotFound);
    }

    const updated = await operatorRepository.updateById(String(operator._id), {
      passwordResetTokenId: null,
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
    });

    return {
      revoked: true,
      operator: updated,
    };
  },
  resendEmailVerification: async (operatorId: string) => {
    const operator = await operatorRepository.findById(operatorId);
    if (!operator) {
      throw new AppError('Operator not found', 404, ErrorCodes.NotFound);
    }

    if (operator.emailVerifiedAt) {
      return { queued: true, sent: false, reason: 'already_verified' as const };
    }

    if (operator.status !== 'ACTIVE') {
      return { queued: true, sent: false, reason: 'operator_not_active' as const };
    }

    const token = createTokenMaterial('evt');
    const tokenHash = createTokenHash(token.tokenSecret);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const updated = await operatorRepository.updateById(String(operator._id), {
      emailVerificationTokenId: token.tokenId,
      emailVerificationTokenHash: tokenHash,
      emailVerificationTokenExpiresAt: expiresAt,
    });

    let delivery: Awaited<ReturnType<typeof sendVerificationEmail>> | undefined;
    if (updated) {
      delivery = await sendVerificationEmail({
        email: updated.email,
        fullName: updated.fullName,
        token: token.token,
      });
    }

    metrics.increment('email_verification_requested_total', { sent: Boolean(delivery?.delivered) });

    return { queued: true, sent: Boolean(delivery?.delivered) };
  },
  forcePasswordReset: async (operatorId: string) => {
    const operator = await operatorRepository.findById(operatorId);
    if (!operator) {
      throw new AppError('Operator not found', 404, ErrorCodes.NotFound);
    }

    const token = createTokenMaterial('prt');
    const tokenHash = createTokenHash(token.tokenSecret);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const updated = await withTransaction(async (session) => {
      const result = await operatorRepository.updateById(
        String(operator._id),
        {
          passwordResetTokenId: token.tokenId,
          passwordResetTokenHash: tokenHash,
          passwordResetTokenExpiresAt: expiresAt,
        },
        { session },
      );

      await sessionRepository.revokeAllByOperatorId(String(operator._id), 'PASSWORD_RESET_REQUIRED', { session });
      return result;
    });

    let delivery: Awaited<ReturnType<typeof sendPasswordResetEmail>> | undefined;
    if (updated) {
      delivery = await sendPasswordResetEmail({
        email: updated.email,
        fullName: updated.fullName,
        token: token.token,
      });
    }

    metrics.increment('password_reset_requested_total', { sent: Boolean(delivery?.delivered) });

    return { queued: true, sent: Boolean(delivery?.delivered) };
  },
  requestEmailVerification: async (email: string) => {
    const operator = await operatorRepository.findByEmail(email);
    if (!operator || operator.emailVerifiedAt || operator.status !== 'ACTIVE') {
      return { queued: true, sent: false };
    }

    const token = createTokenMaterial('evt');
    const tokenHash = createTokenHash(token.tokenSecret);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const updated = await operatorRepository.updateById(String(operator._id), {
      emailVerificationTokenId: token.tokenId,
      emailVerificationTokenHash: tokenHash,
      emailVerificationTokenExpiresAt: expiresAt,
    });

    let delivery: Awaited<ReturnType<typeof sendVerificationEmail>> | undefined;
    if (updated) {
      delivery = await sendVerificationEmail({
        email: updated.email,
        fullName: updated.fullName,
        token: token.token,
      });
    }

    return { queued: true, sent: Boolean(delivery?.delivered) };
  },
  confirmEmailVerification: async (rawToken: string) => {
    const [tokenId, tokenSecret] = rawToken.split('.');
    if (!tokenId || !tokenSecret) {
      throw new AppError('Invalid or expired token', 400, ErrorCodes.InvalidToken);
    }

    const operator = await operatorRepository.findByEmailVerificationTokenId(tokenId);
    if (!operator || !operator.emailVerificationTokenHash || !operator.emailVerificationTokenExpiresAt) {
      throw new AppError('Invalid or expired token', 400, ErrorCodes.InvalidToken);
    }

    if (operator.emailVerificationTokenExpiresAt.getTime() < Date.now()) {
      throw new AppError('Invalid or expired token', 400, ErrorCodes.InvalidToken);
    }

    if (!verifyTokenHash(tokenSecret, operator.emailVerificationTokenHash)) {
      throw new AppError('Invalid or expired token', 400, ErrorCodes.InvalidToken);
    }

    return operatorRepository.updateById(String(operator._id), {
      emailVerifiedAt: new Date(),
      emailVerificationTokenId: null,
      emailVerificationTokenHash: null,
      emailVerificationTokenExpiresAt: null,
    });
  },
  requestPasswordReset: async (email: string) => {
    const operator = await operatorRepository.findByEmail(email);
    if (!operator || operator.status !== 'ACTIVE') {
      return { queued: true, sent: false };
    }

    const token = createTokenMaterial('prt');
    const tokenHash = createTokenHash(token.tokenSecret);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const updated = await operatorRepository.updateById(String(operator._id), {
      passwordResetTokenId: token.tokenId,
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiresAt: expiresAt,
    });

    let delivery: Awaited<ReturnType<typeof sendPasswordResetEmail>> | undefined;
    if (updated) {
      delivery = await sendPasswordResetEmail({
        email: updated.email,
        fullName: updated.fullName,
        token: token.token,
      });
    }

    return { queued: true, sent: Boolean(delivery?.delivered) };
  },
  confirmPasswordReset: async (rawToken: string, newPassword: string) => {
    const [tokenId, tokenSecret] = rawToken.split('.');
    if (!tokenId || !tokenSecret) {
      throw new AppError('Invalid or expired token', 400, ErrorCodes.InvalidToken);
    }

    const operator = await operatorRepository.findByPasswordResetTokenId(tokenId);
    if (!operator || !operator.passwordResetTokenHash || !operator.passwordResetTokenExpiresAt) {
      throw new AppError('Invalid or expired token', 400, ErrorCodes.InvalidToken);
    }

    if (operator.passwordResetTokenExpiresAt.getTime() < Date.now()) {
      throw new AppError('Invalid or expired token', 400, ErrorCodes.InvalidToken);
    }

    if (!verifyTokenHash(tokenSecret, operator.passwordResetTokenHash)) {
      throw new AppError('Invalid or expired token', 400, ErrorCodes.InvalidToken);
    }

    return withTransaction(async (session) => {
      const updated = await operatorRepository.updateById(
        String(operator._id),
        {
          passwordHash: createPasswordHash(newPassword),
          emailVerifiedAt: operator.emailVerifiedAt ?? new Date(),
          passwordResetTokenId: null,
          passwordResetTokenHash: null,
          passwordResetTokenExpiresAt: null,
        },
        { session },
      );

      await sessionRepository.revokeAllByOperatorId(String(operator._id), 'PASSWORD_RESET', { session });
      metrics.increment('password_reset_confirmed_total');
      return updated;
    });
  },
  };
