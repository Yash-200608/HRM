import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRedisUrl } from '../src/config/resolveRedisUrl';

test('resolveRedisUrl prefers host and api key when REDIS_HOST is set', () => {
  const url = resolveRedisUrl({
    REDIS_URL: 'redis://localhost:6379',
    REDIS_HOST: 'redis.example.com',
    REDIS_PORT: '6380',
    REDIS_API_KEY: 'secret-key',
    REDIS_USERNAME: 'default',
    REDIS_TLS: 'true',
  });

  assert.equal(url, 'rediss://default:secret-key@redis.example.com:6380');
});

test('resolveRedisUrl falls back to REDIS_URL when host is empty', () => {
  const url = resolveRedisUrl({
    REDIS_URL: 'redis://localhost:6379',
  });

  assert.equal(url, 'redis://localhost:6379');
});