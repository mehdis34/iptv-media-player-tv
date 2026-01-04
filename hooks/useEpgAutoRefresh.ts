import { useEffect } from 'react';

import { usePortalStore } from '@/hooks/usePortalStore';
import { getProfileById } from '@/storage/profiles';
import { refreshXtreamEpgIfNeeded } from '@/storage/xtreamSync';

export const useEpgAutoRefresh = () => {
  const activeProfileId = usePortalStore((state) => state.activeProfileId);

  useEffect(() => {
    if (!activeProfileId) {
      return;
    }

    let isMounted = true;

    const run = async () => {
      const profile = await getProfileById(activeProfileId);
      if (!profile || !isMounted) {
        return;
      }
      await refreshXtreamEpgIfNeeded(profile);
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [activeProfileId]);
};
