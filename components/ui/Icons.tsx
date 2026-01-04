import { FontAwesome as ExpoFontAwesome, MaterialIcons as ExpoMaterialIcons } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';

cssInterop(ExpoMaterialIcons, { className: 'style' });
cssInterop(ExpoFontAwesome, { className: 'style' });

export const MaterialIcons = ExpoMaterialIcons;
export const FontAwesome = ExpoFontAwesome;
