import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { COLORS } from '../constants/theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `textarea:focus, input:focus { outline: none; }`;
  document.head.append(style);
}

function RouteGuard() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === 'auth';

    if (!user && !inAuth) {
      router.replace('/auth/login');
    } else if (user && inAuth) {
      const role = user.role;
      if (role === 'main_manager' || role === 'branch_manager') {
        router.replace('/manager/dashboard');
      } else if (role === 'hall_employee') {
        router.replace('/employee/scan');
      } else {
        router.replace('/customer/home');
      }
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <RouteGuard />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
