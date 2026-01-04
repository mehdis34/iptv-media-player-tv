import { useEffect, useState } from 'react';

import { buildSeriesEpisodeUrl, buildStreamUrl, buildVodUrl } from '@/storage/xtream';
import { getProfileById } from '@/storage/profiles';
import { usePortalStore } from '@/hooks/usePortalStore';

export type PlayerType = 'vod' | 'series' | 'live';

export type PlayerRouteParams = {
  id: string | null;
  type: PlayerType;
  name?: string | null;
  ext?: string | null;
  seriesId?: string | null;
  season?: string | null;
  start?: string | null;
  icon?: string | null;
};

type PlayerSourceState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  streamUrl: string | null;
  error: 'profile' | 'params' | 'source' | null;
};

const resolveStreamId = (id: string | null) => {
  if (!id) {
    return null;
  }
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric;
};

export const usePlayerSource = (params: PlayerRouteParams, reloadKey: number) => {
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const [state, setState] = useState<PlayerSourceState>({
    status: 'idle',
    streamUrl: null,
    error: null,
  });

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      if (!activeProfileId) {
        setState({ status: 'error', streamUrl: null, error: 'profile' });
        return;
      }
      const streamId = resolveStreamId(params.id);
      if (!streamId) {
        setState({ status: 'error', streamUrl: null, error: 'params' });
        return;
      }
      setState((prev) => ({ ...prev, status: 'loading', error: null }));
      const profile = await getProfileById(activeProfileId);
      if (!profile) {
        if (!isCancelled) {
          setState({ status: 'error', streamUrl: null, error: 'profile' });
        }
        return;
      }

      let url: string | null = null;
      if (params.type === 'vod') {
        url = buildVodUrl(profile, streamId, params.ext ?? 'mp4');
      } else if (params.type === 'series') {
        url = buildSeriesEpisodeUrl(profile, streamId, params.ext ?? 'mp4');
      } else if (params.type === 'live') {
        url = buildStreamUrl(profile, streamId);
      }

      if (!url) {
        if (!isCancelled) {
          setState({ status: 'error', streamUrl: null, error: 'source' });
        }
        return;
      }

      if (!isCancelled) {
        setState({ status: 'ready', streamUrl: url, error: null });
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [activeProfileId, params.ext, params.id, params.type, reloadKey]);

  return state;
};
