import type { TranslationKey } from '@/constants/i18n';
import type { PortalProfile } from '@/types/profile';

import {
  fetchLiveCategories,
  fetchLiveStreams,
  fetchSeries,
  fetchSeriesCategories,
  fetchVodCategories,
  fetchVodStreams,
  fetchXmltvEpg,
} from '@/storage/xtream';
import {
  clearCatalogForProfile,
  clearEpgForProfile,
  getCatalogMeta,
  setCatalogMeta,
  storeCategories,
  storeEpg,
  storeLiveStreams,
  storeSeries,
  storeVodStreams,
} from '@/storage/catalog';

const EPG_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

type XtreamSyncProgress = {
  stepKey: TranslationKey;
  current: number;
  total: number;
};

export const syncXtreamProfileData = async (
  profile: PortalProfile,
  onProgress?: (progress: XtreamSyncProgress) => void,
) => {
  const totalSteps = 5;
  let currentStep = 0;
  const report = (stepKey: TranslationKey) => {
    currentStep += 1;
    onProgress?.({ stepKey, current: currentStep, total: totalSteps });
  };

  await clearCatalogForProfile(profile.id);

  report('auth.sync.categories');
  const [liveCategories, vodCategories, seriesCategories] = await Promise.all([
    fetchLiveCategories(profile),
    fetchVodCategories(profile),
    fetchSeriesCategories(profile),
  ]);
  await storeCategories(profile.id, 'live', liveCategories);
  await storeCategories(profile.id, 'vod', vodCategories);
  await storeCategories(profile.id, 'series', seriesCategories);

  report('auth.sync.liveStreams');
  const liveStreams = await fetchLiveStreams(profile);
  await storeLiveStreams(profile.id, liveStreams);

  report('auth.sync.vodStreams');
  const vodStreams = await fetchVodStreams(profile);
  await storeVodStreams(profile.id, vodStreams);

  report('auth.sync.series');
  const seriesItems = await fetchSeries(profile);
  await storeSeries(profile.id, seriesItems);

  report('auth.sync.epg');
  const epgPayload = await fetchXmltvEpg(profile);
  await storeEpg(profile.id, epgPayload);

  await setCatalogMeta(profile.id, 'catalog_updated_at', String(Date.now()));
  await setCatalogMeta(profile.id, 'epg_updated_at', String(Date.now()));
};

export const refreshXtreamEpgIfNeeded = async (profile: PortalProfile) => {
  const meta = await getCatalogMeta(profile.id, 'epg_updated_at');
  if (meta && Date.now() - meta.updated_at < EPG_REFRESH_INTERVAL_MS) {
    return false;
  }

  const epgPayload = await fetchXmltvEpg(profile);
  await clearEpgForProfile(profile.id);
  await storeEpg(profile.id, epgPayload);
  await setCatalogMeta(profile.id, 'epg_updated_at', String(Date.now()));
  return true;
};
