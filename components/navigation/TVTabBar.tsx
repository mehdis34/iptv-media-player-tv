import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { useI18n } from '@/components/i18n/I18nProvider';
import { cn } from '@/components/ui/cn';
import { MaterialIcons } from '@/components/ui/Icons';
import type { TranslationKey } from '@/constants/i18n';

const tabLabelMap: Record<string, TranslationKey> = {
  index: 'tabs.home',
  live: 'tabs.live',
  vod: 'tabs.vod',
  series: 'tabs.series',
  favorites: 'tabs.favorites',
  search: 'tabs.search',
  settings: 'tabs.settings',
};

type IconName = ComponentProps<typeof MaterialIcons>['name'];

const tabIconMap: Record<string, IconName> = {
  index: 'home',
  live: 'live-tv',
  vod: 'movie',
  series: 'tv',
  favorites: 'favorite',
  search: 'search',
  settings: 'settings',
};

export function TVTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useI18n();
  const activeRoute = state.routes[state.index];
  const initialFocusKey = activeRoute ? `tab-${activeRoute.name}` : 'tab-index';

  return (
    <SafeAreaView edges={['top', 'bottom', 'left']} className="">
      <TVFocusProvider initialFocusKey={initialFocusKey}>
        <View className="h-full w-24 py-8 bg-black">
          <View className="flex-1 items-center justify-center gap-6">
            {state.routes.map((route, index) => {
              const descriptor = descriptors[route.key];
              const isFocused = state.index === index;
              const labelKey = tabLabelMap[route.name] ?? 'tabs.home';
              const iconName = tabIconMap[route.name] ?? 'home';
              const accessibilityLabel = descriptor.options.tabBarAccessibilityLabel ?? t(labelKey);

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              return (
                <TVFocusPressable
                  key={route.key}
                  focusKey={`tab-${route.name}`}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={accessibilityLabel}
                  unstyled
                  className="group h-12 w-12 items-center justify-center"
                >
                  <MaterialIcons
                    name={iconName}
                    size={24}
                    className={cn(
                      'group-focus:text-primary group-focus:scale-125',
                      isFocused ? 'text-primary' : 'text-white/70 ',
                    )}
                  />
                </TVFocusPressable>
              );
            })}
          </View>
        </View>
      </TVFocusProvider>
    </SafeAreaView>
  );
}
