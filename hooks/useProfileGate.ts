import { useEffect, useState } from 'react';

import { getProfiles } from '@/storage/profiles';
import { usePortalStore } from '@/hooks/usePortalStore';

type GateMode = 'root' | 'tabs';

type GateResult = {
  status: 'loading' | 'ready';
  target: string | null;
};

export const useProfileGate = (mode: GateMode): GateResult => {
  const [status, setStatus] = useState<GateResult['status']>('loading');
  const [target, setTarget] = useState<GateResult['target']>(null);
  const activeProfileId = usePortalStore((state) => state.activeProfileId);
  const setActiveProfileId = usePortalStore((state) => state.setActiveProfileId);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const profiles = await getProfiles();
      const count = profiles.length;

      let nextTarget: string | null = null;

      if (count === 0) {
        nextTarget = '/(auth)/add-profile';
      } else if (count === 1) {
        setActiveProfileId(profiles[0].id);
        if (mode === 'root') {
          nextTarget = '/(tabs)';
        }
      } else if (count > 1) {
        if (mode === 'root') {
          nextTarget = '/(auth)/select-profile';
        } else if (!activeProfileId) {
          nextTarget = '/(auth)/select-profile';
        }
      }

      if (isMounted) {
        setTarget(nextTarget);
        setStatus('ready');
      }
    };

    run().catch(() => {
      if (isMounted) {
        setTarget('/(auth)/add-profile');
        setStatus('ready');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeProfileId, mode, setActiveProfileId]);

  return { status, target };
};
