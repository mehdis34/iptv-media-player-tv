import { Text, View } from 'react-native';
import { useMemo } from 'react';

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
  onTogglePlay: () => void;
  onJumpBack: () => void;
  onJumpForward: () => void;
  onJumpToLive: () => void;
  onShowTracks: () => void;
  onShowEpisodes?: () => void;
  onShowSeasons?: () => void;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  labels: {
    live: string;
    play: string;
    pause: string;
    jumpBack: string;
    jumpForward: string;
    jumpLive: string;
    tracks: string;
    episodes: string;
    seasons: string;
    favorite: string;
    unfavorite: string;
    close: string;
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
  onTogglePlay,
  onJumpBack,
  onJumpForward,
  onJumpToLive,
  onShowTracks,
  onShowEpisodes,
  onShowSeasons,
  onBack,
  isFavorite,
  onToggleFavorite,
  labels,
}: PlayerControlsProps) {
  const progress = useMemo(() => {
    if (!duration) {
      return 0;
    }
    return Math.min(1, Math.max(0, currentTime / duration));
  }, [currentTime, duration]);

  return (
    <View className="absolute inset-0 justify-between">
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
            onPress={onToggleFavorite}
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
            focusKey="player-close"
            onPress={onBack}
            unstyled
            className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
            focusClassName="bg-primary"
            accessibilityLabel={labels.close}
          >
            <MaterialIcons name="close" size={24} className="text-white" />
          </TVFocusPressable>
        </View>
      </View>

      <View className="px-10 pb-8 gap-5">
        {isLive ? (
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-primary" />
            <Text className="text-white text-sm font-semibold">{labels.live}</Text>
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
              onPress={onJumpBack}
              unstyled
              className="h-14 w-14 items-center justify-center rounded-full bg-white/10"
              focusClassName="bg-primary"
              accessibilityLabel={labels.jumpBack}
            >
              <MaterialIcons name="replay-10" size={26} className="text-white" />
            </TVFocusPressable>
          )}
          <TVFocusPressable
            focusKey="player-toggle"
            onPress={onTogglePlay}
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
          {isLive ? null : (
            <TVFocusPressable
              focusKey="player-jump-forward"
              onPress={onJumpForward}
              unstyled
              className="h-14 w-14 items-center justify-center rounded-full bg-white/10"
              focusClassName="bg-primary"
              accessibilityLabel={labels.jumpForward}
            >
              <MaterialIcons name="forward-10" size={26} className="text-white" />
            </TVFocusPressable>
          )}
        </View>

        <View className="flex-row flex-wrap items-center justify-center gap-4">
          <TVFocusPressable
            focusKey="player-tracks"
            onPress={onShowTracks}
            unstyled
            className="rounded-full bg-white/10 px-5 py-2"
            focusClassName="bg-primary"
            accessibilityLabel={labels.tracks}
          >
            <Text className="text-white text-sm font-semibold">{labels.tracks}</Text>
          </TVFocusPressable>
          {onShowEpisodes ? (
            <TVFocusPressable
              focusKey="player-episodes"
              onPress={onShowEpisodes}
              unstyled
              className="rounded-full bg-white/10 px-5 py-2"
              focusClassName="bg-primary"
              accessibilityLabel={labels.episodes}
            >
              <Text className="text-white text-sm font-semibold">{labels.episodes}</Text>
            </TVFocusPressable>
          ) : null}
          {onShowSeasons ? (
            <TVFocusPressable
              focusKey="player-seasons"
              onPress={onShowSeasons}
              unstyled
              className="rounded-full bg-white/10 px-5 py-2"
              focusClassName="bg-primary"
              accessibilityLabel={labels.seasons}
            >
              <Text className="text-white text-sm font-semibold">{labels.seasons}</Text>
            </TVFocusPressable>
          ) : null}
          {isLive ? (
            <TVFocusPressable
              focusKey="player-live"
              onPress={onJumpToLive}
              unstyled
              className="rounded-full bg-white/10 px-5 py-2"
              focusClassName="bg-primary"
              accessibilityLabel={labels.jumpLive}
            >
              <Text className="text-white text-sm font-semibold">{labels.jumpLive}</Text>
            </TVFocusPressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
