import { useCallback } from 'react';

import { useProfileById } from '@/hooks/useProfileById';
import { useProfileConnection } from '@/hooks/useProfileConnection';
import { usePortalStore } from '@/hooks/usePortalStore';

export const useProfileRefresh = () => {
  const activeProfileId = usePortalStore((state) => state.activeProfileId);
  const { profile } = useProfileById(activeProfileId);
  const { status, errorKey, progress, connectProfile, reset } =
    useProfileConnection();

  const refresh = useCallback(async () => {
    if (!profile) {
      return false;
    }
    const refreshed = await connectProfile(profile, {
      onVerified: () => profile,
    });
    return Boolean(refreshed);
  }, [connectProfile, profile]);

  return {
    profile,
    status,
    errorKey,
    progress,
    refresh,
    reset,
  };
};
