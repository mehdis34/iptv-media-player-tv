export type XtreamId = string | number;
export type XtreamTimestamp = string | number;
export type XtreamAuthFlag = 0 | 1 | boolean;

export type XtreamAuthStatus = 'Active' | 'Disabled' | 'Banned' | 'Expired' | string;

export type XtreamStreamType = 'live' | 'movie' | 'series' | string;
export type XtreamOutputFormat = 'm3u8' | 'ts' | 'rtmp' | string;

export type XtreamApiCredentials = {
  host: string;
  username: string;
  password: string;
};

export type XtreamAuthResponse = {
  user_info: XtreamUserInfo;
  server_info: XtreamServerInfo;
};

export type XtreamUserInfo = {
  username: string;
  password: string;
  message?: string;
  auth: XtreamAuthFlag;
  status: XtreamAuthStatus;
  exp_date?: XtreamTimestamp | null;
  is_trial?: '0' | '1' | boolean;
  active_cons?: string | number;
  created_at?: XtreamTimestamp;
  max_connections?: string | number;
  allowed_output_formats?: XtreamOutputFormat[];
};

export type XtreamServerInfo = {
  url: string;
  port: string | number;
  https_port?: string | number;
  server_protocol?: 'http' | 'https' | string;
  rtmp_port?: string | number;
  timestamp_now?: XtreamTimestamp;
  time_now?: string;
  timezone?: string;
};

export type XtreamCategory = {
  category_id: XtreamId;
  category_name: string;
  parent_id?: XtreamId;
};

export type XtreamStreamBase = {
  name: string;
  category_id?: XtreamId;
  stream_icon?: string;
  added?: XtreamTimestamp;
  direct_source?: string;
  custom_sid?: string;
};

export type XtreamLiveStream = XtreamStreamBase & {
  stream_id: XtreamId;
  stream_type?: XtreamStreamType;
  epg_channel_id?: string;
  epg_id?: XtreamId;
  tv_archive?: string | number;
  tv_archive_duration?: string | number;
  num?: number;
};

export type XtreamVodStream = XtreamStreamBase & {
  stream_id: XtreamId;
  stream_type?: XtreamStreamType;
  rating?: string;
  rating_5based?: string | number;
  container_extension?: string;
};

export type XtreamSeriesItem = {
  series_id: XtreamId;
  name: string;
  cover?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  last_modified?: XtreamTimestamp;
  rating?: string;
  rating_5based?: string | number;
  backdrop_path?: string[] | string;
  youtube_trailer?: string;
  episode_run_time?: string;
  category_id?: XtreamId;
};

export type XtreamSeriesInfoResponse = {
  seasons: XtreamSeason[];
  info: XtreamSeriesInfo;
  episodes: Record<string, XtreamEpisode[]>;
};

export type XtreamSeriesInfo = XtreamSeriesItem & {
  cover_big?: string;
};

export type XtreamSeason = {
  id?: XtreamId;
  season_number?: number | string;
  name?: string;
  overview?: string;
  air_date?: string;
  cover?: string;
  cover_big?: string;
  episode_count?: number;
};

export type XtreamEpisode = {
  id?: XtreamId;
  title?: string;
  episode_num?: number | string;
  season?: number | string;
  container_extension?: string;
  added?: XtreamTimestamp;
  custom_sid?: string;
  direct_source?: string;
  info?: XtreamEpisodeInfo;
};

export type XtreamEpisodeInfo = {
  plot?: string;
  releasedate?: string;
  duration?: string;
  duration_secs?: string | number;
  rating?: string;
  movie_image?: string;
};

export type XtreamVodInfoResponse = {
  info: XtreamVodInfo;
  movie_data: XtreamVodMovieData;
};

export type XtreamVodInfo = {
  kinopoisk_url?: string;
  tmdb_id?: string;
  imdb_id?: string;
  name?: string;
  o_name?: string;
  cover_big?: string;
  movie_image?: string;
  plot?: string;
  cast?: string;
  director?: string;
  actors?: string;
  genre?: string;
  releasedate?: string;
  duration?: string;
  rating?: string;
  rating_5based?: string | number;
  country?: string;
  youtube_trailer?: string;
  trailer?: string;
  backdrop_path?: string[] | string;
  age?: string;
};

export type XtreamVodMovieData = XtreamVodStream & {
  container_extension?: string;
};

export type XtreamLiveInfoResponse = {
  info: XtreamLiveStream;
  epg_listings?: XtreamEpgListing[];
};

export type XtreamEpgListing = {
  id?: XtreamId;
  epg_id?: XtreamId;
  title?: string;
  lang?: string;
  start?: string;
  end?: string;
  start_timestamp?: XtreamTimestamp;
  stop_timestamp?: XtreamTimestamp;
  now_playing?: 0 | 1 | boolean;
  has_archive?: 0 | 1 | boolean;
  archive_duration?: string | number;
  description?: string;
};

export type XtreamEpgResponse = {
  epg_listings: XtreamEpgListing[];
};
