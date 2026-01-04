import { useCallback, useEffect, useState } from 'react';

import { useProfilesCacheStore } from '@/hooks/useProfilesCacheStore';
import {
  addProfile,
  getProfiles,
  updateProfile as updateProfileStorage,
} from '@/storage/profiles';
import type { PortalProfile, PortalProfileInput } from '@/types/profile';

type ProfilesState = {
  status: 'loading' | 'ready' | 'error';
  profiles: PortalProfile[];
};

type UseProfilesResult = ProfilesState & {
  refresh: () => Promise<void>;
  createProfile: (input: PortalProfileInput) => Promise<PortalProfile>;
  updateProfile: (profileId: string, input: PortalProfileInput) => Promise<PortalProfile>;
};

export const useProfiles = (): UseProfilesResult => {
  const [state, setState] = useState<ProfilesState>({
    status: 'loading',
    profiles: [],
  });
  const version = useProfilesCacheStore((cache) => cache.version);
  const bump = useProfilesCacheStore((cache) => cache.bump);

  const refresh = useCallback(async () => {
    try {
      const profiles = await getProfiles();
      setState({ status: 'ready', profiles });
    } catch {
      setState({ status: 'error', profiles: [] });
    }
  }, []);

  const createProfile = useCallback(async (input: PortalProfileInput) => {
    const profile = await addProfile(input);
    bump();
    return profile;
  }, [bump]);

  const updateProfile = useCallback(
    async (profileId: string, input: PortalProfileInput) => {
      const profile = await updateProfileStorage(profileId, input);
      bump();
      return profile;
    },
    [bump],
  );

  useEffect(() => {
    refresh();
  }, [refresh, version]);

  return {
    ...state,
    refresh,
    createProfile,
    updateProfile,
  };
};
