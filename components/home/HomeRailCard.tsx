import { Text, View } from 'react-native';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import type { HomeContentItem } from '@/components/home/types';
import { Image } from '@/components/ui/ExpoImage';
import { cn } from '@/components/ui/cn';
import { MaterialIcons } from '@/components/ui/Icons';

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

const parseXmltvTimestamp = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ).getTime();
};

const formatProgramDuration = (start?: string | null, end?: string | null) => {
  const startMs = parseXmltvTimestamp(start);
  const endMs = parseXmltvTimestamp(end);
  if (!startMs || !endMs || endMs <= startMs) {
    return null;
  }
  const minutes = Math.round((endMs - startMs) / 60000);
  if (minutes <= 0) {
    return null;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours > 0) {
    return remaining > 0 ? `${hours}h${remaining}m` : `${hours}h`;
  }
  return `${remaining}m`;
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
  containerClassName?: string;
  imageClassName?: string;
  placeholderIconSize?: number;
};

export function HomeRailCard({
  item,
  focusKey,
  onPress,
  containerClassName: containerOverride,
  imageClassName: imageOverride,
  placeholderIconSize,
}: HomeRailCardProps) {
  const isLive = item.type === 'live';
  const imageClassName = imageOverride ?? (isLive ? 'h-24 w-44' : 'h-48 w-32');
  const containerClassName = containerOverride ?? (isLive ? 'w-44' : 'w-32');
  const programDuration = isLive
    ? formatProgramDuration(item.epgStart ?? null, item.epgEnd ?? null)
    : null;
  const showEpgMeta = isLive && (item.epgTitle || programDuration);

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
              <MaterialIcons
                name="play-arrow"
                size={placeholderIconSize ?? 28}
                className="text-white/70"
              />
            </View>
          )}
          {isLive && item.epgProgress ? (
            <View className="absolute inset-x-0 bottom-0 px-2 pb-2">
              <ProgressBar progress={item.epgProgress} />
            </View>
          ) : null}
          <View
            pointerEvents="none"
            className="absolute inset-0 z-10 rounded-md border-2 border-transparent group-focus:border-primary"
          />
        </View>
      </TVFocusPressable>
      <View className="gap-1 h-12">
        <Text className="text-white text-sm font-semibold text-left" numberOfLines={1}>
          {item.title}
        </Text>
        {showEpgMeta ? (
          <>
            {item.epgTitle ? (
              <Text className="text-white/70 text-xs text-left" numberOfLines={1}>
                {item.epgTitle}
              </Text>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}
