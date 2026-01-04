import { useCallback, useEffect, useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';

import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { useI18n } from '@/components/i18n/I18nProvider';
import { getAvatarUrl } from '@/components/portals/avatarHelpers';
import { FullscreenLoadingModal } from '@/components/ui/FullscreenLoadingModal';
import { Image } from '@/components/ui/ExpoImage';
import { MaterialIcons } from '@/components/ui/Icons';
import { ScreenLoading } from '@/components/ui/ScreenLoading';
import { ScreenLayout } from '@/layouts/ScreenLayout';
import { useProfileConnection } from '@/hooks/useProfileConnection';
import { useProfiles } from '@/hooks/useProfiles';
import { usePortalStore } from '@/hooks/usePortalStore';
import type { PortalProfile } from '@/types/profile';

const ADD_PROFILE_FOCUS_KEY = 'add-profile';

type SelectProfileScreenProps = {
  onNavigateToTabs: () => void;
  onNavigateToAddProfile: () => void;
  onRedirectEmpty?: () => void;
};

export function SelectProfileScreen({
  onNavigateToTabs,
  onNavigateToAddProfile,
  onRedirectEmpty,
}: SelectProfileScreenProps) {
  const { t } = useI18n();
  const { profiles, status } = useProfiles();
  const setActiveProfileId = usePortalStore((state) => state.setActiveProfileId);
  const {
    status: connectionStatus,
    errorKey,
    progress,
    connectProfile,
    reset,
  } = useProfileConnection();

  const handleSelect = useCallback(
    async (profile: PortalProfile) => {
      reset();
      const verifiedProfile = await connectProfile(profile, {
        skipSync: true,
        skipVerify: true,
      });

      if (!verifiedProfile) {
        return;
      }

      setActiveProfileId(verifiedProfile.id);
      onNavigateToTabs();
    },
    [connectProfile, onNavigateToTabs, reset, setActiveProfileId],
  );

  const handleAddProfile = useCallback(() => {
    onNavigateToAddProfile();
  }, [onNavigateToAddProfile]);

  type ProfileGridItem =
    | { type: 'add'; id: 'add' }
    | { type: 'profile'; id: string; profile: PortalProfile };

  const data: ProfileGridItem[] = [
    { type: 'add', id: 'add' },
    ...profiles.map<ProfileGridItem>((profile) => ({
      type: 'profile',
      id: profile.id,
      profile,
    })),
  ];

  const focusKey = useMemo(() => {
    if (profiles.length > 0) {
      return `profile-${profiles[0].id}`;
    }
    return ADD_PROFILE_FOCUS_KEY;
  }, [profiles]);

  useEffect(() => {
    if (status !== 'ready') {
      return;
    }
    if (profiles.length === 0) {
      onRedirectEmpty?.();
    }
  }, [onRedirectEmpty, profiles.length, status]);

  if (status === 'loading') {
    return <ScreenLoading />;
  }

  const isModalVisible = connectionStatus === 'verifying' || connectionStatus === 'loading';
  const modalTitleKey =
    connectionStatus === 'loading' && progress?.stepKey
      ? progress.stepKey
      : connectionStatus === 'loading'
        ? 'auth.status.loadingData'
        : 'auth.status.verifying';

  return (
    <ScreenLayout contentClassName="gap-8 max-w-xl mx-auto">
      <TVFocusProvider initialFocusKey={focusKey}>
        <Text className="text-white text-3xl font-semibold text-center my-12">
          {t('auth.selectProfile.title')}
        </Text>
        {connectionStatus === 'error' && errorKey ? (
          <Text className="rounded-md border border-primary bg-primary/20 px-4 py-3 text-primary text-sm">
            {t(errorKey)}
          </Text>
        ) : null}
        <FlatList
          data={data}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerClassName={'gap-6'}
          renderItem={({ item }) => {
            if (item.type === 'add') {
              return (
                <View>
                  <TVFocusPressable
                    focusKey={ADD_PROFILE_FOCUS_KEY}
                    onPress={handleAddProfile}
                    unstyled
                    className="h-36 w-36 items-center justify-center rounded-full border-2 border-white/10 bg-white/5"
                    focusClassName="border-primary bg-white/10"
                  >
                    <MaterialIcons name="add" className="text-white text-4xl" />
                  </TVFocusPressable>
                  <Text className="text-white text-sm font-semibold text-center mt-3">
                    {t('auth.selectProfile.addCta')}
                  </Text>
                </View>
              );
            }

            const avatarSeed =
              item.profile.avatarSeed ?? item.profile.profileName ?? item.profile.id;

            return (
              <View>
                <TVFocusPressable
                  focusKey={`profile-${item.profile.id}`}
                  onPress={() => handleSelect(item.profile)}
                  unstyled
                  className="h-36 w-36 items-center justify-center rounded-full border-2 bg-white/5"
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
      <FullscreenLoadingModal
        visible={isModalVisible}
        titleKey={modalTitleKey}
        progress={connectionStatus === 'loading' ? progress : null}
      />
    </ScreenLayout>
  );
}
