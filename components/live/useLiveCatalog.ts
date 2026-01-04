import { useCallback, useEffect, useMemo, useState } from 'react';

import { applyLiveEpg } from '@/components/epg/applyLiveEpg';
import type { HomeContentItem } from '@/components/home/types';
import { useCatalogRefreshStore } from '@/hooks/useCatalogRefreshStore';
import { usePortalStore } from '@/hooks/usePortalStore';
import {
  getLiveCategories,
  getLivePage,
  type LiveCategory,
} from '@/storage/catalog';

const PAGE_SIZE = 30;

type LiveState = {
  status: 'loading' | 'ready' | 'error';
  items: HomeContentItem[];
  categories: LiveCategory[];
  categoryId: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
};

export const useLiveCatalog = () => {
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const catalogVersion = useCatalogRefreshStore((store) => store.version);
  const [state, setState] = useState<LiveState>({
    status: 'loading',
    items: [],
    categories: [],
    categoryId: null,
    hasMore: true,
    isLoadingMore: false,
  });

  const loadPage = useCallback(
    async (
      reset: boolean,
      currentItems: HomeContentItem[] = [],
      override?: { categoryId?: string | null },
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
      const items = await getLivePage(
        activeProfileId,
        PAGE_SIZE,
        offset,
        override?.categoryId ?? state.categoryId,
        { includeMissingIcons: true },
      );
      setState((prev) => {
        const nextItems = reset ? items : [...prev.items, ...items];
        return {
          ...prev,
          status: 'ready',
          items: nextItems,
          hasMore: items.length === PAGE_SIZE,
          isLoadingMore: false,
        };
      });
      try {
        const withEpg = await applyLiveEpg(activeProfileId, items);
        setState((prev) => ({
          ...prev,
          status: 'ready',
          items: reset ? withEpg : [...prev.items, ...withEpg],
        }));
      } catch {
        // Keep raw items if EPG resolution fails.
      }
    },
    [activeProfileId, state.categoryId],
  );

  useEffect(() => {
    if (!activeProfileId) {
      return;
    }
    let isCancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));
    const run = async () => {
      try {
        const categories = await getLiveCategories(activeProfileId);
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
        hasMore: true,
      }));
      void loadPage(true, [], { categoryId });
    },
    [loadPage],
  );

  const loadMore = useCallback(() => {
    if (state.isLoadingMore || !state.hasMore || state.status === 'loading') {
      return;
    }
    void loadPage(false, state.items);
  }, [loadPage, state.hasMore, state.isLoadingMore, state.items, state.status]);

  return {
    ...state,
    setCategoryId,
    loadMore,
  };
};
