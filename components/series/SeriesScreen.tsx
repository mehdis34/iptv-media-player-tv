import { Text } from 'react-native';

import { useI18n } from '@/components/i18n/I18nProvider';
import { ScreenLayout } from '@/layouts/ScreenLayout';

export function SeriesScreen() {
  const { t } = useI18n();

  return (
    <ScreenLayout titleKey="screens.series.title">
      <Text className="text-white/70 text-base">{t('screens.series.empty')}</Text>
    </ScreenLayout>
  );
}
