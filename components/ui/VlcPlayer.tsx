import { forwardRef } from 'react';
import {
  VLCPlayer as NativeVLCPlayer,
  type VLCPlayerProps,
} from 'react-native-vlc-media-player';
import { cssInterop } from 'nativewind';

cssInterop(NativeVLCPlayer, { className: 'style' });

export type VlcPlayerPropsWithClassName = VLCPlayerProps & { className?: string };

export const VLCPlayer = forwardRef<any, VlcPlayerPropsWithClassName>((props, ref) => (
  <NativeVLCPlayer {...props} ref={ref as any} />
));
export type { VLCPlayerProps };
