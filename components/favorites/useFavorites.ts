import { useEffect, useMemo, useState } from 'react';

import { usePortalStore } from '@/hooks/usePortalStore';
import { useLibraryRefreshStore } from '@/hooks/useLibraryRefreshStore';
import { getFavorites, type LibraryItem } from '@/storage/library';
import {
  getLiveItemsByIds,
  getSeriesItemsByIds,
  getVodItemsByIds,
  type HomeCatalogItem,
} from '@/storage/catalog';

type FavoritesState = {
  status: 'loading' | 'ready' | 'error';
  items: HomeCatalogItem[];
};

const FAVORITES_LIMIT = 200;

const resolveLibraryItems = async (
  profileId: string,
  items: LibraryItem[],
): Promise<HomeCatalogItem[]> => {
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

  return items
    .map((item) => {
      if (item.itemType === 'live') {
        return liveMap.get(item.itemId) ?? null;
      }
      if (item.itemType === 'vod') {
        return vodMap.get(item.itemId) ?? null;
      }
      return seriesMap.get(item.itemId) ?? null;
    })
    .filter(Boolean) as HomeCatalogItem[];
};

export const useFavorites = () => {
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const libraryVersion = useLibraryRefreshStore((store) => store.version);
  const [state, setState] = useState<FavoritesState>({
    status: 'loading',
    items: [],
  });

  useEffect(() => {
    if (!activeProfileId) {
      return;
    }

    let isCancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));

    const run = async () => {
      try {
        const rows = await getFavorites(activeProfileId, FAVORITES_LIMIT);
        if (isCancelled) {
          return;
        }
        const items = await resolveLibraryItems(activeProfileId, rows);
        if (isCancelled) {
          return;
        }
        setState({ status: 'ready', items });
      } catch {
        if (!isCancelled) {
          setState((prev) => ({ ...prev, status: 'error' }));
        }
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [activeProfileId, libraryVersion]);

  const liveItems = useMemo(
    () => state.items.filter((item) => item.type === 'live'),
    [state.items],
  );
  const vodItems = useMemo(
    () => state.items.filter((item) => item.type === 'vod'),
    [state.items],
  );
  const seriesItems = useMemo(
    () => state.items.filter((item) => item.type === 'series'),
    [state.items],
  );

  return {
    ...state,
    liveItems,
    vodItems,
    seriesItems,
  };
};
