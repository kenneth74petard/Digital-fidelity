import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRestaurantStore } from '../stores/restaurantStore';
import { Colors, getThemeMode } from '../constants/theme';

export default function RootLayout() {
  const { checkOnboarding } = useRestaurantStore();

  useEffect(() => {
    checkOnboarding();

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = Colors.background;
      document.body.style.backgroundColor = Colors.background;
      document.body.style.color = Colors.textPrimary;
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style={getThemeMode() === 'dark' ? 'light' : 'dark'} backgroundColor={Colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="clients/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: Colors.card },
            headerTintColor: Colors.textPrimary,
            headerTitle: 'Détail client',
            headerBackTitle: 'Retour',
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
