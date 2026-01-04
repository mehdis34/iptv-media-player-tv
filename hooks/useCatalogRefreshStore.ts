import { create } from 'zustand';

type CatalogRefreshState = {
  version: number;
  bump: () => void;
};

export const useCatalogRefreshStore = create<CatalogRefreshState>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));
