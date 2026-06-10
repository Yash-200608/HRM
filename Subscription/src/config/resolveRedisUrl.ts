type RedisEnv = NodeJS.ProcessEnv | Record<string, string | undefined>;

function isTruthyFlag(value: string | undefined): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export function resolveRedisUrl(env: RedisEnv = process.env): string {
  const explicit = String(env.REDIS_URL || '').trim();
  const host = String(env.REDIS_HOST || '').trim();

  if (!host) {
    return explicit || 'redis://localhost:6379';
  }

  const port = String(env.REDIS_PORT || '6379').trim();
  const username = String(env.REDIS_USERNAME || 'default').trim();
  const apiKey = String(env.REDIS_API_KEY || env.REDIS_PASSWORD || '').trim();
  const scheme = isTruthyFlag(env.REDIS_TLS) ? 'rediss' : 'redis';

  if (apiKey) {
    return `${scheme}://${encodeURIComponent(username)}:${encodeURIComponent(apiKey)}@${host}:${port}`;
  }

  return `${scheme}://${host}:${port}`;
}