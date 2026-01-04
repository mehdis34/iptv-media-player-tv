import '../global.css';

import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { initCacheDb } from '@/storage/cache';
import { initCatalogDb } from '@/storage/catalog';
import { initLibraryDb } from '@/storage/library';
import { initProfilesDb } from '@/storage/profiles';
import { I18nProvider } from '@/components/i18n/I18nProvider';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Disable reanimated warnings
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
      if (error) {
        console.warn(`Error in loading fonts: ${error}`);
      }
    }
  }, [loaded, error]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    initCacheDb().catch((initError) => {
      console.warn(`Error initializing cache DB: ${String(initError)}`);
    });
    initCatalogDb().catch((initError) => {
      console.warn(`Error initializing catalog DB: ${String(initError)}`);
    });
    initLibraryDb().catch((initError) => {
      console.warn(`Error initializing library DB: ${String(initError)}`);
    });
    initProfilesDb().catch((initError) => {
      console.warn(`Error initializing profiles DB: ${String(initError)}`);
    });
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
    <I18nProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemeProvider>
    </I18nProvider>
  );
}
