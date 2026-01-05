import { FlatList, Text, View } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';

import { useI18n } from '@/components/i18n/I18nProvider';
import { ScreenLayout } from '@/layouts/ScreenLayout';
import { TVFocusTextInput } from '@/components/focus/TVFocusTextInput';
import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { MaterialIcons } from '@/components/ui/Icons';
import { useSearchCatalog } from '@/components/search/useSearchCatalog';
import type { SeriesItem, VodItem } from '@/storage/catalog';
import { VodDetailsModal } from '@/components/vod/VodDetailsModal';
import { SeriesDetailsModal } from '@/components/series/SeriesDetailsModal';
import { HomeRailCard } from '@/components/home/HomeRailCard';
import type { HomeContentItem } from '@/components/home/types';

type SearchResultEntry =
  | { id: string; type: 'live'; homeItem: HomeContentItem }
  | { id: string; type: 'vod' | 'series'; homeItem: HomeContentItem; item: VodItem | SeriesItem };

export function SearchScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [inputQuery, setInputQuery] = useState('');
  const [previewQuery, setPreviewQuery] = useState<string | null>(null);
  const [suggestionSourceItems, setSuggestionSourceItems] = useState<
    Array<{ type: 'vod' | 'series'; item: VodItem | SeriesItem }>
  >([]);
  const suggestionBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchQuery = previewQuery ?? inputQuery;
  const {
    status,
    liveResults,
    vodResults,
    seriesResults,
    suggestedLive,
    suggestedVod,
    suggestedSeries,
  } = useSearchCatalog(searchQuery);
  const [selectedVod, setSelectedVod] = useState<VodItem | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [isVodDetailsVisible, setVodDetailsVisible] = useState(false);
  const [isSeriesDetailsVisible, setSeriesDetailsVisible] = useState(false);

  const isQueryActive = inputQuery.trim().length > 0;
  const isSearchActive = searchQuery.trim().length > 0;

  const suggestedMediaItems = useMemo(
    () => [
      ...suggestedVod.map((item) => ({
        type: 'vod' as const,
        item,
      })),
      ...suggestedSeries.map((item) => ({
        type: 'series' as const,
        item,
      })),
    ],
    [suggestedSeries, suggestedVod],
  );

  const searchedMediaItems = useMemo(
    () => [
      ...vodResults.map((item) => ({
        type: 'vod' as const,
        item,
      })),
      ...seriesResults.map((item) => ({
        type: 'series' as const,
        item,
      })),
    ],
    [seriesResults, vodResults],
  );

  const liveItems = isSearchActive ? liveResults : suggestedLive;
  const mediaItems = isSearchActive ? searchedMediaItems : suggestedMediaItems;

  const resultItems: SearchResultEntry[] = useMemo(
    () => [
      ...liveItems.map((item) => ({
        id: item.id,
        type: 'live' as const,
        homeItem: item,
      })),
      ...mediaItems.map((entry) => ({
        id: entry.item.id,
        type: entry.type,
        homeItem: {
          id: entry.item.id,
          title: entry.item.title,
          image: entry.item.image,
          type: entry.type,
        },
        item: entry.item,
      })),
    ],
    [liveItems, mediaItems],
  );

  const hasResults = resultItems.length > 0;

  useEffect(() => {
    if (previewQuery) {
      return;
    }

    if (isQueryActive) {
      setSuggestionSourceItems(searchedMediaItems);
      return;
    }

    setSuggestionSourceItems(suggestedMediaItems);
  }, [isQueryActive, previewQuery, searchedMediaItems, suggestedMediaItems]);

  useEffect(() => {
    return () => {
      if (suggestionBlurTimeoutRef.current) {
        clearTimeout(suggestionBlurTimeoutRef.current);
      }
    };
  }, []);

  const handleClear = useCallback(() => {
    setPreviewQuery(null);
    setInputQuery('');
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setPreviewQuery(null);
    setInputQuery(value);
  }, []);

  const handleLivePress = useCallback(
    (item: HomeContentItem) => {
      router.push({
        pathname: '/player/[id]' as any,
        params: {
          id: item.id,
          type: 'live',
          name: item.title,
          icon: item.image ?? undefined,
        },
      });
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

  const handleSuggestionPress = useCallback((title: string) => {
    setPreviewQuery(null);
    setInputQuery((prev) => (prev === title ? prev : title));
  }, []);

  const handleSuggestionFocus = useCallback((title: string) => {
    if (suggestionBlurTimeoutRef.current) {
      clearTimeout(suggestionBlurTimeoutRef.current);
      suggestionBlurTimeoutRef.current = null;
    }
    setPreviewQuery((prev) => (prev === title ? prev : title));
  }, []);

  const handleSuggestionBlur = useCallback(() => {
    if (suggestionBlurTimeoutRef.current) {
      clearTimeout(suggestionBlurTimeoutRef.current);
    }
    suggestionBlurTimeoutRef.current = setTimeout(() => {
      setPreviewQuery(null);
    }, 0);
  }, []);

  const suggestionItems = useMemo(() => suggestionSourceItems.slice(0, 8), [suggestionSourceItems]);
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
                  value={inputQuery}
                  autoCapitalize={'none'}
                  onChangeText={handleInputChange}
                  placeholder={t('search.placeholder')}
                  className="flex-1 text-lg placeholder:text-white/60 py-2"
                  focusClassName="border-primary bg-white/20"
                  returnKeyType="search"
                />
                {inputQuery.length > 0 ? (
                  <TVFocusPressable
                    focusKey="search-clear"
                    onPress={handleClear}
                    unstyled
                    className="h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5"
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
                  contentContainerClassName={'gap-3'}
                  keyExtractor={(entry) => `${entry.type}-${entry.item.id}-suggestion`}
                  renderItem={({ item: entry }) => (
                    <TVFocusPressable
                      focusKey={`search-suggestion-${entry.type}-${entry.item.id}`}
                      onFocus={() => handleSuggestionFocus(entry.item.title)}
                      onBlur={handleSuggestionBlur}
                      onPress={() => handleSuggestionPress(entry.item.title)}
                      unstyled
                      className="group items-start rounded-md border-none p-0"
                      accessibilityLabel={entry.item.title}
                    >
                      <Text
                        className="text-white/70 text-sm group-focus:font-semibold group-focus:text-primary"
                        numberOfLines={1}
                      >
                        {entry.item.title}
                      </Text>
                    </TVFocusPressable>
                  )}
                  ItemSeparatorComponent={() => <View className="h-2" />}
                  scrollEnabled={false}
                />
              </View>
            ) : null}
          </View>
          <View className="flex-1">
            <FlatList
              data={resultItems}
              keyExtractor={(entry) => `${entry.type}-${entry.id}`}
              contentContainerClassName="gap-6 pb-16"
              renderItem={({ item: entry }) => (
                <HomeRailCard
                  item={entry.homeItem}
                  focusKey={`search-result-${entry.type}-${entry.id}`}
                  onPress={() => {
                    if (entry.type === 'live') {
                      handleLivePress(entry.homeItem);
                      return;
                    }
                    handleMediaPress({ type: entry.type, item: entry.item });
                  }}
                  containerClassName="flex-1"
                  imageClassName="aspect-video w-full"
                  placeholderIconSize={36}
                />
              )}
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
