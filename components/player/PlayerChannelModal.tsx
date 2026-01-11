import { FlatList, Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import KeyEvent from 'react-native-keyevent';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { useI18n } from '@/components/i18n/I18nProvider';
import { Image } from '@/components/ui/ExpoImage';
import televisionImage from '@/assets/images/television.png';
import type { LiveChannelItem } from '@/components/player/useLiveChannelsList';
import type { HomeEpgListing } from '@/storage/catalog';

type PlayerChannelModalProps = {
  visible: boolean;
  channels: LiveChannelItem[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  activeChannelId: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  startIndex: number;
  onLoadMore: () => void;
  onSelect: (item: LiveChannelItem) => void;
  onClose: () => void;
};

const ITEM_HEIGHT = 84;
const SEPARATOR_HEIGHT = 12;
const VISIBLE_COUNT = 5;

const buildChannelKey = (id: string) => `player-channel-${id}`;

type ChannelRowProps = {
  item: LiveChannelItem;
  index: number;
  startIndex: number;
  noInfoLabel: string;
  isFocused: boolean;
  onSelect: (item: LiveChannelItem) => void;
  onFocus: (index: number) => void;
};

const ChannelRow = memo(function ChannelRow({
  item,
  index,
  startIndex,
  noInfoLabel,
  isFocused,
  onSelect,
  onFocus,
}: ChannelRowProps) {
  const numberLabel = `${startIndex + index + 1}. ${item.title}`;
  const programTitle = item.epgTitle ?? noInfoLabel;
  const scheduleItems = item.epgSchedule ?? [];
  const showRail = isFocused && scheduleItems.length > 0;
  const railRef = useRef<FlatList<HomeEpgListing>>(null);
  const railAutoFocusRef = useRef(false);
  const prevShowRailRef = useRef(false);

  useEffect(() => {
    if (showRail && !prevShowRailRef.current) {
      railAutoFocusRef.current = true;
    }
    if (!showRail) {
      railAutoFocusRef.current = false;
    }
    prevShowRailRef.current = showRail;
  }, [showRail]);

  const scrollRailTo = useCallback((railIndex: number) => {
    railRef.current?.scrollToIndex({
      index: railIndex,
      animated: false,
      viewPosition: 0,
    });
  }, []);

  const renderRailItem = useCallback(
    ({ item: program, index: railIndex }: { item: HomeEpgListing; index: number }) => (
      <View className="h-[84] flex-row items-center gap-3">
        <TVFocusPressable
          focusKey={`player-epg-${item.id}-${railIndex}`}
          hasTVPreferredFocus={railIndex === 0 && railAutoFocusRef.current}
          onFocus={() => {
            railAutoFocusRef.current = false;
            scrollRailTo(railIndex);
          }}
          unstyled
          className="h-24 w-40 rounded-md overflow-hidden border-2 border-transparent bg-black/30"
          focusClassName="border-primary"
          accessibilityLabel={program.title}
        >
          <Image
            source={item.image ? { uri: item.image } : televisionImage}
            className="h-full w-full"
            contentFit="contain"
          />
        </TVFocusPressable>
        <Text className="text-white text-base font-semibold" numberOfLines={1}>
          {program.title}
        </Text>
      </View>
    ),
    [item.id, scrollRailTo],
  );

  if (showRail) {
    return (
      <View className="h-[84] flex-row items-center">
        <FlatList
          ref={railRef}
          data={scheduleItems}
          keyExtractor={(program, railIndex) =>
            `${item.id}-${program.start ?? 'unknown'}-${railIndex}`
          }
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={renderRailItem}
          contentContainerClassName="gap-6"
        />
      </View>
    );
  }

  return (
    <TVFocusPressable
      focusKey={buildChannelKey(item.id)}
      onFocus={() => onFocus(index)}
      onPress={() => onSelect(item)}
      unstyled
      className="group h-[84] flex-row items-center gap-4"
    >
      <View className="h-24 w-40 rounded-md overflow-hidden border-2 border-transparent bg-black/30 group-focus:border-primary">
        <Image
          source={item.image ? { uri: item.image } : televisionImage}
          className="h-full w-full"
          contentFit="contain"
        />
      </View>
      <View className="flex-1 min-w-0 gap-2">
        <Text className="text-white text-base font-semibold" numberOfLines={1}>
          {numberLabel}
        </Text>
        <Text
          className="text-white/80 text-sm font-semibold opacity-0 group-focus:opacity-100"
          numberOfLines={1}
        >
          {programTitle}
        </Text>
      </View>
    </TVFocusPressable>
  );
});

export function PlayerChannelModal({
  visible,
  channels,
  status,
  activeChannelId,
  hasMore,
  isLoadingMore,
  startIndex,
  onLoadMore,
  onSelect,
  onClose,
}: PlayerChannelModalProps) {
  const { t } = useI18n();
  const listRef = useRef<FlatList<LiveChannelItem>>(null);
  const [focusedChannelId, setFocusedChannelId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [focusOverrideKey, setFocusOverrideKey] = useState<string | null>(null);
  const [focusOverrideNonce, setFocusOverrideNonce] = useState(0);
  const [railVisible, setRailVisible] = useState(false);
  const activeIndex = useMemo(
    () => channels.findIndex((item) => item.id === activeChannelId),
    [activeChannelId, channels],
  );
  const initialFocusKey = useMemo(() => {
    const resolved =
      activeChannelId && activeIndex >= 0 ? activeChannelId : (channels[0]?.id ?? null);
    return resolved ? buildChannelKey(resolved) : 'player-channels-close';
  }, [activeChannelId, activeIndex, channels]);
  const preferredFocusKey = focusOverrideKey ?? initialFocusKey;

  const getItemLayout = (_: ArrayLike<LiveChannelItem> | null | undefined, index: number) => ({
    length: ITEM_HEIGHT + SEPARATOR_HEIGHT,
    offset: (ITEM_HEIGHT + SEPARATOR_HEIGHT) * index,
    index,
  });

  const scrollToOffsetForIndex = useCallback((index: number) => {
    const anchor = Math.max(0, index - (VISIBLE_COUNT - 1));
    listRef.current?.scrollToIndex({
      index: anchor,
      animated: false,
    });
  }, []);

  const hasInitialScrollRef = useRef(false);
  const anchorIndexRef = useRef(0);

  const handleRowFocus = useCallback(
    (index: number) => {
      const anchor = anchorIndexRef.current;
      const lastVisible = anchor + VISIBLE_COUNT - 1;
      if (index > lastVisible) {
        const nextAnchor = Math.max(0, index - (VISIBLE_COUNT - 1));
        anchorIndexRef.current = nextAnchor;
        scrollToOffsetForIndex(nextAnchor);
        return;
      }
      if (index < anchor) {
        anchorIndexRef.current = index;
        scrollToOffsetForIndex(index);
      }
    },
    [scrollToOffsetForIndex],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: LiveChannelItem; index: number }) => (
      <ChannelRow
        item={item}
        index={index}
        startIndex={startIndex}
        noInfoLabel={t('player.labels.noInfo')}
        onSelect={onSelect}
        onFocus={(focusIndex) => {
          setFocusedChannelId(item.id);
          setFocusedIndex(focusIndex);
          setRailVisible((item.epgSchedule ?? []).length > 0);
          handleRowFocus(focusIndex);
        }}
        isFocused={item.id === focusedChannelId}
      />
    ),
    [focusedChannelId, handleRowFocus, onSelect, startIndex, t],
  );

  useEffect(() => {
    if (!visible || activeIndex < 0) {
      return;
    }
    setFocusedChannelId(activeChannelId ?? channels[0]?.id ?? null);
    setFocusedIndex(activeIndex);
    setRailVisible((channels[activeIndex]?.epgSchedule ?? []).length > 0);
    if (hasInitialScrollRef.current) {
      return;
    }
    hasInitialScrollRef.current = true;
    anchorIndexRef.current = Math.max(0, activeIndex - (VISIBLE_COUNT - 1));
    const timer = setTimeout(() => {
      scrollToOffsetForIndex(activeIndex);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeChannelId, activeIndex, channels, scrollToOffsetForIndex, visible]);

  useEffect(() => {
    if (!visible) {
      hasInitialScrollRef.current = false;
      setFocusOverrideKey(null);
      setRailVisible(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const handleKeyDown = (event: { keyCode: number }) => {
      if (!railVisible) {
        return;
      }
      const keyCode = event?.keyCode ?? -1;
      if (keyCode !== 19 && keyCode !== 20) {
        return;
      }
      const delta = keyCode === 19 ? -1 : 1;
      const nextIndex = focusedIndex + delta;
      if (nextIndex < 0 || nextIndex >= channels.length) {
        return;
      }
      const nextChannel = channels[nextIndex];
      if (!nextChannel) {
        return;
      }
      setFocusedChannelId(nextChannel.id);
      setFocusedIndex(nextIndex);
      setRailVisible((nextChannel.epgSchedule ?? []).length > 0);
      setFocusOverrideKey(buildChannelKey(nextChannel.id));
      setFocusOverrideNonce((prev) => prev + 1);
    };
    KeyEvent.onKeyDownListener(handleKeyDown);
    return () => {
      KeyEvent.removeKeyDownListener();
    };
  }, [channels, focusedIndex, railVisible, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView className="flex-1" intensity={30} experimentalBlurMethod="dimezisBlurView">
        <SafeAreaView className="flex-1 bg-black/80">
          <TVFocusProvider
            key={focusOverrideNonce}
            initialFocusKey={preferredFocusKey}
          >
            <View className="flex-1 px-10 py-10">
              <View className="mb-6">
                <Text className="text-white text-2xl font-semibold">
                  {t('player.channels.title')}
                </Text>
              </View>
              {status === 'loading' ? (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-white/70 text-base">{t('player.channels.loading')}</Text>
                </View>
              ) : channels.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-white/70 text-base">{t('player.channels.empty')}</Text>
                </View>
              ) : (
                <FlatList
                  ref={listRef}
                  data={channels}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  getItemLayout={getItemLayout}
                  initialScrollIndex={
                    activeIndex >= 0 ? Math.max(0, activeIndex - (VISIBLE_COUNT - 1)) : undefined
                  }
                  initialNumToRender={10}
                  windowSize={9}
                  maxToRenderPerBatch={10}
                  updateCellsBatchingPeriod={50}
                  removeClippedSubviews={false}
                  onScrollToIndexFailed={(info) => {
                    listRef.current?.scrollToOffset({
                      offset: info.averageItemLength * info.index,
                      animated: false,
                    });
                    setTimeout(() => scrollToOffsetForIndex(info.index), 50);
                  }}
                  onEndReached={() => {
                    if (hasMore && !isLoadingMore) {
                      onLoadMore();
                    }
                  }}
                  onEndReachedThreshold={0.7}
                  renderItem={renderItem}
                  ItemSeparatorComponent={() => <View className="h-3" />}
                  className="h-[480] -mx-10"
                  contentContainerClassName="pb-2"
                />
              )}
            </View>
          </TVFocusProvider>
        </SafeAreaView>
      </BlurView>
    </Modal>
  );
}
