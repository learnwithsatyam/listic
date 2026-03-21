import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/auth-store';
import { colors } from '../src/theme';

/** Segments that don't require authentication */
const PUBLIC_SEGMENTS = ['index', '(auth)', 'about', 'privacy'];

export default function RootLayout() {
  const loadToken = useAuthStore((s) => s.loadToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadToken();
  }, []);

  // Redirect unauthenticated users away from protected routes
  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] || 'index';
    const isPublic = PUBLIC_SEGMENTS.includes(firstSegment);

    if (!isAuthenticated && !isPublic) {
      // Not logged in, trying to access a protected page → send to landing
      router.replace('/');
    } else if (isAuthenticated && firstSegment === '(auth)') {
      // Logged in, but on login/register → send to home
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Sign In' }} />
        <Stack.Screen name="(auth)/register" options={{ title: 'Sign Up' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="upload" options={{ title: 'New Project' }} />
        <Stack.Screen name="generate/[id]" options={{ title: '', headerBackTitle: '' }} />
        <Stack.Screen name="results/[id]" options={{ title: 'Results' }} />
        <Stack.Screen name="about" options={{ title: 'About Listic' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
        <Stack.Screen name="purchase" options={{ title: 'Purchase Credits' }} />
        <Stack.Screen name="payment-history" options={{ title: 'Payment History' }} />
      </Stack>
    </>
  );
}
