import { FlatList, Text, View } from 'react-native';
import { useCallback, useMemo } from 'react';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { HomeRailCard } from '@/components/home/HomeRailCard';
import type { HomeContentItem, HomeRail, HomeRailKind } from '@/components/home/types';
import { useI18n } from '@/components/i18n/I18nProvider';
import { cn } from '@/components/ui/cn';
import { MaterialIcons } from '@/components/ui/Icons';

type HomeRailRowProps = {
  rail: HomeRail;
  onItemPress: (item: HomeContentItem) => void;
  onSeeMorePress: (rail: HomeRail) => void;
};

type RailEntry = { type: 'item'; item: HomeContentItem } | { type: 'see-more' };

const getTileClassName = (kind: HomeRailKind) => (kind === 'live' ? 'h-24 w-44' : 'h-48 w-32');

const getContainerClassName = (kind: HomeRailKind) => (kind === 'live' ? 'w-44' : 'w-32');

const buildItemFocusKey = (railId: string, itemId: string) => `home-${railId}-${itemId}`;

const buildSeeMoreFocusKey = (railId: string) => `home-${railId}-see-more`;

export function HomeRailRow({ rail, onItemPress, onSeeMorePress }: HomeRailRowProps) {
  const { t } = useI18n();
  const seeMoreLabel = t(rail.seeMoreLabelKey);

  const data = useMemo<RailEntry[]>(
    () => [
      ...rail.items.map((item) => ({ type: 'item' as const, item })),
      { type: 'see-more' as const },
    ],
    [rail.items],
  );

  const renderItem = useCallback(
    ({ item }: { item: RailEntry }) => {
      if (item.type === 'see-more') {
        const containerClassName = getContainerClassName(rail.seeMoreKind);
        const tileClassName = getTileClassName(rail.seeMoreKind);
        return (
          <TVFocusPressable
            focusKey={buildSeeMoreFocusKey(rail.id)}
            onPress={() => onSeeMorePress(rail)}
            unstyled
            className={cn('group gap-3', containerClassName)}
            accessibilityLabel={seeMoreLabel}
          >
            <View
              className={cn(
                'relative items-center justify-center rounded-md bg-white/5',
                tileClassName,
              )}
            >
              <MaterialIcons name="add" size={28} className="text-white/70" />
              <View
                pointerEvents="none"
                className="absolute inset-0 z-10 rounded-md border-2 border-transparent group-focus:border-primary"
              />
            </View>
            <Text className="text-white text-sm font-semibold text-center">{seeMoreLabel}</Text>
          </TVFocusPressable>
        );
      }
      return (
        <HomeRailCard
          item={item.item}
          focusKey={buildItemFocusKey(rail.id, item.item.id)}
          onPress={() => onItemPress(item.item)}
        />
      );
    },
    [onItemPress, onSeeMorePress, rail, seeMoreLabel],
  );

  return (
    <View className="gap-3">
      <Text className="text-white text-xl font-semibold">{t(rail.titleKey)}</Text>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(entry) =>
          entry.type === 'see-more' ? `${rail.id}-see-more` : `${rail.id}-${entry.item.id}`
        }
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        ItemSeparatorComponent={() => <View className="w-4" />}
        ListHeaderComponent={() => <View className="w-2" />}
        ListFooterComponent={() => <View className="w-2" />}
      />
    </View>
  );
}
