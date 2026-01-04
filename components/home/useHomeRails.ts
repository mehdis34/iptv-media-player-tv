import { useEffect, useRef, useState } from 'react';

import { HOME_RAILS } from '@/components/home/rails';
import type { HomeContentItem, HomeRail } from '@/components/home/types';
import { applyLiveEpg } from '@/components/epg/applyLiveEpg';
import { useCatalogRefreshStore } from '@/hooks/useCatalogRefreshStore';
import { useLibraryRefreshStore } from '@/hooks/useLibraryRefreshStore';
import { useSyncStatusStore } from '@/hooks/useSyncStatusStore';
import { usePortalStore } from '@/hooks/usePortalStore';
import {
  getLiveItemsByIds,
  getLiveItemsWithCurrentEpg,
  getRecentSeriesItems,
  getRecentVodItems,
  getSeriesItemsByIds,
  getVodItemsByIds,
} from '@/storage/catalog';
import {
  getContinueWatching,
  getFavorites,
  getRecentlyViewed,
  type LibraryItem,
} from '@/storage/library';
const MAX_CONTENT_ITEMS = 9;

const buildEmptyRails = () =>
  HOME_RAILS.map((rail) => ({
    ...rail,
    items: [],
  }));

const resolveLibraryItems = async (
  profileId: string,
  items: LibraryItem[],
): Promise<HomeContentItem[]> => {
  const liveIds = items.filter((item) => item.itemType === 'live').map((item) => item.itemId);
  const vodIds = items.filter((item) => item.itemType === 'vod').map((item) => item.itemId);
  const seriesIds = items
    .filter((item) => item.itemType === 'series')
    .map((item) => item.itemId);

  const [liveItems, vodItems, seriesItems] = await Promise.all([
    getLiveItemsByIds(profileId, liveIds),
    getVodItemsByIds(profileId, vodIds),
    getSeriesItemsByIds(profileId, seriesIds),
  ]);

  const liveMap = new Map(liveItems.map((item) => [item.id, item]));
  const vodMap = new Map(vodItems.map((item) => [item.id, item]));
  const seriesMap = new Map(seriesItems.map((item) => [item.id, item]));

  const resolved = items
    .map((item) => {
      if (item.itemType === 'live') {
        return liveMap.get(item.itemId) ?? null;
      }
      if (item.itemType === 'vod') {
        return vodMap.get(item.itemId) ?? null;
      }
      return seriesMap.get(item.itemId) ?? null;
    })
    .filter(Boolean) as HomeContentItem[];

  return applyLiveEpg(profileId, resolved);
};

export const useHomeRails = () => {
  const [state, setState] = useState<{
    status: 'loading' | 'ready' | 'error';
    rails: HomeRail[];
  }>({
    status: 'loading',
    rails: buildEmptyRails(),
  });
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const syncStatus = useSyncStatusStore((store) => store.status);
  const catalogVersion = useCatalogRefreshStore((store) => store.version);
  const libraryVersion = useLibraryRefreshStore((store) => store.version);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!activeProfileId || syncStatus !== 'idle') {
      return;
    }

    let isCancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));

    const run = async () => {
      try {
        const [continueRows, favoriteRows, recentRows, recentVod, recentSeries] =
          await Promise.all([
            getContinueWatching(activeProfileId, MAX_CONTENT_ITEMS),
            getFavorites(activeProfileId, MAX_CONTENT_ITEMS),
            getRecentlyViewed(activeProfileId, MAX_CONTENT_ITEMS),
            getRecentVodItems(activeProfileId, MAX_CONTENT_ITEMS),
            getRecentSeriesItems(activeProfileId, MAX_CONTENT_ITEMS),
          ]);
        const recentLive = await getLiveItemsWithCurrentEpg(
          activeProfileId,
          MAX_CONTENT_ITEMS,
        );

        const [continueItems, favoriteItems, recentItems] = await Promise.all([
          resolveLibraryItems(activeProfileId, continueRows),
          resolveLibraryItems(activeProfileId, favoriteRows),
          resolveLibraryItems(activeProfileId, recentRows),
        ]);

        const recentLiveWithEpg = (await applyLiveEpg(
          activeProfileId,
          recentLive,
        )).filter((item) => item.type !== 'live' || item.epgProgress != null);


        const rails: HomeRail[] = HOME_RAILS.map((rail) => {
          if (rail.id === 'continue-watching') {
            return {
              ...rail,
              items: continueItems,
            };
          }
          if (rail.id === 'favorites') {
            return {
              ...rail,
              items: favoriteItems,
            };
          }
          if (rail.id === 'recently-viewed') {
            return {
              ...rail,
              items: recentItems,
            };
          }
          if (rail.id === 'recent-vod') {
            return {
              ...rail,
              items: recentVod,
            };
          }
          if (rail.id === 'recent-series') {
            return {
              ...rail,
              items: recentSeries,
            };
          }
          return {
            ...rail,
            items: recentLiveWithEpg,
          };
        });

        if (!mountedRef.current || isCancelled) {
          return;
        }
        setState({
          status: 'ready',
          rails,
        });
      } catch {
        if (!mountedRef.current || isCancelled) {
          return;
        }
        setState((prev) => ({ ...prev, status: 'error' }));
      }
    };

    run();

    return () => {
      isCancelled = true;
    };
  }, [activeProfileId, catalogVersion, libraryVersion, syncStatus]);

  return state;
};
