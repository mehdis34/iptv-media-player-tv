import { useEffect, useState } from 'react';
import type { Href } from 'expo-router';

import { usePortalStore } from '@/hooks/usePortalStore';
import { getProfiles } from '@/storage/profiles';

type GateState = {
  status: 'loading' | 'ready';
  target: Href | null;
};

export const useAddProfileGate = (allowExisting: boolean): GateState => {
  const [state, setState] = useState<GateState>({
    status: 'loading',
    target: null,
  });
  const setActiveProfileId = usePortalStore((store) => store.setActiveProfileId);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const profiles = await getProfiles();
      const count = profiles.length;
      let target: Href | null = null;

      if (!allowExisting) {
        if (count === 1) {
          setActiveProfileId(profiles[0].id);
          target = '/(tabs)';
        } else if (count > 1) {
          target = '/(auth)/select-profile';
        }
      }

      if (isMounted) {
        setState({ status: 'ready', target });
      }
    };

    run().catch(() => {
      if (isMounted) {
        setState({ status: 'ready', target: null });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [allowExisting, setActiveProfileId]);

  return state;
};
