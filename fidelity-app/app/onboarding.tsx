import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, StyleSheet, } from 'react-native';
import { showAlert } from '../lib/alert';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRestaurantStore } from '../stores/restaurantStore';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { LoyaltyType } from '../../shared/types';
import { Button, Input } from '../components/ui';

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loyaltyType, setLoyaltyType] = useState<LoyaltyType>('stamps');
  const [stampGoal, setStampGoal] = useState(10);
  const [pointsPerVisit, setPointsPerVisit] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setupRestaurant, setOnboarded } = useRestaurantStore();

  const handleSetup = async () => {
    if (!name.trim()) {
      showAlert('Erreur', 'Le nom du commerce est requis');
      return;
    }
    try {
      setIsSubmitting(true);
      await setupRestaurant({
        name: name.trim(),
        description: description.trim() || undefined,
        logo_emoji: '🏪',
        color_primary: '#F59E0B',
        color_secondary: '#ffffff',
        loyalty_type: loyaltyType,
        stamp_goal: stampGoal,
        points_per_visit: pointsPerVisit,
      });
      const { restaurant } = useRestaurantStore.getState();
      if (restaurant) {
        await setOnboarded(restaurant.id);
        setStep(2);
      }
    } catch {
      showAlert('Erreur', 'Impossible de créer le commerce. Vérifiez que le serveur est démarré.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <View style={styles.brandBadge}>
            <Ionicons name="trophy" size={48} color={Colors.goldDark} />
          </View>
          <Text style={styles.title}>UP Fidelity</Text>
          <Text style={styles.tagline}>Fidélisez vos clients</Text>
          <Text style={styles.desc}>
            Créez votre programme de fidélité, gérez vos clients et envoyez des notifications push directement depuis votre navigateur.
          </Text>

          <View style={styles.featureList}>
            <FeatureRow icon="card-outline" label="Cartes de fidélité digitales" />
            <FeatureRow icon="qr-code-outline" label="Inscription client par QR code" />
            <FeatureRow icon="notifications-outline" label="Notifications push marketing" />
          </View>
        </View>
        <View>
          <Button label="Commencer la configuration" onPress={() => setStep(1)} />
          <Text style={styles.simNote}>Apple Wallet est activable dès que vos certificats Apple Developer sont en place</Text>
        </View>
      </View>
    );
  }

  if (step === 2) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <View style={[styles.brandBadge, { backgroundColor: Colors.successSoft }]}>
            <Ionicons name="checkmark" size={48} color={Colors.success} />
          </View>
          <Text style={styles.title}>C'est prêt !</Text>
          <Text style={styles.confirmName}>{name}</Text>
          <Text style={styles.desc}>
            {loyaltyType === 'stamps'
              ? `Programme à tampons configuré — objectif : ${stampGoal} tampons par récompense.`
              : `Programme à points configuré — ${pointsPerVisit} points par visite.`
            }
          </Text>
        </View>
        <Button label="Accéder au tableau de bord" onPress={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Configurer votre commerce</Text>
      <Text style={styles.stepSub}>Ces informations apparaîtront sur les cartes de fidélité</Text>

      <Input
        label="Nom du commerce *"
        value={name}
        onChangeText={setName}
        placeholder="Ex: Salon Marie, Boulangerie Dupont..."
      />
      <Input
        label="Description (optionnel)"
        value={description}
        onChangeText={setDescription}
        placeholder="Ex: Cuisine française traditionnelle"
        multiline
      />

      {/* Choix du système */}
      <Text style={styles.label}>Système de fidélité</Text>
      <View style={styles.loyaltyRow}>
        <TouchableOpacity
          style={[styles.loyaltyCard, loyaltyType === 'stamps' && styles.loyaltyCardActive]}
          onPress={() => setLoyaltyType('stamps')}
          activeOpacity={0.8}
        >
          <View style={[styles.loyaltyIconWrap, loyaltyType === 'stamps' && styles.loyaltyIconWrapActive]}>
            <Ionicons name="ribbon" size={26} color={loyaltyType === 'stamps' ? Colors.goldDark : Colors.textSecondary} />
          </View>
          <Text style={[styles.loyaltyCardTitle, loyaltyType === 'stamps' && { color: Colors.goldDark }]}>Tampons</Text>
          <Text style={styles.loyaltyCardDesc}>
            Un tampon à chaque visite, une récompense à l'objectif
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loyaltyCard, loyaltyType === 'points' && styles.loyaltyCardActive]}
          onPress={() => setLoyaltyType('points')}
          activeOpacity={0.8}
        >
          <View style={[styles.loyaltyIconWrap, loyaltyType === 'points' && styles.loyaltyIconWrapActive]}>
            <Ionicons name="star" size={26} color={loyaltyType === 'points' ? Colors.goldDark : Colors.textSecondary} />
          </View>
          <Text style={[styles.loyaltyCardTitle, loyaltyType === 'points' && { color: Colors.goldDark }]}>Points</Text>
          <Text style={styles.loyaltyCardDesc}>
            Des points cumulés à chaque visite, échangeables en réductions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Paramètre selon le mode */}
      {loyaltyType === 'stamps' && (
        <>
          <Text style={styles.label}>Objectif de tampons : {stampGoal}</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>5</Text>
            <View style={styles.sliderTrack}>
              {[5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.sliderDot, stampGoal >= val && { backgroundColor: Colors.gold, borderColor: Colors.gold }]}
                  onPress={() => setStampGoal(val)}
                />
              ))}
            </View>
            <Text style={styles.sliderLabel}>20</Text>
          </View>
        </>
      )}

      {loyaltyType === 'points' && (
        <>
          <Text style={styles.label}>Points par visite : {pointsPerVisit}</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>50</Text>
            <View style={styles.sliderTrack}>
              {[50,100,150,200,250,300,350,400,450,500].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.sliderDot, pointsPerVisit >= val && { backgroundColor: Colors.gold, borderColor: Colors.gold }]}
                  onPress={() => setPointsPerVisit(val)}
                />
              ))}
            </View>
            <Text style={styles.sliderLabel}>500</Text>
          </View>
        </>
      )}

      <Button
        label="Créer mon commerce"
        onPress={handleSetup}
        loading={isSubmitting}
        style={{ marginTop: Spacing.lg }}
      />
    </ScrollView>
  );
}

function FeatureRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrap}>
        <Ionicons name={icon} size={17} color={Colors.goldDark} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg, justifyContent: 'space-between', paddingVertical: 72 },
  center: { alignItems: 'center', marginTop: 24 },
  scroll: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.lg, paddingBottom: 60, maxWidth: 560, width: '100%', alignSelf: 'center' },
  brandBadge: {
    width: 96, height: 96, borderRadius: 28, backgroundColor: Colors.goldSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  title: { fontSize: 34, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs, letterSpacing: -0.5 },
  tagline: { fontSize: 17, color: Colors.goldDark, fontWeight: '600', marginBottom: Spacing.lg },
  desc: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 420 },
  featureList: { marginTop: Spacing.xl, gap: Spacing.md, alignSelf: 'stretch', maxWidth: 360, width: '100%' },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.cardBorder, ...Shadows.card,
  },
  featureIconWrap: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: Colors.goldSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  featureLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  confirmName: { fontSize: 22, color: Colors.goldDark, fontWeight: '800', marginBottom: Spacing.md },
  simNote: { textAlign: 'center', color: Colors.textMuted, fontSize: 12, marginTop: Spacing.md },
  stepTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: 56, letterSpacing: -0.3 },
  stepSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xl },
  label: {
    fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
    marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  loyaltyRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  loyaltyCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, alignItems: 'center', borderWidth: 2, borderColor: Colors.border,
    gap: Spacing.sm, ...Shadows.card,
  },
  loyaltyCardActive: { borderColor: Colors.gold, backgroundColor: Colors.goldSoft },
  loyaltyIconWrap: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.inputBg,
    alignItems: 'center', justifyContent: 'center',
  },
  loyaltyIconWrapActive: { backgroundColor: Colors.card },
  loyaltyCardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  loyaltyCardDesc: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', lineHeight: 17 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  sliderLabel: { color: Colors.textSecondary, fontSize: 12, width: 28, textAlign: 'center' },
  sliderTrack: { flex: 1, flexDirection: 'row', gap: 4 },
  sliderDot: { flex: 1, height: 10, borderRadius: 5, backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border },
});
