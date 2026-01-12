import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PlayerChannelModal } from '@/components/player/PlayerChannelModal';
import { PlayerControls } from '@/components/player/PlayerControls';
import { PlayerTracksModal } from '@/components/player/PlayerTracksModal';
import { type PlayerRouteParams, usePlayerSource } from '@/components/player/usePlayerSource';
import { usePlayerControlsVisibility } from '@/components/player/usePlayerControlsVisibility';
import { useVlcPlayback } from '@/components/player/useVlcPlayback';
import { VLCPlayer } from '@/components/ui/VlcPlayer';
import { useFavoriteStatus } from '@/hooks/useFavoriteStatus';
import { useLibraryRefreshStore } from '@/hooks/useLibraryRefreshStore';
import { usePortalStore } from '@/hooks/usePortalStore';
import { addRecentlyViewed } from '@/storage/library';
import { applyLiveEpg } from '@/components/epg/applyLiveEpg';
import { getEpgProgress } from '@/components/home/epgTime';
import { useLiveChannelsList } from '@/components/player/useLiveChannelsList';
import {
  getEpgListingsForChannels,
  getLiveItemsByIds,
  type HomeEpgListing,
} from '@/storage/catalog';

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

const formatTimeRange = (start: string, end: string) => {
  const startMs = parseXmltvTimestamp(start);
  const endMs = parseXmltvTimestamp(end);
  if (!startMs || !endMs) {
    return null;
  }
  const format = (value: number) => {
    const date = new Date(value);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  return `${format(startMs)} - ${format(endMs)}`;
};

const formatProgramDuration = (start: string, end: string) => {
  const startMs = parseXmltvTimestamp(start);
  const endMs = parseXmltvTimestamp(end);
  if (!startMs || !endMs || endMs <= startMs) {
    return null;
  }
  const minutes = Math.round((endMs - startMs) / 60000);
  if (minutes <= 0) {
    return null;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours > 0) {
    return remaining > 0 ? `${hours}h${remaining}m` : `${hours}h`;
  }
  return `${remaining}m`;
};

const selectCurrentListing = (listings: HomeEpgListing[]) => {
  const now = Date.now();
  return (
    listings.find((listing) => {
      const start = parseXmltvTimestamp(listing.start);
      const end = parseXmltvTimestamp(listing.end);
      if (!start || !end) {
        return false;
      }
      return start <= now && end >= now;
    }) ?? null
  );
};

const selectUpcomingListings = (listings: HomeEpgListing[]) => {
  const now = Date.now();
  return listings.filter((listing) => {
    const start = parseXmltvTimestamp(listing.start);
    return start != null && start > now;
  });
};

type LivePlayerScreenProps = {
  routeParams: PlayerRouteParams;
};

export function LivePlayerScreen({ routeParams }: LivePlayerScreenProps) {
  const { t } = useI18n();
  const router = useRouter();
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const bumpLibrary = useLibraryRefreshStore((store) => store.bump);
  const hasMarkedViewedRef = useRef(false);
  const liveId = routeParams.id ?? null;

  const [reloadKey, setReloadKey] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const [tracksVisible, setTracksVisible] = useState(false);
  const [channelsVisible, setChannelsVisible] = useState(false);
  const [liveEpg, setLiveEpg] = useState<{
    current: HomeEpgListing | null;
    upcoming: HomeEpgListing[];
  }>({ current: null, upcoming: [] });
  const [liveClock, setLiveClock] = useState(() => Date.now());
  const channels = useLiveChannelsList(channelsVisible, liveId);
  const openChannels = useCallback(() => setChannelsVisible(true), []);
  const closeChannels = useCallback(() => setChannelsVisible(false), []);
  const onUserActivityRef = useRef<(() => void) | null>(null);
  const handlePlayerKey = useCallback(
    (keyCode: number) => {
      if (channelsVisible) {
        return true;
      }
      const isArrow = keyCode === 19 || keyCode === 20 || keyCode === 21 || keyCode === 22;
      const isChannelNav = keyCode === 166 || keyCode === 167;
      const isSelect = keyCode === 23 || keyCode === 66;
      if (!controlsVisible && (isArrow || isChannelNav)) {
        openChannels();
        return true;
      }
      if (!controlsVisible && isSelect) {
        onUserActivityRef.current?.();
        return true;
      }
      if (controlsVisible && (isArrow || isChannelNav || isSelect)) {
        onUserActivityRef.current?.();
        return true;
      }
      return false;
    },
    [channelsVisible, openChannels],
  );
  const { controlsVisible, canPress, onUserActivity } = usePlayerControlsVisibility({
    enabled: !tracksVisible && !channelsVisible,
    onKeyDown: handlePlayerKey,
  });
  useEffect(() => {
    onUserActivityRef.current = onUserActivity;
  }, [onUserActivity]);

  const { status, streamUrl, error: sourceError } = usePlayerSource(routeParams, reloadKey);

  const sourceKey = `${routeParams.type}-${routeParams.id ?? 'unknown'}-${reloadKey}`;
  const {
    playerRef,
    state,
    togglePlay,
    jumpBy,
    handleProgress,
    handleLoad,
    handlePlaying,
    handlePaused,
    handleEnd,
    handleError,
    setSelectedAudio,
    setSelectedText,
    playerProps,
  } = useVlcPlayback({
    sourceKey,
    onProgress: (currentTime) => {
      if (!activeProfileId || !liveId) {
        return;
      }
      if (!hasMarkedViewedRef.current && currentTime >= 2) {
        hasMarkedViewedRef.current = true;
        addRecentlyViewed(activeProfileId, 'live', liveId).then(() => bumpLibrary());
      }
    },
    onEnd: () => {
      router.back();
    },
    onError: () => {
      setPlaybackError(true);
    },
  });

  useEffect(() => {
    setPlaybackError(false);
    hasMarkedViewedRef.current = false;
  }, [streamUrl]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeProfileId || !liveId) {
      setLiveEpg({ current: null, upcoming: [] });
      return;
    }

    const resolvedLiveId = liveId;
    let isCancelled = false;
    const run = async () => {
      try {
        const liveItems = await getLiveItemsByIds(activeProfileId, [resolvedLiveId]);
        const fallbackItem = {
          id: resolvedLiveId,
          title: routeParams.name ?? '',
          image: routeParams.icon ?? null,
          type: 'live' as const,
          epgChannelId: null,
        };
        let resolved = liveItems[0] ?? fallbackItem;
        if (!resolved.epgChannelId) {
          const [mapped] = await applyLiveEpg(activeProfileId, [resolved]);
          resolved = mapped ?? resolved;
        }
        const channelId = resolved.epgChannelId ?? null;
        if (!channelId) {
          if (!isCancelled) {
            setLiveEpg({ current: null, upcoming: [] });
          }
          return;
        }
        const listings = await getEpgListingsForChannels(activeProfileId, [channelId]);
        const sorted = listings
          .slice()
          .sort(
            (a, b) => (parseXmltvTimestamp(a.start) ?? 0) - (parseXmltvTimestamp(b.start) ?? 0),
          );
        const current = selectCurrentListing(sorted);
        const upcoming = selectUpcomingListings(sorted).slice(0, 8);
        if (!isCancelled) {
          setLiveEpg({ current, upcoming });
        }
      } catch {
        if (!isCancelled) {
          setLiveEpg({ current: null, upcoming: [] });
        }
      }
    };

    run();

    return () => {
      isCancelled = true;
    };
  }, [activeProfileId, liveId, routeParams.icon, routeParams.name]);

  const { isFavorite, toggleFavorite } = useFavoriteStatus('live', liveId);

  const labels = useMemo(
    () => ({
      live: t('player.labels.live'),
      play: t('player.actions.play'),
      pause: t('player.actions.pause'),
      jumpBack: t('player.actions.jumpBack'),
      jumpForward: t('player.actions.jumpForward'),
      tracks: t('player.actions.tracks'),
      episodes: t('player.actions.episodes'),
      seasons: t('player.actions.seasons'),
      favorite: t('player.actions.favorite'),
      unfavorite: t('player.actions.unfavorite'),
      noInfo: t('player.labels.noInfo'),
    }),
    [t],
  );

  const handleRetry = useCallback(() => {
    setPlaybackError(false);
    setReloadKey((prev) => prev + 1);
  }, []);

  const showError = playbackError || status === 'error';
  const errorMessage =
    sourceError === 'profile'
      ? t('player.errors.noProfile')
      : sourceError === 'params'
        ? t('player.errors.invalidParams')
        : t('player.errors.playback');

  if (showError) {
    return (
      <View className="flex-1 bg-black items-center justify-center gap-4 px-10">
        <StatusBar hidden />
        <TVFocusProvider initialFocusKey="player-retry">
          <View className="items-center gap-4">
            <Text className="text-white text-base text-center">{errorMessage}</Text>
            <View className="flex-row items-center gap-4">
              <TVFocusPressable
                focusKey="player-retry"
                onPress={handleRetry}
                unstyled
                className="rounded-full bg-white/10 px-6 py-3"
                focusClassName="bg-primary"
                accessibilityLabel={t('player.actions.retry')}
              >
                <Text className="text-white text-sm font-semibold">
                  {t('player.actions.retry')}
                </Text>
              </TVFocusPressable>
              <TVFocusPressable
                focusKey="player-exit"
                onPress={() => router.back()}
                unstyled
                className="rounded-full bg-white/10 px-6 py-3"
                focusClassName="bg-primary"
                accessibilityLabel={t('common.close')}
              >
                <Text className="text-white text-sm font-semibold">{t('common.close')}</Text>
              </TVFocusPressable>
            </View>
          </View>
        </TVFocusProvider>
      </View>
    );
  }

  if (status === 'loading' || !streamUrl) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <StatusBar hidden />
        <Text className="text-white/70 text-base">{t('player.status.loading')}</Text>
      </View>
    );
  }

  const subtitle = liveEpg.current?.title ?? null;
  const artwork = routeParams.icon ?? null;
  const liveProgress = liveEpg.current
    ? getEpgProgress(liveEpg.current.start, liveEpg.current.end, liveClock)
    : null;
  const liveTimeRange = liveEpg.current
    ? formatTimeRange(liveEpg.current.start, liveEpg.current.end)
    : null;
  const upNextItems = liveEpg.upcoming.map((item) => ({
    id: `${item.channelId}-${item.start}-${item.end}`,
    title: item.title,
    timeRange: formatTimeRange(item.start, item.end),
    durationLabel: formatProgramDuration(item.start, item.end),
    image: artwork,
    description: item.description ?? null,
  }));

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />
      <View className="flex-1">
        <VLCPlayer
          ref={playerRef}
          key={streamUrl}
          autoplay
          paused={state.paused}
          source={{ uri: streamUrl }}
          onProgress={handleProgress}
          onLoad={handleLoad}
          onPlaying={handlePlaying}
          onPaused={handlePaused}
          onEnd={handleEnd}
          onError={handleError}
          className="flex-1"
          {...playerProps}
        />
        {controlsVisible ? (
          <TVFocusProvider>
            <PlayerControls
              title={routeParams.name ?? ''}
              subtitle={subtitle}
              artwork={artwork}
              isLive
              isPaused={state.paused}
              currentTime={state.currentTime}
              duration={state.duration}
              onTogglePlay={togglePlay}
              onJumpBack={() => jumpBy(-10)}
              onJumpForward={() => jumpBy(10)}
              onShowTracks={() => setTracksVisible(true)}
              onShowEpisodes={undefined}
              onShowSeasons={undefined}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              labels={labels}
              liveProgress={liveProgress}
              liveTimeRange={liveTimeRange}
              upNextLabel={t('player.labels.upNext')}
              upNextItems={upNextItems}
              onSelectUpcoming={() => {}}
              onAnyFocus={onUserActivity}
              onAnyPress={onUserActivity}
              canPress={canPress}
            />
          </TVFocusProvider>
        ) : null}
      </View>

      <PlayerTracksModal
        visible={tracksVisible}
        audioTracks={state.audioTracks}
        textTracks={state.textTracks}
        selectedAudio={state.selectedAudio}
        selectedText={state.selectedText}
        onSelectAudio={setSelectedAudio}
        onSelectText={setSelectedText}
        onClose={() => setTracksVisible(false)}
        labels={{
          audio: t('player.actions.audio'),
          subtitles: t('player.actions.subtitles'),
          close: t('common.close'),
          unavailable: t('common.notAvailable'),
          trackFallback: t('player.labels.track'),
        }}
      />
      <PlayerChannelModal
        visible={channelsVisible}
        channels={channels.items}
        status={channels.status}
        activeChannelId={liveId}
        hasMore={channels.hasMore}
        isLoadingMore={channels.isLoadingMore}
        startIndex={channels.startIndex}
        onLoadMore={channels.loadMore}
        onSelect={(item) => {
          closeChannels();
          router.setParams({
            id: item.id,
            name: item.title,
            icon: item.image ?? undefined,
            type: 'tv',
          });
        }}
        onClose={closeChannels}
      />
    </View>
  );
}
