import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { useCustomersStore } from '../../stores/customersStore';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { Customer } from '../../../shared/types';

type FilterType = 'all' | 'active' | 'reward';

export default function ClientsScreen() {
  const { restaurant } = useRestaurantStore();
  const { customers, loadCustomers, addStamp, createCustomer, isLoading } = useCustomersStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [stampConfirm, setStampConfirm] = useState<Customer | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const stampGoal = restaurant?.stamp_goal || 10;

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const filterParam = filter === 'all' ? undefined : filter === 'active' ? 'active' : 'reward';
    await loadCustomers(restaurant.id, { search: search || undefined, filter: filterParam });
  }, [restaurant, search, filter]);

  useEffect(() => {
    const timer = setTimeout(loadData, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleAddStamp = async (customer: Customer) => {
    try {
      const result = await addStamp(customer.id);
      if (result.reward_claimed) {
        Alert.alert('🎉 Récompense !', result.message);
      } else {
        Alert.alert('✅ Tampon ajouté', result.message);
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible d\'ajouter le tampon');
    }
    setStampConfirm(null);
  };

  const filteredCustomers = customers;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <Text style={styles.count}>{customers.length} client{customers.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher par nom ou email..."
          placeholderTextColor={Colors.textSecondary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        {(['all', 'active', 'reward'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f === 'all' ? 'Tous' : f === 'active' ? 'Actifs' : 'Récompense disponible'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {isLoading && customers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : customers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyTitle}>Aucun client</Text>
          <Text style={styles.emptySubtitle}>Ajoutez votre premier client en appuyant sur +</Text>
        </View>
      ) : (
        <FlashList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          estimatedItemSize={100}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <CustomerCard
              customer={item}
              stampGoal={stampGoal}
              onStamp={() => setStampConfirm(item)}
              onView={() => { setSelectedCustomer(item); setShowPreviewModal(true); }}
              onDetail={() => router.push(`/clients/${item.id}` as any)}
            />
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add customer modal */}
      <AddCustomerModal
        visible={showAddModal}
        restaurantId={restaurant?.id || ''}
        onClose={() => setShowAddModal(false)}
        onCreated={() => { setShowAddModal(false); loadData(); }}
      />

      {/* Card preview modal */}
      {selectedCustomer && (
        <CardPreviewModal
          visible={showPreviewModal}
          customer={selectedCustomer}
          restaurant={restaurant}
          onClose={() => { setShowPreviewModal(false); setSelectedCustomer(null); }}
        />
      )}

      {/* Stamp confirmation */}
      {stampConfirm && (
        <Modal transparent animationType="fade">
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmSheet}>
              <Text style={styles.confirmTitle}>Ajouter un tampon</Text>
              <Text style={styles.confirmText}>
                Ajouter un tampon pour {stampConfirm.first_name} {stampConfirm.last_name} ?
              </Text>
              <Text style={styles.confirmStamps}>
                {stampConfirm.stamps}/{stampGoal} tampons → {stampConfirm.stamps + 1}/{stampGoal}
              </Text>
              {stampConfirm.stamps + 1 >= stampGoal && (
                <View style={styles.rewardAlert}>
                  <Text style={styles.rewardAlertText}>🎉 Cette visite déclenchera une récompense !</Text>
                </View>
              )}
              <View style={styles.confirmButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setStampConfirm(null)}>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={() => handleAddStamp(stampConfirm)}>
                  <Text style={styles.confirmButtonText}>Confirmer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function CustomerCard({
  customer, stampGoal, onStamp, onView, onDetail,
}: {
  customer: Customer;
  stampGoal: number;
  onStamp: () => void;
  onView: () => void;
  onDetail: () => void;
}) {
  const initials = `${customer.first_name?.[0] ?? ''}${customer.last_name?.[0] ?? ''}`.toUpperCase() || '?';
  const hasReward = customer.stamps >= stampGoal;
  const displayStamps = Math.min(stampGoal, 10);

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onDetail}>
      <View style={cardStyles.top}>
        <View style={[cardStyles.avatar, hasReward && cardStyles.avatarGold]}>
          <Text style={cardStyles.initials}>{initials}</Text>
          {hasReward && <View style={cardStyles.rewardDot} />}
        </View>
        <View style={cardStyles.info}>
          <Text style={cardStyles.name}>{customer.first_name} {customer.last_name}</Text>
          <Text style={cardStyles.email}>{customer.email}</Text>
        </View>
        <View style={cardStyles.badges}>
          <Text style={cardStyles.points}>{customer.points} pts</Text>
          {customer.discount_pct > 0 && (
            <View style={cardStyles.discountBadge}>
              <Text style={cardStyles.discountText}>-{customer.discount_pct}%</Text>
            </View>
          )}
        </View>
      </View>

      <View style={cardStyles.stampsRow}>
        <View style={cardStyles.stampDots}>
          {Array.from({ length: displayStamps }).map((_, i) => (
            <View
              key={i}
              style={[cardStyles.stampDot, i < customer.stamps && cardStyles.stampDotFilled]}
            />
          ))}
        </View>
        <Text style={cardStyles.stampsCount}>{customer.stamps}/{stampGoal}</Text>
      </View>

      <View style={cardStyles.actions}>
        <TouchableOpacity style={cardStyles.actionBtn} onPress={onStamp}>
          <Text style={cardStyles.actionBtnText}>+ Tampon</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.actionBtnOutline]} onPress={onView}>
          <Text style={cardStyles.actionBtnOutlineText}>👁 Carte</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.actionBtnOutline]} onPress={onDetail}>
          <Text style={cardStyles.actionBtnOutlineText}>⋯ Plus</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function AddCustomerModal({
  visible, restaurantId, onClose, onCreated,
}: {
  visible: boolean;
  restaurantId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { createCustomer } = useCustomersStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setFirstName(''); setLastName(''); setEmail(''); setPhone('');
    setGdprConsent(false); setMarketingConsent(false);
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert('Erreur', 'Prénom, nom et email sont requis');
      return;
    }
    if (!gdprConsent) {
      Alert.alert('Erreur', 'Le consentement RGPD est obligatoire');
      return;
    }

    try {
      setSubmitting(true);
      await createCustomer({
        restaurant_id: restaurantId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        gdpr_consent: gdprConsent,
        marketing_consent: marketingConsent,
      });
      reset();
      onCreated();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de créer le client');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>Nouveau client</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={modalStyles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.label}>Prénom *</Text>
                  <TextInput style={modalStyles.input} value={firstName} onChangeText={setFirstName} placeholder="Marie" placeholderTextColor={Colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.label}>Nom *</Text>
                  <TextInput style={modalStyles.input} value={lastName} onChangeText={setLastName} placeholder="Dupont" placeholderTextColor={Colors.textSecondary} />
                </View>
              </View>

              <Text style={modalStyles.label}>Email *</Text>
              <TextInput
                style={modalStyles.input} value={email} onChangeText={setEmail}
                placeholder="marie@email.com" placeholderTextColor={Colors.textSecondary}
                keyboardType="email-address" autoCapitalize="none"
              />

              <Text style={modalStyles.label}>Téléphone (optionnel)</Text>
              <TextInput
                style={modalStyles.input} value={phone} onChangeText={setPhone}
                placeholder="+33 6 12 34 56 78" placeholderTextColor={Colors.textSecondary}
                keyboardType="phone-pad"
              />

              <View style={modalStyles.consentRow}>
                <Switch value={gdprConsent} onValueChange={setGdprConsent} trackColor={{ true: Colors.gold }} />
                <Text style={modalStyles.consentText}>
                  J'accepte que mes données soient utilisées pour la carte de fidélité *
                </Text>
              </View>

              <View style={modalStyles.consentRow}>
                <Switch value={marketingConsent} onValueChange={setMarketingConsent} trackColor={{ true: Colors.gold }} />
                <Text style={modalStyles.consentText}>
                  J'accepte de recevoir des notifications promotionnelles
                </Text>
              </View>

              <View style={modalStyles.buttons}>
                <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => { reset(); onClose(); }}>
                  <Text style={modalStyles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.submitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? <ActivityIndicator color="#000" /> : <Text style={modalStyles.submitBtnText}>Créer le client</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CardPreviewModal({ visible, customer, restaurant, onClose }: any) {
  const stampGoal = restaurant?.stamp_goal || 10;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={previewStyles.overlay}>
        <View style={previewStyles.container}>
          <TouchableOpacity style={previewStyles.closeBtn} onPress={onClose}>
            <Text style={previewStyles.closeBtnText}>✕ Fermer</Text>
          </TouchableOpacity>

          {/* Wallet card simulation */}
          <View style={[previewStyles.card, { backgroundColor: restaurant?.color_primary || Colors.gold }]}>
            <View style={previewStyles.cardHeader}>
              <Text style={previewStyles.cardEmoji}>{restaurant?.logo_emoji || '🍽️'}</Text>
              <View>
                <Text style={previewStyles.cardRestaurantName}>{restaurant?.name}</Text>
                <View style={previewStyles.simBadge}>
                  <Text style={previewStyles.simBadgeText}>MODE SIMULATION</Text>
                </View>
              </View>
            </View>

            <View style={previewStyles.stampsSection}>
              <Text style={previewStyles.stampsLabel}>Tampons</Text>
              <View style={previewStyles.stampDots}>
                {Array.from({ length: stampGoal }).map((_, i) => (
                  <View
                    key={i}
                    style={[previewStyles.stampDot, i < customer.stamps && previewStyles.stampDotFilled]}
                  />
                ))}
              </View>
              <Text style={previewStyles.stampsCount}>{customer.stamps}/{stampGoal}</Text>
            </View>

            <View style={previewStyles.statsRow}>
              <View style={previewStyles.stat}>
                <Text style={previewStyles.statValue}>{customer.points}</Text>
                <Text style={previewStyles.statLabel}>Points</Text>
              </View>
              <View style={previewStyles.stat}>
                <Text style={previewStyles.statValue}>{customer.discount_pct}%</Text>
                <Text style={previewStyles.statLabel}>Réduction</Text>
              </View>
            </View>

            <View style={previewStyles.cardFooter}>
              <View>
                <Text style={previewStyles.memberName}>{customer.first_name} {customer.last_name}</Text>
                <Text style={previewStyles.memberId}>ID: {customer.id.substring(0, 8).toUpperCase()}</Text>
              </View>
              <Text style={previewStyles.nfc}>⊕</Text>
            </View>

            {/* Fake QR */}
            <View style={previewStyles.qrContainer}>
              <View style={previewStyles.fakeQr}>
                <Text style={previewStyles.fakeQrText}>QR</Text>
              </View>
            </View>
          </View>

          <Text style={previewStyles.disclaimer}>
            🔶 Cette carte est en MODE SIMULATION. Sans certificat Apple Developer, elle ne peut pas être installée dans l'Apple Wallet.
          </Text>

          <TouchableOpacity style={previewStyles.shareBtn}>
            <Text style={previewStyles.shareBtnText}>Partager le QR d'inscription</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={previewStyles.downloadBtn}
            onPress={() => Alert.alert(
              'MODE SIMULATION',
              'Cette carte ne peut pas être installée sans certificat Apple Developer. En mode production, elle s\'ajouterait automatiquement au Wallet.',
              [{ text: 'OK' }]
            )}
          >
            <Text style={previewStyles.downloadBtnText}>Télécharger la carte (.pkpass)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  count: { fontSize: 14, color: Colors.textSecondary },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.sm },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 15, paddingVertical: 12 },
  clearSearch: { fontSize: 16, color: Colors.textSecondary, padding: 4 },
  filtersScroll: { paddingLeft: Spacing.lg, marginBottom: Spacing.md, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
    backgroundColor: Colors.card, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  filterChipText: { fontSize: 13, color: Colors.textSecondary },
  filterChipTextActive: { color: '#000', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 90, right: Spacing.lg,
    width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center', shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  fabText: { fontSize: 32, color: '#000', lineHeight: 36 },
  confirmOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  confirmSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  confirmText: { fontSize: 15, color: Colors.textSecondary, marginBottom: Spacing.md },
  confirmStamps: { fontSize: 18, color: Colors.gold, fontWeight: '700', marginBottom: Spacing.md },
  rewardAlert: { backgroundColor: 'rgba(76,175,80,0.15)', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)' },
  rewardAlertText: { color: Colors.success, fontWeight: '600' },
  confirmButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  cancelButton: { flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  cancelButtonText: { color: Colors.textSecondary, fontWeight: '600' },
  confirmButton: { flex: 1, backgroundColor: Colors.gold, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  confirmButtonText: { color: '#000', fontWeight: '700' },
});

const cardStyles = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border, position: 'relative' },
  avatarGold: { borderColor: Colors.gold },
  initials: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  rewardDot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.gold },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  email: { fontSize: 12, color: Colors.textSecondary },
  badges: { alignItems: 'flex-end', gap: 4 },
  points: { fontSize: 14, color: Colors.gold, fontWeight: '700' },
  discountBadge: { backgroundColor: 'rgba(201,168,76,0.15)', borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  discountText: { fontSize: 11, color: Colors.gold, fontWeight: '600' },
  stampsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  stampDots: { flexDirection: 'row', gap: 4, flex: 1, flexWrap: 'wrap' },
  stampDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  stampDotFilled: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  stampsCount: { fontSize: 12, color: Colors.textSecondary, marginLeft: Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { flex: 1, backgroundColor: Colors.gold, borderRadius: BorderRadius.sm, padding: Spacing.sm, alignItems: 'center' },
  actionBtnText: { fontSize: 12, color: '#000', fontWeight: '700' },
  actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border },
  actionBtnOutlineText: { fontSize: 12, color: Colors.textSecondary },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, maxHeight: '90%' },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.lg },
  row: { flexDirection: 'row', gap: Spacing.md },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.sm, padding: Spacing.md, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  consentText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  buttons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg, paddingBottom: 40 },
  cancelBtn: { flex: 1, padding: Spacing.md, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.background },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  submitBtn: { flex: 2, padding: Spacing.md, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.gold },
  submitBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
});

const previewStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay },
  container: { flex: 1, padding: Spacing.lg, paddingTop: 60 },
  closeBtn: { alignSelf: 'flex-end', marginBottom: Spacing.lg },
  closeBtnText: { color: Colors.textPrimary, fontSize: 16 },
  card: {
    borderRadius: 20, padding: Spacing.lg, marginBottom: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  cardEmoji: { fontSize: 36 },
  cardRestaurantName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  simBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 2 },
  simBadgeText: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 0.5 },
  stampsSection: { marginBottom: Spacing.lg },
  stampsLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  stampDots: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  stampDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  stampDotFilled: { backgroundColor: '#fff' },
  stampsCount: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  statsRow: { flexDirection: 'row', gap: Spacing.xl, marginBottom: Spacing.lg },
  stat: {},
  statValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  memberName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  memberId: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  nfc: { fontSize: 24, color: 'rgba(255,255,255,0.6)' },
  qrContainer: { alignItems: 'flex-end', marginTop: Spacing.md },
  fakeQr: { width: 60, height: 60, backgroundColor: '#fff', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  fakeQrText: { fontSize: 12, color: '#000', fontWeight: '700' },
  disclaimer: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 18 },
  shareBtn: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  shareBtnText: { color: Colors.textPrimary, fontWeight: '600' },
  downloadBtn: { backgroundColor: Colors.gold, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  downloadBtnText: { color: '#000', fontWeight: '700' },
});
