import { XMLParser } from 'fast-xml-parser';

import type { PortalProfile, PortalProfileInput } from '@/types/profile';
import type {
  XtreamApiCredentials,
  XtreamAuthResponse,
  XtreamCategory,
  XtreamLiveStream,
  XtreamSeriesInfoResponse,
  XtreamSeriesItem,
  XtreamVodInfoResponse,
  XtreamVodStream,
} from '@/types/xtream';
import { decodeEpgText, normalizeXmltvName } from '@/storage/epg';

type XtreamProfile = PortalProfile | PortalProfileInput;

export type XtreamXmltvChannel = {
  channelId: string;
  displayName: string;
  normalizedName: string;
};

export type XtreamXmltvListing = {
  channelId: string;
  title: string;
  description: string;
  category: string;
  start: string;
  end: string;
};

export type XtreamXmltvPayload = {
  channels: XtreamXmltvChannel[];
  listings: XtreamXmltvListing[];
};

const DEFAULT_TIMEOUT_MS = 10000;

const normalizeHost = (host: string) => {
  const trimmed = host.trim();
  if (!trimmed) {
    return trimmed;
  }

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  try {
    const url = new URL(withScheme);
    const cleanedPath = url.pathname
      .replace(/\/(player_api\.php|get\.php)$/i, '')
      .replace(/\/+$/, '');
    url.pathname = cleanedPath;
    url.search = '';
    url.hash = '';

    return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
};

const buildApiUrl = (
  creds: XtreamApiCredentials,
  params?: Record<string, string | number | undefined>,
) => {
  const base = `${normalizeHost(creds.host)}/player_api.php`;
  const query = new URLSearchParams({
    username: creds.username,
    password: creds.password,
  });

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value == null) {
        return;
      }
      query.set(key, String(value));
    });
  }

  return `${base}?${query.toString()}`;
};

export const buildStreamUrl = (creds: XtreamApiCredentials, streamId: number) =>
  `${normalizeHost(creds.host)}/live/${creds.username}/${creds.password}/${streamId}.m3u8`;

export const buildVodUrl = (
  creds: XtreamApiCredentials,
  streamId: number,
  extension = 'mp4',
) =>
  `${normalizeHost(creds.host)}/movie/${creds.username}/${creds.password}/${streamId}.${extension}`;

export const buildSeriesEpisodeUrl = (
  creds: XtreamApiCredentials,
  episodeId: number,
  extension = 'mp4',
) =>
  `${normalizeHost(creds.host)}/series/${creds.username}/${creds.password}/${episodeId}.${extension}`;

const fetchXtreamJson = async <T>(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Xtream request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
};

const isAuthenticated = (payload: XtreamAuthResponse) => {
  const userInfo = payload.user_info;
  const auth = userInfo?.auth;
  if (auth != null) {
    return auth === true || auth === 1 || auth === '1';
  }

  const status = userInfo?.status;
  if (status) {
    return status.toLowerCase() === 'active';
  }

  return Boolean(userInfo?.username);
};

const toCredentials = (profile: XtreamProfile): XtreamApiCredentials => ({
  host: profile.host,
  username: profile.username,
  password: profile.password,
});

export const verifyXtreamProfile = async (profile: XtreamProfile) => {
  const url = buildApiUrl(toCredentials(profile));
  const data = await fetchXtreamJson<XtreamAuthResponse>(url);
  return isAuthenticated(data);
};

export const fetchAccountInfo = async (profile: XtreamProfile) => {
  const url = buildApiUrl(toCredentials(profile));
  return fetchXtreamJson<XtreamAuthResponse>(url);
};

export const fetchLiveCategories = async (profile: XtreamProfile) => {
  const url = buildApiUrl(toCredentials(profile), {
    action: 'get_live_categories',
  });
  return fetchXtreamJson<XtreamCategory[]>(url);
};

export const fetchLiveStreams = async (
  profile: XtreamProfile,
  categoryId?: string,
) => {
  const params: Record<string, string> = { action: 'get_live_streams' };
  if (categoryId && categoryId !== 'all') {
    params.category_id = categoryId;
  }
  const url = buildApiUrl(toCredentials(profile), params);
  return fetchXtreamJson<XtreamLiveStream[]>(url);
};

