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
import { Card, Avatar, Button, Badge, StampDots, Input, EmptyState } from '../../components/ui';
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
    error: loadError,
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

  // Attendre que le restaurant soit chargé : en accès direct par URL,
  // loadCustomer partait avant et échouait (restaurantId manquant)
  useEffect(() => {
    if (id && restaurant) {
      loadCustomer(id);
      loadHistory(id);
    }
    return () => clearSelected();
  }, [id, restaurant]);

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
    if (loadError) {
      return (
        <View style={styles.loadingContainer}>
          <EmptyState
            icon="alert-circle-outline"
            title="Client introuvable"
            subtitle="Ce client n'existe pas ou n'a pas pu être chargé."
          />
          <Button label="Retour" variant="secondary" onPress={() => router.back()} style={{ marginTop: Spacing.md, minWidth: 200 }} />
        </View>
      );
    }
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  const hasReward = customer.stamps >= stampGoal;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profil */}
      <View style={styles.profileHeader}>
        <Avatar name={`${customer.first_name} ${customer.last_name}`} size={84} highlight={hasReward} />
        {editing ? (
          <View style={styles.editNameRow}>
            <TextInput style={[styles.input, styles.nameInput]} value={firstName} onChangeText={setFirstName} placeholder="Prénom" placeholderTextColor={Colors.textMuted} />
            <TextInput style={[styles.input, styles.nameInput]} value={lastName} onChangeText={setLastName} placeholder="Nom" placeholderTextColor={Colors.textMuted} />
          </View>
        ) : (
          <Text style={styles.name}>{customer.first_name} {customer.last_name}</Text>
        )}
        <Text style={styles.joinDate}>
          Membre depuis {format(new Date(customer.created_at), 'MMMM yyyy', { locale: fr })}
        </Text>
        {hasReward && loyaltyType === 'stamps' && (
          <View style={{ marginTop: Spacing.sm }}>
            <Badge label="🎁 Récompense disponible" tone="success" />
          </View>
        )}
      </View>

      {/* Statistiques */}
      <View style={styles.statsRow}>
        <StatBox value={customer.total_visits} label="Visites" icon="footsteps-outline" />
        {loyaltyType === 'stamps' && <StatBox value={customer.stamps} label={`/${stampGoal} tampons`} icon="ribbon-outline" />}
        {loyaltyType === 'points' && <StatBox value={customer.points} label="Points" icon="star-outline" />}
        <StatBox value={customer.discount_pct} label="% réduction" icon="pricetag-outline" />
      </View>

      {/* Progression tampons */}
      {loyaltyType === 'stamps' && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Progression des tampons</Text>
          <StampDots count={customer.stamps} total={stampGoal} size={22} />
          {hasReward && (
            <View style={styles.rewardBanner}>
              <Ionicons name="gift" size={16} color={Colors.success} />
              <Text style={styles.rewardBannerText}>Récompense disponible !</Text>
            </View>
          )}
        </Card>
      )}

      {/* Solde points */}
      {loyaltyType === 'points' && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Solde de points</Text>
          <Text style={styles.pointsBalance}>{customer.points}</Text>
          <Text style={styles.pointsCaption}>
            points cumulés sur {customer.total_visits} visite{customer.total_visits !== 1 ? 's' : ''}
          </Text>
        </Card>
      )}

      {/* Contact */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Informations de contact</Text>
          <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)}>
            <Text style={styles.editBtn}>{editing ? (saving ? '...' : '✓ Sauvegarder') : 'Modifier'}</Text>
          </TouchableOpacity>
        </View>

        {editing ? (
          <View>
            <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Optionnel" />
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
            <InfoRow icon="notifications-outline" label="Consentement marketing" value={customer.marketing_consent ? 'Oui' : 'Non'} last />
          </View>
        )}
      </Card>

      {/* Historique */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Historique des activités</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>Aucune activité enregistrée</Text>
        ) : (
          history.slice(0, 20).map((item, i) => (
            <HistoryItem key={item.id} item={item} last={i === Math.min(history.length, 20) - 1} />
          ))
        )}
      </Card>

      {/* Actions */}
      <View style={styles.actionsSection}>
        {loyaltyType === 'stamps' && (
          <Button label="Ajouter un tampon" icon="ribbon" onPress={handleAddStamp} />
        )}
        {loyaltyType === 'points' && (
          <Button label="Ajouter des points" icon="star" onPress={() => setShowPointsModal(true)} />
        )}
        <Button label="Supprimer le client" icon="trash-outline" variant="danger" onPress={handleDelete} />
      </View>

      {/* Modale points */}
      <Modal visible={showPointsModal} transparent animationType="fade" onRequestClose={() => setShowPointsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Ajouter des points</Text>
            <TextInput
              style={styles.input}
              value={pointsToAdd}
              onChangeText={setPointsToAdd}
              keyboardType="number-pad"
              placeholder="Nombre de points"
              placeholderTextColor={Colors.textMuted}
            />
            <View style={styles.modalButtons}>
              <Button label="Annuler" variant="secondary" onPress={() => setShowPointsModal(false)} style={{ flex: 1 }} />
              <Button label="Ajouter" onPress={handleAddPoints} style={{ flex: 1 }} />
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
      <View style={statStyles.iconWrap}>
        <Ionicons name={icon} size={16} color={Colors.goldDark} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; last?: boolean }) {
  return (
    <View style={[infoStyles.row, last && { borderBottomWidth: 0 }]}>
      <View style={infoStyles.iconWrap}>
        <Ionicons name={icon} size={16} color={Colors.textSecondary} />
      </View>
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

function HistoryItem({ item, last }: { item: StampHistory; last?: boolean }) {
  const iconName: keyof typeof Ionicons.glyphMap = ACTION_ICONS[item.action] || 'pin-outline';
  return (
    <View style={[histStyles.item, last && { borderBottomWidth: 0 }]}>
      <View style={histStyles.iconWrap}>
        <Ionicons name={iconName} size={15} color={Colors.goldDark} />
      </View>
      <View style={histStyles.info}>
        <Text style={histStyles.action}>{ACTION_LABELS[item.action] || item.action}</Text>
        {item.note ? <Text style={histStyles.note}>{item.note}</Text> : null}
        <Text style={histStyles.date}>
          {format(new Date(item.created_at), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
        </Text>
      </View>
      {item.value > 0 && (
        <Text style={histStyles.value}>
          {item.action === 'points_added' ? `+${item.value} pts` : `+${item.value}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 100, maxWidth: 640, width: '100%', alignSelf: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  profileHeader: { alignItems: 'center', marginBottom: Spacing.lg },
  name: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: 2, letterSpacing: -0.3 },
  editNameRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, marginBottom: 4 },
  nameInput: { flex: 1, fontSize: 17, textAlign: 'center' },
  joinDate: { fontSize: 13, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  sectionCard: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  editBtn: { fontSize: 14, color: Colors.goldDark, fontWeight: '700' },
  rewardBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.successSoft, borderRadius: BorderRadius.md,
    padding: Spacing.sm, marginTop: Spacing.md,
  },
  rewardBannerText: { color: Colors.success, fontWeight: '700' },
  pointsBalance: { fontSize: 42, fontWeight: '800', color: Colors.goldDark, textAlign: 'center', marginVertical: Spacing.sm, letterSpacing: -1 },
  pointsCaption: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  input: {
    backgroundColor: Colors.inputBg, borderRadius: BorderRadius.md, padding: Spacing.md,
    color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  consentText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', padding: Spacing.md },
  actionsSection: { gap: Spacing.md },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', padding: Spacing.lg },
  modalSheet: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.xl,
    maxWidth: 440, width: '100%', alignSelf: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  modalButtons: { flexDirection: 'row', gap: Spacing.md },
});

const statStyles = StyleSheet.create({
  box: {
    flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.cardBorder,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: Colors.goldSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  value: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  label: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center', marginTop: 1 },
});

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 9, backgroundColor: Colors.inputBg,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1 },
  label: { fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 1 },
  value: { fontSize: 15, color: Colors.textPrimary },
});

const histStyles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  iconWrap: {
    width: 28, height: 28, borderRadius: 9, backgroundColor: Colors.goldSoft,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  info: { flex: 1 },
  action: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  note: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  date: { fontSize: 11, color: Colors.textMuted },
  value: { fontSize: 14, fontWeight: '800', color: Colors.goldDark, paddingTop: 4 },
});
