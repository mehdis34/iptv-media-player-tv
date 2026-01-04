import { ActivityIndicator, Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/components/i18n/I18nProvider';
import type { TranslationKey } from '@/constants/i18n';
import { Image } from '@/components/ui/ExpoImage';

type FullscreenLoadingModalProps = {
  visible: boolean;
  titleKey: TranslationKey;
  messageKey?: TranslationKey;
  progress?: {
    stepKey: TranslationKey;
    current: number;
    total: number;
  } | null;
  onRequestClose?: () => void;
};

export function FullscreenLoadingModal({
  visible,
  titleKey,
  messageKey,
  progress,
  onRequestClose,
}: FullscreenLoadingModalProps) {
  const { t } = useI18n();
  const showStep = progress?.stepKey != null && progress.stepKey !== titleKey;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <SafeAreaView className="flex-1 bg-black/90">
        <View className="flex-1 items-center justify-center px-10">
          <View className="w-full max-w-3xl px-10 py-10">
            <View className="mt-8 gap-6">
              <ActivityIndicator size="large" className={'text-primary'} />
              <Text className="text-white text-xl font-semibold text-center">{t(titleKey)}</Text>
              {showStep ? (
                <Text className="text-white/80 text-base">{t(progress.stepKey)}</Text>
              ) : null}
              {progress ? (
                <Text className="text-white/80 text-sm">
                  {t('auth.status.progress', {
                    current: progress.current,
                    total: progress.total,
                  })}
                </Text>
              ) : null}
              {messageKey ? <Text className="text-white/70 text-base">{t(messageKey)}</Text> : null}
            </View>

            {progress ? (
              <View className="mt-6 flex-row items-center gap-2">
                {Array.from({ length: progress.total }).map((_, index) => (
                  <View
                    key={`progress-${index}`}
                    className={
                      index < progress.current
                        ? 'h-1 flex-1 rounded-full bg-primary'
                        : 'h-1 flex-1 rounded-full bg-white/50'
                    }
                  />
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
