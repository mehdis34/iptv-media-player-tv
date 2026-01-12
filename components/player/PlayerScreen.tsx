import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import {
  type PlayerRouteParams,
  type PlayerType,
} from '@/components/player/usePlayerSource';
import { LivePlayerScreen } from '@/components/player/LivePlayerScreen';
import { VodSeriesPlayerScreen } from '@/components/player/VodSeriesPlayerScreen';

const resolveParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? null;
};

const resolvePlayerType = (value?: string | string[]): PlayerType => {
  const raw = resolveParam(value);
  if (raw === 'vod') {
    return 'vod';
  }
  if (raw === 'series') {
    return 'series';
  }
  if (raw === 'tv') {
    return 'live';
  }
  return 'live';
};

export function PlayerScreen() {
  const params = useLocalSearchParams();

  const routeParams: PlayerRouteParams = useMemo(
    () => ({
      id: resolveParam(params.id),
      type: resolvePlayerType(params.type),
      name: resolveParam(params.name),
      ext: resolveParam(params.ext),
      seriesId: resolveParam(params.seriesId),
      season: resolveParam(params.season),
      start: resolveParam(params.start),
      icon: resolveParam(params.icon),
    }),
    [params],
  );

  if (routeParams.type === 'live') {
    return <LivePlayerScreen routeParams={routeParams} />;
  }

  return <VodSeriesPlayerScreen routeParams={routeParams} />;
}
