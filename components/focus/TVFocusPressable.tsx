import type { PressableProps } from 'react-native';

import { TVFocusable } from './TVFocusable';

type TVFocusPressableProps = PressableProps & {
  focusKey?: string;
  className?: string;
  focusClassName?: string;
  unstyled?: boolean;
};

export function TVFocusPressable({
  focusClassName,
  unstyled,
  ...props
}: TVFocusPressableProps) {
  const resolvedFocusClassName =
    focusClassName ?? (unstyled ? undefined : 'bg-primary');

  return (
    <TVFocusable
      accessibilityRole="button"
      focusClassName={resolvedFocusClassName}
      unstyled={unstyled}
      {...props}
    />
  );
}
