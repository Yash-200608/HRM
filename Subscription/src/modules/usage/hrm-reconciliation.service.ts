import type { ClientSession } from 'mongoose';
import { withTransaction } from '../../common/db/transaction';
import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';
import { metrics } from '../../common/observability/metrics';
import { eventRepository } from '../events/event.repository';
import { subscriptionRepository } from '../subscriptions/subscription.repository';
import { usageRepository } from './usage.repository';
import { HrmEmployeeModel } from './hrm-employee.model';

export type HrmEventType = 'EmployeeCreated' | 'EmployeeDeleted' | 'EmployeeArchived' | 'EmployeeRestored';

export type HrmEventInput = {
  eventId: string;
  organizationId: string;
  entityId: string;
  eventVersion: number;
  eventType: HrmEventType;
  payload?: unknown;
};

type HrmEmployeeState = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

function deriveEmployeeState(eventType: HrmEventType): HrmEmployeeState {
  if (eventType === 'EmployeeArchived') {
    return 'ARCHIVED';
  }

  if (eventType === 'EmployeeDeleted') {
    return 'DELETED';
  }

  return 'ACTIVE';
}

function computeUsageDelta(previousState: HrmEmployeeState | null, nextState: HrmEmployeeState) {
  const delta = { activeEmployees: 0, archivedEmployees: 0 };

  if (previousState === nextState) {
    return delta;
  }

  if (previousState === 'ACTIVE') {
    delta.activeEmployees -= 1;
  } else if (previousState === 'ARCHIVED') {
    delta.archivedEmployees -= 1;
  }

  if (nextState === 'ACTIVE') {
    delta.activeEmployees += 1;
  } else if (nextState === 'ARCHIVED') {
    delta.archivedEmployees += 1;
  }

  return delta;
}

async function aggregateUsageCounts(organizationId: string, session?: ClientSession) {
  const [activeEmployees, archivedEmployees] = await Promise.all([
    HrmEmployeeModel.countDocuments({ organizationId, state: 'ACTIVE' }).session(session ?? null),
    HrmEmployeeModel.countDocuments({ organizationId, state: 'ARCHIVED' }).session(session ?? null),
  ]);

  const subscription = await subscriptionRepository.findByOrganization(organizationId, { session });
  const overageEmployees = subscription?.employeeLimit != null ? Math.max(0, activeEmployees - subscription.employeeLimit) : 0;

  return {
    activeEmployees,
    archivedEmployees,
    overageEmployees,
  };
}

