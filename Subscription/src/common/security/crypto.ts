import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env';

export function createSecretHash(plain: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(`${plain}:${env.API_KEY_PEPPER}`, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifySecret(plain: string, storedHash: string) {
  const [salt, derived] = storedHash.split(':');
  const actual = scryptSync(`${plain}:${env.API_KEY_PEPPER}`, salt, 64);
  const expected = Buffer.from(derived, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function constantTimeEquals(a: string, b: string) {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

export function createPasswordHash(plain: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(`${plain}:${env.PASSWORD_PEPPER}`, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(plain: string, storedHash: string) {
  const [salt, derived] = storedHash.split(':');
  const actual = scryptSync(`${plain}:${env.PASSWORD_PEPPER}`, salt, 64);
  const expected = Buffer.from(derived, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createTokenHash(plain: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(`${plain}:${env.AUTH_TOKEN_PEPPER}`, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyTokenHash(plain: string, storedHash: string) {
  const [salt, derived] = storedHash.split(':');
  const actual = scryptSync(`${plain}:${env.AUTH_TOKEN_PEPPER}`, salt, 64);
  const expected = Buffer.from(derived, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
