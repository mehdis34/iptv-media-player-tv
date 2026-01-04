import { useCallback } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { useI18n } from '@/components/i18n/I18nProvider';
import { ProfileForm } from '@/components/portals/ProfileForm';
import { getAvatarUrl } from '@/components/portals/avatarHelpers';
import { Image } from '@/components/ui/ExpoImage';
import { FullscreenLoadingModal } from '@/components/ui/FullscreenLoadingModal';
import { MaterialIcons } from '@/components/ui/Icons';
import { useProfilesCacheStore } from '@/hooks/useProfilesCacheStore';
import { useProfileEditor } from '@/hooks/useProfileEditor';
import { usePortalStore } from '@/hooks/usePortalStore';
import { ScreenLayout } from '@/layouts/ScreenLayout';
import { clearCatalogForProfile, clearEpgForProfile } from '@/storage/catalog';
import { removeProfile } from '@/storage/profiles';
import type { PortalProfileInput } from '@/types/profile';

export function EditProfileScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const profileId = Array.isArray(params.id) ? params.id[0] : (params.id ?? null);
  const { profile, status, submit, connectionStatus, errorKey, progress } =
    useProfileEditor(profileId);
  const setActiveProfileId = usePortalStore((state) => state.setActiveProfileId);
  const bumpProfilesCache = useProfilesCacheStore((state) => state.bump);

  const handleSubmit = useCallback(
    async (values: PortalProfileInput) => {
      const result = await submit(values);
      if (!result.profile) {
        return;
      }
      if (result.didSync) {
        router.replace('/(tabs)');
        return;
      }
      router.back();
    },
    [router, submit],
  );

  if (status === 'loading') {
    return (
      <ScreenLayout titleKey="settings.profiles.editTitle">
        <Text className="text-white/70 text-base">{t('common.loading')}</Text>
      </ScreenLayout>
    );
  }

  if (!profile) {
    return (
      <ScreenLayout titleKey="settings.profiles.editTitle">
        <Text className="text-white/70 text-base">{t('settings.profiles.notFound')}</Text>
      </ScreenLayout>
    );
  }

  const avatarSeed = profile.avatarSeed ?? profile.profileName ?? profile.id;

  const isModalVisible = connectionStatus === 'verifying' || connectionStatus === 'loading';
  const modalTitleKey =
    connectionStatus === 'loading' && progress?.stepKey
      ? progress.stepKey
      : connectionStatus === 'loading'
        ? 'auth.status.loadingData'
        : 'auth.status.verifying';

  return (
    <ScreenLayout contentClassName="gap-8 max-w-xl mx-auto">
      <TVFocusProvider initialFocusKey="edit-avatar">
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text className={'text-white text-3xl font-semibold text-center mb-6'}>
            {t('settings.profiles.editTitle')}
          </Text>
          <TVFocusPressable
            focusKey="edit-avatar"
            onPress={() =>
              router.push({
                pathname: '/(tabs)/settings/select-avatar',
                params: { id: profile.id },
              })
            }
            unstyled
            className="h-36 w-36 items-center justify-center rounded-full border-2 bg-white/5 mx-auto"
            focusClassName="border-primary bg-white/10"
          >
            <View
              className={
                'absolute top-0 right-3 z-50 bg-neutral-800 items-center justify-center rounded-full w-8 h-8'
              }
            >
              <MaterialIcons name="edit" className="text-base text-white/70" />
            </View>
            <Image
              source={{ uri: getAvatarUrl(avatarSeed) }}
              className="h-24 w-24 rounded-full"
              contentFit="cover"
            />
          </TVFocusPressable>
          {connectionStatus === 'error' && errorKey ? (
            <View className="flex-row items-center gap-3 rounded-md border border-primary/30 bg-primary/20 p-4 my-6">
              <MaterialIcons name="error" className="text-white text-2xl" />
              <Text className="flex-1 text-sm text-white">{t(errorKey)}</Text>
            </View>
          ) : null}
          <ProfileForm
            onSubmit={handleSubmit}
            submitKey="settings.profiles.saveCta"
            initialValues={profile}
            initialFocusKey={null}
            showDevTools={false}
          />
          <Text className="text-white text-base font-semibold my-6 text-center">
            - {t('common.or')} -
          </Text>
          <TVFocusPressable
            focusKey="delete-profile"
            onPress={() =>
              Alert.alert(
                t('settings.profiles.deleteTitle'),
                t('settings.profiles.deleteMessage'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('settings.profiles.deleteCta'),
                    style: 'destructive',
                    onPress: async () => {
                      await clearCatalogForProfile(profile.id);
                      await clearEpgForProfile(profile.id);
                      await removeProfile(profile.id);
                      bumpProfilesCache();
                      setActiveProfileId(null);
                      router.replace('/(auth)/select-profile');
                    },
                  },
                ],
              )
            }
            className="w-full items-center justify-center rounded-lg border border-primary/40 bg-primary/10 py-4"
            focusClassName="bg-primary"
          >
            <Text className="text-white text-base font-semibold">
              {t('settings.profiles.deleteCta')}
            </Text>
          </TVFocusPressable>
        </ScrollView>
      </TVFocusProvider>
      <FullscreenLoadingModal
        visible={isModalVisible}
        titleKey={modalTitleKey}
        progress={connectionStatus === 'loading' ? progress : null}
      />
    </ScreenLayout>
  );
}
