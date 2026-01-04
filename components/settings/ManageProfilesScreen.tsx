import { useCallback } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useProfiles } from '@/hooks/useProfiles';
import { ScreenLayout } from '@/layouts/ScreenLayout';
import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { MaterialIcons } from '@expo/vector-icons';
import { getAvatarUrl } from '@/components/portals/avatarHelpers';
import { Image } from '@/components/ui/ExpoImage';

export function ManageProfilesScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { profiles, refresh } = useProfiles();
  const initialFocusKey = profiles[0]?.id ? `manage-profile-${profiles[0]?.id}` : undefined;

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <ScreenLayout contentClassName="gap-8 max-w-xl mx-auto">
      <TVFocusProvider initialFocusKey={initialFocusKey}>
        <Text className={'text-white text-3xl font-semibold text-center my-12'}>
          {t('settings.profiles.manageTitle')}
        </Text>
        <FlatList
          data={profiles}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerClassName={'gap-3'}
          ListEmptyComponent={() => (
            <Text className="text-white/70 text-base">{t('settings.profiles.empty')}</Text>
          )}
          renderItem={({ item }) => {
            const avatarSeed = item.avatarSeed ?? item.profileName ?? item.id;
            return (
              <View>
                <TVFocusPressable
                  focusKey={`manage-profile-${item.id}`}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/settings/edit-profile',
                      params: { id: item.id },
                    })
                  }
                  unstyled
                  className="h-36 w-36 items-center justify-center rounded-full border-2 bg-white/5"
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
                <Text className="text-white text-sm font-semibold text-center mt-3">
                  {item.profileName}
                </Text>
              </View>
            );
          }}
        />
      </TVFocusProvider>
    </ScreenLayout>
  );
}
