import { Stack, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { useI18n } from '@/components/i18n/I18nProvider';

export default function NotFoundScreen() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-black px-10">
      <Stack.Screen options={{ title: t('app.name') }} />
      <Text className="text-white text-xl font-semibold">
        {t('notFound.title')}
      </Text>
      <TVFocusPressable
        focusKey="not-found-home"
        onPress={() => router.replace('/')}
        hasTVPreferredFocus
        className="mt-4 rounded-md border-white/20 px-6 py-3"
        focusClassName="border-primary"
      >
        <Text className="text-primary text-base font-semibold">
          {t('notFound.cta')}
        </Text>
      </TVFocusPressable>
    </SafeAreaView>
  );
}