export const hrmReconciliationService = {
  ingestEvent: async (input: HrmEventInput) => {
    try {
      return await eventRepository.createInbox({
        eventId: input.eventId,
        source: 'hrm',
        topic: input.eventType,
        organizationId: input.organizationId,
        entityId: input.entityId,
        eventVersion: input.eventVersion,
        payload: input,
        receivedAt: new Date(),
        status: 'RECEIVED',
      });
    } catch (error) {
      const existing = await eventRepository.findInboxByOrganizationEventId(input.organizationId, input.eventId);
      if (existing) {
        return existing;
      }

      throw error;
    }
  },
  applyEvent: async (input: HrmEventInput) =>
    withTransaction(async (session) => {
      const existing = await HrmEmployeeModel.findOne({
        organizationId: input.organizationId,
        entityId: input.entityId,
      })
        .session(session)
        .lean();

      if (existing && Number(existing.eventVersion ?? 0) >= input.eventVersion) {
        return {
          organizationId: input.organizationId,
          entityId: input.entityId,
          eventId: input.eventId,
          eventVersion: input.eventVersion,
          drift: false,
          ignored: true,
        };
      }

      const nextState = deriveEmployeeState(input.eventType);
      const delta = computeUsageDelta((existing?.state as HrmEmployeeState | undefined) ?? null, nextState);

      const updatedEmployee = await HrmEmployeeModel.findOneAndUpdate(
        {
          organizationId: input.organizationId,
          entityId: input.entityId,
          $or: [{ eventVersion: { $lt: input.eventVersion } }, { eventVersion: null }, { eventVersion: { $exists: false } }],
        },
        {
          $set: {
            organizationId: input.organizationId,
            entityId: input.entityId,
            state: nextState,
            eventVersion: input.eventVersion,
            lastEventId: input.eventId,
            lastEventType: input.eventType,
            lastProcessedAt: new Date(),
            metadata: {
              eventId: input.eventId,
              eventType: input.eventType,
              payload: input.payload ?? null,
            },
          },
        },
        { upsert: true, new: true, session },
      );

      if (!updatedEmployee) {
        throw new AppError('Stale HRM event rejected', 409, ErrorCodes.Conflict);
      }

      const aggregate = await aggregateUsageCounts(input.organizationId, session);
      const existingUsage = await usageRepository.getByOrganization(input.organizationId, { session });
      const correctedUsage = await usageRepository.upsertByOrganization(
        input.organizationId,
        {
          $set: {
            activeEmployees: aggregate.activeEmployees,
            archivedEmployees: aggregate.archivedEmployees,
            overageEmployees: aggregate.overageEmployees,
            sourceVersion: Math.max(Number(existingUsage?.sourceVersion ?? 0), input.eventVersion),
            lastSyncedAt: new Date(),
            metadata: {
              ...(existingUsage?.metadata ?? {}),
              lastEventId: input.eventId,
              lastEventType: input.eventType,
              lastEntityId: input.entityId,
              reconciliationMode: 'incremental',
            },
          },
        },
        { session },
      );

      return {
        organizationId: input.organizationId,
        entityId: input.entityId,
        eventId: input.eventId,
        eventVersion: input.eventVersion,
        nextState,
        delta,
        usage: correctedUsage,
        aggregate,
      };
    }),
  reconcileOrganizationUsage: async (organizationId: string) => {
    const aggregate = await aggregateUsageCounts(organizationId);
    const stored = await usageRepository.getByOrganization(organizationId);
    const drift =
      Number(stored?.activeEmployees ?? 0) !== aggregate.activeEmployees ||
      Number(stored?.archivedEmployees ?? 0) !== aggregate.archivedEmployees ||
      Number(stored?.overageEmployees ?? 0) !== aggregate.overageEmployees;

    if (!drift) {
      return {
        organizationId,
        drift: false,
        corrected: false,
        stored,
        aggregate,
      };
    }

    metrics.increment('usage_reconciliation_drift_total');

    const correctedUsage = await usageRepository.upsertByOrganization(organizationId, {
      $set: {
        activeEmployees: aggregate.activeEmployees,
        archivedEmployees: aggregate.archivedEmployees,
        overageEmployees: aggregate.overageEmployees,
        sourceVersion: Number(stored?.sourceVersion ?? 0),
        lastSyncedAt: new Date(),
        metadata: {
          ...(stored?.metadata ?? {}),
          reconciliationMode: 'full',
        },
      },
    });

    metrics.increment('usage_reconciliation_corrected_total');

    return {
      organizationId,
      drift: true,
      corrected: true,
      stored,
      usage: correctedUsage,
      aggregate,
    };
  },
  reconcileAllOrganizations: async () => {
    const organizations = await HrmEmployeeModel.distinct('organizationId');
    const reports = [];

    for (const organizationId of organizations) {
      reports.push(await hrmReconciliationService.reconcileOrganizationUsage(String(organizationId)));
    }

    return reports;
  },
  buildReport: async (organizationId: string) => {
    const aggregate = await aggregateUsageCounts(organizationId);
    const stored = await usageRepository.getByOrganization(organizationId);

    return {
      organizationId,
      stored,
      aggregate,
      drift: {
        activeEmployees: Number(stored?.activeEmployees ?? 0) - aggregate.activeEmployees,
        archivedEmployees: Number(stored?.archivedEmployees ?? 0) - aggregate.archivedEmployees,
        overageEmployees: Number(stored?.overageEmployees ?? 0) - aggregate.overageEmployees,
      },
    };
  },
};
