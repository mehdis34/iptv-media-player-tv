import { getEpgProgress } from '@/components/home/epgTime';
import type { HomeContentItem } from '@/components/home/types';
import {
  getEpgChannelIdByNormalizedNames,
  getEpgChannelIdForNormalizedName,
  getEpgChannelIdFromListings,
  getEpgChannels,
  getEpgListingsForChannels,
} from '@/storage/catalog';
import { normalizeXmltvName } from '@/storage/epg';

export const applyLiveEpg = async (
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

      if (!resolved && normalized) {
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
  const byChannel = new Map<
    string,
    { title: string; progress: number; start: string; end: string }
  >();

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
      start: listing.start,
      end: listing.end,
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
      epgStart: epg.start,
      epgEnd: epg.end,
    };
  });
};
