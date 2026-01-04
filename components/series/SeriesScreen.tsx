import { FlatList, Text, View } from 'react-native';
import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/components/i18n/I18nProvider';
import { ScreenLayout } from '@/layouts/ScreenLayout';
import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { VodSelectionModal } from '@/components/vod/VodSelectionModal';
import { useSeriesCatalog } from '@/components/series/useSeriesCatalog';
import { SeriesFeaturedCard } from '@/components/series/SeriesFeaturedCard';
import { SeriesPosterCard } from '@/components/series/SeriesPosterCard';
import { SeriesDetailsModal } from '@/components/series/SeriesDetailsModal';
import { MaterialIcons } from '@/components/ui/Icons';
import type { SeriesItem } from '@/storage/catalog';

export function SeriesScreen() {
  const { t } = useI18n();
  const {
    status,
    featured,
    gridItems,
    categories,
    categoryId,
    sort,
    setCategoryId,
    setSort,
    loadMore,
    hasMore,
  } = useSeriesCatalog();
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [isDetailsVisible, setDetailsVisible] = useState(false);

  const categoryOptions = useMemo(
    () => [
      { id: null, name: t('series.categories.all') },
      ...categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    ],
    [categories, t],
  );

  const activeCategory =
    categoryOptions.find((option) => option.id === categoryId) ?? categoryOptions[0];

  const sortLabel =
    sort === 'az'
      ? t('series.sort.az')
      : sort === 'za'
        ? t('series.sort.za')
        : sort === 'oldest'
          ? t('series.sort.oldest')
          : t('series.sort.recent');

  const handleCategoryPress = useCallback(() => {
    setCategoryModalVisible(true);
  }, []);

  const handleSortPress = useCallback(() => {
    setSortModalVisible(true);
  }, []);

  const initialFocusKey = featured
    ? `series-featured-${featured.id}`
    : gridItems[0]
      ? `series-item-${gridItems[0].id}`
      : undefined;

  const header = (
    <View className="gap-6">
      <View className="flex-row items-center justify-between">
        <Text className="text-white text-3xl font-semibold">{t('screens.series.title')}</Text>
        <View className="flex-row items-center gap-3">
          <TVFocusPressable
            focusKey="series-categories"
            onPress={handleCategoryPress}
            unstyled
            className="px-4 py-2 rounded-md border border-white/10 bg-white/5 flex-row items-center gap-1"
            focusClassName="bg-primary border-primary"
          >
            <Text className="text-white text-sm font-semibold">{activeCategory?.name}</Text>
            <MaterialIcons name={'keyboard-arrow-down'} className={'text-white'} size={20} />
          </TVFocusPressable>
          <TVFocusPressable
            focusKey="series-sort"
            onPress={handleSortPress}
            unstyled
            className="px-4 py-2 rounded-md border border-white/10 bg-white/5 flex-row items-center gap-1"
            focusClassName="bg-primary border-primary"
          >
            <Text className="text-white text-sm font-semibold">{sortLabel}</Text>
            <MaterialIcons name={'keyboard-arrow-down'} className={'text-white'} size={20} />
          </TVFocusPressable>
        </View>
      </View>
      {featured ? (
        <SeriesFeaturedCard
          item={featured}
          focusKey={`series-featured-${featured.id}`}
          onPress={() => {
            setSelectedSeries(featured);
            setDetailsVisible(true);
          }}
        />
      ) : null}
    </View>
  );

  return (
    <ScreenLayout>
      <TVFocusProvider initialFocusKey={initialFocusKey}>
        <FlatList
          data={gridItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SeriesPosterCard
              item={item}
              focusKey={`series-item-${item.id}`}
              onPress={() => {
                setSelectedSeries(item);
                setDetailsVisible(true);
              }}
            />
          )}
          numColumns={6}
          columnWrapperClassName="gap-6"
          contentContainerClassName="gap-6 pb-10"
          ListHeaderComponent={header}
          ListEmptyComponent={
            status === 'ready' ? (
              <Text className="text-white/70 text-base">{t('screens.series.empty')}</Text>
            ) : null
          }
          onEndReached={() => {
            if (hasMore) {
              loadMore();
            }
          }}
          onEndReachedThreshold={0.6}
          showsVerticalScrollIndicator={false}
          initialNumToRender={18}
          maxToRenderPerBatch={18}
          windowSize={7}
          removeClippedSubviews
        />
      </TVFocusProvider>
      <VodSelectionModal
        visible={isCategoryModalVisible}
        titleKey="series.actions.categories"
        options={categoryOptions.map((option) => ({
          id: option.id,
          label: option.name,
        }))}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onClose={() => setCategoryModalVisible(false)}
      />
      <VodSelectionModal
        visible={isSortModalVisible}
        titleKey="series.actions.sort"
        options={[
          { id: 'recent', label: t('series.sort.recent') },
          { id: 'oldest', label: t('series.sort.oldest') },
          { id: 'az', label: t('series.sort.az') },
          { id: 'za', label: t('series.sort.za') },
        ]}
        selectedId={sort}
        onSelect={(value) => {
          if (value === 'az') {
            setSort('az');
            return;
          }
          if (value === 'za') {
            setSort('za');
            return;
          }
          if (value === 'oldest') {
            setSort('oldest');
            return;
          }
          setSort('recent');
        }}
        onClose={() => setSortModalVisible(false)}
      />
      <SeriesDetailsModal
        visible={isDetailsVisible}
        item={selectedSeries}
        onClose={() => setDetailsVisible(false)}
      />
    </ScreenLayout>
  );
}
