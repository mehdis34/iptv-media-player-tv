import type { TranslationKey } from '@/constants/i18n';
import type { HomeSeeMoreRoute } from '@/components/home/types';

export type HomeRailConfig = {
  id: string;
  titleKey: TranslationKey;
  seeMoreLabelKey: TranslationKey;
  seeMoreRoute: HomeSeeMoreRoute;
  seeMoreKind: 'poster' | 'live';
};

export const HOME_RAILS: HomeRailConfig[] = [
  {
    id: 'continue-watching',
    titleKey: 'home.rail.continueWatching',
    seeMoreLabelKey: 'home.rail.seeMoreContinue',
    seeMoreRoute: '/(tabs)/vod',
    seeMoreKind: 'poster',
  },
  {
    id: 'favorites',
    titleKey: 'home.rail.favorites',
    seeMoreLabelKey: 'home.rail.seeMoreFavorites',
    seeMoreRoute: '/(tabs)/vod',
    seeMoreKind: 'poster',
  },
  {
    id: 'recently-viewed',
    titleKey: 'home.rail.recentlyViewed',
    seeMoreLabelKey: 'home.rail.seeMoreRecentlyViewed',
    seeMoreRoute: '/(tabs)/vod',
    seeMoreKind: 'poster',
  },
  {
    id: 'recent-vod',
    titleKey: 'home.rail.recentVod',
    seeMoreLabelKey: 'home.rail.seeMoreVod',
    seeMoreRoute: '/(tabs)/vod',
    seeMoreKind: 'poster',
  },
  {
    id: 'recent-series',
    titleKey: 'home.rail.recentSeries',
    seeMoreLabelKey: 'home.rail.seeMoreSeries',
    seeMoreRoute: '/(tabs)/series',
    seeMoreKind: 'poster',
  },
  {
    id: 'recent-live',
    titleKey: 'home.rail.recentLive',
    seeMoreLabelKey: 'home.rail.seeMoreLive',
    seeMoreRoute: '/(tabs)/live',
    seeMoreKind: 'live',
  },
];
