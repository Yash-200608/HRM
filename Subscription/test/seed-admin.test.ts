import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '3000';
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

let mongoServer: MongoMemoryReplSet;
let seedAdmin: typeof import('../src/bootstrap/seed-admin').seedAdmin;
let operatorRepository: typeof import('../src/modules/auth/operator.repository').operatorRepository;

before(async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger',
    },
  });
  process.env.MONGODB_URI = mongoServer.getUri();

  const seedModule = await import('../src/bootstrap/seed-admin');
  const repositoryModule = await import('../src/modules/auth/operator.repository');
  const mongoModule = await import('../src/config/mongo');

  seedAdmin = seedModule.seedAdmin;
  operatorRepository = repositoryModule.operatorRepository;

  await mongoModule.connectMongo();
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test('seed:admin creates the first verified admin and skips when one already exists', async () => {
  const firstRun = await seedAdmin();
  assert.equal(firstRun.seeded, true);
  assert.equal(firstRun.operator.role, 'ADMIN');
  assert.equal(Boolean(firstRun.operator.emailVerifiedAt), true);

  const secondRun = await seedAdmin();
  assert.equal(secondRun.seeded, false);
  assert.equal(secondRun.reason, 'admin_already_exists');

  const admins = await operatorRepository.listByRole('ADMIN');
  assert.equal(admins.length, 1);
  assert.equal(admins[0].email, process.env.SUPER_ADMIN_EMAIL);
});
