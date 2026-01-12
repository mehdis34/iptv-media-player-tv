import { FlatList, Text, View } from 'react-native';
import { useMemo, useRef } from 'react';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { MaterialIcons } from '@/components/ui/Icons';
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

const ProgressBar = ({ progress }: { progress: number }) => (
  <View className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
    <View className={cn('h-full bg-primary', getProgressWidthClass(progress))} />
  </View>
);

type PlayerControlsProps = {
  title: string;
  subtitle?: string | null;
  artwork?: string | null;
  isLive: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  liveProgress?: number | null;
  liveTimeRange?: string | null;
  onAnyFocus?: () => void;
  onAnyPress?: () => void;
  canPress?: () => boolean;
  upNextLabel?: string;
  upNextItems?: Array<{
    id: string;
    title: string;
    timeRange?: string | null;
    durationLabel?: string | null;
    image?: string | null;
    description?: string | null;
  }>;
  onSelectUpcoming?: (itemId: string) => void;
  onTogglePlay: () => void;
  onJumpBack: () => void;
  onJumpForward: () => void;
  onShowTracks: () => void;
  onShowEpisodes?: () => void;
  onShowSeasons?: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  labels: {
    live: string;
    play: string;
    pause: string;
    jumpBack: string;
    jumpForward: string;
    tracks: string;
    episodes: string;
    seasons: string;
    favorite: string;
    unfavorite: string;
    noInfo: string;
  };
};

