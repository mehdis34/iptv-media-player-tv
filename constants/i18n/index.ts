import en from './en.json';
import fr from './fr.json';

export const translations = { en, fr } as const;

export type Locale = keyof typeof translations;
export type TranslationKey = string;
export type TranslationParams = Record<string, string | number>;

export const defaultLocale: Locale = 'en';

const lookupValue = (path: string, dictionary: Record<string, unknown>) => {
  return path
    .split('.')
    .reduce<unknown>((current, key) => {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      return (current as Record<string, unknown>)[key];
    }, dictionary);
};

export const resolveTranslation = (
  key: TranslationKey,
  locale: Locale,
  fallbackLocale: Locale = defaultLocale,
) => {
  const primary = lookupValue(key, translations[locale]);
  if (typeof primary === 'string') {
    return primary;
  }
  const fallback = lookupValue(key, translations[fallbackLocale]);
  if (typeof fallback === 'string') {
    return fallback;
  }
  return key;
};
