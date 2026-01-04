import { create } from 'zustand';

type LibraryRefreshState = {
  version: number;
  bump: () => void;
};

export const useLibraryRefreshStore = create<LibraryRefreshState>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));
