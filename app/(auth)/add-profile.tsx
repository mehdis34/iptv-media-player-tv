import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { AddProfileScreen } from '@/components/portals/AddProfileScreen';
import { ScreenLoading } from '@/components/ui/ScreenLoading';
import { useAddProfileGate } from '@/hooks/useAddProfileGate';

export default function AddProfileRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ allowExisting?: string }>();
  const allowExisting =
    params.allowExisting === '1' || params.allowExisting === 'true';
  const { status, target } = useAddProfileGate(allowExisting);

  if (status === 'loading') {
    return <ScreenLoading />;
  }

  if (target) {
    return <Redirect href={target} />;
  }

  return (
    <AddProfileScreen
      onNavigateToTabs={() => router.replace('/(tabs)')}
    />
  );
}
