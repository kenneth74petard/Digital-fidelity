import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { Colors } from '../../constants/theme';

function TabIcon({ iconName, label, focused }: { iconName: keyof typeof Ionicons.glyphMap; label: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <Ionicons name={iconName} size={22} color={focused ? Colors.gold : Colors.textSecondary} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { isOnboarded, isLoading } = useRestaurantStore();

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <Ionicons name="trophy" size={64} color={Colors.gold} />
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
            <TabIcon iconName="bar-chart" label="Tableau" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="people" label="Clients" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="notifications" label="Notifs" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="settings-sharp" label="Réglages" focused={focused} />
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
  tabBar: {
    backgroundColor: Colors.tabBar,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
  },
  tabIcon: { alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 10, color: Colors.textSecondary },
  tabLabelFocused: { color: Colors.gold },
});
