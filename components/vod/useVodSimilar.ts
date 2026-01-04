import { useEffect, useState } from 'react';

import { getVodSimilar, type VodItem } from '@/storage/catalog';
import { usePortalStore } from '@/hooks/usePortalStore';

type VodSimilarState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: VodItem[];
};

export const useVodSimilar = (
  categoryId?: string | null,
  excludeId?: string | null,
  limit = 10,
) => {
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const [state, setState] = useState<VodSimilarState>({
    status: 'idle',
    items: [],
  });

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!activeProfileId || !categoryId) {
        if (isMounted) {
          setState({ status: 'ready', items: [] });
        }
        return;
      }

      setState((prev) => ({ ...prev, status: 'loading' }));

      try {
        const items = await getVodSimilar(
          activeProfileId,
          categoryId,
          excludeId,
          limit,
        );
        if (isMounted) {
          setState({ status: 'ready', items });
        }
      } catch {
        if (isMounted) {
          setState({ status: 'error', items: [] });
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [activeProfileId, categoryId, excludeId, limit]);

  return state;
};
