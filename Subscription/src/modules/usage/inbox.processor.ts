import { eventRepository } from '../events/event.repository';
import { EventInboxModel } from '../events/event-inbox.model';
import { hrmReconciliationService } from './hrm-reconciliation.service';

const WORKER_ID = `hrm-inbox-${process.pid}`;
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

function backoffMs(attempts: number) {
  const baseDelay = 1000;
  const multiplier = Math.max(0, attempts - 1);
  return Math.min(baseDelay * Math.pow(2, multiplier), 15 * 60 * 1000);
}

export async function processInboxRecord(record: {
  _id: unknown;
  eventId: string;
  organizationId: string;
  source: string;
  topic: string;
  payload: unknown;
  status: string;
  attempts?: number;
}) {
  const claimed = await eventRepository.claimInbox(String(record._id), WORKER_ID, new Date(Date.now() + CLAIM_TIMEOUT_MS));
  if (!claimed) {
    return null;
  }

  try {
    const payload = claimed.payload as {
      eventId?: string;
      organizationId?: string;
      entityId?: string;
      eventVersion?: number;
      eventType?: 'EmployeeCreated' | 'EmployeeDeleted' | 'EmployeeArchived' | 'EmployeeRestored';
    };

    if (!payload?.eventId || !payload.organizationId || !payload.entityId || typeof payload.eventVersion !== 'number' || !payload.eventType) {
      throw new Error('invalid_hrm_inbox_payload');
    }

    const result = await hrmReconciliationService.applyEvent({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      entityId: payload.entityId,
      eventVersion: payload.eventVersion,
      eventType: payload.eventType,
      payload: claimed.payload,
    });

    const processed = await eventRepository.markInboxProcessed(String(claimed._id));
    return processed ?? result ?? claimed;
  } catch (error) {
    const attempts = Number(claimed.attempts ?? 0);
    const nextAttemptAt = new Date(Date.now() + backoffMs(attempts));
    await eventRepository.markInboxFailed(
      String(claimed._id),
      error instanceof Error ? error.message : 'hrm_inbox_processing_failed',
      nextAttemptAt,
    );
    throw error;
  }
}

export async function processInboxBatch() {
  const now = new Date();
  const candidates = await EventInboxModel.find({
    source: 'hrm',
    status: { $in: ['RECEIVED', 'FAILED'] },
    $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
  })
    .sort({ createdAt: 1 })
    .lean();

  const summary = { processed: 0 };
  for (const record of candidates) {
    const result = await processInboxRecord(record);
    if (result) {
      summary.processed += 1;
    }
  }

  return summary;
}
