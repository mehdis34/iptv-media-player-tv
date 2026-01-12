import { useCallback, useEffect, useRef, useState } from 'react';
import KeyEvent from 'react-native-keyevent';

type ControlsVisibilityOptions = {
  autoHideDelayMs?: number;
  enabled?: boolean;
  onKeyDown?: (keyCode: number) => boolean | void;
};

const WAKE_KEY_CODES = new Set([19, 20, 21, 22, 23, 66, 85, 126, 127]);

export const usePlayerControlsVisibility = ({
  autoHideDelayMs = 5000,
  enabled = true,
  onKeyDown,
}: ControlsVisibilityOptions = {}) => {
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsVisibleRef = useRef(true);
  const [pressEnabled, setPressEnabled] = useState(true);
  const pressEnabledRef = useRef(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const setVisible = useCallback((value: boolean) => {
    controlsVisibleRef.current = value;
    setControlsVisible(value);
  }, []);

  const enablePress = useCallback(() => {
    pressEnabledRef.current = true;
    setPressEnabled(true);
  }, []);

  const temporarilyDisablePress = useCallback(() => {
    pressEnabledRef.current = false;
    setPressEnabled(false);
    clearPressTimer();
    pressTimerRef.current = setTimeout(() => {
      enablePress();
    }, 350);
  }, [clearPressTimer, enablePress]);

  const scheduleHide = useCallback(() => {
    if (!enabled) {
      return;
    }
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, autoHideDelayMs);
  }, [autoHideDelayMs, clearHideTimer, enabled, setVisible]);

  const showControls = useCallback(() => {
    const wasHidden = !controlsVisibleRef.current;
    if (wasHidden) {
      temporarilyDisablePress();
      setVisible(true);
    } else {
      enablePress();
    }
    scheduleHide();
  }, [enablePress, scheduleHide, setVisible, temporarilyDisablePress]);

  const canPress = useCallback(() => pressEnabledRef.current, []);

  const onUserActivity = useCallback(() => {
    showControls();
  }, [showControls]);

  useEffect(() => {
    if (!enabled) {
      clearHideTimer();
      clearPressTimer();
      return;
    }
    scheduleHide();
    return () => {
      clearHideTimer();
      clearPressTimer();
    };
  }, [clearHideTimer, clearPressTimer, enabled, scheduleHide]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handleKeyDown = (event: { keyCode?: number }) => {
      const keyCode = event?.keyCode ?? -1;
      if (onKeyDown?.(keyCode)) {
        return;
      }
      if (!WAKE_KEY_CODES.has(keyCode)) {
        return;
      }
      onUserActivity();
    };
    KeyEvent.onKeyDownListener(handleKeyDown);
    return () => {
      KeyEvent.removeKeyDownListener();
    };
  }, [enabled, onKeyDown, onUserActivity]);

  return {
    controlsVisible,
    pressEnabled,
    canPress,
    onUserActivity,
  };
};
