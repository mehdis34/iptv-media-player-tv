import { useCallback } from 'react';

import { useProfileById } from '@/hooks/useProfileById';
import { useProfileConnection } from '@/hooks/useProfileConnection';
import { usePortalStore } from '@/hooks/usePortalStore';
import type { PortalProfile, PortalProfileInput } from '@/types/profile';

type SubmitResult = {
  profile: PortalProfile | null;
  didSync: boolean;
};

const normalizeHost = (host: string) => host.trim().replace(/\/+$/, '');

export const useProfileEditor = (profileId: string | null) => {
  const { profile, status, save } = useProfileById(profileId);
  const { status: connectionStatus, errorKey, progress, connectProfile } =
    useProfileConnection();
  const setActiveProfileId = usePortalStore(
    (state) => state.setActiveProfileId,
  );

  const hasCredentialChanges = useCallback(
    (values: PortalProfileInput) => {
      if (!profile) {
        return false;
      }
      return (
        normalizeHost(values.host) !== normalizeHost(profile.host) ||
        values.username.trim() !== profile.username.trim() ||
        values.password !== profile.password
      );
    },
    [profile],
  );

  const submit = useCallback(
    async (values: PortalProfileInput): Promise<SubmitResult> => {
      if (!profile) {
        return { profile: null, didSync: false };
      }

      if (hasCredentialChanges(values)) {
        const updated = await connectProfile(values, {
          onVerified: async () => {
            const saved = await save(values);
            if (!saved) {
              throw new Error('Profile update failed');
            }
            return saved;
          },
        });

        if (!updated) {
          return { profile: null, didSync: false };
        }

        setActiveProfileId(updated.id);
        return { profile: updated, didSync: true };
      }

      const updated = await save(values);
      return { profile: updated, didSync: false };
    },
    [connectProfile, hasCredentialChanges, profile, save, setActiveProfileId],
  );

  return {
    profile,
    status,
    submit,
    connectionStatus,
    errorKey,
    progress,
  };
};
