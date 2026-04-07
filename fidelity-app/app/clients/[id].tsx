import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, Switch,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCustomersStore } from '../../stores/customersStore';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { StampHistory } from '../../../shared/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ACTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  stamp_added: 'ribbon-outline',
  reward_claimed: 'gift-outline',
  points_added: 'star-outline',
};

const ACTION_LABELS: Record<string, string> = {
  stamp_added: 'Tampon ajouté',
  reward_claimed: 'Récompense obtenue',
  points_added: 'Points ajoutés',
};

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { restaurant } = useRestaurantStore();
  const {
    selectedCustomer: customer,
    customerHistory: history,
    loadCustomer,
    loadHistory,
    updateCustomer,
    deleteCustomer,
    addStamp,
    addPoints,
    clearSelected,
  } = useCustomersStore();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsToAdd, setPointsToAdd] = useState('100');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadCustomer(id);
      loadHistory(id);
    }
    return () => clearSelected();
  }, [id]);

  useEffect(() => {
    if (customer) {
      setFirstName(customer.first_name);
      setLastName(customer.last_name);
      setEmail(customer.email);
      setPhone(customer.phone || '');
      setMarketingConsent(Boolean(customer.marketing_consent));
    }
  }, [customer]);

  const stampGoal = restaurant?.stamp_goal || 10;
  const loyaltyType = restaurant?.loyalty_type || 'stamps';

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateCustomer(id!, { first_name: firstName, last_name: lastName, email, phone, marketing_consent: marketingConsent });
      setEditing(false);
      Alert.alert('Mis à jour', 'Informations mises à jour');
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStamp = async () => {
    try {
      const result = await addStamp(id!);
      if (result.reward_claimed) {
        Alert.alert('Récompense !', result.message);
      } else {
        Alert.alert('Tampon ajouté', result.message);
      }
      loadHistory(id!);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ajouter le tampon');
    }
  };

  const handleAddPoints = async () => {
    const pts = parseInt(pointsToAdd);
    if (isNaN(pts) || pts <= 0) { Alert.alert('Erreur', 'Entrez un nombre valide'); return; }
    try {
      await addPoints(id!, pts);
      setShowPointsModal(false);
      loadHistory(id!);
      Alert.alert('Points ajoutés', `${pts} points ajoutés`);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ajouter les points');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '⚠️ Supprimer le client',
      `Toutes les données de ${customer?.first_name} ${customer?.last_name} seront définitivement supprimées conformément au RGPD. Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomer(id!);
              router.back();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  if (!customer) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  const initials = `${customer.first_name?.[0] ?? ''}${customer.last_name?.[0] ?? ''}`.toUpperCase() || '?';
  const hasReward = customer.stamps >= stampGoal;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Avatar & Name */}
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, hasReward && styles.avatarGold]}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        {editing ? (
          <View style={styles.editNameRow}>
            <TextInput style={[styles.input, styles.nameInput]} value={firstName} onChangeText={setFirstName} placeholder="Prénom" placeholderTextColor={Colors.textSecondary} />
            <TextInput style={[styles.input, styles.nameInput]} value={lastName} onChangeText={setLastName} placeholder="Nom" placeholderTextColor={Colors.textSecondary} />
          </View>
        ) : (
          <Text style={styles.name}>{customer.first_name} {customer.last_name}</Text>
        )}
        <Text style={styles.joinDate}>
          Membre depuis {format(new Date(customer.created_at), "MMMM yyyy", { locale: fr })}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox value={customer.total_visits} label="Visites" icon="footsteps-outline" />
        {loyaltyType === 'stamps' && <StatBox value={customer.stamps} label={`/${stampGoal} tampons`} icon="ribbon-outline" />}
        {loyaltyType === 'points' && <StatBox value={customer.points} label="Points" icon="star-outline" />}
        <StatBox value={customer.discount_pct} label="% réduction" icon="pricetag-outline" />
      </View>

      {/* Stamp progress (mode tampons uniquement) */}
      {loyaltyType === 'stamps' && (
        <View style={styles.stampProgress}>
          <Text style={styles.sectionTitle}>Progression des tampons</Text>
          <View style={styles.stampDots}>
            {Array.from({ length: stampGoal }).map((_, i) => (
              <View key={i} style={[styles.stampDot, i < customer.stamps && styles.stampDotFilled]} />
            ))}
          </View>
          {hasReward && (
            <View style={styles.rewardBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <Ionicons name="gift-outline" size={16} color={Colors.success} />
                <Text style={styles.rewardBannerText}>Récompense disponible !</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Points summary (mode points uniquement) */}
      {loyaltyType === 'points' && (
        <View style={styles.stampProgress}>
          <Text style={styles.sectionTitle}>Solde de points</Text>
          <Text style={{ fontSize: 40, fontWeight: '800', color: Colors.gold, textAlign: 'center', marginVertical: Spacing.md }}>
            {customer.points}
          </Text>
          <Text style={{ fontSize: 13, color: Colors.textSecondary, textAlign: 'center' }}>points cumulés sur {customer.total_visits} visite{customer.total_visits !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {/* Contact info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Informations de contact</Text>
          <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)}>
            <Text style={styles.editBtn}>{editing ? (saving ? '...' : '✓ Sauvegarder') : '✎ Modifier'}</Text>
          </TouchableOpacity>
        </View>

        {editing ? (
          <View>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={Colors.textSecondary} />
            <Text style={styles.fieldLabel}>Téléphone</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Optionnel" placeholderTextColor={Colors.textSecondary} />
            <View style={styles.consentRow}>
              <Switch value={marketingConsent} onValueChange={setMarketingConsent} trackColor={{ true: Colors.gold }} />
              <Text style={styles.consentText}>Consentement notifications marketing</Text>
            </View>
          </View>
        ) : (
          <View>
            <InfoRow icon="mail-outline" label="Email" value={customer.email} />
            <InfoRow icon="phone-portrait-outline" label="Téléphone" value={customer.phone || 'Non renseigné'} />
            <InfoRow icon="shield-checkmark-outline" label="Consentement RGPD" value={customer.gdpr_consent ? 'Oui' : 'Non'} />
            <InfoRow icon="notifications-outline" label="Consentement marketing" value={customer.marketing_consent ? 'Oui' : 'Non'} />
          </View>
        )}
      </View>

      {/* History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historique des activités</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>Aucune activité enregistrée</Text>
        ) : (
          history.slice(0, 20).map((item) => (
            <HistoryItem key={item.id} item={item} />
          ))
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        {loyaltyType === 'stamps' && (
          <TouchableOpacity style={styles.primaryAction} onPress={handleAddStamp}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="ribbon" size={18} color="#000" />
              <Text style={styles.primaryActionText}>Ajouter un tampon</Text>
            </View>
          </TouchableOpacity>
        )}
        {loyaltyType === 'points' && (
          <TouchableOpacity style={styles.primaryAction} onPress={() => setShowPointsModal(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="star" size={18} color="#000" />
              <Text style={styles.primaryActionText}>Ajouter des points</Text>
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.dangerAction} onPress={handleDelete}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
            <Text style={styles.dangerActionText}>Supprimer le client</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Points modal */}
      <Modal visible={showPointsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Ajouter des points</Text>
            <TextInput
              style={styles.input}
              value={pointsToAdd}
              onChangeText={setPointsToAdd}
              keyboardType="number-pad"
              placeholder="Nombre de points"
              placeholderTextColor={Colors.textSecondary}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPointsModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAddPoints}>
                <Text style={styles.confirmBtnText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatBox({ value, label, icon }: { value: number; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={statStyles.box}>
      <Ionicons name={icon} size={20} color={Colors.gold} style={{ marginBottom: 4 }} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Ionicons name={icon} size={20} color={Colors.textSecondary} style={{ width: 28, textAlign: 'center' }} />
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

function HistoryItem({ item }: { item: StampHistory }) {
  const iconName: keyof typeof Ionicons.glyphMap = ACTION_ICONS[item.action] || 'pin-outline';
  return (
    <View style={histStyles.item}>
      <Ionicons name={iconName} size={20} color={Colors.textSecondary} style={{ width: 28, textAlign: 'center', paddingTop: 2 }} />
      <View style={histStyles.info}>
        <Text style={histStyles.action}>{ACTION_LABELS[item.action] || item.action}</Text>
        {item.note && <Text style={histStyles.note}>{item.note}</Text>}
        <Text style={histStyles.date}>
          {format(new Date(item.created_at), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
        </Text>
      </View>
      {item.value > 0 && (
        <Text style={[histStyles.value, item.action === 'points_added' && { color: Colors.gold }]}>
          {item.action === 'points_added' ? `+${item.value} pts` : `+${item.value}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  profileHeader: { alignItems: 'center', marginBottom: Spacing.xl },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.border, marginBottom: Spacing.md },
  avatarGold: { borderColor: Colors.gold },
  initials: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
  name: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  editNameRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: 4 },
  nameInput: { flex: 1, fontSize: 18, textAlign: 'center' },
  joinDate: { fontSize: 13, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  stampProgress: { backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  editBtn: { fontSize: 14, color: Colors.gold, fontWeight: '600' },
  stampDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  stampDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.background, borderWidth: 2, borderColor: Colors.border },
  stampDotFilled: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  rewardBanner: { backgroundColor: 'rgba(76,175,80,0.15)', borderRadius: BorderRadius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)' },
  rewardBannerText: { color: Colors.success, fontWeight: '600', textAlign: 'center' },
  section: { backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.sm, padding: Spacing.md, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  fieldLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  consentText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', padding: Spacing.md },
  actionsSection: { gap: Spacing.md },
  primaryAction: { backgroundColor: Colors.gold, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  primaryActionText: { color: '#000', fontWeight: '700', fontSize: 16 },
  secondaryAction: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  secondaryActionText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 16 },
  dangerAction: { borderWidth: 1, borderColor: Colors.error, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  dangerActionText: { color: Colors.error, fontWeight: '600', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', padding: Spacing.lg },
  modalSheet: { backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.lg },
  modalButtons: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, backgroundColor: Colors.gold, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  confirmBtnText: { color: '#000', fontWeight: '700' },
});

const statStyles = StyleSheet.create({
  box: { flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  value: { fontSize: 20, fontWeight: '800', color: Colors.gold },
  label: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },
});

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  content: { flex: 1 },
  label: { fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  value: { fontSize: 15, color: Colors.textPrimary },
});

const histStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  info: { flex: 1 },
  action: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  note: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  date: { fontSize: 11, color: Colors.textMuted },
  value: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, paddingTop: 2 },
});
