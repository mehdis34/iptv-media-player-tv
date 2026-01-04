import { TextInput, type TextInputProps } from 'react-native';

import { cn } from '@/components/ui/cn';

import { useTVFocus } from './useTVFocus';

type TVFocusTextInputProps = TextInputProps & {
  focusKey?: string;
  className?: string;
  focusClassName?: string;
};

const baseClassName =
  'rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white text-base';
const focusClassName = 'focus:border-primary focus:bg-white/20';
const disabledClassName = 'opacity-50';

export function TVFocusTextInput({
  focusKey,
  hasTVPreferredFocus,
  className,
  focusClassName: focusClassNameProp,
  editable,
  ...props
}: TVFocusTextInputProps) {
  const { hasTVPreferredFocus: preferredFocus } = useTVFocus({
    focusKey,
    hasTVPreferredFocus,
  });

  return (
    <TextInput
      {...props}
      editable={editable}
      focusable
      hasTVPreferredFocus={preferredFocus}
      className={cn(
        baseClassName,
        focusClassName,
        className,
        focusClassNameProp,
        editable === false ? disabledClassName : null,
      )}
    />
  );
}
