import { create } from 'zustand';

import type { TranslationKey } from '@/constants/i18n';

type SyncStatus = 'idle' | 'verifying' | 'loading' | 'error';

type SyncProgress = {
  stepKey: TranslationKey;
  current: number;
  total: number;
} | null;

type SyncState = {
  status: SyncStatus;
  progress: SyncProgress;
  errorKey: TranslationKey | null;
};

type SyncActions = {
  setStatus: (status: SyncStatus) => void;
  setProgress: (progress: SyncProgress) => void;
  setErrorKey: (errorKey: TranslationKey | null) => void;
  reset: () => void;
};

export const useSyncStatusStore = create<SyncState & SyncActions>((set) => ({
  status: 'idle',
  progress: null,
  errorKey: null,
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setErrorKey: (errorKey) => set({ errorKey }),
  reset: () => set({ status: 'idle', progress: null, errorKey: null }),
}));
