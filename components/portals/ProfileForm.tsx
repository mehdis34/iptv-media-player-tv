import { useCallback, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { z } from 'zod';

import { TVFocusProvider } from '@/components/focus/TVFocusProvider';
import { TVFocusPressable } from '@/components/focus/TVFocusPressable';
import { TVFocusTextInput } from '@/components/focus/TVFocusTextInput';
import { useI18n } from '@/components/i18n/I18nProvider';
import { createAvatarSeed, createRandomProfileName } from '@/components/portals/avatarHelpers';
import type { TranslationKey } from '@/constants/i18n';
import type { PortalProfileInput } from '@/types/profile';

const profileSchema = z.object({
  profileName: z.string().min(1),
  host: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  avatarSeed: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type ProfileFormProps = {
  onSubmit: (values: PortalProfileInput) => Promise<void> | void;
  submitKey: TranslationKey;
  initialFocusKey?: string | null;
  initialValues?: PortalProfileInput | null;
  showDevTools?: boolean;
  withRandomAvatarSeed?: boolean;
};

type FieldProps = {
  name: keyof ProfileFormValues;
  labelKey: TranslationKey;
  autoCapitalize?: 'none' | 'sentences';
  secureTextEntry?: boolean;
};

const profileDefaultValues: ProfileFormValues = {
  profileName: '',
  host: '',
  username: '',
  password: '',
  avatarSeed: '',
};

export function ProfileForm({
  onSubmit,
  submitKey,
  initialFocusKey = 'profileName',
  initialValues,
  showDevTools = __DEV__,
  withRandomAvatarSeed = false,
}: ProfileFormProps) {
  const { t } = useI18n();
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: profileDefaultValues,
  });

  const handleFormSubmit = useCallback(
    async (values: ProfileFormValues) => {
      const result = profileSchema.safeParse(values);
      if (!result.success) {
        const message = t('auth.errors.required');
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as keyof ProfileFormValues | undefined;
          if (!field) {
            return;
          }
          setError(field, { type: 'manual', message });
        });
        return;
      }

      const normalizedAvatarSeed = result.data.avatarSeed?.trim();
      const avatarSeed = normalizedAvatarSeed
        ? normalizedAvatarSeed
        : withRandomAvatarSeed
          ? createAvatarSeed()
          : null;
      await onSubmit({
        ...result.data,
        avatarSeed,
      });
    },
    [onSubmit, setError, t, withRandomAvatarSeed],
  );

  useEffect(() => {
    if (!initialValues) {
      return;
    }
    reset({
      ...profileDefaultValues,
      ...initialValues,
      avatarSeed: initialValues.avatarSeed ?? '',
    });
  }, [initialValues, reset]);

  const Field = ({
    name,
    labelKey,
    autoCapitalize = 'none',
    secureTextEntry = false,
  }: FieldProps) => (
    <View className="gap-2">
      <Text className="text-white/80 text-sm">{t(labelKey)}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <TVFocusTextInput
            focusKey={name}
            value={value}
            onChangeText={onChange}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            secureTextEntry={secureTextEntry}
          />
        )}
      />
      {errors[name]?.message ? (
        <Text className="mt-2 rounded-md border border-primary bg-primary/20 px-3 py-2 text-primary text-sm">
          {errors[name]?.message}
        </Text>
      ) : null}
    </View>
  );

  return (
    <TVFocusProvider initialFocusKey={initialFocusKey}>
      <View className="w-full gap-6">
        <Field name="profileName" labelKey="auth.fields.name" />
        <Field name="host" labelKey="auth.fields.host" />
        <Field name="username" labelKey="auth.fields.username" />
        <Field
          name="password"
          labelKey="auth.fields.password"
          secureTextEntry
        />
        <TVFocusPressable
          focusKey="submit"
          disabled={isSubmitting}
          onPress={handleSubmit(handleFormSubmit)}
        >
          <Text className="text-white text-base font-semibold">
            {t(submitKey)}
          </Text>
        </TVFocusPressable>
        {showDevTools ? (
          <TVFocusPressable
            focusKey="dev-prefill"
            onPress={() => {
              const randomName = createRandomProfileName();
              const randomSeed = createAvatarSeed();
              setValue('profileName', randomName, { shouldValidate: true });
              setValue('avatarSeed', randomSeed, { shouldValidate: true });
              setValue('host', 'http://tvchallenge.tn:7040', {
                shouldValidate: true,
              });
              setValue('username', 'mehdi30', { shouldValidate: true });
              setValue('password', '8xEW5uunD4d2', { shouldValidate: true });
            }}
          >
            <Text className="text-white text-base font-semibold">
              {t('auth.addProfile.devPrefill')}
            </Text>
          </TVFocusPressable>
        ) : null}
      </View>
    </TVFocusProvider>
  );
}
