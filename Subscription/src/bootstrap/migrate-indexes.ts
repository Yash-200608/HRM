import 'dotenv/config';
import { connectMongo } from '../config/mongo';
import { logger } from '../config/logger';
import { InvoiceModel } from '../modules/billing/invoice.model';
import { PaymentModel } from '../modules/billing/payment.model';
import { CreditLedgerModel } from '../modules/billing/credit-ledger.model';
import { PaymentSagaModel } from '../modules/billing/payment-saga.model';
import { WebhookEventModel } from '../modules/webhooks/webhook-event.model';
import { EventInboxModel } from '../modules/events/event-inbox.model';
import { EventOutboxModel } from '../modules/events/event-outbox.model';
import { SubscriptionModel } from '../modules/subscriptions/subscription.model';
import { UsageModel } from '../modules/usage/usage.model';
import { HrmEmployeeModel } from '../modules/usage/hrm-employee.model';
import { PlanModel } from '../modules/plans/plan.model';

const models = [
  InvoiceModel,
  PaymentModel,
  CreditLedgerModel,
  PaymentSagaModel,
  WebhookEventModel,
  EventInboxModel,
  EventOutboxModel,
  SubscriptionModel,
  UsageModel,
  HrmEmployeeModel,
  PlanModel,
];

type ModelLike = {
  modelName: string;
  schema: { indexes(): Array<[Record<string, 1 | -1>, Record<string, unknown>]> };
  aggregate: (pipeline: unknown[]) => { allowDiskUse: (flag: boolean) => { exec: () => Promise<Array<Record<string, unknown>>> } };
  createIndexes: () => Promise<unknown>;
};

type UniqueIndexViolation = {
  modelName: string;
  fields: Record<string, 1 | -1>;
  options: Record<string, unknown>;
  duplicates: Array<{
    key: Record<string, unknown>;
    count: number;
    ids: string[];
  }>;
};

function getMigrationMode() {
  const mode = String(process.env.INDEX_MIGRATION_MODE ?? '').toLowerCase();
  if (mode === 'dry-run' || process.env.INDEX_MIGRATION_DRY_RUN === 'true') {
    return 'dry-run' as const;
  }

  if (mode === 'validate' || process.env.INDEX_MIGRATION_VALIDATE_ONLY === 'true') {
    return 'validate' as const;
  }

  return 'apply' as const;
}

function buildDuplicateMatch(options: Record<string, unknown>) {
  if (options.partialFilterExpression && typeof options.partialFilterExpression === 'object') {
    return options.partialFilterExpression as Record<string, unknown>;
  }

  return {};
}

async function detectUniqueIndexViolations(model: ModelLike): Promise<UniqueIndexViolation[]> {
  const violations: UniqueIndexViolation[] = [];

  for (const [fields, options] of model.schema.indexes()) {
    if (!options.unique) {
      continue;
    }

    const indexName = typeof options.name === 'string' ? options.name : `${model.modelName}:${Object.keys(fields).join(',')}`;
    const groupKey = Object.fromEntries(Object.entries(fields).map(([field]) => [field, `$${field}`]));
    const match = buildDuplicateMatch(options);

    const duplicates = await model
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: groupKey,
            count: { $sum: 1 },
            ids: { $push: '$_id' },
          },
        },
        { $match: { count: { $gt: 1 } } },
      ])
      .allowDiskUse(true)
      .exec();

    if (duplicates.length > 0) {
      violations.push({
        modelName: model.modelName,
        fields,
        options: {
          name: indexName,
          unique: true,
          ...options,
        },
        duplicates: duplicates.map((duplicate) => ({
          key: duplicate._id as Record<string, unknown>,
          count: Number(duplicate.count ?? 0),
          ids: Array.isArray(duplicate.ids) ? duplicate.ids.map((id) => String(id)) : [],
        })),
      });
    }
  }

  return violations;
}

async function inspectIndexSafety() {
  const violations: UniqueIndexViolation[] = [];

  for (const model of models as unknown as ModelLike[]) {
    violations.push(...(await detectUniqueIndexViolations(model)));
  }

  return violations;
}

async function main() {
  await connectMongo();

  const mode = getMigrationMode();
  const violations = await inspectIndexSafety();

  if (violations.length > 0) {
    logger.error('index_migration_duplicate_data_detected', {
      mode,
      violations,
    });

    if (mode !== 'dry-run') {
      process.exit(1);
      return;
    }
  }

  if (mode === 'dry-run' || mode === 'validate') {
    logger.info('index_migration_validation_complete', {
      mode,
      models: models.length,
      violations: violations.length,
    });
    process.exit(violations.length > 0 && mode === 'validate' ? 1 : 0);
    return;
  }

  await Promise.all(models.map((model) => (model as unknown as ModelLike).createIndexes()));
  logger.info('indexes_migrated', { models: models.length });
  process.exit(0);
}

void main().catch((error) => {
  logger.error('migrate_indexes_failed', error);
  process.exit(1);
});
