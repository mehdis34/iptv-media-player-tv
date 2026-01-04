import { create } from 'zustand';

type PortalState = {
  activeProfileId: string | null;
  setActiveProfileId: (profileId: string | null) => void;
};

export const usePortalStore = create<PortalState>((set) => ({
  activeProfileId: null,
  setActiveProfileId: (profileId) => set({ activeProfileId: profileId }),
}));
