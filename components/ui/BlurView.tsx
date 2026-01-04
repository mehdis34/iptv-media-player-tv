import { BlurView as ExpoBlurView, type BlurViewProps } from 'expo-blur';
import { cssInterop } from 'nativewind';

cssInterop(ExpoBlurView, { className: 'style' });

export const BlurView = ExpoBlurView;
export type { BlurViewProps };
