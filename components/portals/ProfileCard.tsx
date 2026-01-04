import { Text, View } from 'react-native';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { PortalProfile } from '@/types/profile';

type ProfileCardProps = {
  profile: PortalProfile;
  focusKey: string;
  onPress: (profile: PortalProfile) => void;
};

export function ProfileCard({ profile, focusKey, onPress }: ProfileCardProps) {
  const { t } = useI18n();

  return (
    <TVFocusPressable
      focusKey={focusKey}
      onPress={() => onPress(profile)}
      className="rounded-lg px-6 py-5"
      focusClassName="border-primary"
    >
      <View className="gap-2">
        <Text className="text-white text-xl font-semibold">
          {profile.profileName}
        </Text>
        <View className="gap-1">
          <Text className="text-white/60 text-sm">
            {t('auth.fields.host')}
          </Text>
          <Text className="text-white text-sm">{profile.host}</Text>
        </View>
        <View className="gap-1">
          <Text className="text-white/60 text-sm">
            {t('auth.fields.username')}
          </Text>
          <Text className="text-white text-sm">{profile.username}</Text>
        </View>
      </View>
    </TVFocusPressable>
  );
}
