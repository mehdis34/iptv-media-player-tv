import { useCallback, useEffect, useRef, useState } from 'react';

import { usePortalStore } from '@/hooks/usePortalStore';
import { useLibraryRefreshStore } from '@/hooks/useLibraryRefreshStore';
import { addFavorite, isFavorite, removeFavorite, type LibraryItemType } from '@/storage/library';

type FavoriteStatus = {
  isFavorite: boolean;
  isLoading: boolean;
  toggleFavorite: () => void;
};

export const useFavoriteStatus = (
  itemType: LibraryItemType,
  itemId: string | null,
): FavoriteStatus => {
  const activeProfileId = usePortalStore((store) => store.activeProfileId);
  const bumpLibrary = useLibraryRefreshStore((store) => store.bump);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!activeProfileId || !itemId) {
      setIsFavorited(false);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    const run = async () => {
      try {
        const value = await isFavorite(activeProfileId, itemType, itemId);
        if (!mountedRef.current || isCancelled) {
          return;
        }
        setIsFavorited(value);
      } finally {
        if (!mountedRef.current || isCancelled) {
          return;
        }
        setIsLoading(false);
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [activeProfileId, itemId, itemType]);

  const toggleFavorite = useCallback(() => {
    if (!activeProfileId || !itemId) {
      return;
    }

    const nextValue = !isFavorited;
    setIsFavorited(nextValue);

    const run = async () => {
      try {
        if (nextValue) {
          await addFavorite(activeProfileId, itemType, itemId);
        } else {
          await removeFavorite(activeProfileId, itemType, itemId);
        }
        bumpLibrary();
      } catch {
        if (!mountedRef.current) {
          return;
        }
        setIsFavorited(!nextValue);
      }
    };

    void run();
  }, [activeProfileId, bumpLibrary, isFavorited, itemId, itemType]);

  return {
    isFavorite: isFavorited,
    isLoading,
    toggleFavorite,
  };
};
