import { Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useRef } from 'react';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { useI18n } from '@/components/i18n/I18nProvider';
import { cn } from '@/components/ui/cn';
import type { TranslationKey } from '@/constants/i18n';
import { BlurView } from 'expo-blur';

export type VodSelectionOption = {
  id: string | null;
  label: string;
};

type VodSelectionModalProps = {
  visible: boolean;
  titleKey: TranslationKey;
  options: VodSelectionOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
};

const buildOptionKey = (id: string | null) => `vod-modal-option-${id ?? 'all'}`;

export function VodSelectionModal({
  visible,
  titleKey,
  options,
  selectedId,
  onSelect,
  onClose,
}: VodSelectionModalProps) {
  const { t } = useI18n();
  const scrollRef = useRef<ScrollView>(null);
  const rowPositions = useRef<Record<string, number>>({});
  const pendingScrollKey = useRef<string | null>(null);
  const initialFocusKey = useMemo(() => {
    const selected = options.find((option) => option.id === selectedId);
    return buildOptionKey(selected?.id ?? options[0]?.id ?? null);
  }, [options, selectedId]);
  const selectedKey = useMemo(
    () => String(selectedId ?? options[0]?.id ?? 'all'),
    [options, selectedId],
  );

  useEffect(() => {
    if (!visible) {
      pendingScrollKey.current = null;
      return;
    }
    pendingScrollKey.current = selectedKey;
    const y = rowPositions.current[selectedKey];
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: false });
    }
  }, [selectedKey, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView className={'flex-1'} intensity={30} experimentalBlurMethod={'dimezisBlurView'}>
        <SafeAreaView className="flex-1 bg-black/80">
          <TVFocusProvider initialFocusKey={initialFocusKey}>
            <View className="flex-1 px-10 py-10">
              <View className="flex-1 w-full max-w-2xl self-center gap-6">
                <Text className="text-white text-2xl font-semibold">{t(titleKey)}</Text>
              <ScrollView
                ref={scrollRef}
                className="flex-1 -ml-4"
                contentContainerClassName="gap-3 pb-6"
                showsVerticalScrollIndicator={false}
              >
                {options.map((item) => {
                  const isSelected = item.id === selectedId;
                  const optionKey = String(item.id ?? 'all');
                  return (
                    <TVFocusPressable
                      key={optionKey}
                      focusKey={buildOptionKey(item.id)}
                      onPress={() => {
                        onSelect(item.id);
                        onClose();
                      }}
                      onLayout={(event) => {
                        rowPositions.current[optionKey] =
                          event.nativeEvent.layout.y;
                        if (pendingScrollKey.current === optionKey) {
                          scrollRef.current?.scrollTo({
                            y: Math.max(0, event.nativeEvent.layout.y - 24),
                            animated: false,
                          });
                          pendingScrollKey.current = null;
                        }
                      }}
                      unstyled
                      className={cn(
                        'w-full py-4 border-l-4 pl-4',
                        isSelected ? 'border-primary border-l-3' : 'border-transparent',
                      )}
                        focusClassName="border-primary"
                      >
                        <Text className="text-white text-lg font-semibold">{item.label}</Text>
                      </TVFocusPressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </TVFocusProvider>
        </SafeAreaView>
      </BlurView>
    </Modal>
  );
}
