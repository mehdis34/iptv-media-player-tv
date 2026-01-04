import { ScrollView, Text, View } from 'react-native';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/fr';

import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useAccountInfo } from '@/hooks/useAccountInfo';
import { usePortalStore } from '@/hooks/usePortalStore';
import { ScreenLayout } from '@/layouts/ScreenLayout';

dayjs.extend(localizedFormat);

const formatValue = (value: unknown, fallback: string) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : fallback;
  }
  return String(value);
};

const formatTrial = (value: unknown, yesLabel: string, noLabel: string, fallback: string) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  if (value === true || value === 1 || value === '1') {
    return yesLabel;
  }
  if (value === false || value === 0 || value === '0') {
    return noLabel;
  }
  return fallback;
};

const toDayjs = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    return dayjs(ms);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric)) {
        return null;
      }
      const ms = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
      return dayjs(ms);
    }
    const parsed = dayjs(trimmed);
    return parsed.isValid() ? parsed : null;
  }
  return null;
};

const formatDateValue = (
  value: unknown,
  locale: string,
  fallback: string,
  withTime: boolean,
) => {
  const parsed = toDayjs(value);
  if (!parsed || !parsed.isValid()) {
    return fallback;
  }
  const localized = parsed.locale(locale === 'fr' ? 'fr' : 'en');
  return withTime ? localized.format('LLL') : localized.format('LL');
};

export function AccountScreen() {
  const { t, locale } = useI18n();
  const activeProfileId = usePortalStore((state) => state.activeProfileId);
  const { profile, info, status, errorKey } = useAccountInfo(activeProfileId);

  if (status === 'loading') {
    return (
      <ScreenLayout contentClassName="gap-8 max-w-xl mx-auto">
        <Text className="text-white/70 text-base">{t('common.loading')}</Text>
      </ScreenLayout>
    );
  }

  if (!profile || !info) {
    return (
      <ScreenLayout contentClassName="gap-8 max-w-xl mx-auto">
        <Text className="text-white/70 text-base">
          {t(errorKey ?? 'settings.account.errors.loadFailed')}
        </Text>
      </ScreenLayout>
    );
  }

  const fallback = t('common.notAvailable');
  const yesLabel = t('common.yes');
  const noLabel = t('common.no');
  const user = info.user_info;
  const server = info.server_info;

  const sections = [
    {
      titleKey: 'settings.account.sections.profile',
      rows: [
        {
          labelKey: 'settings.account.fields.profileName',
          value: profile.profileName,
        },
        {
          labelKey: 'settings.account.fields.host',
          value: profile.host,
        },
        {
          labelKey: 'settings.account.fields.username',
          value: user?.username,
        },
      ],
    },
    {
      titleKey: 'settings.account.sections.subscription',
      rows: [
        {
          labelKey: 'settings.account.fields.status',
          value: user?.status,
        },
        {
          labelKey: 'settings.account.fields.expiration',
          value: formatDateValue(user?.exp_date, locale, fallback, false),
        },
        {
          labelKey: 'settings.account.fields.trial',
          value: formatTrial(user?.is_trial, yesLabel, noLabel, fallback),
        },
        {
          labelKey: 'settings.account.fields.activeConnections',
          value: user?.active_cons,
        },
        {
          labelKey: 'settings.account.fields.maxConnections',
          value: user?.max_connections,
        },
        {
          labelKey: 'settings.account.fields.createdAt',
          value: formatDateValue(user?.created_at, locale, fallback, false),
        },
        {
          labelKey: 'settings.account.fields.outputFormats',
          value: formatValue(user?.allowed_output_formats, fallback),
        },
      ],
    },
    {
      titleKey: 'settings.account.sections.server',
      rows: [
        {
          labelKey: 'settings.account.fields.serverUrl',
          value: server?.url,
        },
        {
          labelKey: 'settings.account.fields.serverTime',
          value: formatDateValue(server?.time_now, locale, fallback, true),
        },
        {
          labelKey: 'settings.account.fields.timezone',
          value: server?.timezone,
        },
      ],
    },
  ];

  return (
    <ScreenLayout contentClassName="gap-8 max-w-xl mx-auto">
      <Text className="text-white text-3xl font-semibold text-center my-12">
        {t('settings.account.title')}
      </Text>
      <TVFocusProvider initialFocusKey={sections[0]?.titleKey}>
        <ScrollView contentContainerClassName="gap-6" showsVerticalScrollIndicator={false}>
          {sections.map((section) => (
            <TVFocusPressable
              key={section.titleKey}
              focusKey={section.titleKey}
              onPress={() => {}}
              unstyled
              className="gap-4 rounded-xl border border-white/10 bg-white/5 p-6"
              focusClassName="border-primary bg-white/10 scale-102"
            >
              <Text className="text-white text-lg font-semibold">{t(section.titleKey)}</Text>
              <View className="gap-3">
                {section.rows.map((row) => (
                  <View key={row.labelKey} className="flex-row justify-between gap-6">
                    <Text className="text-white/70 text-sm">{t(row.labelKey)}</Text>
                    <Text className="text-white text-sm text-right">
                      {formatValue(row.value, fallback)}
                    </Text>
                  </View>
                ))}
              </View>
            </TVFocusPressable>
          ))}
        </ScrollView>
      </TVFocusProvider>
    </ScreenLayout>
  );
}
