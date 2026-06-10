export type NotificationPreferences = {
  email: boolean;
  tasks: boolean;
  leave: boolean;
  expenses: boolean;
};

export type UserPreferences = {
  language: string;
  compactView: boolean;
  notifications: NotificationPreferences;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  language: "en",
  compactView: false,
  notifications: {
    email: true,
    tasks: true,
    leave: true,
    expenses: false,
  },
};

export const PREFERENCES_STORAGE_KEY = "userPreferences";

export function normalizePreferences(
  preferences?: Partial<UserPreferences> | null,
): UserPreferences {
  return {
    language: preferences?.language || DEFAULT_USER_PREFERENCES.language,
    compactView:
      preferences?.compactView ?? DEFAULT_USER_PREFERENCES.compactView,
    notifications: {
      email:
        preferences?.notifications?.email ??
        DEFAULT_USER_PREFERENCES.notifications.email,
      tasks:
        preferences?.notifications?.tasks ??
        DEFAULT_USER_PREFERENCES.notifications.tasks,
      leave:
        preferences?.notifications?.leave ??
        DEFAULT_USER_PREFERENCES.notifications.leave,
      expenses:
        preferences?.notifications?.expenses ??
        DEFAULT_USER_PREFERENCES.notifications.expenses,
    },
  };
}

export function applyPreferences(preferences: UserPreferences) {
  const normalized = normalizePreferences(preferences);
  const root = document.documentElement;
  root.lang = normalized.language;
  root.classList.toggle("compact-view", Boolean(normalized.compactView));
  localStorage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalized),
  );

  void import("@/i18n").then(({ default: i18n }) => {
    if (i18n.language !== normalized.language) {
      void i18n.changeLanguage(normalized.language);
    }
  });
}

export function readCachedPreferences(): UserPreferences | null {
  const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (!raw) return null;

  try {
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return null;
  }
}