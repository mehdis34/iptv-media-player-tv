import { FlatList, Text, View } from 'react-native';
import { useCallback, useMemo, useState } from 'react';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { VodDetailsModal } from '@/components/vod/VodDetailsModal';
import { VodFeaturedCard } from '@/components/vod/VodFeaturedCard';
import { VodPosterCard } from '@/components/vod/VodPosterCard';
import { VodSelectionModal } from '@/components/vod/VodSelectionModal';
import { useVodCatalog } from '@/components/vod/useVodCatalog';
import { useI18n } from '@/components/i18n/I18nProvider';
import { ScreenLayout } from '@/layouts/ScreenLayout';
import { MaterialIcons } from '@expo/vector-icons';
import type { VodItem } from '@/storage/catalog';

export function VodScreen() {
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
  } = useVodCatalog();
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  const [selectedVod, setSelectedVod] = useState<VodItem | null>(null);
  const [isDetailsVisible, setDetailsVisible] = useState(false);

  const categoryOptions = useMemo(
    () => [
      { id: null, name: t('vod.categories.all') },
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
      ? t('vod.sort.az')
      : sort === 'za'
        ? t('vod.sort.za')
        : sort === 'oldest'
          ? t('vod.sort.oldest')
          : t('vod.sort.recent');

  const handleCategoryPress = useCallback(() => {
    setCategoryModalVisible(true);
  }, []);

  const handleSortPress = useCallback(() => {
    setSortModalVisible(true);
  }, []);

  const initialFocusKey = featured
    ? `vod-featured-${featured.id}`
    : gridItems[0]
      ? `vod-item-${gridItems[0].id}`
      : undefined;

  const header = (
    <View className="gap-6">
      <View className="flex-row items-center justify-between">
        <Text className="text-white text-3xl font-semibold">{t('screens.vod.title')}</Text>
        <View className="flex-row items-center gap-3">
          <TVFocusPressable
            focusKey="vod-categories"
            onPress={handleCategoryPress}
            unstyled
            className="px-4 py-2 rounded-md border border-white/10 bg-white/5 flex-row items-center gap-1"
            focusClassName="bg-primary border-primary"
          >
            <Text className="text-white text-sm font-semibold">{activeCategory?.name}</Text>
            <MaterialIcons name={'keyboard-arrow-down'} className={'text-white'} size={20} />
          </TVFocusPressable>
          <TVFocusPressable
            focusKey="vod-sort"
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
        <VodFeaturedCard item={featured} focusKey={`vod-featured-${featured.id}`} />
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
            <VodPosterCard
              item={item}
              focusKey={`vod-item-${item.id}`}
              onPress={() => {
                setSelectedVod(item);
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
              <Text className="text-white/70 text-base">{t('screens.vod.empty')}</Text>
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
        titleKey="vod.actions.categories"
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
        titleKey="vod.actions.sort"
        options={[
          { id: 'recent', label: t('vod.sort.recent') },
          { id: 'oldest', label: t('vod.sort.oldest') },
          { id: 'az', label: t('vod.sort.az') },
          { id: 'za', label: t('vod.sort.za') },
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
      <VodDetailsModal
        visible={isDetailsVisible}
        item={selectedVod}
        onClose={() => setDetailsVisible(false)}
      />
    </ScreenLayout>
  );
}
