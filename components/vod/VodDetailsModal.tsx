import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/fr';
import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { useI18n } from '@/components/i18n/I18nProvider';
import { Image } from '@/components/ui/ExpoImage';
import { useVodDetails } from '@/components/vod/useVodDetails';
import { useVodSimilar } from '@/components/vod/useVodSimilar';
import type { VodItem } from '@/storage/catalog';
import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { FontAwesome, MaterialIcons } from '@/components/ui/Icons';
import { VodPosterCard } from '@/components/vod/VodPosterCard';
import { LinearGradient } from 'expo-linear-gradient';

dayjs.extend(localizedFormat);

const normalizeTrailerValue = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

type VodDetailsModalProps = {
  visible: boolean;
  item: VodItem | null;
  onClose: () => void;
};

const parseDurationToMinutes = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 3600 ? Math.round(value / 60) : Math.round(value);
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  const hmsMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hmsMatch) {
    const hours = Number(hmsMatch[1] ?? 0);
    const minutes = Number(hmsMatch[2] ?? 0);
    const seconds = Number(hmsMatch[3] ?? 0);
    return hours * 60 + minutes + Math.round(seconds / 60);
  }
  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    return numeric >= 3600 ? Math.round(numeric / 60) : Math.round(numeric);
  }
  return null;
};

const formatDuration = (value: unknown) => {
  const minutes = parseDurationToMinutes(value);
  if (minutes == null) {
    return null;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours > 0) {
    return remaining > 0 ? `${hours}h${remaining}m` : `${hours}h`;
  }
  return `${remaining}m`;
};

export function VodDetailsModal({ visible, item, onClose }: VodDetailsModalProps) {
  const { t, locale } = useI18n();
  const [activeItem, setActiveItem] = useState<VodItem | null>(item);

  useEffect(() => {
    setActiveItem(item);
  }, [item]);

  const vodId = activeItem?.id ?? null;
  const { status, info } = useVodDetails(vodId, { mode: 'fetch' });
  const details = info?.info;
  const fallback = t('common.notAvailable');
  const isLoading = status === 'loading';
  const similarCategoryId = activeItem?.categoryId ?? null;
  const { status: similarStatus, items: similarItems } = useVodSimilar(
    similarCategoryId,
    activeItem?.id ?? null,
    20,
  );
  const formatReleaseDate = (value?: string | null) => {
    if (!value) {
      return null;
    }
    const parsed = dayjs(value);
    if (!parsed.isValid()) {
      return null;
    }
    return parsed.locale(locale === 'fr' ? 'fr' : 'en').format('YYYY');
  };
  const releaseDate = isLoading
    ? t('common.loading')
    : (formatReleaseDate(details?.releasedate) ?? fallback);
  const synopsis = isLoading ? t('common.loading') : (details?.plot ?? fallback);
  const title = isLoading ? (activeItem?.title ?? '') : (details?.name ?? activeItem?.title ?? '');
  const image = isLoading
    ? (activeItem?.image ?? null)
    : (details?.cover_big ?? details?.movie_image ?? activeItem?.image ?? null);
  const cover = isLoading
    ? (activeItem?.image ?? undefined)
    : (details?.backdrop_path?.[0] ?? image ?? undefined);
  const rawDuration = details?.duration ?? null;
  const duration = isLoading ? t('common.loading') : (formatDuration(rawDuration) ?? fallback);
  const trailerValue = normalizeTrailerValue(
    isLoading ? null : (details?.trailer ?? details?.youtube_trailer ?? null),
  );
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

  const handleSelectSimilar = useCallback((next: VodItem) => {
    setActiveItem(next);
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
            <LinearGradient
              className="absolute inset-0"
              colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.4)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <TVFocusProvider initialFocusKey="vod-details-play">
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
                        {releaseDate} • {duration}
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
                      focusKey={'vod-details-play'}
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
                        Lecture
                      </Text>
                    </TVFocusPressable>
                    <TVFocusPressable
                      unstyled
                      className="group items-center flex flex-row justify-between rounded-lg bg-white/10 py-2 px-6 gap-1"
                      focusClassName="bg-primary"
                    >
                      <MaterialIcons name={'add'} className="text-white group-focus:" size={24} />
                      <Text className="text-base font-semibold text-white group-focus:text-white">
                        Ma liste
                      </Text>
                    </TVFocusPressable>
                    {hasTrailer && (
                      <TVFocusPressable
                        focusKey={'vod-details-trailer'}
                        onPress={handleOpenTrailer}
                        unstyled
                        className={'group items-center rounded-lg bg-white/10 py-2 px-6'}
                        focusClassName={'bg-primary'}
                      >
                        <View className={'flex-row items-center gap-2'}>
                          <FontAwesome
                            name={'youtube-play'}
                            className={'text-primary group-focus:text-white'}
                            size={18}
                          />
                          <Text
                            className={'text-base font-semibold text-white group-focus:text-white'}
                          >
                            {t('vod.actions.trailer')}
                          </Text>
                        </View>
                      </TVFocusPressable>
                    )}
                  </View>
                  <View className={'gap-1'}>
                    {!isLoading && details?.actors ? (
                      <Text className="text-white/70 text-base">
                        {t('vod.fields.casting')} : {details.actors}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View className="gap-3">
                  <Text className="text-white text-lg font-semibold px-10">
                    {t('vod.details.similarTitle')}
                  </Text>
                  {similarStatus === 'loading' ? (
                    <Text className="text-white/70 text-sm px-10">{t('common.loading')}</Text>
                  ) : similarStatus === 'error' ? (
                    <Text className="text-primary text-sm px-10">
                      {t('auth.errors.syncFailed')}
                    </Text>
                  ) : similarItems.length === 0 ? (
                    <Text className="text-white/70 text-sm px-10">
                      {t('vod.details.similarEmpty')}
                    </Text>
                  ) : (
                    <FlatList
                      data={similarItems}
                      keyExtractor={(similar) => similar.id}
                      renderItem={({ item: similar }) => (
                        <VodPosterCard
                          item={similar}
                          focusKey={`vod-details-similar-${similar.id}`}
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
    </Modal>
  );
}
