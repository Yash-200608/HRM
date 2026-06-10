import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserPreferences, updateUserPreferences } from "@/services/Service";
import {
  applyPreferences,
  DEFAULT_USER_PREFERENCES,
  normalizePreferences,
  readCachedPreferences,
  UserPreferences,
} from "@/lib/preferences";

type PreferencesContextType = {
  preferences: UserPreferences;
  loading: boolean;
  saving: boolean;
  savePreferences: (
    nextPreferences: UserPreferences,
    successMessage?: string,
  ) => Promise<boolean>;
  refreshPreferences: () => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined,
);

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    return readCachedPreferences() || DEFAULT_USER_PREFERENCES;
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const refreshPreferences = useCallback(async () => {
    if (!isAuthenticated || !user?._id) {
      return;
    }

    setLoading(true);
    try {
      const res = await getUserPreferences();
      if (res.status === 200 && res.data?.preferences) {
        const normalized = normalizePreferences(res.data.preferences);
        setPreferences(normalized);
        applyPreferences(normalized);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?._id]);

  useEffect(() => {
    const cached = readCachedPreferences();
    if (cached) {
      applyPreferences(cached);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?._id) {
      refreshPreferences();
    } else {
      const cached = readCachedPreferences() || DEFAULT_USER_PREFERENCES;
      setPreferences(cached);
      applyPreferences(cached);
    }
  }, [isAuthenticated, user?._id, refreshPreferences]);

  const savePreferences = useCallback(
    async (nextPreferences: UserPreferences, successMessage?: string) => {
      const normalized = normalizePreferences(nextPreferences);
      setPreferences(normalized);
      applyPreferences(normalized);

      if (!isAuthenticated || !user?._id) {
        return true;
      }

      setSaving(true);
      try {
        const res = await updateUserPreferences(normalized);
        if (res.status === 200) {
          const saved = normalizePreferences(
            res.data?.preferences || normalized,
          );
          setPreferences(saved);
          applyPreferences(saved);
          return true;
        }
        return false;
      } catch (err) {
        console.log(err);
        await refreshPreferences();
        return false;
      } finally {
        setSaving(false);
      }
    },
    [isAuthenticated, user?._id, refreshPreferences],
  );

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        loading,
        saving,
        savePreferences,
        refreshPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return context;
};