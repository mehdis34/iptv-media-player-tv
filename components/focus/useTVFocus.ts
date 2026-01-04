import { useTVFocusContext } from './TVFocusProvider';

type UseTVFocusInput = {
  focusKey?: string;
  hasTVPreferredFocus?: boolean;
};

export const useTVFocus = ({
  focusKey,
  hasTVPreferredFocus,
}: UseTVFocusInput) => {
  const { initialFocusKey } = useTVFocusContext();

  const preferredFocus =
    hasTVPreferredFocus ??
    (focusKey != null && focusKey === initialFocusKey);

  return {
    hasTVPreferredFocus: preferredFocus,
  };
};
