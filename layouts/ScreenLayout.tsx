import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { useI18n } from '@/components/i18n/I18nProvider';
import { cn } from '@/components/ui/cn';
import type { TranslationKey } from '@/constants/i18n';

type ScreenLayoutProps = {
  titleKey?: TranslationKey;
  children?: ReactNode;
  contentClassName?: string;
};

export function ScreenLayout({ titleKey, children, contentClassName }: ScreenLayoutProps) {
  const { t } = useI18n();

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <View className="flex-1 px-10 py-8">
        <View className={cn('flex-1 w-full gap-6', contentClassName)}>
          {titleKey ? (
            <Text className="text-white text-3xl font-semibold">{t(titleKey)}</Text>
          ) : null}
          <View className="flex-1">{children}</View>
        </View>
      </View>
    </SafeAreaView>
  );
}
