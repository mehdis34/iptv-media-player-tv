import { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/components/i18n/I18nProvider';
import { ProfileForm } from '@/components/portals/ProfileForm';
import { Image } from '@/components/ui/ExpoImage';
import { FullscreenLoadingModal } from '@/components/ui/FullscreenLoadingModal';
import { MaterialIcons } from '@/components/ui/Icons';
import { useProfileConnection } from '@/hooks/useProfileConnection';
import { useProfiles } from '@/hooks/useProfiles';
import { usePortalStore } from '@/hooks/usePortalStore';
import type { PortalProfileInput } from '@/types/profile';

type AddProfileScreenProps = {
  onNavigateToTabs: () => void;
};

export function AddProfileScreen({
  onNavigateToTabs,
}: AddProfileScreenProps) {
  const { t } = useI18n();
  const { createProfile } = useProfiles();
  const setActiveProfileId = usePortalStore((state) => state.setActiveProfileId);
  const { status, errorKey, progress, connectProfile } = useProfileConnection();

  const handleSubmit = useCallback(
    async (values: PortalProfileInput) => {
      const createdProfile = await connectProfile(values, {
        onVerified: async () => await createProfile(values),
      });

      if (!createdProfile) {
        return;
      }

      setActiveProfileId(createdProfile.id);
      onNavigateToTabs();
    },
    [
      connectProfile,
      createProfile,
      onNavigateToTabs,
      setActiveProfileId,
    ],
  );

  const isModalVisible = status === 'verifying' || status === 'loading';
  const modalTitleKey =
    status === 'loading' && progress?.stepKey
      ? progress.stepKey
      : status === 'loading'
        ? 'auth.status.loadingData'
        : 'auth.status.verifying';

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 flex-row">
        <View className="relative flex-[1.1]">
          <Image
            source={require('../../assets/images/movies-wall.jpg')}
            className="absolute inset-0"
            contentFit="cover"
          />
          <View className="absolute inset-0 bg-black/45" />
          <View className="absolute inset-y-0 right-0 flex-row">
            <View className="w-6 bg-black/0" />
            <View className="w-6 bg-black/10" />
            <View className="w-6 bg-black/20" />
            <View className="w-6 bg-black/30" />
            <View className="w-6 bg-black/40" />
            <View className="w-6 bg-black/50" />
            <View className="w-6 bg-black/60" />
            <View className="w-6 bg-black/70" />
            <View className="w-6 bg-black/80" />
            <View className="w-6 bg-black/90" />
          </View>
          <View className="flex-1 items-center justify-center gap-4">
            <Image
              source={require('../../assets/images/icon.png')}
              className="h-24 w-24"
              contentFit="contain"
            />
            <Text className="text-white text-2xl font-semibold">{t('app.name')}</Text>
          </View>
        </View>
        <ScrollView className="flex-1 px-10 py-10" showsVerticalScrollIndicator={false}>
          <View className="w-full max-w-3xl self-center gap-6 pb-24">
            <Text className="text-white text-3xl font-semibold">{t('auth.addProfile.title')}</Text>
            <Text className="text-white/70 text-base">{t('auth.addProfile.subtitle')}</Text>
            {status === 'error' && errorKey ? (
              <View className="flex-row items-center gap-3 rounded-md border border-primary/30 bg-primary/20 p-4">
                <MaterialIcons name="error" className="text-white text-2xl" />
                <Text className="flex-1 text-sm text-white">{t(errorKey)}</Text>
              </View>
            ) : null}
            <ProfileForm
              onSubmit={handleSubmit}
              submitKey="auth.addProfile.cta"
              withRandomAvatarSeed
            />
          </View>
        </ScrollView>
      </View>
      <FullscreenLoadingModal
        visible={isModalVisible}
        titleKey={modalTitleKey}
        progress={status === 'loading' ? progress : null}
      />
    </SafeAreaView>
  );
}
