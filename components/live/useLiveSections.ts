import { useEffect, useState } from 'react';

import { applyLiveEpg } from '@/components/epg/applyLiveEpg';
import { useCatalogRefreshStore } from '@/hooks/useCatalogRefreshStore';
import { usePortalStore } from '@/hooks/usePortalStore';
import {
  getLiveCategories,
  getLivePage,
  type LiveCategory,
} from '@/storage/catalog';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { HomeContentItem } from '@/components/home/types';

const SECTION_ITEM_LIMIT = 5;

type LiveSection = {
  id: string;
  name: string;
  items: HomeContentItem[];
};

type LiveSectionsState = {
  status: 'loading' | 'ready' | 'error';
  sections: LiveSection[];
};

export const useLiveSections = (enabled: boolean) => {
  const { t } = useI18n();
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const catalogVersion = useCatalogRefreshStore((store) => store.version);
  const [state, setState] = useState<LiveSectionsState>({
    status: 'loading',
    sections: [],
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (!activeProfileId) {
      return;
    }
    let isCancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));

    const run = async () => {
      try {
        const categories: LiveCategory[] = await getLiveCategories(activeProfileId);
        const rawSections = await Promise.all(
          categories.map(async (category) => {
            const items = await getLivePage(
              activeProfileId,
              SECTION_ITEM_LIMIT,
              0,
              category.id,
              { includeMissingIcons: true },
            );
            return {
              id: category.id,
              name: category.name,
              items,
            };
          }),
        );
        const sections = rawSections.filter((section) => section.items.length > 0);
        if (sections.length === 0) {
          const items = await getLivePage(
            activeProfileId,
            SECTION_ITEM_LIMIT,
            0,
            null,
            { includeMissingIcons: true },
          );
          if (isCancelled) {
            return;
          }
          setState({
            status: 'ready',
            sections: items.length > 0
              ? [{ id: 'all', name: t('live.categories.all'), items }]
              : [],
          });
          if (items.length > 0) {
            try {
              const withEpg = await applyLiveEpg(activeProfileId, items);
              if (!isCancelled) {
                setState({
                  status: 'ready',
                  sections: [
                    { id: 'all', name: t('live.categories.all'), items: withEpg },
                  ],
                });
              }
            } catch {
              // Keep raw items if EPG resolution fails.
            }
          }
          return;
        }
        if (isCancelled) {
          return;
        }
        setState({
          status: 'ready',
          sections,
        });

        const flatItems = sections.flatMap((section) => section.items);
        if (flatItems.length === 0) {
          return;
        }
        try {
          const withEpgItems = await applyLiveEpg(activeProfileId, flatItems);
          if (isCancelled) {
            return;
          }
          const byId = new Map(withEpgItems.map((item) => [item.id, item]));
          setState({
            status: 'ready',
            sections: sections.map((section) => ({
              ...section,
              items: section.items.map((item) => byId.get(item.id) ?? item),
            })),
          });
        } catch {
          // Keep raw items if EPG resolution fails.
        }
      } catch {
        if (!isCancelled) {
          setState((prev) => ({ ...prev, status: 'error' }));
        }
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [activeProfileId, catalogVersion, enabled]);

  return state;
};
