import { View } from 'react-native';

import { cn } from '@/components/ui/cn';

type TVFocusRingProps = {
  className?: string;
  isFocused?: boolean;
};

export function TVFocusRing({ className, isFocused }: TVFocusRingProps) {
  return (
    <View
      pointerEvents="none"
      className={cn(
        'absolute inset-0 rounded-md border-2 border-primary',
        isFocused ? 'opacity-100' : 'opacity-0',
        className,
      )}
    />
  );
}
