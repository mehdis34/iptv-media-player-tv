import { ScrollView, Text, View } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { HomeRailRow } from '@/components/home/HomeRailRow';
import { HOME_RAILS } from '@/components/home/rails';
import type { HomeContentItem, HomeRail } from '@/components/home/types';
import { useHomeRails } from '@/components/home/useHomeRails';
import { useI18n } from '@/components/i18n/I18nProvider';
import { FullscreenLoadingModal } from '@/components/ui/FullscreenLoadingModal';
import { useSyncStatusStore } from '@/hooks/useSyncStatusStore';
import { ScreenLayout } from '@/layouts/ScreenLayout';
import { VodDetailsModal } from '@/components/vod/VodDetailsModal';
import { SeriesDetailsModal } from '@/components/series/SeriesDetailsModal';
import type { SeriesItem, VodItem } from '@/storage/catalog';

const getInitialFocusKey = (rails: HomeRail[]) => {
  if (rails.length === 0) {
    return undefined;
  }

  for (const rail of rails) {
    const firstItem = rail.items[0];
    if (firstItem) {
      return `home-${rail.id}-${firstItem.id}`;
    }
    if (rail.items.length === 0) {
      return `home-${rail.id}-see-more`;
    }
  }

  return undefined;
};

const getRouteForItem = (item: HomeContentItem) => {
  if (item.type === 'live') {
    return '/(tabs)/live';
  }
  if (item.type === 'series') {
    return '/(tabs)/series';
  }
  return '/(tabs)/vod';
};

export function HomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { rails: loadedRails } = useHomeRails();
  const syncStatus = useSyncStatusStore((state) => state.status);
  const syncProgress = useSyncStatusStore((state) => state.progress);
  const [selectedVod, setSelectedVod] = useState<VodItem | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [isVodDetailsVisible, setVodDetailsVisible] = useState(false);
  const [isSeriesDetailsVisible, setSeriesDetailsVisible] = useState(false);

  const fallbackRails = useMemo<HomeRail[]>(
    () =>
      HOME_RAILS.map((rail) => ({
        ...rail,
        items: [],
      })),
    [],
  );

  const rails = (loadedRails.length > 0 ? loadedRails : fallbackRails).filter((rail) =>
    rail.id === 'continue-watching' || rail.id === 'favorites' || rail.id === 'recently-viewed'
      ? rail.items.length > 0
      : true,
  );
  const initialFocusKey = useMemo(() => getInitialFocusKey(rails), [rails]);

  const handleItemPress = useCallback(
    (item: HomeContentItem) => {
      if (item.type === 'vod') {
        setSelectedVod({
          id: item.id,
          title: item.title,
          image: item.image,
          categoryId: null,
        });
        setVodDetailsVisible(true);
        return;
      }
      if (item.type === 'series') {
        setSelectedSeries({
          id: item.id,
          title: item.title,
          image: item.image,
          categoryId: null,
        });
        setSeriesDetailsVisible(true);
        return;
      }
      router.push(getRouteForItem(item));
    },
    [router],
  );

  const handleSeeMorePress = useCallback(
    (rail: HomeRail) => {
      router.push(rail.seeMoreRoute);
    },
    [router],
  );

  return (
    <ScreenLayout>
      <TVFocusProvider initialFocusKey={initialFocusKey}>
        {rails.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white/70 text-lg">{t('screens.home.empty')}</Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-8 pb-6"
            showsVerticalScrollIndicator={false}
          >
            {rails.map((rail) => (
              <HomeRailRow
                key={rail.id}
                rail={rail}
                onItemPress={handleItemPress}
                onSeeMorePress={handleSeeMorePress}
              />
            ))}
          </ScrollView>
        )}
      </TVFocusProvider>
      <FullscreenLoadingModal
        visible={syncStatus === 'loading'}
        titleKey={syncProgress?.stepKey ?? 'auth.status.loadingData'}
        progress={syncProgress}
      />
      <VodDetailsModal
        visible={isVodDetailsVisible}
        item={selectedVod}
        onClose={() => setVodDetailsVisible(false)}
      />
      <SeriesDetailsModal
        visible={isSeriesDetailsVisible}
        item={selectedSeries}
        onClose={() => setSeriesDetailsVisible(false)}
      />
    </ScreenLayout>
  );
}
