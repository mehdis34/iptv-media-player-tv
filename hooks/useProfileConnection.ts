import { useCallback, useEffect, useRef, useState } from 'react';

import type { TranslationKey } from '@/constants/i18n';
import type { PortalProfile, PortalProfileInput } from '@/types/profile';
import { verifyXtreamProfile } from '@/storage/xtream';
import { syncXtreamProfileData } from '@/storage/xtreamSync';
import { useCatalogRefreshStore } from '@/hooks/useCatalogRefreshStore';
import { useSyncStatusStore } from '@/hooks/useSyncStatusStore';

type ConnectionStatus = 'idle' | 'verifying' | 'loading' | 'error';

type ConnectOptions = {
  onVerified?: () => Promise<PortalProfile | void> | PortalProfile | void;
  skipSync?: boolean;
  skipVerify?: boolean;
};

type UseProfileConnectionResult = {
  status: ConnectionStatus;
  errorKey: TranslationKey | null;
  progress: {
    stepKey: TranslationKey;
    current: number;
    total: number;
  } | null;
  connectProfile: (
    profile: PortalProfile | PortalProfileInput,
    options?: ConnectOptions,
  ) => Promise<PortalProfile | null>;
  reset: () => void;
};

export const useProfileConnection = (): UseProfileConnectionResult => {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [progress, setProgress] = useState<{
    stepKey: TranslationKey;
    current: number;
    total: number;
  } | null>(null);
  const mountedRef = useRef(true);
  const setSyncStatus = useSyncStatusStore((state) => state.setStatus);
  const setSyncProgress = useSyncStatusStore((state) => state.setProgress);
  const setSyncErrorKey = useSyncStatusStore((state) => state.setErrorKey);
  const resetSyncStatus = useSyncStatusStore((state) => state.reset);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const connectProfile = useCallback(
    async (
      profile: PortalProfile | PortalProfileInput,
      options?: ConnectOptions,
    ) => {
      setErrorKey(null);
      setProgress(null);
      setSyncProgress(null);
      setSyncErrorKey(null);

      try {
        let verifiedProfile = profile;

        if (!options?.skipVerify) {
          setStatus('verifying');
          setSyncStatus('verifying');
          const isValid = await verifyXtreamProfile(profile);
          if (!mountedRef.current) {
            return null;
          }

          if (!isValid) {
            setStatus('error');
            setErrorKey('auth.errors.profileInvalid');
            setSyncStatus('error');
            setSyncErrorKey('auth.errors.profileInvalid');
            return null;
          }

          verifiedProfile = (await options?.onVerified?.()) ?? profile;
        } else {
          verifiedProfile = (await options?.onVerified?.()) ?? profile;
        }

        if (options?.skipSync) {
          if (mountedRef.current) {
            setStatus('idle');
            setProgress(null);
            resetSyncStatus();
          }
          return 'id' in verifiedProfile ? verifiedProfile : null;
        }

        setStatus('loading');
        setProgress(null);
        setSyncStatus('loading');
        setSyncProgress(null);

        if (!('id' in verifiedProfile)) {
          setStatus('error');
          setErrorKey('auth.errors.syncFailed');
          setSyncStatus('error');
          setSyncErrorKey('auth.errors.syncFailed');
          return null;
        }

        await syncXtreamProfileData(verifiedProfile, (next) => {
          if (!mountedRef.current) {
            return;
          }
          setProgress(next);
          setSyncProgress(next);
        });

        if (mountedRef.current) {
          setStatus('idle');
          setProgress(null);
          useCatalogRefreshStore.getState().bump();
          resetSyncStatus();
        }

        return verifiedProfile;
      } catch {
        if (mountedRef.current) {
          setStatus('error');
          setErrorKey('auth.errors.syncFailed');
          setProgress(null);
          setSyncStatus('error');
          setSyncErrorKey('auth.errors.syncFailed');
        }
        return null;
      }
    },
    [resetSyncStatus, setSyncErrorKey, setSyncProgress, setSyncStatus],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorKey(null);
    setProgress(null);
    resetSyncStatus();
  }, [resetSyncStatus]);

  return {
    status,
    errorKey,
    progress,
    connectProfile,
    reset,
  };
};
