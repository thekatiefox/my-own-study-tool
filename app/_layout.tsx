import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { AuthProvider, useAuth } from '@/lib/auth';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    'Inter-Light': require('@expo-google-fonts/inter/300Light/Inter_300Light.ttf'),
    'Inter-Regular': require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    'Inter-Medium': require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user, loading, configured } = useAuth();

  const theme = colorScheme === 'dark' ? {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, background: colors.background },
  } : {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: colors.background },
  };

  // If Supabase isn't configured yet, skip auth entirely (local-only mode)
  const needsAuth = configured && !user && !loading;

  return (
    <ThemeProvider value={theme}>
      <Stack>
        <Stack.Screen name="auth" options={{ headerShown: false }} redirect={!needsAuth} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} redirect={needsAuth} />
        <Stack.Screen
          name="review/[packId]"
          options={{
            title: 'Review',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            presentation: 'modal',
          }}
          redirect={needsAuth}
        />
      </Stack>
    </ThemeProvider>
  );
}
