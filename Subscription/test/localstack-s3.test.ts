import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { CreateBucketCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '3000';
process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/subscription_billing_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-test-jwt-secret';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? 'test-admin-jwt-secret-test-admin-jwt-secret';
process.env.INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? 'test-internal-api-key';
process.env.API_KEY_PEPPER = process.env.API_KEY_PEPPER ?? 'test-api-key-pepper';
process.env.PASSWORD_PEPPER = process.env.PASSWORD_PEPPER ?? 'test-password-pepper';
process.env.AUTH_TOKEN_PEPPER = process.env.AUTH_TOKEN_PEPPER ?? 'test-auth-token-pepper';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? 'test-resend-api-key';
process.env.RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'no-reply@example.com';
process.env.APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://127.0.0.1:3000';
process.env.SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@example.com';
process.env.SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? 'supersecurepass';
process.env.SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';

const localstackEndpoint = process.env.LOCALSTACK_S3_ENDPOINT || process.env.S3_ENDPOINT || '';
const shouldRun = Boolean(localstackEndpoint);

before(async () => {
  if (!shouldRun) {
    return;
  }
});

after(async () => {
  if (!shouldRun) {
    return;
  }
});

async function readBody(body: unknown) {
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

test(
  'LocalStack-backed S3 upload persists and reads back bytes',
  { skip: !shouldRun },
  async () => {
    const bucket = process.env.LOCALSTACK_S3_BUCKET || 'subscription-service-test-bucket';
    const region = process.env.LOCALSTACK_S3_REGION || 'us-east-1';
    const credentials = {
      accessKeyId: process.env.LOCALSTACK_S3_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.LOCALSTACK_S3_SECRET_ACCESS_KEY || 'test',
    };

    const s3Client = new S3Client({
      region,
      endpoint: localstackEndpoint,
      forcePathStyle: true,
      credentials,
    });

    await s3Client.send(new CreateBucketCommand({ Bucket: bucket })).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (!/BucketAlreadyOwnedByYou|BucketAlreadyExists/i.test(message)) {
        throw error;
      }
    });

    const { uploadObject } = await import('../src/integrations/s3');
    const key = `integration/${Date.now()}.txt`;
    const body = Buffer.from('localstack-s3-integration', 'utf8');

    const uploaded = await uploadObject(
      {
        key,
        body,
        contentType: 'text/plain',
      },
      {
        bucket,
        endpoint: localstackEndpoint,
        region,
        forcePathStyle: true,
        credentials,
      },
    );

    assert.equal(uploaded.key, key);
    assert.ok(uploaded.url.includes(key));

    const object = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const roundTrip = await readBody(object.Body);
    assert.equal(roundTrip.toString('utf8'), 'localstack-s3-integration');
  },
);
