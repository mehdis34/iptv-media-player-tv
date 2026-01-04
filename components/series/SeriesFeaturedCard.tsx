import { Text, View } from 'react-native';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/fr';
import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { Image } from '@/components/ui/ExpoImage';
import { cn } from '@/components/ui/cn';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useSeriesDetails } from '@/components/series/useSeriesDetails';
import type { SeriesItem } from '@/storage/catalog';
import { MaterialIcons } from '@/components/ui/Icons';
import { truncate } from '@/components/ui/utils';
import { useFavoriteStatus } from '@/hooks/useFavoriteStatus';

dayjs.extend(localizedFormat);

type SeriesFeaturedCardProps = {
  item: SeriesItem;
  focusKey: string;
};

const resolveBackdrop = (value?: string[] | string | null) => {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
};

export function SeriesFeaturedCard({
  item,
  focusKey,
}: SeriesFeaturedCardProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { status, info } = useSeriesDetails(item.id);
  const { isFavorite, toggleFavorite } = useFavoriteStatus('series', item.id);
  const details = info?.info;
  const fallback = t('common.notAvailable');

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

  const releaseDate =
    formatReleaseDate(details?.releaseDate ?? details?.releasedate) ?? fallback;
  const genre = details?.genre ?? fallback;
  const synopsis = details?.plot ?? fallback;
  const cover = resolveBackdrop(details?.backdrop_path) ?? item.image ?? undefined;
  const firstEpisode = useMemo(() => {
    const episodesBySeason = info?.episodes ?? {};
    const sortedSeasons = (info?.seasons ?? [])
      .slice()
      .sort((a, b) => Number(a.season_number ?? 0) - Number(b.season_number ?? 0))
      .map((season, index) => String(season.season_number ?? index));

    const resolveFirstEpisode = (seasonId: string) => {
      const entries = episodesBySeason[seasonId] ?? [];
      if (entries.length === 0) {
        return null;
      }
      const firstEntry = entries[0];
      if (!firstEntry?.id) {
        return null;
      }
      return {
        episodeId: String(firstEntry.id),
        seasonId,
        containerExtension: firstEntry.container_extension ?? null,
        image: firstEntry.info?.movie_image ?? null,
      };
    };

    for (const seasonId of sortedSeasons) {
      const resolved = resolveFirstEpisode(seasonId);
      if (resolved) {
        return resolved;
      }
    }

    const fallbackKeys = Object.keys(episodesBySeason).sort(
      (a, b) => Number(a) - Number(b),
    );
    for (const seasonId of fallbackKeys) {
      const resolved = resolveFirstEpisode(seasonId);
      if (resolved) {
        return resolved;
      }
    }
    return null;
  }, [info?.episodes, info?.seasons]);

  const handlePlay = useCallback(() => {
    if (!firstEpisode?.episodeId) {
      return;
    }
    router.push({
      pathname: '/player/[id]',
      params: {
        id: firstEpisode.episodeId,
        type: 'series',
        name: item.title,
        ext: firstEpisode.containerExtension ?? undefined,
        seriesId: item.id,
        season: firstEpisode.seasonId ?? undefined,
        icon: firstEpisode.image ?? item.image ?? undefined,
      },
    });
  }, [firstEpisode, item.id, item.image, item.title, router]);

  return (
    <View className="relative h-[60vh] w-full overflow-hidden rounded-2xl bg-white/10 border-white/10 border">
      {status === 'ready' && (
        <>
          {cover ? (
            <Image source={{ uri: cover }} className="h-full w-full" contentFit="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center px-6">
              <Text className="text-white/80 text-base text-center">{item.title}</Text>
            </View>
          )}
          <View className="absolute w-full top-0 bottom-0 p-6 bg-black/70 flex flex-col justify-end">
            <View className={'flex flex-row items-start gap-6'}>
              <View className="h-44 w-28 rounded-lg mt-1 bg-white/10">
                {item.image && (
                  <Image
                    source={{ uri: item.image }}
                    className="h-full w-full rounded-lg"
                    contentFit="cover"
                  />
                )}
              </View>
              <View className={'flex-1 gap-3'}>
                <Text className="text-white text-2xl font-semibold" numberOfLines={2}>
                  {item.title}
                </Text>
                <View className={'gap-1'}>
                  <Text className="text-white text-sm font-semibold">
                    {releaseDate} • {genre}
                  </Text>
                  {synopsis && (
                    <Text className="text-white/80 text-sm max-w-xl" numberOfLines={3}>
                      {truncate(synopsis, 300)}
                    </Text>
                  )}
                </View>
                <View className={'flex flex-row gap-3 mt-2'}>
                  <TVFocusPressable
                    focusKey={focusKey}
                    onPress={handlePlay}
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
                </View>
              </View>
            </View>
          </View>
        </>
      )}
      <View
        pointerEvents="none"
        className={cn(
          'absolute inset-0 rounded-2xl border-2 border-transparent',
          'group-focus:border-primary',
        )}
      />
    </View>
  );
}
