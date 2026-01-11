import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Text, View, useTVEventHandler } from 'react-native';
import KeyEvent from 'react-native-keyevent';

import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PlayerControls } from '@/components/player/PlayerControls';
import { PlayerEpisodesModal, type EpisodeEntry } from '@/components/player/PlayerEpisodesModal';
import { PlayerChannelModal } from '@/components/player/PlayerChannelModal';
import { PlayerTracksModal } from '@/components/player/PlayerTracksModal';
import {
  usePlayerSource,
  type PlayerRouteParams,
  type PlayerType,
} from '@/components/player/usePlayerSource';
import { useLiveChannelsList } from '@/components/player/useLiveChannelsList';
import { useVlcPlayback } from '@/components/player/useVlcPlayback';
import { VLCPlayer } from '@/components/ui/VlcPlayer';
import { useFavoriteStatus } from '@/hooks/useFavoriteStatus';
import { useLibraryRefreshStore } from '@/hooks/useLibraryRefreshStore';
import { usePortalStore } from '@/hooks/usePortalStore';
import {
  addRecentlyViewed,
  removeContinueWatching,
  upsertContinueWatching,
} from '@/storage/library';
import { VodSelectionModal } from '@/components/vod/VodSelectionModal';
import { useSeriesDetails } from '@/components/series/useSeriesDetails';
import {
  getEpgListingsForChannels,
  getLiveItemsByIds,
  type HomeCatalogItem,
  type HomeEpgListing,
} from '@/storage/catalog';
import { applyLiveEpg } from '@/components/epg/applyLiveEpg';
import { getEpgProgress } from '@/components/home/epgTime';

const resolveParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? null;
};

const resolvePlayerType = (value?: string | string[]): PlayerType => {
  const raw = resolveParam(value);
  if (raw === 'vod') {
    return 'vod';
  }
  if (raw === 'series') {
    return 'series';
  }
  if (raw === 'tv') {
    return 'live';
  }
  return 'live';
};

