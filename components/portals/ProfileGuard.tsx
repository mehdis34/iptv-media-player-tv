import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { ScreenLoading } from '@/components/ui/ScreenLoading';
import { useEpgAutoRefresh } from '@/hooks/useEpgAutoRefresh';
import { useProfileGate } from '@/hooks/useProfileGate';

type ProfileGuardProps = {
  children: ReactNode;
};

export function ProfileGuard({ children }: ProfileGuardProps) {
  const { status, target } = useProfileGate('tabs');
  useEpgAutoRefresh();

  if (status === 'loading') {
    return <ScreenLoading />;
  }

  if (target) {
    return <Redirect href={target} />;
  }

  return <>{children}</>;
}
