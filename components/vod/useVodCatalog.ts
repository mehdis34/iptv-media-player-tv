import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getVodCategories,
  getVodPage,
  type VodCategory,
  type VodItem,
  type VodSortKey,
} from '@/storage/catalog';
import { useCatalogRefreshStore } from '@/hooks/useCatalogRefreshStore';
import { usePortalStore } from '@/hooks/usePortalStore';

const PAGE_SIZE = 30;

type VodState = {
  status: 'loading' | 'ready' | 'error';
  items: VodItem[];
  featured: VodItem | null;
  categories: VodCategory[];
  categoryId: string | null;
  sort: VodSortKey;
  hasMore: boolean;
  isLoadingMore: boolean;
};

const getFeatured = (items: VodItem[]) => items[0] ?? null;

export const useVodCatalog = () => {
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const catalogVersion = useCatalogRefreshStore((store) => store.version);
  const [state, setState] = useState<VodState>({
    status: 'loading',
    items: [],
    featured: null,
    categories: [],
    categoryId: null,
    sort: 'recent',
    hasMore: true,
    isLoadingMore: false,
  });

  const loadPage = useCallback(
    async (
      reset: boolean,
      currentItems: VodItem[] = [],
      override?: { categoryId?: string | null; sort?: VodSortKey },
    ) => {
      if (!activeProfileId) {
        return;
      }
      setState((prev) => ({
        ...prev,
        status: reset ? 'loading' : prev.status,
        isLoadingMore: !reset,
      }));
      const offset = reset ? 0 : currentItems.length;
      const items = await getVodPage(
        activeProfileId,
        PAGE_SIZE,
        offset,
        override?.sort ?? state.sort,
        override?.categoryId ?? state.categoryId,
      );
      setState((prev) => {
        const nextItems = reset ? items : [...prev.items, ...items];
        return {
          ...prev,
          status: 'ready',
          items: nextItems,
          featured: getFeatured(nextItems),
          hasMore: items.length === PAGE_SIZE,
          isLoadingMore: false,
        };
      });
    },
    [activeProfileId, state.categoryId, state.sort],
  );

  useEffect(() => {
    if (!activeProfileId) {
      return;
    }
    let isCancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));
    const run = async () => {
      try {
        const categories = await getVodCategories(activeProfileId);
        if (isCancelled) {
          return;
        }
        setState((prev) => ({ ...prev, categories }));
        await loadPage(true, []);
      } catch {
        if (!isCancelled) {
          setState((prev) => ({ ...prev, status: 'error', isLoadingMore: false }));
        }
      }
    };
    run();
    return () => {
      isCancelled = true;
    };
  }, [activeProfileId, catalogVersion, loadPage]);

  const setCategoryId = useCallback(
    (categoryId: string | null) => {
      setState((prev) => ({
        ...prev,
        categoryId,
        items: [],
        featured: null,
        hasMore: true,
      }));
      void loadPage(true, [], { categoryId, sort: state.sort });
    },
    [loadPage, state.sort],
  );

  const setSort = useCallback(
    (sort: VodSortKey) => {
      setState((prev) => ({
        ...prev,
        sort,
        items: [],
        featured: null,
        hasMore: true,
      }));
      void loadPage(true, [], { categoryId: state.categoryId, sort });
    },
    [loadPage, state.categoryId],
  );

  const loadMore = useCallback(() => {
    if (state.isLoadingMore || !state.hasMore || state.status === 'loading') {
      return;
    }
    void loadPage(false, state.items);
  }, [loadPage, state.hasMore, state.isLoadingMore, state.items, state.status]);

  const gridItems = useMemo(() => {
    if (!state.featured) {
      return state.items;
    }
    return state.items.filter((item) => item.id !== state.featured?.id);
  }, [state.featured, state.items]);

  return {
    ...state,
    gridItems,
    setCategoryId,
    setSort,
    loadMore,
  };
};
