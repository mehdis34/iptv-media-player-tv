import type { TranslationKey } from '@/constants/i18n';

export type HomeItemType = 'live' | 'vod' | 'series';

export type HomeContentItem = {
  id: string;
  title: string;
  image: string | null;
  type: HomeItemType;
  epgChannelId?: string | null;
  epgTitle?: string | null;
  epgProgress?: number | null;
  epgStart?: string | null;
  epgEnd?: string | null;
};

export type HomeRailKind = 'poster' | 'live';

export type HomeSeeMoreRoute =
  | '/(tabs)/live'
  | '/(tabs)/vod'
  | '/(tabs)/series'
  | '/(tabs)/favorites';

export type HomeRail = {
  id: string;
  titleKey: TranslationKey;
  items: HomeContentItem[];
  seeMoreLabelKey: TranslationKey;
  seeMoreRoute: HomeSeeMoreRoute;
  seeMoreKind: HomeRailKind;
};
