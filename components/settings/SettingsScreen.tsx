import { useCallback } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { useI18n } from '@/components/i18n/I18nProvider';
import { getAvatarUrl } from '@/components/portals/avatarHelpers';
import { Image } from '@/components/ui/ExpoImage';
import { FullscreenLoadingModal } from '@/components/ui/FullscreenLoadingModal';
import { MaterialIcons } from '@/components/ui/Icons';
import { cn } from '@/components/ui/cn';
import { usePortalStore } from '@/hooks/usePortalStore';
import { useProfiles } from '@/hooks/useProfiles';
import { useProfileRefresh } from '@/hooks/useProfileRefresh';
import { ScreenLayout } from '@/layouts/ScreenLayout';
import type { PortalProfile } from '@/types/profile';
import { clearCatalogForProfile } from '@/storage/catalog';
import { clearCache } from '@/storage/cache';
import { clearProfiles } from '@/storage/profiles';

export function SettingsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { profiles, refresh } = useProfiles();
  const activeProfileId = usePortalStore((state) => state.activeProfileId);
  const setActiveProfileId = usePortalStore((state) => state.setActiveProfileId);
  const {
    profile: activeProfile,
    status: refreshStatus,
    errorKey: refreshErrorKey,
    progress: refreshProgress,
    refresh: refreshProfileData,
  } = useProfileRefresh();

  const initialFocusKey = activeProfileId ? `profile-switch-${activeProfileId}` : 'profile-add';

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  type ProfileSwitchItem =
    | { type: 'add'; id: 'add' }
    | { type: 'profile'; id: string; profile: PortalProfile };

  const orderedProfiles = [...profiles].sort((first, second) => {
    if (!activeProfileId) {
      return 0;
    }
    if (first.id === activeProfileId) {
      return -1;
    }
    if (second.id === activeProfileId) {
      return 1;
    }
    return 0;
  });

  const data: ProfileSwitchItem[] = [
    { type: 'add', id: 'add' },
    ...orderedProfiles.map<ProfileSwitchItem>((profile) => ({
      type: 'profile',
      id: profile.id,
      profile,
    })),
  ];

  return (
    <ScreenLayout contentClassName="gap-8 max-w-xl mx-auto">
      <View className="gap-4">
        <TVFocusProvider initialFocusKey={initialFocusKey}>
          <FlatList
            horizontal
            data={data}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            ItemSeparatorComponent={() => <View className="w-4" />}
            ListHeaderComponent={() => <View className="w-2" />}
            ListFooterComponent={() => <View className="w-2" />}
            renderItem={({ item }) => {
              if (item.type === 'add') {
                return (
                  <View>
                    <TVFocusPressable
                      focusKey="profile-add"
                      onPress={() =>
                        router.push({
                          pathname: '/(auth)/add-profile',
                          params: { allowExisting: '1' },
                        })
                      }
                      unstyled
                      className="h-36 w-36 items-center justify-center rounded-full border-2 border-white/10 bg-white/5 px-3 py-4"
                      focusClassName="border-primary bg-white/10"
                    >
                      <MaterialIcons name="add" className="text-white" size={40} />
                    </TVFocusPressable>
                    <Text className="text-white text-sm font-semibold text-center mt-3">
                      {t('settings.profiles.addCta')}
                    </Text>
                  </View>
                );
              }

              const isActive = item.profile.id === activeProfileId;
              const avatarSeed =
                item.profile.avatarSeed ?? item.profile.profileName ?? item.profile.id;

              return (
                <View>
                  <TVFocusPressable
                    focusKey={`profile-switch-${item.profile.id}`}
                    onPress={() => {
                      setActiveProfileId(item.profile.id);
                      router.replace('/(tabs)');
                    }}
                    unstyled
                    className={cn(
                      'h-36 w-36 items-center justify-center rounded-full border-2 bg-white/5 px-3 py-4',
                      isActive ? 'border-white' : 'border-white/10',
                    )}
                    focusClassName="border-primary bg-white/10"
                  >
                    <Image
                      source={{ uri: getAvatarUrl(avatarSeed) }}
                      className="h-24 w-24 rounded-full"
                      contentFit="cover"
                    />
                  </TVFocusPressable>
                  <Text className="text-white text-sm font-semibold text-center mt-3">
                    {item.profile.profileName}
                  </Text>
                </View>
              );
            }}
          />
        </TVFocusProvider>
      </View>
      <View className={'mt-10'}>
        <TVFocusPressable
          focusKey="manage-profiles"
          onPress={() => router.push('/(tabs)/settings/manage-profiles')}
          className="w-full items-center flex flex-row justify-between rounded-lg bg-white/10 py-4"
          focusClassName="bg-primary"
        >
          <Text className="text-white text-base font-semibold">
            {t('settings.profiles.manageCta')}
          </Text>
          <MaterialIcons name={'chevron-right'} className={'text-white'} size={24} />
        </TVFocusPressable>
      </View>
      <View className={'mt-4 gap-3'}>
        <Text className="text-white text-xl font-semibold">{t('screens.settings.title')}</Text>
        <TVFocusPressable
          onPress={() => router.push('/(tabs)/settings/account')}
          className="w-full items-center flex flex-row justify-between rounded-lg bg-white/10 py-4"
          focusClassName="bg-primary"
        >
          <Text className="text-white text-base font-semibold">{t('settings.actions.account')}</Text>
          <MaterialIcons name={'chevron-right'} className={'text-white'} size={24} />
        </TVFocusPressable>
        <TVFocusPressable
          onPress={() => {
            if (!activeProfile) {
              Alert.alert(
                t('settings.actions.noActiveProfileTitle'),
                t('settings.actions.noActiveProfileMessage'),
                [{ text: t('common.cancel'), style: 'cancel' }],
              );
              return;
            }
            Alert.alert(
              t('settings.actions.refreshTitle'),
              t('settings.actions.refreshMessage'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('settings.actions.refreshConfirm'),
                  style: 'default',
                  onPress: () => {
                    refreshProfileData();
                  },
                },
              ],
            );
          }}
          className="w-full items-center flex flex-row justify-between rounded-lg bg-white/10 py-4"
          focusClassName="bg-primary"
        >
          <Text className="text-white text-base font-semibold">
            {t('settings.actions.refresh')}
          </Text>
          <MaterialIcons name={'chevron-right'} className={'text-white'} size={24} />
        </TVFocusPressable>
        <TVFocusPressable
          onPress={() =>
            Alert.alert(
              t('settings.actions.logoutTitle'),
              t('settings.actions.logoutMessage'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('settings.actions.logoutConfirm'),
                  style: 'destructive',
                  onPress: async () => {
                    for (const profile of profiles) {
                      await clearCatalogForProfile(profile.id);
                    }
                    await clearCache();
                    await clearProfiles();
                    setActiveProfileId(null);
                    router.replace('/(auth)/add-profile');
                  },
                },
              ],
            )
          }
          className="w-full items-center flex flex-row justify-between rounded-lg bg-white/10 py-4"
          focusClassName="bg-primary"
        >
          <Text className="text-white text-base font-semibold">
            {t('settings.actions.logout')}
          </Text>
          <MaterialIcons name={'chevron-right'} className={'text-white'} size={24} />
        </TVFocusPressable>
      </View>
      {refreshStatus === 'error' && refreshErrorKey ? (
        <Text className="rounded-md border border-primary bg-primary/20 px-4 py-3 text-primary text-sm">
          {t(refreshErrorKey)}
        </Text>
      ) : null}
      <FullscreenLoadingModal
        visible={refreshStatus === 'verifying' || refreshStatus === 'loading'}
        titleKey={
          refreshStatus === 'loading' && refreshProgress?.stepKey
            ? refreshProgress.stepKey
            : refreshStatus === 'loading'
              ? 'auth.status.loadingData'
              : 'auth.status.verifying'
        }
        progress={refreshStatus === 'loading' ? refreshProgress : null}
      />
    </ScreenLayout>
  );
}
