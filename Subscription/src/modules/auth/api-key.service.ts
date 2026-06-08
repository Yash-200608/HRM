import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';
import { createSecretHash } from '../../common/security/crypto';
import { verifySecret } from '../../common/security/crypto';
import { apiKeyRepository } from './api-key.repository';
import type { ApiKeyPrincipal } from './auth.types';
import { randomBytes } from 'node:crypto';

function parseApiKey(raw: string) {
  const [prefix, secret] = raw.split('.');
  if (!prefix || !secret) {
    return null;
  }

  return { prefix, secret };
}

function createApiKeyMaterial() {
  const prefix = `ak_${randomBytes(6).toString('hex')}`;
  const secret = randomBytes(24).toString('hex');
  return { prefix, secret, apiKey: `${prefix}.${secret}` };
}

export const apiKeyService = {
  authenticate: async (rawApiKey: string): Promise<ApiKeyPrincipal | null> => {
    const parsed = parseApiKey(rawApiKey);
    if (!parsed) {
      return null;
    }

    const record = await apiKeyRepository.findByPrefix(parsed.prefix);
    if (!record) {
      return null;
    }

    if (!verifySecret(parsed.secret, record.keyHash)) {
      return null;
    }

    await apiKeyRepository.markUsed(String(record._id));

    if (record.revokedAt) {
      throw new AppError('API key revoked', 401, ErrorCodes.Unauthorized);
    }

    return {
      kind: record.ownerType === 'ORGANIZATION' ? 'organization' : record.ownerType === 'ADMIN' ? 'admin' : 'service',
      subject: record.ownerId,
      organizationId: record.ownerType === 'ORGANIZATION' ? record.ownerId : undefined,
      roles: Array.isArray(record.scopes) ? record.scopes : [],
    };
  },
  createKey: async (input: {
    ownerType: 'ORGANIZATION' | 'ADMIN' | 'WORKER' | 'WEBHOOK';
    ownerId: string;
    name: string;
    scopes?: string[];
  }) => {
    const material = createApiKeyMaterial();
    const record = await apiKeyRepository.create({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      name: input.name,
      prefix: material.prefix,
      keyHash: createSecretHash(material.secret),
      scopes: input.scopes ?? [],
      lastUsedAt: null,
      revokedAt: null,
    });

    return {
      record,
      apiKey: material.apiKey,
    };
  },
  listKeys: (ownerType: 'ORGANIZATION' | 'ADMIN' | 'WORKER' | 'WEBHOOK', ownerId: string) =>
    apiKeyRepository.findByOwner(ownerType, ownerId),
  revokeKey: async (id: string) => {
    const key = await apiKeyRepository.revokeById(id);
    if (!key) {
      throw new AppError('API key not found', 404, ErrorCodes.NotFound);
    }
    return key;
  },
};
