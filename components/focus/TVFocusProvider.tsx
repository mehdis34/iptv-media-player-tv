import { createContext, useContext, useMemo, type ReactNode } from 'react';

type TVFocusContextValue = {
  initialFocusKey?: string | null;
};

const TVFocusContext = createContext<TVFocusContextValue>({
  initialFocusKey: null,
});

type TVFocusProviderProps = {
  initialFocusKey?: string | null;
  children: ReactNode;
};

export function TVFocusProvider({
  initialFocusKey,
  children,
}: TVFocusProviderProps) {
  const value = useMemo(() => ({ initialFocusKey }), [initialFocusKey]);
  return (
    <TVFocusContext.Provider value={value}>{children}</TVFocusContext.Provider>
  );
}

export const useTVFocusContext = () => useContext(TVFocusContext);
