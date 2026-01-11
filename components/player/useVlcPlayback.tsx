import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { VLCPlayerProps } from '@/components/ui/VlcPlayer';

type TrackItem = { id: number; name: string };

type UseVlcPlaybackParams = {
  sourceKey: string;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnd?: () => void;
  onError?: () => void;
};

type VlcPlaybackState = {
  isReady: boolean;
  paused: boolean;
  duration: number;
  currentTime: number;
  audioTracks: TrackItem[];
  textTracks: TrackItem[];
  selectedAudio: number | null;
  selectedText: number | null;
};

const toSeconds = (value: number | undefined) => {
  if (!Number.isFinite(value ?? NaN)) {
    return 0;
  }
  const resolved = value ?? 0;
  return resolved > 10000 ? resolved / 1000 : resolved;
};

export const useVlcPlayback = ({
  sourceKey,
  onProgress,
  onEnd,
  onError,
}: UseVlcPlaybackParams) => {
  const playerRef = useRef<any>(null);
  const [state, setState] = useState<VlcPlaybackState>({
    isReady: false,
    paused: false,
    duration: 0,
    currentTime: 0,
    audioTracks: [],
    textTracks: [],
    selectedAudio: null,
    selectedText: null,
  });
  const lastProgressRef = useRef(0);

  useEffect(() => {
    setState({
      isReady: false,
      paused: false,
      duration: 0,
      currentTime: 0,
      audioTracks: [],
      textTracks: [],
      selectedAudio: null,
      selectedText: null,
    });
    lastProgressRef.current = 0;
  }, [sourceKey]);

  const setPaused = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, paused: value }));
  }, []);

  const togglePlay = useCallback(() => {
    setState((prev) => ({ ...prev, paused: !prev.paused }));
  }, []);

  const seekTo = useCallback((seconds: number) => {
    setState((prev) => {
      const total = Math.max(1, prev.duration);
      const clamped = Math.max(0, Math.min(total, seconds));
      playerRef.current?.seek(clamped / total);
      return { ...prev, currentTime: clamped };
    });
  }, []);

  const jumpBy = useCallback((deltaSeconds: number) => {
    setState((prev) => {
      const total = Math.max(1, prev.duration);
      const next = Math.max(0, Math.min(total, prev.currentTime + deltaSeconds));
      playerRef.current?.seek(next / total);
      return { ...prev, currentTime: next };
    });
  }, []);


  const handleProgress: VLCPlayerProps['onProgress'] = useCallback(
    (event) => {
      const nextDuration = toSeconds(event?.duration);
      let nextCurrent = toSeconds(event?.currentTime);
      if (
        Number.isFinite(event?.position ?? NaN) &&
        nextDuration > 0 &&
        typeof event?.position === 'number'
      ) {
        nextCurrent = event?.position * nextDuration;
      }
      if (nextDuration > 0 && nextCurrent > nextDuration) {
        nextCurrent = nextDuration;
      }

      const now = Date.now();
      const shouldUpdate = now - lastProgressRef.current > 500 || nextDuration !== state.duration;
      if (!shouldUpdate) {
        return;
      }
      lastProgressRef.current = now;

      setState((prev) => ({
        ...prev,
        duration: nextDuration > 0 ? nextDuration : prev.duration,
        currentTime: nextCurrent > 0 ? nextCurrent : prev.currentTime,
      }));
      onProgress?.(nextCurrent, nextDuration);
    },
    [onProgress, state.duration],
  );

  const handleLoad: VLCPlayerProps['onLoad'] = useCallback((event) => {
    const audioTracks =
      event?.audioTracks
        ?.filter((track) => typeof track.id === 'number')
        .map((track) => ({
          id: track.id as number,
          name: track.name ?? '',
        })) ?? [];
    const textTracks =
      event?.textTracks
        ?.filter((track) => typeof track.id === 'number')
        .map((track) => ({
          id: track.id as number,
          name: track.name ?? '',
        })) ?? [];
    setState((prev) => ({
      ...prev,
      isReady: true,
      audioTracks,
      textTracks,
    }));
  }, []);

  const handlePlaying: VLCPlayerProps['onPlaying'] = useCallback(() => {
    setState((prev) => ({ ...prev, paused: false, isReady: true }));
  }, []);

  const handlePaused: VLCPlayerProps['onPaused'] = useCallback(() => {
    setState((prev) => ({ ...prev, paused: true }));
  }, []);

  const handleEnd: VLCPlayerProps['onEnd'] = useCallback(() => {
    onEnd?.();
  }, [onEnd]);

  const handleError: VLCPlayerProps['onError'] = useCallback(() => {
    onError?.();
  }, [onError]);

  const setSelectedAudio = useCallback((trackId: number | null) => {
    setState((prev) => ({ ...prev, selectedAudio: trackId }));
  }, []);

  const setSelectedText = useCallback((trackId: number | null) => {
    setState((prev) => ({ ...prev, selectedText: trackId }));
  }, []);

  const playerProps = useMemo(
    () => ({
      audioTrack: state.selectedAudio ?? undefined,
      textTrack: state.selectedText ?? undefined,
    }),
    [state.selectedAudio, state.selectedText],
  );

  return {
    playerRef,
    state,
    setPaused,
    togglePlay,
    seekTo,
    jumpBy,
    handleProgress,
    handleLoad,
    handlePlaying,
    handlePaused,
    handleEnd,
    handleError,
    setSelectedAudio,
    setSelectedText,
    playerProps,
  };
};
