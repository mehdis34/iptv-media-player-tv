import { useEffect, useMemo, useState } from 'react';

import { applyLiveEpg } from '@/components/epg/applyLiveEpg';
import { useCatalogRefreshStore } from '@/hooks/useCatalogRefreshStore';
import { usePortalStore } from '@/hooks/usePortalStore';
import {
  getLiveItemsWithCurrentEpg,
  getLivePage,
  getRecentSeriesItems,
  getRecentVodItems,
  searchLiveStreams,
  searchSeriesItems,
  searchVodStreams,
  type VodItem,
  type SeriesItem,
} from '@/storage/catalog';
import type { HomeContentItem } from '@/components/home/types';

const LIVE_LIMIT = 12;
const MEDIA_LIMIT = 24;
const DEBOUNCE_MS = 200;

type SearchState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  liveResults: HomeContentItem[];
  vodResults: VodItem[];
  seriesResults: SeriesItem[];
  suggestedLive: HomeContentItem[];
  suggestedVod: VodItem[];
  suggestedSeries: SeriesItem[];
};

const hasImage = (item: { image: string | null }) =>
  Boolean(item.image && item.image.trim().length > 0);

export const useSearchCatalog = (query: string) => {
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const catalogVersion = useCatalogRefreshStore((store) => store.version);
  const [state, setState] = useState<SearchState>({
    status: 'idle',
    liveResults: [],
    vodResults: [],
    seriesResults: [],
    suggestedLive: [],
    suggestedVod: [],
    suggestedSeries: [],
  });

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!activeProfileId) {
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(() => {
      const run = async () => {
        try {
          setState((prev) => ({ ...prev, status: 'loading' }));
          if (!trimmedQuery) {
            const [recentVod, recentSeries] = await Promise.all([
              getRecentVodItems(activeProfileId, MEDIA_LIMIT),
              getRecentSeriesItems(activeProfileId, MEDIA_LIMIT),
            ]);
            const suggestedVod = recentVod
              .map((item) => ({
                id: item.id,
                title: item.title,
                image: item.image,
                categoryId: null,
              }))
              .filter(hasImage);
            const suggestedSeries = recentSeries
              .map((item) => ({
                id: item.id,
                title: item.title,
                image: item.image,
                categoryId: null,
              }))
              .filter(hasImage);
            let liveSuggested = await getLiveItemsWithCurrentEpg(
              activeProfileId,
              LIVE_LIMIT,
            );
            if (liveSuggested.length === 0) {
              liveSuggested = await getLivePage(
                activeProfileId,
                LIVE_LIMIT,
                0,
                null,
                { includeMissingIcons: true },
              );
            }
            let liveWithEpg = liveSuggested;
            try {
              liveWithEpg = await applyLiveEpg(activeProfileId, liveSuggested);
            } catch {
              // Keep raw items if EPG fails.
            }
            if (!isCancelled) {
              setState({
                status: 'ready',
                liveResults: [],
                vodResults: [],
                seriesResults: [],
                suggestedLive: liveWithEpg,
                suggestedVod,
                suggestedSeries,
              });
            }
            return;
          }

          const [liveResults, vodResults, seriesResults] = await Promise.all([
            searchLiveStreams(activeProfileId, trimmedQuery, LIVE_LIMIT),
            searchVodStreams(activeProfileId, trimmedQuery, MEDIA_LIMIT),
            searchSeriesItems(activeProfileId, trimmedQuery, MEDIA_LIMIT),
          ]);
          let liveWithEpg = liveResults;
          try {
            liveWithEpg = await applyLiveEpg(activeProfileId, liveResults);
          } catch {
            // Keep raw items if EPG fails.
          }
          if (!isCancelled) {
            setState((prev) => ({
              ...prev,
              status: 'ready',
              liveResults: liveWithEpg,
              vodResults,
              seriesResults,
            }));
          }
        } catch {
          if (!isCancelled) {
            setState((prev) => ({ ...prev, status: 'error' }));
          }
        }
      };

      void run();
    }, DEBOUNCE_MS);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [activeProfileId, catalogVersion, trimmedQuery]);

  return state;
};
