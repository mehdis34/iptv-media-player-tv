import { useEffect, useState } from 'react';

import { getSeriesInfo, storeSeriesInfo } from '@/storage/catalog';
import { fetchSeriesInfo } from '@/storage/xtream';
import { getProfileById } from '@/storage/profiles';
import { usePortalStore } from '@/hooks/usePortalStore';
import type { XtreamSeriesInfoResponse } from '@/types/xtream';

type SeriesDetailsState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  info: XtreamSeriesInfoResponse | null;
};

type SeriesDetailsOptions = {
  mode?: 'fetch' | 'cache';
};

export const useSeriesDetails = (
  seriesId: string | null,
  options?: SeriesDetailsOptions,
) => {
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const mode = options?.mode ?? 'fetch';
  const [state, setState] = useState<SeriesDetailsState>({
    status: 'idle',
    info: null,
  });

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!activeProfileId || !seriesId) {
        if (isMounted) {
          setState({ status: 'idle', info: null });
        }
        return;
      }

      setState((prev) => ({ ...prev, status: 'loading' }));

      const cached = await getSeriesInfo(activeProfileId, seriesId);
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
        const fetched = await fetchSeriesInfo(profile, seriesId);
        await storeSeriesInfo(activeProfileId, seriesId, fetched);
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
  }, [activeProfileId, mode, seriesId]);

  return state;
};
