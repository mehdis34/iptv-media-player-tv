import {Tabs} from 'expo-router';

import {TVTabBar} from '@/components/navigation/TVTabBar';
import {useI18n} from '@/components/i18n/I18nProvider';

export default function TabLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarPosition: 'left' }}
      tabBar={(props) => <TVTabBar {...props} />}
    >
      <Tabs.Screen name="search" options={{ title: t('tabs.search') }} />
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="live" options={{ title: t('tabs.live') }} />
      <Tabs.Screen name="vod" options={{ title: t('tabs.vod') }} />
      <Tabs.Screen name="series" options={{ title: t('tabs.series') }} />
      <Tabs.Screen name="favorites" options={{ title: t('tabs.favorites') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
    </Tabs>
  );
}
