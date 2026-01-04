import { FlatList, Text, View } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { useI18n } from '@/components/i18n/I18nProvider';
import { ScreenLayout } from '@/layouts/ScreenLayout';
import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { MaterialIcons } from '@/components/ui/Icons';
import { VodSelectionModal } from '@/components/vod/VodSelectionModal';
import { HomeRailCard } from '@/components/home/HomeRailCard';
import { useLiveCatalog } from '@/components/live/useLiveCatalog';
import { useLiveSections } from '@/components/live/useLiveSections';
import { cn } from '@/components/ui/cn';

export function LiveScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const { status, items, categories, categoryId, setCategoryId, loadMore, hasMore } =
    useLiveCatalog();
  const { status: sectionsStatus, sections } = useLiveSections(
    categoryId == null && !isCategoryModalVisible,
  );

  const categoryOptions = useMemo(
    () => [
      { id: null, name: t('live.categories.all') },
      ...categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    ],
    [categories, t],
  );

  const activeCategory =
    categoryOptions.find((option) => option.id === categoryId) ?? categoryOptions[0];

  const handleCategoryPress = useCallback(() => {
    setCategoryModalVisible(true);
  }, []);

  const handleSeeMorePress = useCallback(
    (categoryIdValue: string) => {
      setCategoryId(categoryIdValue);
    },
    [setCategoryId],
  );

  const handleLivePress = useCallback(
    (item: HomeContentItem) => {
      router.push({
        pathname: '/player/[id]',
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

  const initialFocusKey =
    categoryId == null
      ? sections[0]?.items[0]
        ? `live-section-${sections[0].id}-${sections[0].items[0].id}`
        : items[0]
          ? `live-section-all-${items[0].id}`
          : undefined
      : items[0]
        ? `live-item-${items[0].id}`
        : undefined;

  return (
    <ScreenLayout>
      <TVFocusProvider initialFocusKey={initialFocusKey}>
        {categoryId == null ? (
          <FlatList
            key="live-sections"
            data={
              sections.length > 0
                ? sections
                : items.length > 0
                  ? [
                      {
                        id: 'all',
                        name: t('live.categories.all'),
                        items,
                      },
                    ]
                  : []
            }
            keyExtractor={(item) => item.id}
            renderItem={({ item: section }) => (
              <View className="gap-3">
                <Text className="text-white text-xl font-semibold">{section.name}</Text>
                <FlatList
                  horizontal
                  data={[
                    ...section.items.slice(0, 4).map((item) => ({
                      type: 'item' as const,
                      item,
                    })),
                    ...(section.items.length > 4 ? [{ type: 'see-more' as const }] : []),
                  ]}
                  keyExtractor={(entry) =>
                    entry.type === 'see-more'
                      ? `${section.id}-see-more`
                      : `${section.id}-${entry.item.id}`
                  }
                  renderItem={({ item: entry }) => {
                    if (entry.type === 'see-more') {
                      return (
                        <TVFocusPressable
                          focusKey={`live-section-${section.id}-see-more`}
                          onPress={() => handleSeeMorePress(section.id)}
                          unstyled
                          className={cn('group gap-3', 'w-44')}
                          accessibilityLabel={t('home.rail.seeMore')}
                        >
                          <View
                            className={cn(
                              'relative items-center justify-center rounded-md bg-white/5',
                              'h-24 w-44',
                            )}
                          >
                            <MaterialIcons name="add" size={28} className="text-white/70" />
                            <View
                              pointerEvents="none"
                              className="absolute inset-0 z-10 rounded-md border-2 border-transparent group-focus:border-primary"
                            />
                          </View>
                          <Text className="text-white text-sm font-semibold text-center">
                            {t('home.rail.seeMore')}
                          </Text>
                        </TVFocusPressable>
                      );
                    }
                    return (
                      <HomeRailCard
                        item={entry.item}
                        focusKey={`live-section-${section.id}-${entry.item.id}`}
                        onPress={() => handleLivePress(entry.item)}
                      />
                    );
                  }}
                  showsHorizontalScrollIndicator={false}
                  initialNumToRender={6}
                  maxToRenderPerBatch={6}
                  windowSize={5}
                  removeClippedSubviews
                  ItemSeparatorComponent={() => <View className="w-4" />}
                  ListHeaderComponent={() => <View className="w-2" />}
                  ListFooterComponent={() => <View className="w-2" />}
                />
              </View>
            )}
            contentContainerClassName="gap-8 pb-10"
            ListHeaderComponent={
              <View className="gap-6">
                <View className="flex-row items-center justify-between">
                  <Text className="text-white text-3xl font-semibold">
                    {t('screens.live.title')}
                  </Text>
                  <TVFocusPressable
                    focusKey="live-categories"
                    onPress={handleCategoryPress}
                    unstyled
                    className="px-4 py-2 rounded-md border border-white/10 bg-white/5 flex-row items-center gap-1"
                    focusClassName="bg-primary border-primary"
                  >
                    <Text className="text-white text-sm font-semibold">{activeCategory?.name}</Text>
                    <MaterialIcons
                      name={'keyboard-arrow-down'}
                      className={'text-white'}
                      size={20}
                    />
                  </TVFocusPressable>
                </View>
              </View>
            }
            ListEmptyComponent={
              sectionsStatus === 'ready' ? (
                <Text className="text-white/70 text-base">{t('screens.live.empty')}</Text>
              ) : null
            }
            showsVerticalScrollIndicator={false}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={5}
            removeClippedSubviews
          />
        ) : (
          <FlatList
            key="live-grid"
            data={[...items, ...Array((4 - (items.length % 4 || 4)) % 4).fill(null)]}
            keyExtractor={(item, index) => (item ? item.id : `placeholder-${index}`)}
            renderItem={({ item }) =>
              item ? (
                <HomeRailCard
                  item={item}
                  focusKey={`live-item-${item.id}`}
                  onPress={() => handleLivePress(item)}
                  containerClassName="flex-1"
                  imageClassName="aspect-video w-full"
                  placeholderIconSize={36}
                />
              ) : (
                <View className="w-1/4" pointerEvents="none" />
              )
            }
            numColumns={4}
            columnWrapperClassName="gap-6"
            contentContainerClassName={'gap-6'}
            ListHeaderComponent={
              <View className="gap-6 mb-6">
                <View className="flex-row items-center justify-between">
                  <Text className="text-white text-3xl font-semibold">
                    {t('screens.live.title')}
                  </Text>
                  <TVFocusPressable
                    focusKey="live-categories"
                    onPress={handleCategoryPress}
                    unstyled
                    className="px-4 py-2 rounded-md border border-white/10 bg-white/5 flex-row items-center gap-1"
                    focusClassName="bg-primary border-primary"
                  >
                    <Text className="text-white text-sm font-semibold">{activeCategory?.name}</Text>
                    <MaterialIcons
                      name={'keyboard-arrow-down'}
                      className={'text-white'}
                      size={20}
                    />
                  </TVFocusPressable>
                </View>
              </View>
            }
            ListEmptyComponent={
              status === 'ready' ? (
                <Text className="text-white/70 text-base">{t('screens.live.empty')}</Text>
              ) : null
            }
            onEndReached={() => {
              if (hasMore) {
                loadMore();
              }
            }}
            onEndReachedThreshold={0.6}
            showsVerticalScrollIndicator={false}
            initialNumToRender={16}
            maxToRenderPerBatch={16}
            windowSize={5}
            removeClippedSubviews
          />
        )}
      </TVFocusProvider>
      <VodSelectionModal
        visible={isCategoryModalVisible}
        titleKey="live.actions.categories"
        options={categoryOptions.map((option) => ({
          id: option.id,
          label: option.name,
        }))}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onClose={() => setCategoryModalVisible(false)}
      />
    </ScreenLayout>
  );
}
