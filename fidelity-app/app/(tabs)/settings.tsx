import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Modal, Switch, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { useCustomersStore } from '../../stores/customersStore';
import { Colors, Spacing, BorderRadius, getThemeMode, setThemeMode, ThemeMode } from '../../constants/theme';
import { LoyaltyType } from '../../../shared/types';

export default function SettingsScreen() {
  const { restaurant, updateRestaurant, reset } = useRestaurantStore();
  const { customers } = useCustomersStore();
  const [showGdprModal, setShowGdprModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const [name, setName] = useState(restaurant?.name || '');
  const [description, setDescription] = useState(restaurant?.description || '');
  const [loyaltyType, setLoyaltyType] = useState<LoyaltyType>(restaurant?.loyalty_type || 'stamps');
  const [stampGoal, setStampGoal] = useState(restaurant?.stamp_goal || 10);
  const [pointsPerVisit, setPointsPerVisit] = useState(restaurant?.points_per_visit || 100);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getThemeMode());
  const [saving, setSaving] = useState(false);

  // SQLite stores booleans as 0/1 integers — use Boolean() to normalise
  const marketingCount = customers.filter((c) => Boolean(c.marketing_consent)).length;

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Erreur', 'Le nom est requis'); return; }
    try {
      setSaving(true);
      await updateRestaurant({ name, description, loyalty_type: loyaltyType, stamp_goal: stampGoal, points_per_visit: pointsPerVisit });
      Alert.alert('Sauvegardé', 'Vos paramètres ont été mis à jour');
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = () => {
    const data = { restaurant, customers: customers.map((c) => ({ ...c, push_subscription: undefined })), exported_at: new Date().toISOString() };
    Alert.alert('Export RGPD', `Les données de ${customers.length} client(s) seraient exportées en JSON.\n\n(Intégrez expo-sharing pour le partage réel)`);
  };

  const handleReset = () => {
    Alert.alert(
      '⚠️ Réinitialisation',
      'Toutes les données seront supprimées. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            await reset();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const handleThemeChange = (isDarkEnabled: boolean) => {
    const nextMode: ThemeMode = isDarkEnabled ? 'dark' : 'light';
    setThemeModeState(nextMode);
    setThemeMode(nextMode);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }

    Alert.alert('Apparence', 'Le thème a été enregistré. Rechargez la page pour l\'appliquer partout.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Réglages</Text>

      {/* Restaurant section */}
      <SectionTitle title="Apparence" />
      <View style={styles.card}>
        <View style={[styles.menuItem, { borderBottomWidth: 0, paddingVertical: 0 }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name={themeMode === 'dark' ? 'moon-outline' : 'sunny-outline'} size={18} color={Colors.textPrimary} />
            <Text style={styles.menuItemText}>Mode sombre</Text>
          </View>
          <Switch
            value={themeMode === 'dark'}
            onValueChange={handleThemeChange}
            thumbColor={themeMode === 'dark' ? Colors.gold : '#f4f3f4'}
            trackColor={{ false: '#d7d2c7', true: 'rgba(201,168,76,0.4)' }}
          />
        </View>
      </View>

      {/* Restaurant section */}
      <SectionTitle title="Mon Commerce" />
      <View style={styles.card}>
        <Field label="Système de fidélité">
          <View style={styles.loyaltyRow}>
            <TouchableOpacity
              style={[styles.loyaltyBtn, loyaltyType === 'stamps' && styles.loyaltyBtnActive]}
              onPress={() => setLoyaltyType('stamps')}
            >
              <Ionicons name="ribbon" size={18} color={loyaltyType === 'stamps' ? '#000' : Colors.textSecondary} />
              <Text style={[styles.loyaltyBtnText, loyaltyType === 'stamps' && styles.loyaltyBtnTextActive]}>Tampons</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.loyaltyBtn, loyaltyType === 'points' && styles.loyaltyBtnActive]}
              onPress={() => setLoyaltyType('points')}
            >
              <Ionicons name="star" size={18} color={loyaltyType === 'points' ? '#000' : Colors.textSecondary} />
              <Text style={[styles.loyaltyBtnText, loyaltyType === 'points' && styles.loyaltyBtnTextActive]}>Points</Text>
            </TouchableOpacity>
          </View>
        </Field>
        <Field label="Nom du commerce">
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nom..." placeholderTextColor={Colors.textSecondary} />
        </Field>
        <Field label="Description">
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Description..." placeholderTextColor={Colors.textSecondary} multiline />
        </Field>
        {loyaltyType === 'stamps' && (
          <Field label={`Objectif tampons: ${stampGoal}`}>
            <View style={styles.counterRow}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setStampGoal(Math.max(5, stampGoal - 1))}><Text style={styles.counterBtnText}>−</Text></TouchableOpacity>
              <Text style={styles.counterValue}>{stampGoal}</Text>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setStampGoal(Math.min(20, stampGoal + 1))}><Text style={styles.counterBtnText}>+</Text></TouchableOpacity>
            </View>
          </Field>
        )}
        {loyaltyType === 'points' && (
          <Field label={`Points par visite: ${pointsPerVisit}`}>
            <View style={styles.counterRow}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setPointsPerVisit(Math.max(50, pointsPerVisit - 50))}><Text style={styles.counterBtnText}>−</Text></TouchableOpacity>
              <Text style={styles.counterValue}>{pointsPerVisit}</Text>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setPointsPerVisit(Math.min(500, pointsPerVisit + 50))}><Text style={styles.counterBtnText}>+</Text></TouchableOpacity>
            </View>
          </Field>
        )}
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</Text>
        </TouchableOpacity>
      </View>

      {/* Push Notifications */}
      <SectionTitle title="Notifications Push" />
      <View style={styles.card}>
        <View style={styles.vapidRow}>
          <Text style={styles.vapidLabel}>Clé publique VAPID</Text>
          <Text style={styles.vapidValue} numberOfLines={2}>{restaurant?.vapid_public_key || 'Non configurée'}</Text>
        </View>
      </View>

      {/* GDPR */}
      <SectionTitle title="Conformité RGPD" />
      <View style={styles.card}>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowGdprModal(true)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="document-text-outline" size={18} color={Colors.textPrimary} />
            <Text style={styles.menuItemText}>Politique de confidentialité</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleExportData}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="download-outline" size={18} color={Colors.textPrimary} />
            <Text style={styles.menuItemText}>Exporter toutes les données</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.gdprStat}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.gdprStatText}>
              <Text style={styles.gdprStatCount}>{marketingCount}</Text> client{marketingCount !== 1 ? 's' : ''} avec consentement marketing
            </Text>
          </View>
        </View>
      </View>

      {/* Apple Wallet */}
      <SectionTitle title="Apple Wallet" />
      <View style={styles.card}>
        <View style={styles.checklist}>
          {[
            { done: false, text: 'Apple Developer Account (99$/an)' },
            { done: false, text: 'Pass Type ID certificate' },
            { done: false, text: 'APNs certificate' },
          ].map((item, i) => (
            <View key={i} style={styles.checklistItem}>
              <Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={item.done ? Colors.success : Colors.textSecondary} />
              <Text style={styles.checklistText}>{item.text}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.learnMoreBtn} onPress={() => setShowWalletModal(true)}>
          <Text style={styles.learnMoreBtnText}>En savoir plus sur la mise en production</Text>
        </TouchableOpacity>
      </View>

      {/* Danger zone */}
      <SectionTitle title="Zone de danger" />
      <View style={styles.card}>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleReset}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="warning-outline" size={18} color={Colors.error} />
            <Text style={styles.dangerBtnText}>Réinitialiser toutes les données</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* GDPR Modal */}
      <Modal visible={showGdprModal} animationType="slide">
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Politique de confidentialité</Text>
            <TouchableOpacity onPress={() => setShowGdprModal(false)}>
              <Text style={modalStyles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.content}>
            <Text style={modalStyles.text}>{generateGdprText(restaurant?.name || 'Notre commerce')}</Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Wallet Modal */}
      <Modal visible={showWalletModal} animationType="slide">
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Mise en production Wallet</Text>
            <TouchableOpacity onPress={() => setShowWalletModal(false)}>
              <Text style={modalStyles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.content}>
            <Text style={modalStyles.text}>{walletInstructions}</Text>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const generateGdprText = (restaurantName: string) => `POLITIQUE DE CONFIDENTIALITÉ — ${restaurantName.toUpperCase()}

Dernière mise à jour: ${new Date().toLocaleDateString('fr-FR')}

1. DONNÉES COLLECTÉES
Nous collectons: prénom, nom, adresse email, numéro de téléphone (optionnel), historique des visites et tampons.

2. FINALITÉ DU TRAITEMENT
Ces données sont utilisées exclusivement pour la gestion de votre carte de fidélité et, avec votre consentement, pour vous envoyer des notifications promotionnelles.

3. BASE LÉGALE
Le traitement est basé sur votre consentement explicite donné lors de votre inscription (Art. 6 RGPD).

4. CONSERVATION DES DONNÉES
Vos données sont conservées pendant la durée de votre relation avec ${restaurantName}, plus 3 ans après la dernière visite.

5. VOS DROITS
Conformément au RGPD, vous disposez des droits suivants:
• Droit d'accès à vos données
• Droit de rectification
• Droit à l'effacement ("droit à l'oubli")
• Droit à la portabilité
• Droit de retrait du consentement

Pour exercer vos droits, contactez directement ${restaurantName}.

6. SÉCURITÉ
Vos données sont stockées de manière sécurisée et ne sont jamais vendues à des tiers.`;

