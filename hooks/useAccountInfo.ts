import { useCallback, useEffect, useState } from 'react';

import type { TranslationKey } from '@/constants/i18n';
import { useProfileById } from '@/hooks/useProfileById';
import { fetchAccountInfo } from '@/storage/xtream';
import type { PortalProfile } from '@/types/profile';
import type { XtreamAuthResponse } from '@/types/xtream';

type AccountState = {
  status: 'loading' | 'ready' | 'error';
  profile: PortalProfile | null;
  info: XtreamAuthResponse | null;
  errorKey: TranslationKey | null;
};

export const useAccountInfo = (profileId: string | null) => {
  const { profile } = useProfileById(profileId);
  const [state, setState] = useState<AccountState>({
    status: 'loading',
    profile: null,
    info: null,
    errorKey: null,
  });

  const refresh = useCallback(async () => {
    if (!profile) {
      setState({
        status: 'error',
        profile: null,
        info: null,
        errorKey: 'settings.account.errors.noProfile',
      });
      return;
    }

    try {
      const info = await fetchAccountInfo(profile);
      setState({
        status: 'ready',
        profile,
        info,
        errorKey: null,
      });
    } catch {
      setState({
        status: 'error',
        profile,
        info: null,
        errorKey: 'settings.account.errors.loadFailed',
      });
    }
  }, [profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
};
