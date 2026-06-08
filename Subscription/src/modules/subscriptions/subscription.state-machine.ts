export type SubscriptionState =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'READ_ONLY'
  | 'SUSPENDED'
  | 'ARCHIVED'
  | 'PURGED';

export type SubscriptionLifecycleAction = 'UPGRADE' | 'DOWNGRADE' | 'CANCEL' | 'PAUSE' | 'RESUME' | 'RENEW';

const transitions: Record<SubscriptionState, SubscriptionState[]> = {
  TRIAL: ['ACTIVE', 'ARCHIVED', 'PURGED'],
  ACTIVE: ['PAST_DUE', 'READ_ONLY', 'SUSPENDED', 'ARCHIVED', 'PURGED'],
  PAST_DUE: ['ACTIVE', 'READ_ONLY', 'SUSPENDED', 'ARCHIVED', 'PURGED'],
  READ_ONLY: ['ACTIVE', 'SUSPENDED', 'ARCHIVED', 'PURGED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED', 'PURGED'],
  ARCHIVED: ['PURGED'],
  PURGED: [],
};

export function canTransition(from: SubscriptionState, to: SubscriptionState) {
  return transitions[from].includes(to);
}

const lifecycleActions: Record<SubscriptionLifecycleAction, SubscriptionState[]> = {
  UPGRADE: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'READ_ONLY', 'SUSPENDED'],
  DOWNGRADE: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'READ_ONLY', 'SUSPENDED'],
  CANCEL: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'READ_ONLY', 'SUSPENDED'],
  PAUSE: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'READ_ONLY'],
  RESUME: ['SUSPENDED'],
  RENEW: ['ACTIVE', 'PAST_DUE', 'READ_ONLY'],
};

export function canPerformAction(from: SubscriptionState, action: SubscriptionLifecycleAction) {
  return lifecycleActions[action].includes(from);
}
