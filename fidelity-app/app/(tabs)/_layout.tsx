import { Redirect, Tabs } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { Colors } from '../../constants/theme';

function TabIcon({ iconName, label, focused }: { iconName: keyof typeof Ionicons.glyphMap; label: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      <Ionicons name={iconName} size={21} color={focused ? Colors.goldDark : Colors.textSecondary} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { isOnboarded, isLoading } = useRestaurantStore();

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingBadge}>
          <Ionicons name="trophy" size={40} color={Colors.goldDark} />
        </View>
        <ActivityIndicator color={Colors.gold} size="large" style={{ marginTop: 20 }} />
      </View>
    );
  }
  if (!isOnboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.goldDark,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName={focused ? 'bar-chart' : 'bar-chart-outline'} label="Tableau" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName={focused ? 'people' : 'people-outline'} label="Clients" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName={focused ? 'notifications' : 'notifications-outline'} label="Notifs" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName={focused ? 'settings' : 'settings-outline'} label="Réglages" focused={focused} />
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
  loadingBadge: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.goldSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  tabBar: {
    backgroundColor: Colors.tabBar,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 76,
    paddingTop: 6,
    paddingBottom: 10,
  },
  tabIcon: {
    alignItems: 'center', gap: 3, minWidth: 72,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14,
  },
  tabIconFocused: { backgroundColor: Colors.goldSoft },
  tabLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '500' },
  tabLabelFocused: { color: Colors.goldDark, fontWeight: '700' },
});