const formatTime = (value: number) => {
  const total = Math.max(0, Math.floor(value));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export function PlayerControls({
  title,
  subtitle,
  artwork,
  isLive,
  isPaused,
  currentTime,
  duration,
  onAnyFocus,
  onTogglePlay,
  onJumpBack,
  onJumpForward,
  onShowTracks,
  onShowEpisodes,
  onShowSeasons,
  isFavorite,
  onToggleFavorite,
  labels,
  onAnyPress,
  canPress,
  liveProgress,
  liveTimeRange,
  upNextLabel,
  upNextItems,
  onSelectUpcoming,
}: PlayerControlsProps) {
  const progress = useMemo(() => {
    if (!duration) {
      return 0;
    }
    return Math.min(1, Math.max(0, currentTime / duration));
  }, [currentTime, duration]);
  const upNextRef = useRef<FlatList>(null);
  const lastUpNextIndexRef = useRef(0);
  const isPressAllowed = () => (canPress ? canPress() : true);

  return (
    <View className="absolute inset-0 justify-between">
      <View className="absolute inset-0 bg-black/85" />
      <View className="px-10 pt-6 flex-row items-center justify-between">
        <View className="flex-row items-center gap-4 flex-1 min-w-0">
          {artwork ? (
            <View className="h-12 w-12 overflow-hidden rounded-md bg-white/10">
              <Image source={{ uri: artwork }} className="h-full w-full" contentFit="cover" />
            </View>
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-md bg-white/10">
              <MaterialIcons name="play-arrow" size={24} className="text-white/70" />
            </View>
          )}
          <View className="flex-1 min-w-0">
            <Text className="text-white text-xl font-semibold" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-white/70 text-sm" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <TVFocusPressable
            focusKey="player-favorite"
            onPress={() => {
              if (!isPressAllowed()) {
                return;
              }
              onAnyPress?.();
              onToggleFavorite();
            }}
            onFocus={onAnyFocus}
            unstyled
            className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
            focusClassName="bg-primary"
            accessibilityLabel={isFavorite ? labels.unfavorite : labels.favorite}
          >
            <MaterialIcons
              name={isFavorite ? 'favorite' : 'favorite-border'}
              size={24}
              className="text-white"
            />
          </TVFocusPressable>
          <TVFocusPressable
            focusKey="player-tracks"
            onPress={() => {
              if (!isPressAllowed()) {
                return;
              }
              onAnyPress?.();
              onShowTracks();
            }}
            onFocus={onAnyFocus}
            unstyled
            className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
            focusClassName="bg-primary"
            accessibilityLabel={labels.tracks}
          >
            <MaterialIcons name="queue-music" size={22} className="text-white" />
          </TVFocusPressable>
          {onShowEpisodes ? (
            <TVFocusPressable
              focusKey="player-episodes"
              onPress={() => {
                if (!isPressAllowed()) {
                  return;
                }
                onAnyPress?.();
                onShowEpisodes();
              }}
              onFocus={onAnyFocus}
              unstyled
              className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
              focusClassName="bg-primary"
              accessibilityLabel={labels.episodes}
            >
              <MaterialIcons name="playlist-play" size={24} className="text-white" />
            </TVFocusPressable>
          ) : null}
          {onShowSeasons ? (
            <TVFocusPressable
              focusKey="player-seasons"
              onPress={() => {
                if (!isPressAllowed()) {
                  return;
                }
                onAnyPress?.();
                onShowSeasons();
              }}
              onFocus={onAnyFocus}
              unstyled
              className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
              focusClassName="bg-primary"
              accessibilityLabel={labels.seasons}
            >
              <MaterialIcons name="layers" size={22} className="text-white" />
            </TVFocusPressable>
          ) : null}
        </View>
      </View>

      <View className="px-10 pb-8 gap-5">
        {isLive ? (
          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full bg-primary" />
              <Text className="text-white text-sm font-semibold">{labels.live}</Text>
            </View>
            {liveProgress != null ? (
              <View className="gap-2">
                <ProgressBar progress={liveProgress} />
                {liveTimeRange ? (
                  <Text className="text-white/70 text-xs">{liveTimeRange}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : (
          <View className="gap-2">
            <ProgressBar progress={progress} />
            <View className="flex-row items-center justify-between">
              <Text className="text-white/70 text-xs">{formatTime(currentTime)}</Text>
              <Text className="text-white/70 text-xs">{formatTime(duration)}</Text>
            </View>
          </View>
        )}

        <View className="flex-row items-center justify-center gap-6">
          {isLive ? null : (
            <TVFocusPressable
              focusKey="player-jump-back"
              onPress={() => {
                if (!isPressAllowed()) {
                  return;
                }
                onAnyPress?.();
                onJumpBack();
              }}
              onFocus={onAnyFocus}
              unstyled
              className="h-14 w-14 items-center justify-center rounded-full bg-white/10"
              focusClassName="bg-primary"
              accessibilityLabel={labels.jumpBack}
            >
              <MaterialIcons name="replay-10" size={26} className="text-white" />
            </TVFocusPressable>
          )}
          {isLive ? null : (
            <TVFocusPressable
              focusKey="player-toggle"
              onPress={() => {
                if (!isPressAllowed()) {
                  return;
                }
                onAnyPress?.();
                onTogglePlay();
              }}
              onFocus={onAnyFocus}
              unstyled
              className="h-20 w-20 items-center justify-center rounded-full bg-white/10"
              focusClassName="bg-primary"
              accessibilityLabel={isPaused ? labels.play : labels.pause}
            >
              <MaterialIcons
                name={isPaused ? 'play-arrow' : 'pause'}
                size={36}
                className="text-white"
              />
            </TVFocusPressable>
          )}
          {isLive ? null : (
            <TVFocusPressable
              focusKey="player-jump-forward"
              onPress={() => {
                if (!isPressAllowed()) {
                  return;
                }
                onAnyPress?.();
                onJumpForward();
              }}
              onFocus={onAnyFocus}
              unstyled
              className="h-14 w-14 items-center justify-center rounded-full bg-white/10"
              focusClassName="bg-primary"
              accessibilityLabel={labels.jumpForward}
            >
              <MaterialIcons name="forward-10" size={26} className="text-white" />
            </TVFocusPressable>
          )}
        </View>

        {isLive && upNextItems && upNextItems.length > 0 ? (
          <View className="gap-3">
            {upNextLabel ? (
              <Text className="text-white/70 text-xs uppercase">{upNextLabel}</Text>
            ) : null}
            <FlatList
              ref={upNextRef}
              data={upNextItems}
              keyExtractor={(item) => item.id}
              horizontal
              contentContainerClassName="gap-4 pr-10"
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View className="w-80 rounded-md px-3 py-2 flex-row gap-3 items-center">
                  {item.image ? (
                    <TVFocusPressable
                      focusKey={`player-upnext-${item.id}`}
                      onPress={() => {
                        if (!isPressAllowed()) {
                          return;
                        }
                        onAnyPress?.();
                        onSelectUpcoming?.(item.id);
                      }}
                      onFocus={() => {
                        onAnyFocus?.();
                        if (index > lastUpNextIndexRef.current) {
                          upNextRef.current?.scrollToIndex({
                            index,
                            animated: true,
                            viewPosition: 0,
                          });
                        }
                        lastUpNextIndexRef.current = index;
                      }}
                      unstyled
                      className="group h-20 w-36 rounded-md bg-white/10 overflow-hidden"
                    >
                      <Image
                        source={{ uri: item.image }}
                        className="h-full w-full"
                        contentFit="contain"
                      />
                      <View
                        pointerEvents="none"
                        className="absolute inset-0 rounded-md border-2 border-transparent group-focus:border-primary"
                      />
                    </TVFocusPressable>
                  ) : null}
                  <View className="flex-1 gap-1">
                    {item.timeRange || item.durationLabel ? (
                      <Text className="text-white/60 text-xs" numberOfLines={1}>
                        {item.timeRange}
                        {item.timeRange && item.durationLabel ? ' • ' : ''}
                        {item.durationLabel}
                      </Text>
                    ) : null}
                    <Text className="text-white text-sm font-semibold max-w-2xl" numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text className="text-white/60 text-xs max-w-2xl" numberOfLines={1}>
                      {item.description?.trim() ? item.description : labels.noInfo}
                    </Text>
                  </View>
                </View>
              )}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}
