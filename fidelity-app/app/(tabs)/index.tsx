import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, RefreshControl, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { useCustomersStore } from '../../stores/customersStore';
import { statsApi } from '../../lib/api';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { Stats, Customer } from '../../../shared/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { restaurant } = useRestaurantStore();
  const { customers, loadCustomers } = useCustomersStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLock = useRef(false);

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    try {
      const [statsRes] = await Promise.all([
        statsApi.get(restaurant.id),
        loadCustomers(restaurant.id),
      ]);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    scanLock.current = false;
    setShowScanner(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanLock.current) return;
    // QR format: fidelite:{customerId}
    const match = data.match(/^fidelite:(.+)$/);
    if (match) {
      scanLock.current = true;
      setShowScanner(false);
      router.push(`/clients/${match[1]}` as any);
    }
  };

  const recentCustomers = customers.slice(0, 5);
  const stampGoal = restaurant?.stamp_goal || 10;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>{restaurant?.logo_emoji}</Text>
          <View>
            <Text style={styles.restaurantName}>{restaurant?.name}</Text>
            <Text style={styles.headerDate}>{format(new Date(), "EEEE d MMMM", { locale: fr })}</Text>
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <StatCard icon="people" value={stats?.total_customers || 0} label="Total clients" />
        <StatCard icon="ribbon" value={stats?.stamps_given_today || 0} label="Tampons aujourd'hui" />
        <StatCard icon="notifications" value={stats?.notifications_sent_total || 0} label="Notifications" />
        <StatCard icon="star" value={stats?.stamps_given_week || 0} label="Tampons semaine" />
      </ScrollView>

      {/* Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Nouveaux clients (7 jours)</Text>
        {stats?.new_customers_per_day && stats.new_customers_per_day.length > 0 ? (
          <MiniBarChart data={stats.new_customers_per_day} />
        ) : (
          <Text style={styles.emptyText}>Aucune donnée disponible</Text>
        )}
      </View>

      {/* Recent Customers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Clients récents</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/clients')}>
            <Text style={styles.seeAll}>Voir tous →</Text>
          </TouchableOpacity>
        </View>
        {recentCustomers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={40} color={Colors.textSecondary} style={{ marginBottom: Spacing.md }} />
            <Text style={styles.emptyTitle}>Aucun client</Text>
            <Text style={styles.emptySubtitle}>Commencez par ajouter vos premiers clients</Text>
          </View>
        ) : (
          recentCustomers.map((customer) => (
            <CustomerRow key={customer.id} customer={customer} stampGoal={stampGoal} />
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleOpenScanner}>
          <Ionicons name="camera" size={24} color="#000" />
          <Text style={styles.actionButtonText}>Scanner un client</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={() => router.push('/(tabs)/clients')}
        >
          <Ionicons name="person-add" size={24} color={Colors.textSecondary} />
          <Text style={[styles.actionButtonText, { color: Colors.textPrimary }]}>Ajouter un client</Text>
        </TouchableOpacity>
      </View>

      {/* Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={scannerStyles.container}>
          <CameraView
            style={scannerStyles.camera}
            facing="front"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <View style={scannerStyles.overlay}>
            <View style={scannerStyles.header}>
              <TouchableOpacity onPress={() => setShowScanner(false)} style={scannerStyles.closeBtn}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={scannerStyles.title}>Scanner un QR client</Text>
              <View style={{ width: 28 }} />
            </View>
            <View style={scannerStyles.reticle} />
            <Text style={scannerStyles.hint}>Placez le QR code du client dans le cadre</Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatCard({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string }) {
  return (
    <View style={statStyles.card}>
      <Ionicons name={icon} size={24} color={Colors.gold} style={{ marginBottom: Spacing.sm }} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function MiniBarChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <View style={chartStyles.container}>
      {data.map((d, i) => (
        <View key={i} style={chartStyles.barGroup}>
          <View style={chartStyles.barContainer}>
            <View
              style={[
                chartStyles.bar,
                { height: Math.max(4, (d.count / max) * 80), backgroundColor: Colors.gold },
              ]}
            />
          </View>
          <Text style={chartStyles.label}>
            {format(new Date(d.date), 'dd/MM')}
          </Text>
          <Text style={chartStyles.count}>{d.count}</Text>
        </View>
      ))}
    </View>
  );
}

function CustomerRow({ customer, stampGoal }: { customer: Customer; stampGoal: number }) {
  const initials = `${customer.first_name?.[0] ?? ''}${customer.last_name?.[0] ?? ''}`.toUpperCase() || '?';
  const hasReward = customer.stamps >= stampGoal;

  return (
    <TouchableOpacity
      style={rowStyles.row}
      onPress={() => router.push(`/clients/${customer.id}` as any)}
    >
      <View style={[rowStyles.avatar, hasReward && rowStyles.avatarGold]}>
        <Text style={rowStyles.initials}>{initials}</Text>
      </View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{customer.first_name} {customer.last_name}</Text>
        <View style={rowStyles.stamps}>
          {Array.from({ length: Math.min(stampGoal, 10) }).map((_, i) => (
            <View
              key={i}
              style={[rowStyles.stamp, i < customer.stamps && { backgroundColor: Colors.gold }]}
            />
          ))}
        </View>
      </View>
      <View style={rowStyles.right}>
        <Text style={rowStyles.points}>{customer.points} pts</Text>
        <Text style={rowStyles.visits}>{customer.total_visits} visites</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 100 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg, paddingTop: 60,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerEmoji: { fontSize: 36 },
  restaurantName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  headerDate: { fontSize: 13, color: Colors.textSecondary, textTransform: 'capitalize' },
  simBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,165,0,0.15)', borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,165,0,0.3)',
  },
  simBadgeText: { fontSize: 11, color: '#FFA500', fontWeight: '600' },
  statsScroll: { paddingLeft: Spacing.lg, marginBottom: Spacing.lg },
  chartCard: {
    marginHorizontal: Spacing.lg, backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.8 },
  section: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  seeAll: { fontSize: 13, color: Colors.gold },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', padding: Spacing.md },
  emptyCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  quickActions: { flexDirection: 'row', gap: Spacing.md, marginHorizontal: Spacing.lg, marginTop: Spacing.sm },
  actionButton: {
    flex: 1, backgroundColor: Colors.gold, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center', gap: Spacing.sm,
  },
  actionButtonSecondary: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: '#000' },
});

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginRight: Spacing.md, minWidth: 120,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  value: { fontSize: 28, fontWeight: '800', color: Colors.gold },
  label: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
});

const chartStyles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120 },
  barGroup: { flex: 1, alignItems: 'center', gap: 4 },
  barContainer: { height: 80, justifyContent: 'flex-end' },
  bar: { width: 24, borderRadius: 4, minHeight: 4 },
  label: { fontSize: 9, color: Colors.textSecondary, textAlign: 'center' },
  count: { fontSize: 11, color: Colors.gold, fontWeight: '600' },
});

const scannerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  reticle: { width: 250, height: 250, borderWidth: 3, borderColor: Colors.gold, borderRadius: 24 },
  hint: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', paddingHorizontal: 40 },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border,
  },
  avatarGold: { borderColor: Colors.gold },
  initials: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  stamps: { flexDirection: 'row', gap: 3 },
  stamp: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  right: { alignItems: 'flex-end' },
  points: { fontSize: 13, color: Colors.gold, fontWeight: '600' },
  visits: { fontSize: 11, color: Colors.textSecondary },
});
