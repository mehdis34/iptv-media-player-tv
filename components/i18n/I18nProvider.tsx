import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getLocales } from 'expo-localization';

import {
  defaultLocale,
  type Locale,
  resolveTranslation,
  type TranslationKey,
  type TranslationParams,
  translations,
} from '@/constants/i18n';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  children: ReactNode;
  initialLocale?: Locale;
};

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(
    initialLocale ?? getDeviceLocale(),
  );

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => {
      const value = resolveTranslation(key, locale, defaultLocale);
      if (!params) {
        return value;
      }
      return Object.entries(params).reduce((acc, [param, paramValue]) => {
        return acc.replace(
          new RegExp(`{{\\s*${param}\\s*}}`, 'g'),
          String(paramValue),
        );
      }, value);
    },
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

const getDeviceLocale = (): Locale => {
  try {
    const locales = getLocales();
    const language =
      locales[0]?.languageCode ??
      locales[0]?.languageTag?.split('-')[0] ??
      defaultLocale;
    if (language in translations) {
      return language as Locale;
    }
  } catch {
    // fall back to English
  }
  return 'en';
};
