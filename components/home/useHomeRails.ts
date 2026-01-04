import { useEffect, useRef, useState } from 'react';

import { getEpgProgress } from '@/components/home/epgTime';
import { HOME_RAILS } from '@/components/home/rails';
import type { HomeContentItem, HomeRail } from '@/components/home/types';
import { useCatalogRefreshStore } from '@/hooks/useCatalogRefreshStore';
import { useSyncStatusStore } from '@/hooks/useSyncStatusStore';
import { usePortalStore } from '@/hooks/usePortalStore';
import {
  getEpgChannelIdByNormalizedNames,
  getEpgChannelIdForNormalizedName,
  getEpgChannelIdFromListings,
  getEpgChannels,
  getEpgListingsForChannels,
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
import { normalizeXmltvName } from '@/storage/epg';

const MAX_CONTENT_ITEMS = 9;

const buildEmptyRails = () =>
  HOME_RAILS.map((rail) => ({
    ...rail,
    items: [],
  }));

const applyLiveEpg = async (
  profileId: string,
  items: HomeContentItem[],
) => {
  const liveItems = items.filter((item) => item.type === 'live');
  const normalizedNames = Array.from(
    new Set(liveItems.map((item) => normalizeXmltvName(item.title)).filter(Boolean)),
  );
  const mappedChannels = await getEpgChannelIdByNormalizedNames(
    profileId,
    normalizedNames,
  );
  const fallbackCache = new Map<string, string | null>();
  let fallbackMap: Map<string, string> | null = null;
  const listingsCache = new Map<string, string | null>();
  const resolveFallbackMap = async () => {
    if (fallbackMap) {
      return fallbackMap;
    }
    const channels = await getEpgChannels(profileId);
    fallbackMap = new Map();
    channels.forEach((channel) => {
      const normalized =
        normalizeXmltvName(channel.displayName) || channel.normalizedName;
      if (normalized && !fallbackMap?.has(normalized)) {
        fallbackMap?.set(normalized, channel.channelId);
      }
    });
    return fallbackMap;
  };

  const resolvedItems = await Promise.all(
    items.map(async (item) => {
      if (item.type !== 'live') {
        return item;
      }
      const normalized = normalizeXmltvName(item.title);
      let resolved = item.epgChannelId ?? null;

      if (normalized) {
        const exact = mappedChannels.get(normalized);
        if (exact) {
          resolved = exact;
        } else {
          if (!fallbackCache.has(normalized)) {
            const fallback = await getEpgChannelIdForNormalizedName(
              profileId,
              normalized,
            );
            fallbackCache.set(normalized, fallback);
          }
          const fallback = fallbackCache.get(normalized);
          if (fallback) {
            resolved = fallback;
          } else {
            const fallbackNames = await resolveFallbackMap();
            const mappedByName = fallbackNames.get(normalized);
            if (mappedByName) {
              resolved = mappedByName;
            } else {
              if (!listingsCache.has(normalized)) {
                const listingMatch = await getEpgChannelIdFromListings(
                  profileId,
                  normalized,
                );
                listingsCache.set(normalized, listingMatch);
              }
              const listingMatch = listingsCache.get(normalized);
              if (listingMatch) {
                resolved = listingMatch;
              }
            }
          }
        }
      }

      if (!resolved) {
        return item;
      }

      return { ...item, epgChannelId: resolved };
    }),
  );

  const channelIdList = resolvedItems
    .filter((item) => item.type === 'live')
    .map((item) => item.epgChannelId)
    .filter(Boolean) as string[];

  if (channelIdList.length === 0) {
    return resolvedItems;
  }

  const listings = await getEpgListingsForChannels(profileId, channelIdList);
  const now = Date.now();
  const byChannel = new Map<string, { title: string; progress: number }>();

  listings.forEach((listing) => {
    if (byChannel.has(listing.channelId)) {
      return;
    }
    const progress = getEpgProgress(listing.start, listing.end, now);
    if (progress == null) {
      return;
    }
    byChannel.set(listing.channelId, {
      title: listing.title,
      progress,
    });
  });

  return resolvedItems.map((item) => {
    if (item.type !== 'live') {
      return item;
    }
    const channelId = item.epgChannelId;
    if (!channelId) {
      return item;
    }
    const epg = byChannel.get(channelId);
    if (!epg) {
      return item;
    }
    return {
      ...item,
      epgTitle: epg.title,
      epgProgress: epg.progress,
    };
  });
};

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
  }, [activeProfileId, catalogVersion, syncStatus]);

  return state;
};
