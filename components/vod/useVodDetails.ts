import { useEffect, useState } from 'react';

import { getVodInfo, storeVodInfo } from '@/storage/catalog';
import { fetchVodInfo } from '@/storage/xtream';
import { getProfileById } from '@/storage/profiles';
import { usePortalStore } from '@/hooks/usePortalStore';
import type { XtreamVodInfoResponse } from '@/types/xtream';

type VodDetailsState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  info: XtreamVodInfoResponse | null;
};

type VodDetailsOptions = {
  mode?: 'fetch' | 'cache';
};

export const useVodDetails = (
  vodId: string | null,
  options?: VodDetailsOptions,
) => {
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const mode = options?.mode ?? 'fetch';
  const [state, setState] = useState<VodDetailsState>({
    status: 'idle',
    info: null,
  });

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!activeProfileId || !vodId) {
        if (isMounted) {
          setState({ status: 'idle', info: null });
        }
        return;
      }

      setState((prev) => ({ ...prev, status: 'loading' }));

      const cached = await getVodInfo(activeProfileId, vodId);
      if (cached) {
        if (isMounted) {
          setState({ status: 'ready', info: cached });
        }
        return;
      }

      if (mode === 'cache') {
        if (isMounted) {
          setState({ status: 'ready', info: null });
        }
        return;
      }

      const profile = await getProfileById(activeProfileId);
      if (!profile) {
        if (isMounted) {
          setState({ status: 'error', info: null });
        }
        return;
      }

      try {
        const fetched = await fetchVodInfo(profile, vodId);
        await storeVodInfo(activeProfileId, vodId, fetched);
        if (isMounted) {
          setState({ status: 'ready', info: fetched });
        }
      } catch {
        if (isMounted) {
          setState({ status: 'error', info: null });
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [activeProfileId, mode, vodId]);

  return state;
};
