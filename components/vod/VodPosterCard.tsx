import { Text, View } from 'react-native';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { Image } from '@/components/ui/ExpoImage';
import { cn } from '@/components/ui/cn';
import type { VodItem } from '@/storage/catalog';

type VodPosterCardProps = {
  item: VodItem;
  focusKey: string;
  onPress: () => void;
};

export function VodPosterCard({ item, focusKey, onPress }: VodPosterCardProps) {
  return (
    <TVFocusPressable
      focusKey={focusKey}
      onPress={onPress}
      unstyled
      className="group relative w-32 overflow-visible"
      focusClassName=""
    >
      <View className="gap-2">
        <View className="relative h-48 w-32 overflow-hidden rounded-md bg-white/10">
          {item.image ? (
            <Image source={{ uri: item.image }} className="h-full w-full" contentFit="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center px-2">
              <Text className="text-white/70 text-xs text-center" numberOfLines={3}>
                {item.title}
              </Text>
            </View>
          )}
          <View
            pointerEvents="none"
            className={cn(
              'absolute inset-0 rounded-md border-2 border-transparent',
              'group-focus:border-primary',
            )}
          />
        </View>
        <Text className="text-white text-sm font-semibold" numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    </TVFocusPressable>
  );
}
