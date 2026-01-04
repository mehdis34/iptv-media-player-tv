import { useCallback } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { useI18n } from '@/components/i18n/I18nProvider';
import { getAvatarUrl } from '@/components/portals/avatarHelpers';
import { Image } from '@/components/ui/ExpoImage';
import { useProfileById } from '@/hooks/useProfileById';
import { ScreenLayout } from '@/layouts/ScreenLayout';
import type { PortalProfileInput } from '@/types/profile';

const avatarSeeds = [
  'nova',
  'orion',
  'atlas',
  'lumen',
  'vega',
  'nexus',
  'pixel',
  'cosmo',
  'aurora',
  'zenith',
  'ember',
  'drift',
  'pulse',
  'halo',
  'solace',
  'draco',
  'luna',
  'echo',
  'flux',
  'orbit',
  'raven',
  'spectrum',
  'glitch',
  'ripple',
  'vertex',
  'glyph',
  'quartz',
  'ember-2',
  'nova-2',
  'orbit-2',
];

export function SelectAvatarScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const profileId = Array.isArray(params.id) ? params.id[0] : (params.id ?? null);
  const { profile, status, save } = useProfileById(profileId);

  const handleSelect = useCallback(
    async (seed: string) => {
      if (!profile) {
        return;
      }
      const input: PortalProfileInput = {
        profileName: profile.profileName,
        host: profile.host,
        username: profile.username,
        password: profile.password,
        avatarSeed: seed,
      };
      await save(input);
      router.back();
    },
    [profile, save, router],
  );

  const initialFocusKey = `avatar-${avatarSeeds[0]}`;

  if (status === 'loading') {
    return (
      <ScreenLayout contentClassName="gap-8 max-w-xl mx-auto">
        <Text className="text-white/70 text-base">{t('common.loading')}</Text>
      </ScreenLayout>
    );
  }

  if (!profile) {
    return (
      <ScreenLayout contentClassName="gap-8 max-w-xl mx-auto">
        <Text className="text-white/70 text-base">{t('settings.profiles.notFound')}</Text>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout contentClassName="gap-8 max-w-xl mx-auto">
      <TVFocusProvider initialFocusKey={initialFocusKey}>
        <Text className="text-white text-3xl font-semibold text-center my-12">
          {t('settings.profiles.selectAvatarTitle')}
        </Text>
        <FlatList
          data={avatarSeeds}
          keyExtractor={(item) => item}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          className={'mb-36'}
          renderItem={({ item }) => (
            <View className="w-1/3 items-center pb-8">
              <TVFocusPressable
                focusKey={`avatar-${item}`}
                onPress={() => handleSelect(item)}
                unstyled
                className="h-24 w-24 items-center justify-center rounded-full border-2 bg-white/5"
                focusClassName="border-primary bg-white/10"
              >
                <Image
                  source={{ uri: getAvatarUrl(item) }}
                  className="h-16 w-16 rounded-full"
                  contentFit="cover"
                />
              </TVFocusPressable>
            </View>
          )}
        />
      </TVFocusProvider>
    </ScreenLayout>
  );
}
