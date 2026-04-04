import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRestaurantStore } from '../stores/restaurantStore';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  const { checkOnboarding, isOnboarded, isLoading } = useRestaurantStore();

  useEffect(() => {
    checkOnboarding();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="light" backgroundColor={Colors.background} />
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
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
