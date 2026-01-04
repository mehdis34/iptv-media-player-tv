import { Text, View } from 'react-native';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import type { HomeContentItem } from '@/components/home/types';
import { Image } from '@/components/ui/ExpoImage';
import { cn } from '@/components/ui/cn';

const progressWidthClasses = [
  'w-0',
  'w-1/12',
  'w-2/12',
  'w-3/12',
  'w-4/12',
  'w-5/12',
  'w-6/12',
  'w-7/12',
  'w-8/12',
  'w-9/12',
  'w-10/12',
  'w-11/12',
  'w-full',
];

const getProgressWidthClass = (progress: number) => {
  const clamped = Math.min(1, Math.max(0, progress));
  const index = Math.round(clamped * 12);
  return progressWidthClasses[index] ?? 'w-0';
};

const ProgressBar = ({ progress }: { progress: number | null | undefined }) => {
  if (progress == null) {
    return <View className="h-1 w-full rounded-full bg-white/10" />;
  }
  return (
    <View className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
      <View className={cn('h-full bg-primary', getProgressWidthClass(progress))} />
    </View>
  );
};

type HomeRailCardProps = {
  item: HomeContentItem;
  focusKey: string;
  onPress: () => void;
};

export function HomeRailCard({ item, focusKey, onPress }: HomeRailCardProps) {
  const isLive = item.type === 'live';
  const imageClassName = isLive ? 'h-24 w-44' : 'h-48 w-32';
  const containerClassName = isLive ? 'w-44' : 'w-32';

  return (
    <View className={cn('gap-2', containerClassName)}>
      <TVFocusPressable
        focusKey={focusKey}
        onPress={onPress}
        unstyled
        className={cn('group', containerClassName)}
      >
        <View className={cn('relative overflow-hidden rounded-md bg-white/10', imageClassName)}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              className="h-full w-full rounded-md"
              contentFit="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center px-2">
              <Text className="text-xs text-white/70 text-center" numberOfLines={3}>
                {item.title}
              </Text>
            </View>
          )}
          {isLive ? (
            <View className="absolute inset-x-0 bottom-0 px-2 pb-2">
              <ProgressBar progress={item.epgProgress ?? null} />
            </View>
          ) : null}
          <View
            pointerEvents="none"
            className="absolute inset-0 z-10 rounded-md border-2 border-transparent group-focus:border-primary"
          />
        </View>
      </TVFocusPressable>
      <View className="gap-1">
        <Text className="text-white text-sm font-semibold" numberOfLines={2}>
          {item.title}
        </Text>
        {isLive ? (
          <Text className="text-white/70 text-xs" numberOfLines={1}>
            {item.epgTitle ?? ''}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
