import { Pressable, type PressableProps } from 'react-native';

import { cn } from '@/components/ui/cn';

import { useTVFocus } from './useTVFocus';

type TVFocusableProps = PressableProps & {
  focusKey?: string;
  className?: string;
  focusClassName?: string;
  unstyled?: boolean;
};

const baseClassName = 'relative';
const defaultClassName = 'items-center justify-center rounded-md px-6 py-4 bg-white/10';
const defaultFocusClassName = 'focus:scale-105 focus:z-10 focus:bg-primary';
const disabledClassName = 'opacity-50';

const toFocusClassName = (value?: string) => {
  if (!value) {
    return null;
  }

  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => (token.includes(':') ? token : `focus:${token}`))
    .join(' ');
};

export function TVFocusable({
  focusKey,
  hasTVPreferredFocus,
  className,
  focusClassName,
  unstyled,
  children,
  ...props
}: TVFocusableProps) {
  const { hasTVPreferredFocus: preferredFocus } = useTVFocus({
    focusKey,
    hasTVPreferredFocus,
  });

  return (
    <Pressable
      {...props}
      focusable
      hasTVPreferredFocus={preferredFocus}
      className={cn(
        baseClassName,
        unstyled ? null : defaultClassName,
        unstyled ? null : defaultFocusClassName,
        className,
        toFocusClassName(focusClassName),
        props.disabled ? disabledClassName : null,
      )}
    >
      {children}
    </Pressable>
  );
}