const walletInstructions = `MISE EN PRODUCTION APPLE WALLET

Étape 1: Apple Developer Account
• Inscrivez-vous sur developer.apple.com
• Souscrivez au programme Developer (99$/an)

Étape 2: Créer un Pass Type ID
• Identifiers → + → Pass Type IDs
• Format recommandé: pass.com.votrecommerce.fidelite
• Téléchargez le certificat .cer

Étape 3: Générer les certificats
• Convertissez .cer en .pem via openssl
• Téléchargez le certificat WWDR Apple

Étape 4: Configuration APNs
• Keys → + → APNs
• Téléchargez la clé .p8
• Notez le Key ID

Étape 5: Configuration du serveur
• Éditez backend/.env
• Activez WALLET_LIVE_MODE=true
• Activez PUSH_LIVE_MODE=true
• Renseignez tous les chemins de certificats
• Placez les fichiers dans backend/certs/

Étape 6: Tests
• Testez sur un vrai iPhone (simulateur ne supporte pas Wallet)
• Vérifiez que la carte s'installe correctement
• Testez les notifications push via APNs

IMPORTANT: Ne commitez JAMAIS vos certificats dans git!`;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingTop: 60, paddingBottom: 100 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.lg },
  card: { backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.sm, padding: Spacing.md, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  textArea: { height: 70, textAlignVertical: 'top' },
  loyaltyRow: { flexDirection: 'row', gap: Spacing.sm },
  loyaltyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  loyaltyBtnActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  loyaltyBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  loyaltyBtnTextActive: { color: '#000' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  counterBtnText: { fontSize: 20, color: Colors.textPrimary },
  counterValue: { fontSize: 20, fontWeight: '700', color: Colors.gold, minWidth: 40, textAlign: 'center' },
  saveBtn: { backgroundColor: Colors.gold, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
  simBanner: { flexDirection: 'row', gap: Spacing.md, backgroundColor: 'rgba(255,165,0,0.1)', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,165,0,0.2)', marginBottom: Spacing.md },
  simBannerTitle: { fontSize: 13, fontWeight: '700', color: '#FFA500', marginBottom: 4 },
  simBannerText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  vapidRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  vapidLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  vapidValue: { fontSize: 11, color: Colors.textMuted, fontFamily: 'monospace' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuItemText: { fontSize: 15, color: Colors.textPrimary },
  menuItemArrow: { fontSize: 20, color: Colors.textSecondary },
  gdprStat: { paddingTop: Spacing.md },
  gdprStatText: { fontSize: 14, color: Colors.textSecondary },
  gdprStatCount: { color: Colors.gold, fontWeight: '700' },
  walletMode: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  walletModeLabel: { fontSize: 15, color: Colors.textPrimary },
  walletModeBadge: { backgroundColor: 'rgba(255,165,0,0.15)', borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  walletModeBadgeText: { fontSize: 12, color: '#FFA500', fontWeight: '600' },
  checklist: { gap: Spacing.sm, marginBottom: Spacing.md },
  checklistItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checklistText: { fontSize: 14, color: Colors.textSecondary },
  learnMoreBtn: { borderWidth: 1, borderColor: Colors.gold, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  learnMoreBtnText: { color: Colors.gold, fontWeight: '600' },
  dangerBtn: { borderWidth: 1, borderColor: Colors.error, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  dangerBtnText: { color: Colors.error, fontWeight: '600', fontSize: 15 },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  close: { fontSize: 20, color: Colors.textSecondary },
  content: { flex: 1, padding: Spacing.lg },
  text: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
});