const resolveEpisodeTitle = (
  title: string | null,
  number: number | null,
  fallback: string,
  labelFormatter: (value: number) => string,
) => {
  if (title && title.trim().length > 0) {
    return title;
  }
  if (number != null) {
    return labelFormatter(number);
  }
  return fallback;
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

export function PlayerScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams();
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const bumpLibrary = useLibraryRefreshStore((store) => store.bump);
  const lastLibraryUpdateRef = useRef(0);
  const hasMarkedViewedRef = useRef(false);
  const hasStartSeekRef = useRef(false);

  const routeParams: PlayerRouteParams = useMemo(
    () => ({
      id: resolveParam(params.id),
      type: resolvePlayerType(params.type),
      name: resolveParam(params.name),
      ext: resolveParam(params.ext),
      seriesId: resolveParam(params.seriesId),
      season: resolveParam(params.season),
      start: resolveParam(params.start),
      icon: resolveParam(params.icon),
    }),
    [params],
  );

  const [reloadKey, setReloadKey] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const [tracksVisible, setTracksVisible] = useState(false);
  const [episodesVisible, setEpisodesVisible] = useState(false);
  const [seasonPickerVisible, setSeasonPickerVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsVisibleRef = useRef(true);
  const [channelsVisible, setChannelsVisible] = useState(false);
  const channelsVisibleRef = useRef(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [returnToEpisodes, setReturnToEpisodes] = useState(false);
  const [liveEpg, setLiveEpg] = useState<{
    current: HomeEpgListing | null;
    upcoming: HomeEpgListing[];
  }>({ current: null, upcoming: [] });
  const [liveClock, setLiveClock] = useState(() => Date.now());

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
    onProgress: (currentTime, duration) => {
      if (!activeProfileId) {
        return;
      }
      const itemType = routeParams.type;
      const itemId =
        itemType === 'series' ? (routeParams.seriesId ?? routeParams.id) : routeParams.id;
      if (!itemId || duration <= 0 || currentTime <= 0) {
        return;
      }
      if (!hasMarkedViewedRef.current && currentTime >= 2) {
        hasMarkedViewedRef.current = true;
        addRecentlyViewed(activeProfileId, itemType, itemId).then(() => bumpLibrary());
      }
      if (routeParams.type === 'live') {
        return;
      }
      if (currentTime < 60) {
        return;
      }
      const progress = currentTime / duration;
      const now = Date.now();
      if (progress >= 0.95) {
        removeContinueWatching(activeProfileId, itemType, itemId).then(() => bumpLibrary());
        return;
      }
      if (now - lastLibraryUpdateRef.current < 5000) {
        return;
      }
      lastLibraryUpdateRef.current = now;
      upsertContinueWatching(activeProfileId, itemType, itemId, currentTime, duration).then(() =>
        bumpLibrary(),
      );
    },
    onEnd: () => {
      if (routeParams.type !== 'series') {
        router.back();
        return;
      }
      if (nextEpisode?.episodeId) {
        handlePlayEpisode(nextEpisode);
        return;
      }
      if (nextSeasonEpisode?.episodeId) {
        handlePlayEpisode(nextSeasonEpisode);
        return;
      }
      router.back();
    },
    onError: () => {
      setPlaybackError(true);
    },
  });

  const isLive = routeParams.type === 'live';
  const isSeries = routeParams.type === 'series';

  const liveChannels = useLiveChannelsList(isLive && channelsVisible, routeParams.id ?? null);
  const liveChannelItems = liveChannels?.items ?? [];

  useEffect(() => {
    setPlaybackError(false);
    hasMarkedViewedRef.current = false;
    hasStartSeekRef.current = false;
    lastLibraryUpdateRef.current = 0;
  }, [streamUrl]);

  useEffect(() => {
    controlsVisibleRef.current = controlsVisible;
  }, [controlsVisible]);

  useEffect(() => {
    channelsVisibleRef.current = channelsVisible;
  }, [channelsVisible]);

  const scheduleControlsHide = useCallback((forceVisible: boolean) => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (forceVisible && !controlsVisibleRef.current) {
      setControlsVisible(true);
    }
    hideControlsTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  }, []);

  const handleControlsFocus = useCallback(() => {
    scheduleControlsHide(false);
  }, [scheduleControlsHide]);

  const handleControlsPress = useCallback(() => {
    scheduleControlsHide(true);
  }, [scheduleControlsHide]);

  const handleControlsBack = useCallback(() => {
    if (channelsVisibleRef.current) {
      setChannelsVisible(false);
      return;
    }
    if (controlsVisibleRef.current) {
      setControlsVisible(false);
      return;
    }
    router.back();
  }, [router]);

  useEffect(() => {
    if (!streamUrl) {
      return;
    }
    scheduleControlsHide(true);
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [scheduleControlsHide, streamUrl]);

  useTVEventHandler((event) => {
    if (event.eventType === 'select') {
      scheduleControlsHide(true);
    }
  });

  useEffect(() => {
    const handleKeyDown = (event: { keyCode: number }) => {
      const keyCode = event?.keyCode ?? -1;
      if (keyCode === 23 || keyCode === 66) {
        scheduleControlsHide(true);
        return;
      }
      if (keyCode === 19 || keyCode === 20 || keyCode === 21 || keyCode === 22) {
        if (channelsVisibleRef.current) {
          return;
        }
        if (isLive && !controlsVisibleRef.current) {
          handleOpenChannels();
          return;
        }
        if (controlsVisibleRef.current) {
          scheduleControlsHide(false);
        }
        return;
      }
      if (keyCode === 4) {
        if (channelsVisibleRef.current) {
          setChannelsVisible(false);
          return;
        }
        handleControlsBack();
      }
    };

    KeyEvent.onKeyDownListener(handleKeyDown);
    return () => {
      KeyEvent.removeKeyDownListener();
    };
  }, [handleControlsBack, handleOpenChannels, isLive, liveChannelItems, scheduleControlsHide]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (channelsVisibleRef.current) {
        setChannelsVisible(false);
        return true;
      }
      if (controlsVisibleRef.current) {
        setControlsVisible(false);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, []);

  const seriesId = routeParams.seriesId ?? null;
  const { info: seriesInfo } = useSeriesDetails(isSeries ? seriesId : null, { mode: 'fetch' });
  const episodesBySeason = seriesInfo?.episodes ?? {};
  const seasonOptions = useMemo(
    () =>
      (seriesInfo?.seasons ?? [])
        .slice()
        .sort((a, b) => Number(a.season_number ?? 0) - Number(b.season_number ?? 0))
        .filter((season) => {
          const key = String(season.season_number ?? '');
          return (episodesBySeason[key]?.length ?? 0) > 0;
        })
        .map((season, index) => ({
          id: String(season.season_number ?? index),
          label: t('series.episodes.seasonLabel', {
            number: season.season_number ?? index + 1,
          }),
        })),
    [episodesBySeason, seriesInfo?.seasons, t],
  );

  useEffect(() => {
    setSelectedSeasonId(null);
  }, [seriesId]);

  useEffect(() => {
    if (!isLive) {
      return;
    }
    const timer = setInterval(() => {
      setLiveClock(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, [isLive]);

  useEffect(() => {
    const channelId = routeParams.id;
    if (!isLive || !activeProfileId || !channelId) {
      setLiveEpg({ current: null, upcoming: [] });
      return;
    }

    let isCancelled = false;
    const run = async () => {
      try {
        const liveItems = await getLiveItemsByIds(activeProfileId, [channelId]);
        const fallbackItem: HomeCatalogItem = {
          id: channelId,
          title: routeParams.name ?? '',
          image: routeParams.icon ?? null,
          type: 'live' as const,
          epgChannelId: null,
        };
        const liveItem = liveItems[0] ?? fallbackItem;
        let resolved = liveItem;
        if (!resolved.epgChannelId) {
          const [mapped] = await applyLiveEpg(activeProfileId, [liveItem]);
          resolved = mapped ?? resolved;
        }
        const epgChannelId = resolved.epgChannelId ?? null;
        if (!epgChannelId) {
          if (!isCancelled) {
            setLiveEpg({ current: null, upcoming: [] });
          }
          return;
        }
        const listings = await getEpgListingsForChannels(activeProfileId, [epgChannelId]);
        const sorted = listings
          .slice()
          .sort(
            (a, b) => (parseXmltvTimestamp(a.start) ?? 0) - (parseXmltvTimestamp(b.start) ?? 0),
          );
        const now = Date.now();
        const current =
          sorted.find((listing) => {
            const start = parseXmltvTimestamp(listing.start);
            const end = parseXmltvTimestamp(listing.end);
            if (!start || !end) {
              return false;
            }
            return start <= now && end >= now;
          }) ?? null;
        const upcoming = sorted
          .filter((listing) => {
            const start = parseXmltvTimestamp(listing.start);
            return start != null && start > now;
          })
          .slice(0, 8);
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
  }, [activeProfileId, isLive, routeParams.icon, routeParams.id, routeParams.name]);

  const activeSeasonId = selectedSeasonId ?? routeParams.season ?? seasonOptions[0]?.id ?? null;
  const episodes = useMemo<EpisodeEntry[]>(() => {
    if (!activeSeasonId) {
      return [];
    }
    const seasonEpisodes = episodesBySeason[activeSeasonId] ?? [];
    return seasonEpisodes.map((episode, index) => {
      const episodeNumber = episode.episode_num != null ? Number(episode.episode_num) : index + 1;
      const episodeId = episode.id != null ? String(episode.id) : null;
      const resolvedId = episodeId ?? `${activeSeasonId}-${index}`;
      return {
        id: resolvedId,
        title: resolveEpisodeTitle(
          episode.title ?? null,
          Number.isFinite(episodeNumber) ? episodeNumber : null,
          t('series.episodes.episodeFallback'),
          (value) => t('series.episodes.episodeLabel', { number: value }),
        ),
        image: episode.info?.movie_image ?? null,
        episodeId,
        seasonId: activeSeasonId,
        containerExtension: episode.container_extension ?? 'mp4',
      };
    });
  }, [activeSeasonId, episodesBySeason, t]);

  const episodesById = useMemo(
    () => new Map(episodes.map((episode) => [episode.id, episode])),
    [episodes],
  );
  const currentEpisodeIndex = useMemo(() => {
    if (!routeParams.id) {
      return -1;
    }
    return episodes.findIndex((episode) => episode.episodeId === routeParams.id);
  }, [episodes, routeParams.id]);
  const nextEpisode = currentEpisodeIndex >= 0 ? (episodes[currentEpisodeIndex + 1] ?? null) : null;
  const nextSeasonEpisode = useMemo(() => {
    if (!activeSeasonId) {
      return null;
    }
    const seasonIndex = seasonOptions.findIndex((season) => season.id === activeSeasonId);
    if (seasonIndex < 0) {
      return null;
    }
    const nextSeason = seasonOptions[seasonIndex + 1];
    if (!nextSeason) {
      return null;
    }
    const nextSeasonEpisodes = episodesBySeason[nextSeason.id] ?? [];
    const nextEpisodeEntry = nextSeasonEpisodes[0];
    if (!nextEpisodeEntry?.id) {
      return null;
    }
    return {
      id: String(nextEpisodeEntry.id),
      title: resolveEpisodeTitle(
        nextEpisodeEntry.title ?? null,
        null,
        t('series.episodes.episodeFallback'),
        (value) => t('series.episodes.episodeLabel', { number: value }),
      ),
      image: nextEpisodeEntry.info?.movie_image ?? null,
      episodeId: String(nextEpisodeEntry.id),
      seasonId: nextSeason.id,
      containerExtension: nextEpisodeEntry.container_extension ?? 'mp4',
    } as EpisodeEntry;
  }, [activeSeasonId, episodesBySeason, seasonOptions, t]);

  const handlePlayEpisode = useCallback(
    (episode: EpisodeEntry) => {
      if (!episode.episodeId) {
        return;
      }
      router.setParams({
        id: episode.episodeId,
        type: 'series',
        ext: episode.containerExtension ?? 'mp4',
        seriesId: routeParams.seriesId ?? undefined,
        season: episode.seasonId ?? undefined,
      });
      setEpisodesVisible(false);
    },
    [routeParams.seriesId, router],
  );

  const favoriteId =
    routeParams.type === 'series' ? (routeParams.seriesId ?? routeParams.id) : routeParams.id;
  const { isFavorite, toggleFavorite } = useFavoriteStatus(
    routeParams.type === 'live' ? 'live' : routeParams.type === 'series' ? 'series' : 'vod',
    favoriteId,
  );

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
      close: t('common.close'),
      noInfo: t('player.labels.noInfo'),
    }),
    [t],
  );

  const handleRetry = useCallback(() => {
    setPlaybackError(false);
    setReloadKey((prev) => prev + 1);
  }, []);

  const handleOpenEpisodes = useCallback(() => {
    setEpisodesVisible(true);
  }, []);

  const handleOpenSeasons = useCallback(() => {
    setReturnToEpisodes(true);
    setEpisodesVisible(false);
    setSeasonPickerVisible(true);
  }, []);

  const handleCloseSeasonPicker = useCallback(() => {
    setSeasonPickerVisible(false);
    if (returnToEpisodes) {
      setReturnToEpisodes(false);
      setEpisodesVisible(true);
    }
  }, [returnToEpisodes]);

  const handleOpenChannels = useCallback(() => {
    if (!isLive) {
      return;
    }
    setControlsVisible(false);
    setChannelsVisible(true);
  }, [isLive]);

  const handleSelectChannel = useCallback(
    (item: { id: string; title: string; image?: string | null }) => {
      setChannelsVisible(false);
      router.setParams({
        id: item.id,
        type: 'live',
        name: item.title,
        icon: item.image ?? undefined,
      });
    },
    [router],
  );

  useEffect(() => {
    if (!routeParams.start || routeParams.type === 'live') {
      return;
    }
    if (hasStartSeekRef.current) {
      return;
    }
    if (state.duration <= 0) {
      return;
    }
    const startSeconds = Number(routeParams.start);
    if (!Number.isFinite(startSeconds)) {
      return;
    }
    const ratio = Math.min(0.99, Math.max(0, startSeconds / state.duration));
    playerRef.current?.seek(ratio);
    hasStartSeekRef.current = true;
  }, [playerRef, routeParams.start, state.duration]);

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

  const title = routeParams.name ?? '';
  const subtitle =
    isSeries && currentEpisodeIndex >= 0
      ? (episodes[currentEpisodeIndex]?.title ?? null)
      : isLive
        ? (liveEpg.current?.title ?? null)
        : null;
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
        <TVFocusProvider
          initialFocusKey={
            channelsVisible ? null : controlsVisible ? 'player-toggle' : 'player-surface'
          }
        >
          <TVFocusPressable
            focusKey="player-surface"
            focusable={!controlsVisible && !channelsVisible}
            pointerEvents={controlsVisible || channelsVisible ? 'none' : 'auto'}
            onPress={handleControlsPress}
            unstyled
            className="absolute inset-0"
            focusClassName="border-2 border-primary"
          />
          {controlsVisible ? (
            <PlayerControls
              title={title}
              subtitle={subtitle}
              artwork={artwork}
              isLive={isLive}
              isPaused={state.paused}
              currentTime={state.currentTime}
              duration={state.duration}
              onTogglePlay={togglePlay}
              onJumpBack={() => jumpBy(-10)}
              onJumpForward={() => jumpBy(10)}
              onShowTracks={() => setTracksVisible(true)}
              onShowEpisodes={isSeries ? handleOpenEpisodes : undefined}
              onShowSeasons={isSeries ? handleOpenSeasons : undefined}
              onBack={handleControlsBack}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              labels={labels}
              onAnyFocus={handleControlsFocus}
              onAnyPress={handleControlsPress}
              liveProgress={isLive ? liveProgress : null}
              liveTimeRange={isLive ? liveTimeRange : null}
              upNextLabel={isLive ? t('player.labels.upNext') : undefined}
              upNextItems={isLive ? upNextItems : undefined}
              onSelectUpcoming={() => {}}
            />
          ) : null}
        </TVFocusProvider>
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

      {isSeries ? (
        <PlayerEpisodesModal
          visible={episodesVisible}
          episodes={episodes}
          activeEpisodeId={routeParams.id ?? null}
          onSelectEpisode={(episodeId) => {
            const episode = episodesById.get(episodeId);
            if (!episode) {
              return;
            }
            handlePlayEpisode(episode);
          }}
          onClose={() => setEpisodesVisible(false)}
          onShowSeasons={handleOpenSeasons}
          labels={{
            episodes: t('player.actions.episodes'),
            seasons: t('player.actions.seasons'),
            empty: t('series.episodes.empty'),
            close: t('common.close'),
          }}
        />
      ) : null}

      {isSeries ? (
        <VodSelectionModal
          visible={seasonPickerVisible}
          titleKey="series.episodes.selectSeason"
          options={seasonOptions.map((option) => ({
            id: option.id,
            label: option.label,
          }))}
          selectedId={activeSeasonId}
          onSelect={(value) => {
            if (value != null) {
              setSelectedSeasonId(value);
            }
          }}
          onClose={handleCloseSeasonPicker}
        />
      ) : null}

      {isLive ? (
        <PlayerChannelModal
          visible={channelsVisible}
          channels={liveChannels.items}
          status={liveChannels.status}
          activeChannelId={routeParams.id ?? null}
          hasMore={liveChannels.hasMore}
          isLoadingMore={liveChannels.isLoadingMore}
          startIndex={liveChannels.startIndex}
          onLoadMore={liveChannels.loadMore}
          onSelect={handleSelectChannel}
          onClose={() => setChannelsVisible(false)}
        />
      ) : null}
    </View>
  );
}
