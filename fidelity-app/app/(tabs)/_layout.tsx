import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { Colors } from '../../constants/theme';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { isOnboarded, isLoading } = useRestaurantStore();

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingEmoji}>🏆</Text>
        <ActivityIndicator color={Colors.gold} size="large" style={{ marginTop: 16 }} />
      </View>
    );
  }
  if (!isOnboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" label="Tableau" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👥" label="Clients" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📨" label="Notifs" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚙️" label="Réglages" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1, backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  loadingEmoji: { fontSize: 64 },
  tabBar: {
    backgroundColor: Colors.tabBar,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
  },
  tabIcon: { alignItems: 'center', gap: 2 },
  tabEmoji: { fontSize: 22 },
  tabLabel: { fontSize: 10, color: Colors.textSecondary },
  tabLabelFocused: { color: Colors.gold },
});
