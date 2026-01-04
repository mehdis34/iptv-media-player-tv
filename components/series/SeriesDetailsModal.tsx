import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/fr';

import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { useI18n } from '@/components/i18n/I18nProvider';
import { Image } from '@/components/ui/ExpoImage';
import { useSeriesDetails } from '@/components/series/useSeriesDetails';
import { useSeriesSimilar } from '@/components/series/useSeriesSimilar';
import type { SeriesItem } from '@/storage/catalog';
import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { FontAwesome, MaterialIcons } from '@/components/ui/Icons';
import { SeriesPosterCard } from '@/components/series/SeriesPosterCard';
import { useFavoriteStatus } from '@/hooks/useFavoriteStatus';
import { VodSelectionModal } from '@/components/vod/VodSelectionModal';

dayjs.extend(localizedFormat);

const normalizeTrailerValue = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveBackdrop = (value?: string[] | string | null) => {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
};

type SeriesDetailsModalProps = {
  visible: boolean;
  item: SeriesItem | null;
  onClose: () => void;
};

type EpisodeItem = {
  id: string;
  title: string;
  image: string | null;
  episodeNumber: number | null;
};

const EpisodeCard = ({
  episode,
  focusKey,
  onPress,
}: {
  episode: EpisodeItem;
  focusKey: string;
  onPress: () => void;
}) => (
  <TVFocusPressable
    focusKey={focusKey}
    onPress={onPress}
    unstyled
    className="group relative w-44 overflow-visible"
    focusClassName=""
  >
    <View className="gap-2">
      <View className="relative h-24 w-44 overflow-hidden rounded-md bg-white/10">
        {episode.image ? (
          <Image source={{ uri: episode.image }} className="h-full w-full" contentFit="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center px-2">
            <Text className="text-white/70 text-xs text-center" numberOfLines={2}>
              {episode.title}
            </Text>
          </View>
        )}
        <View
          pointerEvents="none"
          className="absolute inset-0 rounded-md border-2 border-transparent group-focus:border-primary"
        />
      </View>
      <Text className="text-white text-sm font-semibold" numberOfLines={2}>
        {episode.title}
      </Text>
    </View>
  </TVFocusPressable>
);

