import { Text, View } from 'react-native';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/fr';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { Image } from '@/components/ui/ExpoImage';
import { cn } from '@/components/ui/cn';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useVodDetails } from '@/components/vod/useVodDetails';
import { VodItem } from '@/storage/catalog';
import { MaterialIcons } from '@/components/ui/Icons';
import { truncate } from '@/components/ui/utils';

dayjs.extend(localizedFormat);

type VodFeaturedCardProps = {
  item: VodItem;
  focusKey: string;
  onPress: () => void;
};

export function VodFeaturedCard({ item, focusKey, onPress }: VodFeaturedCardProps) {
  const { t, locale } = useI18n();
  const { status, info } = useVodDetails(item.id);
  const details = info?.info;
  const fallback = t('common.notAvailable');

  const formatReleaseDate = (value?: string | null) => {
    if (!value) {
      return null;
    }
    const parsed = dayjs(value);
    if (!parsed.isValid()) {
      return null;
    }
    return parsed.locale(locale === 'fr' ? 'fr' : 'en').format('YYYY');
  };

  const releaseDate = formatReleaseDate(details?.releasedate) ?? fallback;
  const genre = details?.genre ?? fallback;
  const synopsis = details?.plot ?? fallback;
  const cover = details?.backdrop_path?.[0] ?? item.image ?? undefined;

  return (
    <View className="relative h-[60vh] w-full overflow-hidden rounded-2xl bg-white/10 border-white/10 border">
      {status === 'ready' && (
        <>
          {cover ? (
            <Image source={{ uri: cover }} className="h-full w-full" contentFit="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center px-6">
              <Text className="text-white/80 text-base text-center">{item.title}</Text>
            </View>
          )}
          <View className="absolute w-full top-0 bottom-0 p-6 bg-black/70 flex flex-col justify-end">
            <View className={'flex flex-row items-start gap-6'}>
              <View className="h-44 w-28 rounded-lg mt-1 bg-white/10">
                {item.image && (
                  <Image
                    source={{ uri: item.image }}
                    className="h-full w-full rounded-lg"
                    contentFit="cover"
                  />
                )}
              </View>
              <View className={'flex-1 gap-3'}>
                <Text className="text-white text-2xl font-semibold" numberOfLines={2}>
                  {item.title}
                </Text>
                <View className={'gap-1'}>
                  <Text className="text-white text-sm font-semibold">
                    {releaseDate} • {genre}
                  </Text>
                  {synopsis && (
                    <Text className="text-white/80 text-sm max-w-xl" numberOfLines={3}>
                      {truncate(synopsis, 300)}
                    </Text>
                  )}
                </View>
                <View className={'flex flex-row gap-3 mt-2'}>
                  <TVFocusPressable
                    focusKey={focusKey}
                    onPress={onPress}
                    unstyled
                    className="group items-center flex flex-row justify-between rounded-lg bg-white py-2 px-6 gap-1"
                    focusClassName="bg-primary"
                  >
                    <MaterialIcons
                      name={'play-arrow'}
                      className="text-black group-focus:text-white"
                      size={24}
                    />
                    <Text className="text-base font-semibold text-black group-focus:text-white">
                      Lecture
                    </Text>
                  </TVFocusPressable>
                  <TVFocusPressable
                    onPress={onPress}
                    unstyled
                    className="group items-center flex flex-row justify-between rounded-lg bg-white/10 py-2 px-6 gap-1"
                    focusClassName="bg-primary"
                  >
                    <MaterialIcons name={'add'} className="text-white group-focus:" size={24} />
                    <Text className="text-base font-semibold text-white group-focus:text-white">
                      Ma liste
                    </Text>
                  </TVFocusPressable>
                </View>
              </View>
            </View>
          </View>
        </>
      )}
      <View
        pointerEvents="none"
        className={cn(
          'absolute inset-0 rounded-2xl border-2 border-transparent',
          'group-focus:border-primary',
        )}
      />
    </View>
  );
}
