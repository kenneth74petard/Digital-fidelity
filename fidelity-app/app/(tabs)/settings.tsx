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
import { ScreenHeader, Card, SectionLabel, Button, Input, MenuRow } from '../../components/ui';

export default function SettingsScreen() {
  const { restaurant, updateRestaurant, reset } = useRestaurantStore();
  const { customers } = useCustomersStore();
  const [showGdprModal, setShowGdprModal] = useState(false);

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
      <ScreenHeader title="Réglages" />

      <View style={styles.body}>
        {/* Apparence */}
        <SectionLabel title="Apparence" />
        <Card style={styles.sectionCard}>
          <MenuRow
            icon={themeMode === 'dark' ? 'moon-outline' : 'sunny-outline'}
            label="Mode sombre"
            last
            right={
              <Switch
                value={themeMode === 'dark'}
                onValueChange={handleThemeChange}
                thumbColor={themeMode === 'dark' ? Colors.gold : '#f4f3f4'}
                trackColor={{ false: '#d7d2c7', true: Colors.goldSoftBorder }}
              />
            }
          />
        </Card>

        {/* Mon commerce */}
        <SectionLabel title="Mon commerce" style={{ marginTop: Spacing.lg }} />
        <Card style={styles.sectionCard}>
          <Text style={styles.fieldLabel}>Système de fidélité</Text>
          <View style={styles.loyaltyRow}>
            <TouchableOpacity
              style={[styles.loyaltyBtn, loyaltyType === 'stamps' && styles.loyaltyBtnActive]}
              onPress={() => setLoyaltyType('stamps')}
              activeOpacity={0.7}
            >
              <Ionicons name="ribbon" size={18} color={loyaltyType === 'stamps' ? Colors.goldDark : Colors.textSecondary} />
              <Text style={[styles.loyaltyBtnText, loyaltyType === 'stamps' && styles.loyaltyBtnTextActive]}>Tampons</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.loyaltyBtn, loyaltyType === 'points' && styles.loyaltyBtnActive]}
              onPress={() => setLoyaltyType('points')}
              activeOpacity={0.7}
            >
              <Ionicons name="star" size={18} color={loyaltyType === 'points' ? Colors.goldDark : Colors.textSecondary} />
              <Text style={[styles.loyaltyBtnText, loyaltyType === 'points' && styles.loyaltyBtnTextActive]}>Points</Text>
            </TouchableOpacity>
          </View>

          <Input label="Nom du commerce" value={name} onChangeText={setName} placeholder="Nom..." />
          <Input label="Description" value={description} onChangeText={setDescription} placeholder="Description..." multiline />

          {loyaltyType === 'stamps' && (
            <View style={styles.counterField}>
              <Text style={styles.fieldLabel}>Objectif tampons</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setStampGoal(Math.max(5, stampGoal - 1))}>
                  <Ionicons name="remove" size={18} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{stampGoal}</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setStampGoal(Math.min(20, stampGoal + 1))}>
                  <Ionicons name="add" size={18} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {loyaltyType === 'points' && (
            <View style={styles.counterField}>
              <Text style={styles.fieldLabel}>Points par visite</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setPointsPerVisit(Math.max(50, pointsPerVisit - 50))}>
                  <Ionicons name="remove" size={18} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{pointsPerVisit}</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setPointsPerVisit(Math.min(500, pointsPerVisit + 50))}>
                  <Ionicons name="add" size={18} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Button label="Sauvegarder" onPress={handleSave} loading={saving} style={{ marginTop: Spacing.sm }} />
        </Card>

        {/* RGPD */}
        <SectionLabel title="Conformité RGPD" style={{ marginTop: Spacing.lg }} />
        <Card style={styles.sectionCard}>
          <MenuRow icon="document-text-outline" label="Politique de confidentialité" onPress={() => setShowGdprModal(true)} />
          <MenuRow icon="download-outline" label="Exporter toutes les données" onPress={handleExportData} />
          <View style={styles.gdprStat}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.gdprStatText}>
              <Text style={styles.gdprStatCount}>{marketingCount}</Text> client{marketingCount !== 1 ? 's' : ''} avec consentement marketing
            </Text>
          </View>
        </Card>

        {/* Zone de danger */}
        <SectionLabel title="Zone de danger" style={{ marginTop: Spacing.lg }} />
        <Card style={styles.sectionCard}>
          <Button label="Réinitialiser toutes les données" icon="warning-outline" variant="danger" onPress={handleReset} />
        </Card>
      </View>

      {/* Modale RGPD */}
      <Modal visible={showGdprModal} animationType="slide" onRequestClose={() => setShowGdprModal(false)}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Politique de confidentialité</Text>
            <TouchableOpacity onPress={() => setShowGdprModal(false)} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.content}>
            <Text style={modalStyles.text}>{generateGdprText(restaurant?.name || 'Notre commerce')}</Text>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 100 },
  body: { paddingHorizontal: Spacing.lg },
  sectionCard: { marginBottom: Spacing.xs },
  fieldLabel: {
    fontSize: 12, color: Colors.textSecondary, marginBottom: 6,
    fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6,
  },
  loyaltyRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  loyaltyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.inputBg, borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  loyaltyBtnActive: { backgroundColor: Colors.goldSoft, borderColor: Colors.goldSoftBorder },
  loyaltyBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  loyaltyBtnTextActive: { color: Colors.goldDark, fontWeight: '700' },
  counterField: { marginBottom: Spacing.md },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  counterBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.inputBg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  counterValue: { fontSize: 20, fontWeight: '800', color: Colors.goldDark, minWidth: 48, textAlign: 'center' },
  gdprStat: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: Spacing.md },
  gdprStatText: { fontSize: 14, color: Colors.textSecondary },
  gdprStatCount: { color: Colors.goldDark, fontWeight: '800' },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.lg, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.inputBg,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1, padding: Spacing.lg },
  text: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
});
