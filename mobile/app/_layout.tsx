import { useEffect, useState, useRef } from 'react';
import { Stack, SplashScreen, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '../store/auth';
import { Colors } from '../constants/Colors';
import * as LocalAuthentication from 'expo-local-authentication';
import api from '../api/client';
import { registerForPushNotifications, setupNotificationHandler, checkBudgetAlerts } from '../lib/notifications';
import { HelpButton } from '../components/help/HelpButton';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { isLoggedIn, isLoading, checkAuth } = useAuthStore();
  const [ready, setReady] = useState(false);
  const biometricPrompted = useRef(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function init() {
      await checkAuth();
      setReady(true);
      await SplashScreen.hideAsync();
    }
    init();
  }, [checkAuth]);

  // Biometric lock check after auth is confirmed
  useEffect(() => {
    if (!ready || !isLoggedIn || biometricPrompted.current) return;
    biometricPrompted.current = true;

    api.get('/api/users/preferences').then(async (res) => {
      if (res.data?.biometricLock) {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (compatible && enrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock MyMoney',
            fallbackLabel: 'Enter PIN',
          });
          if (!result.success) {
            Alert.alert('Biometric Required', 'Please authenticate to continue using the app.');
          }
        }
      }
    }).catch(() => {});
  }, [ready, isLoggedIn]);

  // Redirect to onboarding for first-time users
  useEffect(() => {
    if (!isLoggedIn || pathname === '/onboarding' || pathname === '/login') return;
    api.get('/api/onboarding').then((r) => {
      if (r.data && !r.data.completed) {
        router.replace('/onboarding');
      }
    }).catch(() => {});
  }, [isLoggedIn, pathname, router]);

  // Push notification registration and handler setup
  useEffect(() => {
    setupNotificationHandler();
    if (isLoggedIn) {
      registerForPushNotifications();
      const budgetInterval = setInterval(() => { checkBudgetAlerts().catch(() => {}); }, 30 * 60 * 1000);
      checkBudgetAlerts().catch(() => {});
      return () => clearInterval(budgetInterval);
    }
  }, [isLoggedIn]);

  if (!ready || isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'slide_from_right',
        }}
      >
        {!isLoggedIn ? (
          <Stack.Screen name="login" options={{ animationTypeForReplace: 'pop' }} />
        ) : (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="budgets"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="goals"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="investments"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="net-worth"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="assets"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="loans"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="bank-accounts"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="insurance"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="subscriptions"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="reminders"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="reports"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="tax"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="settings"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="onboarding"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="environment"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="api-keys"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="auto-link"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="gmail-import"
              options={{ presentation: 'card' }}
            />
          </>
        )}
      </Stack>
      {isLoggedIn && <HelpButton path={pathname} />}
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
