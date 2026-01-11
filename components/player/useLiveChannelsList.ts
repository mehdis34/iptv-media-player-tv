import { useCallback, useEffect, useRef, useState } from 'react';

import { useCatalogRefreshStore } from '@/hooks/useCatalogRefreshStore';
import { usePortalStore } from '@/hooks/usePortalStore';
import { applyLiveEpg } from '@/components/epg/applyLiveEpg';
import type { HomeContentItem } from '@/components/home/types';
import {
  getEpgListingsForChannels,
  getLiveChannelOffset,
  getLivePage,
  type HomeEpgListing,
} from '@/storage/catalog';

const PAGE_SIZE = 50;

export type LiveChannelItem = HomeContentItem & {
  epgSchedule?: HomeEpgListing[];
};

type LiveChannelsState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: LiveChannelItem[];
  hasMore: boolean;
  isLoadingMore: boolean;
  startIndex: number;
};

export const useLiveChannelsList = (visible: boolean, activeChannelId: string | null) => {
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const catalogVersion = useCatalogRefreshStore((store) => store.version);
  const lastKeyRef = useRef<string | null>(null);
  const [state, setState] = useState<LiveChannelsState>({
    status: 'idle',
    items: [],
    hasMore: true,
    isLoadingMore: false,
    startIndex: 0,
  });

  const loadPage = useCallback(
    async (reset: boolean, startingOffset?: number) => {
      if (!activeProfileId) {
        return;
      }
      setState((prev) => ({
        ...prev,
        status: reset ? 'loading' : prev.status,
        isLoadingMore: !reset,
      }));
      const offset = reset ? startingOffset ?? 0 : state.items.length;
      try {
        const rawItems = await getLivePage(activeProfileId, PAGE_SIZE, offset, null, {
          includeMissingIcons: true,
        });
        const itemsWithEpg = (await applyLiveEpg(
          activeProfileId,
          rawItems as HomeContentItem[],
        )) as LiveChannelItem[];
        const channelIds = itemsWithEpg
          .map((item) => item.epgChannelId)
          .filter(Boolean) as string[];
        let scheduleByChannel = new Map<string, HomeEpgListing[]>();
        if (channelIds.length > 0) {
          const listings = await getEpgListingsForChannels(activeProfileId, channelIds);
          const now = Date.now();
          const byChannel = new Map<string, HomeEpgListing[]>();
          listings.forEach((listing) => {
            const list = byChannel.get(listing.channelId) ?? [];
            list.push(listing);
            byChannel.set(listing.channelId, list);
          });
          scheduleByChannel = new Map(
            Array.from(byChannel.entries()).map(([channelId, channelListings]) => {
              const sorted = channelListings
                .slice()
                .sort(
                  (a, b) =>
                    (parseXmltvTimestamp(a.start) ?? 0) -
                    (parseXmltvTimestamp(b.start) ?? 0),
                );
              const current =
                sorted.find((listing) => {
                  const start = parseXmltvTimestamp(listing.start);
                  const end = parseXmltvTimestamp(listing.end);
                  if (!start || !end) {
                    return false;
                  }
                  return start <= now && end >= now;
                }) ?? null;
              const upcoming = sorted.filter((listing) => {
                const start = parseXmltvTimestamp(listing.start);
                return start != null && start > now;
              });
              const schedule = current ? [current, ...upcoming] : upcoming;
              return [channelId, schedule.slice(0, 8)];
            }),
          );
        }
        const items = itemsWithEpg.map((item) => ({
          ...item,
          epgSchedule: item.epgChannelId
            ? scheduleByChannel.get(item.epgChannelId) ?? []
            : [],
        }));
        setState((prev) => {
          const nextItems = reset ? items : [...prev.items, ...items];
          return {
            ...prev,
            status: 'ready',
            items: nextItems,
            hasMore: items.length === PAGE_SIZE,
            isLoadingMore: false,
            startIndex: reset ? offset : prev.startIndex,
          };
        });
      } catch {
        setState((prev) => ({
          ...prev,
          status: 'error',
          isLoadingMore: false,
        }));
      }
    },
    [activeProfileId, state.items.length],
  );

  useEffect(() => {
    if (!visible || !activeProfileId) {
      return;
    }
    const key = `${activeProfileId}-${catalogVersion}`;
    const hasActive = activeChannelId
      ? state.items.some((item) => item.id === activeChannelId)
      : state.items.length > 0;
    const shouldRefresh = lastKeyRef.current !== key;
    lastKeyRef.current = key;
    if (!shouldRefresh && hasActive) {
      return;
    }
    if (!activeChannelId) {
      void loadPage(true);
      return;
    }
    const run = async () => {
      const offset = await getLiveChannelOffset(activeProfileId, activeChannelId);
      if (offset == null) {
        void loadPage(true);
        return;
      }
      const centeredOffset = Math.max(0, offset - Math.floor(PAGE_SIZE / 2));
      void loadPage(true, centeredOffset);
    };
    void run();
  }, [activeChannelId, activeProfileId, catalogVersion, loadPage, visible]);

  const loadMore = useCallback(() => {
    if (state.isLoadingMore || !state.hasMore || state.status === 'loading') {
      return;
    }
    void loadPage(false);
  }, [loadPage, state.hasMore, state.isLoadingMore, state.status]);

  return {
    ...state,
    loadMore,
  };
};

const parseXmltvTimestamp = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ).getTime();
};
