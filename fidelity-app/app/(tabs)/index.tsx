import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { useCustomersStore } from '../../stores/customersStore';
import { statsApi } from '../../lib/api';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Stats, Customer } from '../../../shared/types';
import { Card, StatCard, EmptyState, Avatar, StampDots, Button } from '../../components/ui';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.emojiTile}>
          <Text style={styles.headerEmoji}>{restaurant?.logo_emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.restaurantName}>{restaurant?.name}</Text>
          <Text style={styles.headerDate}>{format(new Date(), "EEEE d MMMM", { locale: fr })}</Text>
        </View>
        <TouchableOpacity style={styles.scanShortcut} onPress={handleOpenScanner} activeOpacity={0.8}>
          <Ionicons name="scan" size={20} color={Colors.onGold} />
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      <View style={styles.statsGrid}>
        <StatCard icon="people" value={stats?.total_customers || 0} label="Clients au total" style={styles.statItem} />
        <StatCard icon="ribbon" value={stats?.stamps_given_today || 0} label="Tampons aujourd'hui" style={styles.statItem} />
        <StatCard icon="star" value={stats?.stamps_given_week || 0} label="Tampons cette semaine" style={styles.statItem} />
        <StatCard icon="notifications" value={stats?.notifications_sent_total || 0} label="Notifications envoyées" style={styles.statItem} />
      </View>

      {/* Graphique */}
      <Card style={styles.chartCard}>
        <Text style={styles.cardTitle}>Nouveaux clients · 7 jours</Text>
        {stats?.new_customers_per_day && stats.new_customers_per_day.length > 0 ? (
          <MiniBarChart data={stats.new_customers_per_day} />
        ) : (
          <Text style={styles.emptyText}>Aucune donnée disponible</Text>
        )}
      </Card>

      {/* Clients récents */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Clients récents</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/clients')}>
            <Text style={styles.seeAll}>Voir tous</Text>
          </TouchableOpacity>
        </View>
        {recentCustomers.length === 0 ? (
          <EmptyState
            inCard
            icon="people-outline"
            title="Aucun client"
            subtitle="Commencez par ajouter vos premiers clients"
          />
        ) : (
          <Card style={{ padding: Spacing.sm }}>
            {recentCustomers.map((customer, i) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                stampGoal={stampGoal}
                last={i === recentCustomers.length - 1}
              />
            ))}
          </Card>
        )}
      </View>

      {/* Actions rapides */}
      <View style={styles.quickActions}>
        <Button label="Scanner un client" icon="camera" onPress={handleOpenScanner} style={{ flex: 1 }} />
        <Button label="Ajouter un client" icon="person-add" variant="secondary" onPress={() => router.push('/(tabs)/clients')} style={{ flex: 1 }} />
      </View>

      {/* Scanner */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={scannerStyles.container}>
          <CameraView
            style={scannerStyles.camera}
            facing="back"
            {...({ type: 'back' } as any)}
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

function MiniBarChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <View style={chartStyles.container}>
      {data.map((d, i) => (
        <View key={i} style={chartStyles.barGroup}>
          <Text style={chartStyles.count}>{d.count}</Text>
          <View style={chartStyles.barContainer}>
            <View
              style={[
                chartStyles.bar,
                {
                  height: Math.max(6, (d.count / max) * 80),
                  backgroundColor: d.count > 0 ? Colors.gold : Colors.inputBg,
                },
              ]}
            />
          </View>
          <Text style={chartStyles.label}>{format(new Date(d.date), 'dd/MM')}</Text>
        </View>
      ))}
    </View>
  );
}

function CustomerRow({ customer, stampGoal, last }: { customer: Customer; stampGoal: number; last?: boolean }) {
  const hasReward = customer.stamps >= stampGoal;

  return (
    <TouchableOpacity
      style={[rowStyles.row, last && { borderBottomWidth: 0 }]}
      onPress={() => router.push(`/clients/${customer.id}` as any)}
      activeOpacity={0.7}
    >
      <Avatar name={`${customer.first_name} ${customer.last_name}`} size={42} highlight={hasReward} />
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{customer.first_name} {customer.last_name}</Text>
        <StampDots count={customer.stamps} total={Math.min(stampGoal, 10)} size={8} />
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
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, paddingTop: 56,
  },
  emojiTile: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.goldSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  headerEmoji: { fontSize: 28 },
  restaurantName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.3 },
  headerDate: { fontSize: 13, color: Colors.textSecondary, textTransform: 'capitalize', marginTop: 1 },
  scanShortcut: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center', ...Shadows.fab,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg,
  },
  statItem: { flexBasis: '47%', flexGrow: 1 },
  chartCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  cardTitle: {
    fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
    marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  section: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  seeAll: { fontSize: 13, color: Colors.goldDark, fontWeight: '600' },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', padding: Spacing.md },
  quickActions: { flexDirection: 'row', gap: Spacing.md, marginHorizontal: Spacing.lg, marginTop: Spacing.sm },
});

const chartStyles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 124 },
  barGroup: { flex: 1, alignItems: 'center', gap: 4 },
  count: { fontSize: 11, color: Colors.goldDark, fontWeight: '700' },
  barContainer: { height: 80, justifyContent: 'flex-end' },
  bar: { width: 22, borderRadius: 7, minHeight: 6 },
  label: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
});

const scannerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  reticle: { width: 250, height: 250, borderWidth: 3, borderColor: '#FBBF24', borderRadius: 24 },
  hint: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', paddingHorizontal: 40 },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: 10, paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  info: { flex: 1, gap: 5 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  right: { alignItems: 'flex-end' },
  points: { fontSize: 13, color: Colors.goldDark, fontWeight: '700' },
  visits: { fontSize: 11, color: Colors.textSecondary },
});
