import { useRouter } from 'expo-router';

import { SelectProfileScreen } from '@/components/portals/SelectProfileScreen';

export default function SelectProfileRoute() {
  const router = useRouter();

  return (
    <SelectProfileScreen
      onNavigateToTabs={() => router.replace('/(tabs)')}
      onNavigateToAddProfile={() =>
        router.push({ pathname: '/(auth)/add-profile', params: { allowExisting: '1' } })
      }
      onRedirectEmpty={() => router.replace('/(auth)/add-profile')}
    />
  );
}
