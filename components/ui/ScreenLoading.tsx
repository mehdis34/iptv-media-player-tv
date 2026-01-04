import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/components/i18n/I18nProvider';

export function ScreenLoading() {
  const { t } = useI18n();

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-black">
      <Text className="text-white text-lg">{t('common.loading')}</Text>
    </SafeAreaView>
  );
}
