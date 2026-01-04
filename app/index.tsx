import { Redirect } from 'expo-router';

import { ScreenLoading } from '@/components/ui/ScreenLoading';
import { useProfileGate } from '@/hooks/useProfileGate';

export default function IndexRoute() {
  const { status, target } = useProfileGate('root');

  if (status === 'loading') {
    return <ScreenLoading />;
  }

  if (target) {
    return <Redirect href={target} />;
  }

  return <Redirect href="/(tabs)" />;
}
