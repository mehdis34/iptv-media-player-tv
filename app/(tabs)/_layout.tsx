import { ProfileGuard } from '@/components/portals/ProfileGuard';
import PlatformTabLayout from '@/layouts/TabLayout';

export default function TabLayout() {
  return (
    <ProfileGuard>
      <PlatformTabLayout />
    </ProfileGuard>
  );
}