export const fetchVodCategories = async (profile: XtreamProfile) => {
  const url = buildApiUrl(toCredentials(profile), {
    action: 'get_vod_categories',
  });
  return fetchXtreamJson<XtreamCategory[]>(url);
};

export const fetchVodStreams = async (profile: XtreamProfile) => {
  const url = buildApiUrl(toCredentials(profile), { action: 'get_vod_streams' });
  return fetchXtreamJson<XtreamVodStream[]>(url);
};

export const fetchVodInfo = async (profile: XtreamProfile, streamId: string) => {
  const url = buildApiUrl(toCredentials(profile), {
    action: 'get_vod_info',
    vod_id: streamId,
  });
  return fetchXtreamJson<XtreamVodInfoResponse>(url);
};

export const fetchSeriesCategories = async (profile: XtreamProfile) => {
  const url = buildApiUrl(toCredentials(profile), {
    action: 'get_series_categories',
  });
  return fetchXtreamJson<XtreamCategory[]>(url);
};

export const fetchSeries = async (profile: XtreamProfile) => {
  const url = buildApiUrl(toCredentials(profile), { action: 'get_series' });
  return fetchXtreamJson<XtreamSeriesItem[]>(url);
};

export const fetchSeriesInfo = async (
  profile: XtreamProfile,
  seriesId: string,
) => {
  const url = buildApiUrl(toCredentials(profile), {
    action: 'get_series_info',
    series_id: seriesId,
  });
  return fetchXtreamJson<XtreamSeriesInfoResponse>(url);
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

const getXmltvText = (node: unknown): string => {
  if (node === null || node === undefined) {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return getXmltvText(node[0]);
  }
  if (typeof node === 'object' && node && 'text' in node) {
    return getXmltvText((node as Record<string, unknown>).text);
  }
  return '';
};

export const fetchXmltvEpg = async (
  profile: XtreamProfile,
): Promise<XtreamXmltvPayload> => {
  const base = normalizeHost(profile.host);
  const url = `${base}/xmltv.php?username=${profile.username}&password=${profile.password}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Xtream request failed: ${response.status}`);
  }
  const xml = await response.text();
  const parsed = xmlParser.parse(xml) as {
    tv?: {
      channel?:
        | Array<{ id?: string; ['display-name']?: unknown }>
        | { id?: string; ['display-name']?: unknown };
      programme?:
        | Array<{
            start?: string;
            stop?: string;
            channel?: string;
            title?: unknown;
            desc?: unknown;
            category?: unknown;
          }>
        | {
            start?: string;
            stop?: string;
            channel?: string;
            title?: unknown;
            desc?: unknown;
            category?: unknown;
          };
    };
  };

  const channelNodes = Array.isArray(parsed.tv?.channel)
    ? parsed.tv?.channel ?? []
    : parsed.tv?.channel
      ? [parsed.tv.channel]
      : [];
  const programNodes = Array.isArray(parsed.tv?.programme)
    ? parsed.tv?.programme ?? []
    : parsed.tv?.programme
      ? [parsed.tv.programme]
      : [];

  const channels: XtreamXmltvChannel[] = [];
  const channelNameById = new Map<string, string>();

  channelNodes.forEach((channel) => {
    if (!channel?.id) {
      return;
    }
    const name = decodeEpgText(getXmltvText(channel['display-name']));
    channelNameById.set(channel.id, name);
    channels.push({
      channelId: channel.id,
      displayName: name,
      normalizedName: normalizeXmltvName(name),
    });
  });

  const listings: XtreamXmltvListing[] = [];
  programNodes.forEach((program) => {
    if (!program?.channel) {
      return;
    }
    listings.push({
      channelId: program.channel,
      title: decodeEpgText(getXmltvText(program.title)),
      description: decodeEpgText(getXmltvText(program.desc)),
      category: decodeEpgText(getXmltvText(program.category)),
      start: program.start ?? '',
      end: program.stop ?? '',
    });
  });

  return { channels, listings };
};
