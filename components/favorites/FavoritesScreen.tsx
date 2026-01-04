import { Alert, FlatList, Text, View } from 'react-native';
import { useCallback, useMemo, useState } from 'react';

import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import type { HomeContentItem } from '@/components/home/types';
import { useFavorites } from '@/components/favorites/useFavorites';
import { useI18n } from '@/components/i18n/I18nProvider';
import { ScreenLayout } from '@/layouts/ScreenLayout';
import { VodDetailsModal } from '@/components/vod/VodDetailsModal';
import { SeriesDetailsModal } from '@/components/series/SeriesDetailsModal';
import type { SeriesItem, VodItem } from '@/storage/catalog';
import { Image } from '@/components/ui/ExpoImage';
import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { MaterialIcons } from '@/components/ui/Icons';
import { usePortalStore } from '@/hooks/usePortalStore';
import { useLibraryRefreshStore } from '@/hooks/useLibraryRefreshStore';
import { removeFavorite } from '@/storage/library';

const buildInitialFocusKey = (items: HomeContentItem[]) => {
  const first = items[0];
  return first ? `favorites-item-${first.id}` : undefined;
};

export function FavoritesScreen() {
  const { t } = useI18n();
  const { status, items } = useFavorites();
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const bumpLibrary = useLibraryRefreshStore((store) => store.bump);
  const [selectedVod, setSelectedVod] = useState<VodItem | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [isVodDetailsVisible, setVodDetailsVisible] = useState(false);
  const [isSeriesDetailsVisible, setSeriesDetailsVisible] = useState(false);

  const initialFocusKey = useMemo(() => buildInitialFocusKey(items), [items]);

  const handleItemPress = useCallback((item: HomeContentItem) => {
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
  }, []);

  const getTypeLabel = useCallback(
    (type: HomeContentItem['type']) => {
      if (type === 'vod') {
        return t('tabs.vod');
      }
      if (type === 'series') {
        return t('tabs.series');
      }
      return t('tabs.live');
    },
    [t],
  );

  const handleRemoveFavorite = useCallback(
    async (item: HomeContentItem) => {
      if (!activeProfileId) {
        return;
      }
      await removeFavorite(activeProfileId, item.type, item.id);
      bumpLibrary();
    },
    [activeProfileId, bumpLibrary],
  );

  const handleRemoveConfirm = useCallback(
    (item: HomeContentItem) => {
      Alert.alert(
        t('favorites.actions.removeTitle'),
        t('favorites.actions.removeMessage'),
        [
          {
            text: t('favorites.actions.removeCancel'),
            style: 'cancel',
          },
          {
            text: t('favorites.actions.removeConfirm'),
            style: 'destructive',
            onPress: () => {
              void handleRemoveFavorite(item);
            },
          },
        ],
      );
    },
    [handleRemoveFavorite, t],
  );

  return (
    <ScreenLayout titleKey="screens.favorites.title">
      <TVFocusProvider initialFocusKey={initialFocusKey}>
        {status === 'ready' && items.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white/70 text-lg">{t('screens.favorites.empty')}</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View className="flex-row items-center gap-4">
                <TVFocusPressable
                  focusKey={`favorites-item-${item.id}`}
                  onPress={() => handleItemPress(item)}
                  unstyled
                  hasTVPreferredFocus={index === 0}
                  className="group h-24 w-40 overflow-hidden rounded-md bg-white/10 border-2 border-transparent"
                  focusClassName="border-primary"
                >
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      className="h-full w-full"
                      contentFit="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center px-2">
                      <Text className="text-white/70 text-xs text-center" numberOfLines={2}>
                        {item.title}
                      </Text>
                    </View>
                  )}
                </TVFocusPressable>
                <View className="flex-1 gap-1">
                  <Text className="text-white text-base font-semibold" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className="text-white/60 text-sm" numberOfLines={1}>
                    {getTypeLabel(item.type)}
                  </Text>
                </View>
                <TVFocusPressable
                  focusKey={`favorites-remove-${item.id}`}
                  onPress={() => handleRemoveConfirm(item)}
                  unstyled
                  className="h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5"
                  focusClassName="bg-primary border-primary"
                  accessibilityLabel={t('favorites.actions.remove')}
                >
                  <MaterialIcons name="delete" size={22} className="text-white" />
                </TVFocusPressable>
              </View>
            )}
            contentContainerClassName="gap-4 pb-6"
            showsVerticalScrollIndicator={false}
          />
        )}
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
