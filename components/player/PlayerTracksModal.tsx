import { Modal, Text, View } from 'react-native';

import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { MaterialIcons } from '@/components/ui/Icons';

type TrackItem = { id: number; name: string };

type PlayerTracksModalProps = {
  visible: boolean;
  audioTracks: TrackItem[];
  textTracks: TrackItem[];
  selectedAudio: number | null;
  selectedText: number | null;
  onSelectAudio: (trackId: number) => void;
  onSelectText: (trackId: number) => void;
  onClose: () => void;
  labels: {
    audio: string;
    subtitles: string;
    close: string;
    unavailable: string;
    trackFallback: string;
  };
};

const renderTrackList = (
  items: TrackItem[],
  selectedId: number | null,
  onSelect: (id: number) => void,
  focusKeyPrefix: string,
  emptyLabel: string,
  trackFallbackLabel: string,
) => {
  if (items.length === 0) {
    return <Text className="text-white/60 text-sm">{emptyLabel}</Text>;
  }
  return (
    <View className="gap-3">
      {items.map((track) => {
        const isActive = track.id === selectedId;
        const label = track.name?.trim()
          ? track.name
          : `${trackFallbackLabel} ${track.id}`;
        return (
          <TVFocusPressable
            key={`${focusKeyPrefix}-${track.id}`}
            focusKey={`${focusKeyPrefix}-${track.id}`}
            onPress={() => onSelect(track.id)}
            unstyled
            className="rounded-full px-4 py-2 bg-white/10"
            focusClassName="bg-primary"
          >
            <Text className={isActive ? 'text-white text-sm font-semibold' : 'text-white/70 text-sm'}>
              {label}
            </Text>
          </TVFocusPressable>
        );
      })}
    </View>
  );
};

export function PlayerTracksModal({
  visible,
  audioTracks,
  textTracks,
  selectedAudio,
  selectedText,
  onSelectAudio,
  onSelectText,
  onClose,
  labels,
}: PlayerTracksModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TVFocusProvider initialFocusKey="player-tracks-close">
        <View className="flex-1">
          <View className="absolute inset-0 bg-black/80" />
          <View className="flex-1 px-16 py-10 gap-6">
            <View className="flex-row justify-end">
              <TVFocusPressable
                focusKey="player-tracks-close"
                onPress={onClose}
                unstyled
                className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
                focusClassName="bg-primary"
                accessibilityLabel={labels.close}
              >
                <MaterialIcons name="close" size={22} className="text-white" />
              </TVFocusPressable>
            </View>
            <View className="flex-1 flex-row gap-12">
              <View className="flex-1 gap-4">
                <Text className="text-white/60 text-xs uppercase">{labels.subtitles}</Text>
                {renderTrackList(
                  textTracks,
                  selectedText,
                  onSelectText,
                  'player-subtitle',
                  labels.unavailable,
                  labels.trackFallback,
                )}
              </View>
              <View className="flex-1 gap-4">
                <Text className="text-white/60 text-xs uppercase">{labels.audio}</Text>
                {renderTrackList(
                  audioTracks,
                  selectedAudio,
                  onSelectAudio,
                  'player-audio',
                  labels.unavailable,
                  labels.trackFallback,
                )}
              </View>
            </View>
          </View>
        </View>
      </TVFocusProvider>
    </Modal>
  );
}
