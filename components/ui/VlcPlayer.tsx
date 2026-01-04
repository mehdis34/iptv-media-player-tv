import { VLCPlayer as NativeVLCPlayer, type VLCPlayerProps } from 'react-native-vlc-media-player';
import { cssInterop } from 'nativewind';

cssInterop(NativeVLCPlayer, { className: 'style' });

export const VLCPlayer = NativeVLCPlayer;
export type { VLCPlayerProps };
