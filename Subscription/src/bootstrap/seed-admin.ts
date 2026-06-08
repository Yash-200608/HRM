import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMongo } from '../config/mongo';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { operatorRepository } from '../modules/auth/operator.repository';
import { operatorService } from '../modules/auth/operator.service';

type SeedAdminResult =
  | { seeded: true; operator: Awaited<ReturnType<typeof operatorService.create>> }
  | { seeded: false; reason: 'admin_already_exists' | 'missing_credentials' };

export async function seedAdmin(): Promise<SeedAdminResult> {
  await connectMongo();

  const admins = await operatorRepository.listByRole('ADMIN');
  if (admins.length > 0) {
    return { seeded: false, reason: 'admin_already_exists' as const };
  }

  if (!env.SUPER_ADMIN_EMAIL || !env.SUPER_ADMIN_PASSWORD) {
    return { seeded: false, reason: 'missing_credentials' as const };
  }

  const operator = await operatorService.create({
    email: env.SUPER_ADMIN_EMAIL,
    fullName: env.SUPER_ADMIN_NAME || 'Super Admin',
    password: env.SUPER_ADMIN_PASSWORD,
    role: 'ADMIN',
    emailVerifiedAt: new Date(),
  });

  return {
    seeded: true,
    operator,
  } as const;
}

async function main() {
  try {
    const result = await seedAdmin();

    if (result.seeded) {
      const { operator } = result;
      logger.info('super_admin_seeded', {
        operatorId: operator.publicId,
        email: operator.email,
      });
    } else {
      logger.info('super_admin_seed_skipped', { reason: result.reason });
    }
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}

if (require.main === module) {
  void main().catch((error) => {
    logger.error('seed_admin_failed', error);
    process.exit(1);
  });
}
