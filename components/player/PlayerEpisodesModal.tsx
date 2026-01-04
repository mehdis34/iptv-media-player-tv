import { FlatList, Modal, Text, View } from 'react-native';

import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { Image } from '@/components/ui/ExpoImage';
import { MaterialIcons } from '@/components/ui/Icons';

export type EpisodeEntry = {
  id: string;
  title: string;
  image: string | null;
  episodeId?: string | null;
  seasonId?: string | null;
  containerExtension?: string | null;
};

type PlayerEpisodesModalProps = {
  visible: boolean;
  episodes: EpisodeEntry[];
  activeEpisodeId: string | null;
  onSelectEpisode: (episodeId: string) => void;
  onClose: () => void;
  onShowSeasons: () => void;
  labels: {
    episodes: string;
    seasons: string;
    empty: string;
    close: string;
  };
};

export function PlayerEpisodesModal({
  visible,
  episodes,
  activeEpisodeId,
  onSelectEpisode,
  onClose,
  onShowSeasons,
  labels,
}: PlayerEpisodesModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TVFocusProvider initialFocusKey="player-episodes-close">
        <View className="flex-1">
          <View className="absolute inset-0 bg-black/80" />
          <View className="flex-1 px-10 py-8 gap-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-white text-lg font-semibold">{labels.episodes}</Text>
              <View className="flex-row items-center gap-3">
                <TVFocusPressable
                  focusKey="player-episodes-seasons"
                  onPress={onShowSeasons}
                  unstyled
                  className="rounded-full bg-white/10 px-4 py-2"
                  focusClassName="bg-primary"
                  accessibilityLabel={labels.seasons}
                >
                  <Text className="text-white text-sm font-semibold">{labels.seasons}</Text>
                </TVFocusPressable>
                <TVFocusPressable
                  focusKey="player-episodes-close"
                  onPress={onClose}
                  unstyled
                  className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
                  focusClassName="bg-primary"
                  accessibilityLabel={labels.close}
                >
                  <MaterialIcons name="close" size={22} className="text-white" />
                </TVFocusPressable>
              </View>
            </View>
            {episodes.length === 0 ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-white/60 text-sm">{labels.empty}</Text>
              </View>
            ) : (
              <FlatList
                data={episodes}
                keyExtractor={(episode) => episode.id}
                horizontal
                contentContainerClassName="gap-4"
                showsHorizontalScrollIndicator={false}
                renderItem={({ item: episode }) => {
                  const isActive = episode.id === activeEpisodeId;
                  return (
                    <TVFocusPressable
                      focusKey={`player-episode-${episode.id}`}
                      onPress={() => onSelectEpisode(episode.id)}
                      unstyled
                      className="group w-44"
                    >
                      <View className="gap-2">
                        <View className="relative h-24 w-44 overflow-hidden rounded-md bg-white/10">
                          {episode.image ? (
                            <Image
                              source={{ uri: episode.image }}
                              className="h-full w-full"
                              contentFit="cover"
                            />
                          ) : null}
                          <View
                            pointerEvents="none"
                            className="absolute inset-0 rounded-md border-2 border-transparent group-focus:border-primary"
                          />
                        </View>
                        <Text
                          className={
                            isActive
                              ? 'text-white text-sm font-semibold'
                              : 'text-white/80 text-sm font-semibold'
                          }
                          numberOfLines={2}
                        >
                          {episode.title}
                        </Text>
                      </View>
                    </TVFocusPressable>
                  );
                }}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={5}
                removeClippedSubviews
              />
            )}
          </View>
        </View>
      </TVFocusProvider>
    </Modal>
  );
}
