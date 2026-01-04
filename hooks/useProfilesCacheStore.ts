import { create } from 'zustand';

type ProfilesCacheState = {
  version: number;
  bump: () => void;
};

export const useProfilesCacheStore = create<ProfilesCacheState>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));
