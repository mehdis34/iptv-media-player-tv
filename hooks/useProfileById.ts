import { useCallback, useEffect, useState } from 'react';

import { useProfilesCacheStore } from '@/hooks/useProfilesCacheStore';
import { getProfileById, updateProfile } from '@/storage/profiles';
import type { PortalProfile, PortalProfileInput } from '@/types/profile';

type ProfileState = {
  status: 'loading' | 'ready' | 'error';
  profile: PortalProfile | null;
};

type UseProfileByIdResult = ProfileState & {
  refresh: () => Promise<void>;
  save: (input: PortalProfileInput) => Promise<PortalProfile | null>;
};

export const useProfileById = (
  profileId: string | null,
): UseProfileByIdResult => {
  const [state, setState] = useState<ProfileState>({
    status: 'loading',
    profile: null,
  });
  const version = useProfilesCacheStore((cache) => cache.version);
  const bump = useProfilesCacheStore((cache) => cache.bump);

  const refresh = useCallback(async () => {
    if (!profileId) {
      setState({ status: 'error', profile: null });
      return;
    }
    try {
      const profile = await getProfileById(profileId);
      if (!profile) {
        setState({ status: 'error', profile: null });
        return;
      }
      setState({ status: 'ready', profile });
    } catch {
      setState({ status: 'error', profile: null });
    }
  }, [profileId]);

  const save = useCallback(
    async (input: PortalProfileInput) => {
      if (!profileId) {
        return null;
      }
      const updated = await updateProfile(profileId, input);
      setState({ status: 'ready', profile: updated });
      bump();
      return updated;
    },
    [bump, profileId],
  );

  useEffect(() => {
    refresh();
  }, [refresh, version]);

  return {
    ...state,
    refresh,
    save,
  };
};