export function SeriesDetailsModal({ visible, item, onClose }: SeriesDetailsModalProps) {
  const { t, locale } = useI18n();
  const [activeItem, setActiveItem] = useState<SeriesItem | null>(item);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [isSeasonModalVisible, setSeasonModalVisible] = useState(false);

  useEffect(() => {
    setActiveItem(item);
  }, [item]);

  const seriesId = activeItem?.id ?? null;
  const resolveEpisodeTitle = useCallback(
    (title?: string | null, number?: number | null) => {
      if (title && title.trim().length > 0) {
        return title;
      }
      if (number != null) {
        return t('series.episodes.episodeLabel', { number });
      }
      return t('series.episodes.episodeFallback');
    },
    [t],
  );

  useEffect(() => {
    setSelectedSeasonId(null);
  }, [seriesId]);
  const { status, info } = useSeriesDetails(seriesId, { mode: 'fetch' });
  const details = info?.info;
  const fallback = t('common.notAvailable');
  const isLoading = status === 'loading';
  const { isFavorite, toggleFavorite } = useFavoriteStatus('series', seriesId);
  const similarCategoryId =
    activeItem?.categoryId ??
    (details?.category_id != null ? String(details.category_id) : null);
  const { status: similarStatus, items: similarItems } = useSeriesSimilar(
    similarCategoryId,
    activeItem?.id ?? null,
    20,
  );
  const formatReleaseDate = (value?: string | null) => {
    if (!value) {
      return null;
    }
    const cleaned = value.split(' ')[0] ?? value;
    const parsed = dayjs(cleaned);
    if (!parsed.isValid()) {
      return null;
    }
    return parsed.locale(locale === 'fr' ? 'fr' : 'en').format('YYYY');
  };
  const releaseDate = isLoading
    ? t('common.loading')
    : (formatReleaseDate(details?.releaseDate ?? details?.releaseDate) ?? fallback);
  const synopsis = isLoading ? t('common.loading') : (details?.plot ?? fallback);
  const title = isLoading ? (activeItem?.title ?? '') : (details?.name ?? activeItem?.title ?? '');
  const image = isLoading
    ? (activeItem?.image ?? null)
    : (details?.cover_big ?? details?.cover ?? activeItem?.image ?? null);
  const cover = isLoading
    ? (activeItem?.image ?? undefined)
    : (resolveBackdrop(details?.backdrop_path) ?? image ?? undefined);
  const seasonCount = info?.seasons?.length ?? null;
  const seasonsLabel = isLoading
    ? t('common.loading')
    : seasonCount != null
      ? t(seasonCount === 1 ? 'series.fields.seasonsOne' : 'series.fields.seasons', {
          count: seasonCount,
        })
      : fallback;
  const trailerValue = normalizeTrailerValue(isLoading ? null : (details?.youtube_trailer ?? null));
  const seasonOptions = useMemo(() => {
    const episodesBySeason = info?.episodes ?? {};
    const seasons = info?.seasons ?? [];
    return seasons
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
      }));
  }, [info?.episodes, info?.seasons, t]);
  const defaultSeasonId = seasonOptions[0]?.id ?? null;
  const activeSeasonId = selectedSeasonId ?? defaultSeasonId;
  const activeSeasonLabel =
    seasonOptions.find((option) => option.id === activeSeasonId)?.label ??
    t('series.episodes.selectSeason');
  const episodes = useMemo<EpisodeItem[]>(() => {
    if (!activeSeasonId) {
      return [];
    }
    const seasonEpisodes = info?.episodes?.[activeSeasonId] ?? [];
    return seasonEpisodes.map((episode, index) => {
      const episodeNumber = episode.episode_num != null ? Number(episode.episode_num) : index + 1;
      const title = resolveEpisodeTitle(episode.title, episodeNumber);
      return {
        id: String(episode.id ?? `${activeSeasonId}-${index}`),
        title,
        image: episode.info?.movie_image ?? null,
        episodeNumber: Number.isFinite(episodeNumber) ? episodeNumber : null,
      };
    });
  }, [activeSeasonId, info?.episodes]);
  const handleSeasonPress = useCallback(() => {
    setSeasonModalVisible(true);
  }, []);
  const trailerId = useMemo(() => {
    if (!trailerValue) {
      return null;
    }
    const match =
      trailerValue.match(/[?&]v=([^&]+)/i) ||
      trailerValue.match(/youtu\.be\/([^?&]+)/i) ||
      trailerValue.match(/youtube\.com\/embed\/([^?&]+)/i);
    if (match?.[1]) {
      return match[1];
    }
    if (!/^https?:/i.test(trailerValue) && /^[a-zA-Z0-9_-]{6,}$/.test(trailerValue)) {
      return trailerValue;
    }
    return null;
  }, [trailerValue]);
  const trailerUrl = useMemo(() => {
    if (!trailerValue) {
      return null;
    }
    if (/^https?:\/\//i.test(trailerValue)) {
      return trailerValue;
    }
    if (trailerId) {
      return `https://www.youtube.com/watch?v=${trailerId}`;
    }
    return null;
  }, [trailerId, trailerValue]);
  const hasTrailer = Boolean(trailerUrl);
  const handleOpenTrailer = useCallback(() => {
    if (!trailerUrl) {
      return;
    }
    const run = async () => {
      if (trailerId) {
        const appUrl = `vnd.youtube://${trailerId}`;
        try {
          const canOpen = await Linking.canOpenURL(appUrl);
          if (canOpen) {
            await Linking.openURL(appUrl);
            return;
          }
        } catch {
          // Fall back to web URL.
        }
      }
      try {
        await Linking.openURL(trailerUrl);
      } catch {
        // ignore failures
      }
    };
    void run();
  }, [trailerId, trailerUrl]);

  const handleSelectSimilar = useCallback((next: SeriesItem) => {
    setActiveItem(next);
    setSelectedSeasonId(null);
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView className="flex-1">
        {status === 'loading' ? (
          <View className={'flex-1'}>
            <View className="absolute inset-0 bg-black" />
            <View className={'flex-1 justify-center'}>
              <ActivityIndicator size="large" className={'text-primary'} />
            </View>
          </View>
        ) : (
          <>
            {cover ? (
              <Image
                source={{ uri: cover }}
                className="absolute inset-0 h-screen w-screen"
                contentFit="cover"
              />
            ) : null}
            <View className="absolute inset-0 bg-black/70" />
            <TVFocusProvider initialFocusKey="series-details-play">
              <ScrollView
                className="flex-1"
                contentContainerClassName="gap-6 justify-center py-10"
                showsVerticalScrollIndicator={false}
              >
                <View className={'flex-row items-center gap-6 px-10'}>
                  {image && (
                    <Image
                      source={{ uri: image }}
                      className="h-36 w-24 rounded-lg"
                      contentFit="cover"
                    />
                  )}
                  <View className={'gap-2'}>
                    <Text className="text-white text-3xl max-w-md font-bold">{title}</Text>
                    <View>
                      <Text className="text-white text-base">
                        {releaseDate} • {seasonsLabel}
                      </Text>
                      {!isLoading && details?.genre ? (
                        <Text className="text-white text-base">{details.genre}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
                <View className={'gap-6 max-w-xl px-10'}>
                  <Text className="text-white/90 text-base leading-6">{synopsis}</Text>
                  <View className={'flex flex-row gap-3 mt-2'}>
                    <TVFocusPressable
                      focusKey={'series-details-play'}
                      unstyled
                      className="group items-center flex flex-row justify-between rounded-lg bg-white py-2 px-6 gap-1"
                      focusClassName="bg-primary"
                    >
                      <MaterialIcons
                        name={'play-arrow'}
                        className="text-black group-focus:text-white"
                        size={24}
                      />
                      <Text className="text-base font-semibold text-black group-focus:text-white">
                        {t('series.actions.play')}
                      </Text>
                    </TVFocusPressable>
                    <TVFocusPressable
                      onPress={toggleFavorite}
                      unstyled
                      className="group items-center flex flex-row justify-between rounded-lg bg-white/10 py-2 px-6 gap-1"
                      focusClassName="bg-primary"
                    >
                      <MaterialIcons
                        name={isFavorite ? 'check' : 'add'}
                        className="text-white group-focus:text-white"
                        size={24}
                      />
                      <Text className="text-base font-semibold text-white group-focus:text-white">
                        {t('series.actions.myListAdd')}
                      </Text>
                    </TVFocusPressable>
                    {hasTrailer && (
                      <TVFocusPressable
                        onPress={handleOpenTrailer}
                        unstyled
                        className="group items-center flex flex-row justify-between rounded-lg bg-white/10 py-2 px-6 gap-2"
                        focusClassName={'bg-primary'}
                      >
                        <FontAwesome
                          name={'youtube-play'}
                          className="text-white group-focus:text-white"
                          size={24}
                        />
                        <Text
                          className={'text-base font-semibold text-white group-focus:text-white'}
                        >
                          {t('series.actions.trailer')}
                        </Text>
                      </TVFocusPressable>
                    )}
                  </View>
                  <View className={'gap-1'}>
                    {!isLoading && details?.cast ? (
                      <Text className="text-white/70 text-base">
                        {t('series.fields.casting')} : {details.cast}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View className="gap-3">
                  {seasonOptions.length > 0 ? (
                    <View className="gap-3">
                      <View className="flex-row items-center gap-4 px-10">
                        <TVFocusPressable
                          onPress={handleSeasonPress}
                          unstyled
                          className="px-4 py-2 rounded-md border border-white/10 bg-white/5 flex-row items-center gap-1"
                          focusClassName="bg-primary border-primary"
                        >
                          <Text className="text-white text-sm font-semibold">
                            {activeSeasonLabel}
                          </Text>
                          <MaterialIcons
                            name={'keyboard-arrow-down'}
                            className={'text-white'}
                            size={20}
                          />
                        </TVFocusPressable>
                      </View>
                      {episodes.length > 0 ? (
                        <FlatList
                          data={episodes}
                          keyExtractor={(episode) => episode.id}
                          renderItem={({ item: episode }) => (
                            <EpisodeCard
                              episode={episode}
                              focusKey={`series-details-episode-${episode.id}`}
                              onPress={() => {}}
                            />
                          )}
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerClassName="gap-4 px-10"
                          initialNumToRender={6}
                          maxToRenderPerBatch={6}
                          windowSize={5}
                          removeClippedSubviews
                        />
                      ) : (
                        <Text className="text-white/70 text-sm px-10">
                          {t('series.episodes.empty')}
                        </Text>
                      )}
                    </View>
                  ) : null}
                </View>
                <View className="gap-3">
                  <Text className="text-white text-lg font-semibold px-10">
                    {t('series.details.similarTitle')}
                  </Text>
                  {similarStatus === 'loading' ? (
                    <Text className="text-white/70 text-sm px-10">{t('common.loading')}</Text>
                  ) : similarStatus === 'error' ? (
                    <Text className="text-primary text-sm px-10">
                      {t('auth.errors.syncFailed')}
                    </Text>
                  ) : similarItems.length === 0 ? (
                    <Text className="text-white/70 text-sm px-10">
                      {t('series.details.similarEmpty')}
                    </Text>
                  ) : (
                    <FlatList
                      data={similarItems}
                      keyExtractor={(similar) => similar.id}
                      renderItem={({ item: similar }) => (
                        <SeriesPosterCard
                          item={similar}
                          focusKey={`series-details-similar-${similar.id}`}
                          onPress={() => handleSelectSimilar(similar)}
                        />
                      )}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerClassName="gap-4 px-10"
                      initialNumToRender={8}
                      maxToRenderPerBatch={8}
                      windowSize={5}
                      removeClippedSubviews
                    />
                  )}
                </View>
                {status === 'error' ? (
                  <Text className="text-primary text-sm">{t('auth.errors.syncFailed')}</Text>
                ) : null}
              </ScrollView>
            </TVFocusProvider>
          </>
        )}
      </SafeAreaView>
      <VodSelectionModal
        visible={isSeasonModalVisible}
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
        onClose={() => setSeasonModalVisible(false)}
      />
    </Modal>
  );
}
