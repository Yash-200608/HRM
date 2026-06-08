import type { Request, Response } from 'express';
import { parseOrThrow } from '../../common/validation';
import {
  createOperatorSchema,
  emailLookupSchema,
  emailVerificationConfirmSchema,
  loginSchema,
  operatorIdParamsSchema,
  sessionIdParamsSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from './operator.validators';
import { operatorService } from './operator.service';

export const operatorController = {
  create: async (req: Request, res: Response) => {
    const input = parseOrThrow(createOperatorSchema, req.body);
    const operator = await operatorService.create(input);
    res.status(201).json({ data: operator });
  },
  login: async (req: Request, res: Response) => {
    const input = parseOrThrow(loginSchema, req.body);
    const result = await operatorService.login(input, {
      userAgent: req.get('user-agent') ?? undefined,
      ipAddress: req.ip,
    });
    res.json({
      data: {
        operator: result.operator,
        principal: result.principal,
        session: result.session,
      },
      token: result.token,
    });
  },
  me: async (req: Request, res: Response) => {
    res.json({ data: req.auth });
  },
  requestEmailVerification: async (req: Request, res: Response) => {
    const input = parseOrThrow(emailLookupSchema, req.body);
    const result = await operatorService.requestEmailVerification(input.email);
    res.json({ data: result });
  },
  confirmEmailVerification: async (req: Request, res: Response) => {
    const input =
      req.method === 'GET'
        ? parseOrThrow(emailVerificationConfirmSchema, { token: req.query.token })
        : parseOrThrow(emailVerificationConfirmSchema, req.body);
    const operator = await operatorService.confirmEmailVerification(input.token);
    res.json({ data: operator });
  },
  requestPasswordReset: async (req: Request, res: Response) => {
    const input = parseOrThrow(passwordResetRequestSchema, req.body);
    const result = await operatorService.requestPasswordReset(input.email);
    res.json({ data: result });
  },
  confirmPasswordReset: async (req: Request, res: Response) => {
    const input = parseOrThrow(passwordResetConfirmSchema, req.body);
    const operator = await operatorService.confirmPasswordReset(input.token, input.newPassword);
    res.json({ data: operator });
  },
  listSessions: async (req: Request, res: Response) => {
    const operatorId = String(req.auth?.subject ?? '');
    const sessions = await operatorService.listSessions(operatorId);
    res.json({ data: sessions });
  },
  logout: async (req: Request, res: Response) => {
    const sessionId = String(req.auth?.sessionId ?? '');
    const result = await operatorService.logout(sessionId);
    res.json({ data: result });
  },
  logoutAll: async (req: Request, res: Response) => {
    const operatorId = String(req.auth?.subject ?? '');
    const result = await operatorService.logoutAll(operatorId);
    res.json({ data: result });
  },
  revokeSession: async (req: Request, res: Response) => {
    const input = parseOrThrow(sessionIdParamsSchema, req.params);
    const operatorId = String(req.auth?.subject ?? '');
    const result = await operatorService.revokeSession(operatorId, input.sessionId);
    res.json({ data: result });
  },
  resendEmailVerification: async (req: Request, res: Response) => {
    const input = parseOrThrow(operatorIdParamsSchema, req.params);
    const result = await operatorService.resendEmailVerification(input.id);
    res.json({ data: result });
  },
  forcePasswordReset: async (req: Request, res: Response) => {
    const input = parseOrThrow(operatorIdParamsSchema, req.params);
    const result = await operatorService.forcePasswordReset(input.id);
    res.json({ data: result });
  },
  clearVerificationState: async (req: Request, res: Response) => {
    const input = parseOrThrow(operatorIdParamsSchema, req.params);
    const result = await operatorService.clearVerificationState(input.id);
    res.json({ data: result });
  },
  revokePasswordReset: async (req: Request, res: Response) => {
    const input = parseOrThrow(operatorIdParamsSchema, req.params);
    const result = await operatorService.revokePasswordReset(input.id);
    res.json({ data: result });
  },
  listAdmins: async (_req: Request, res: Response) => {
    const operators = await operatorService.list('ADMIN');
    res.json({ data: operators });
  },
  listUsers: async (_req: Request, res: Response) => {
    const operators = await operatorService.list('USER');
    res.json({ data: operators });
  },
  suspend: async (req: Request, res: Response) => {
    const input = parseOrThrow(operatorIdParamsSchema, req.params);
    const operator = await operatorService.updateStatus(input.id, 'SUSPENDED');
    res.json({ data: operator });
  },
  activate: async (req: Request, res: Response) => {
    const input = parseOrThrow(operatorIdParamsSchema, req.params);
    const operator = await operatorService.updateStatus(input.id, 'ACTIVE');
    res.json({ data: operator });
  },
};
