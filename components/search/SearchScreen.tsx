import { FlatList, Text, View } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { useI18n } from '@/components/i18n/I18nProvider';
import { ScreenLayout } from '@/layouts/ScreenLayout';
import { TVFocusTextInput } from '@/components/focus/TVFocusTextInput';
import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { MaterialIcons } from '@/components/ui/Icons';
import { useSearchCatalog } from '@/components/search/useSearchCatalog';
import type { VodItem, SeriesItem } from '@/storage/catalog';
import { VodDetailsModal } from '@/components/vod/VodDetailsModal';
import { SeriesDetailsModal } from '@/components/series/SeriesDetailsModal';
import { HomeRailCard } from '@/components/home/HomeRailCard';
import type { HomeContentItem } from '@/components/home/types';
import { VodPosterCard } from '@/components/vod/VodPosterCard';
import { SeriesPosterCard } from '@/components/series/SeriesPosterCard';

export function SearchScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const {
    status,
    liveResults,
    vodResults,
    seriesResults,
    suggestedLive,
    suggestedVod,
    suggestedSeries,
  } = useSearchCatalog(query);
  const [selectedVod, setSelectedVod] = useState<VodItem | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [isVodDetailsVisible, setVodDetailsVisible] = useState(false);
  const [isSeriesDetailsVisible, setSeriesDetailsVisible] = useState(false);

  const isQueryActive = query.trim().length > 0;
  const liveItems = isQueryActive ? liveResults : suggestedLive;
  const mediaItems = useMemo(
    () => [
      ...(isQueryActive ? vodResults : suggestedVod).map((item) => ({
        type: 'vod' as const,
        item,
      })),
      ...(isQueryActive ? seriesResults : suggestedSeries).map((item) => ({
        type: 'series' as const,
        item,
      })),
    ],
    [isQueryActive, seriesResults, suggestedSeries, suggestedVod, vodResults],
  );

  const hasResults = liveItems.length > 0 || mediaItems.length > 0;

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  const handleLivePress = useCallback(
    (_item: HomeContentItem) => {
      router.push('/(tabs)/live');
    },
    [router],
  );

  const handleMediaPress = useCallback(
    (entry: { type: 'vod' | 'series'; item: VodItem | SeriesItem }) => {
      if (entry.type === 'vod') {
        setSelectedVod(entry.item as VodItem);
        setVodDetailsVisible(true);
        return;
      }
      setSelectedSeries(entry.item as SeriesItem);
      setSeriesDetailsVisible(true);
    },
    [],
  );

  const suggestionItems = useMemo(() => mediaItems.slice(0, 8), [mediaItems]);
  const suggestionTitle = isQueryActive ? t('search.sections.media') : t('search.suggestions');

  return (
    <ScreenLayout contentClassName="gap-0">
      <TVFocusProvider initialFocusKey="search-input">
        <View className="flex-1 flex-row gap-10">
          <View className="w-96 gap-8">
            <View className="gap-3">
              <Text className="text-white text-3xl font-semibold">{t('screens.search.title')}</Text>
              <View className="flex-row items-center gap-3">
                <TVFocusTextInput
                  focusKey="search-input"
                  value={query}
                  autoCapitalize={'none'}
                  onChangeText={setQuery}
                  placeholder={t('search.placeholder')}
                  className="flex-1 text-lg placeholder:text-white/60"
                  focusClassName="border-primary bg-white/20"
                  returnKeyType="search"
                />
                {query.length > 0 ? (
                  <TVFocusPressable
                    focusKey="search-clear"
                    onPress={handleClear}
                    unstyled
                    className="h-12 w-12 items-center justify-center rounded-md border border-white/10 bg-white/5"
                    focusClassName="bg-primary border-primary"
                    accessibilityLabel={t('search.clear')}
                  >
                    <MaterialIcons name="close" size={22} className="text-white" />
                  </TVFocusPressable>
                ) : (
                  <View className="h-12 w-12" />
                )}
              </View>
              <Text className="text-white/60 text-sm">{t('search.hint')}</Text>
            </View>
            {suggestionItems.length > 0 ? (
              <View className="gap-3">
                <Text className="text-white/80 text-sm font-semibold">{suggestionTitle}</Text>
                <FlatList
                  data={suggestionItems}
                  keyExtractor={(entry) => `${entry.type}-${entry.item.id}-suggestion`}
                  renderItem={({ item: entry }) => (
                    <Text className="text-white/70 text-sm" numberOfLines={1}>
                      {entry.item.title}
                    </Text>
                  )}
                  ItemSeparatorComponent={() => <View className="h-2" />}
                  scrollEnabled={false}
                />
              </View>
            ) : null}
          </View>
          <View className="flex-1">
            <FlatList
              data={mediaItems}
              keyExtractor={(entry) => `${entry.type}-${entry.item.id}`}
              contentContainerClassName="gap-6 pb-16 pr-0"
              ListHeaderComponent={
                liveItems.length > 0 ? (
                  <View className="gap-4 pb-4">
                    <FlatList
                      data={liveItems}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <HomeRailCard
                          item={item}
                          focusKey={`search-live-${item.id}`}
                          onPress={() => handleLivePress(item)}
                        />
                      )}
                      numColumns={3}
                      columnWrapperClassName="gap-6"
                      contentContainerClassName="gap-6 pr-0"
                      scrollEnabled={false}
                    />
                  </View>
                ) : null
              }
              renderItem={({ item: entry }) =>
                entry.type === 'vod' ? (
                  <VodPosterCard
                    item={entry.item}
                    focusKey={`search-media-${entry.type}-${entry.item.id}`}
                    onPress={() => handleMediaPress(entry)}
                  />
                ) : (
                  <SeriesPosterCard
                    item={entry.item}
                    focusKey={`search-media-${entry.type}-${entry.item.id}`}
                    onPress={() => handleMediaPress(entry)}
                  />
                )
              }
              numColumns={3}
              columnWrapperClassName="gap-6"
              ListEmptyComponent={
                status === 'ready' && !hasResults ? (
                  <View className="flex-1 items-center justify-center py-10">
                    <Text className="text-white text-lg font-semibold text-center">
                      {t('search.emptyTitle')}
                    </Text>
                    <Text className="text-white/70 text-base text-center">
                      {t('search.emptySubtitle')}
                    </Text>
                  </View>
                ) : null
              }
              showsVerticalScrollIndicator={false}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={7}
              removeClippedSubviews
            />
          </View>
        </View>
      </TVFocusProvider>
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
