import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRestaurantStore } from '../stores/restaurantStore';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { LoyaltyType } from '../../shared/types';

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
      Alert.alert('Erreur', 'Le nom du commerce est requis');
      return;
    }
    try {
      setIsSubmitting(true);
      await setupRestaurant({
        name: name.trim(),
        description: description.trim() || undefined,
        logo_emoji: '🏪',
        color_primary: '#c9a84c',
        color_secondary: '#1a1a24',
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
      Alert.alert('Erreur', 'Impossible de créer le commerce. Vérifiez que le serveur est démarré.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="trophy" size={72} color={Colors.gold} style={{ marginBottom: Spacing.lg }} />
          <Text style={styles.title}>FidélitéPro</Text>
          <Text style={styles.tagline}>Fidélisez vos clients</Text>
          <Text style={styles.desc}>
            Créez votre programme de fidélité, gérez vos clients et envoyez des notifications push directement depuis votre navigateur.
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(1)}>
          <Text style={styles.primaryBtnText}>Commencer la configuration</Text>
        </TouchableOpacity>
        <Text style={styles.simNote}>Apple Wallet est activable dès que vos certificats Apple Developer sont en place</Text>
      </View>
    );
  }

  if (step === 2) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={80} color={Colors.success} style={{ marginBottom: Spacing.lg }} />
          <Text style={styles.title}>C'est prêt !</Text>
          <Text style={styles.confirmName}>{name}</Text>
          <Text style={styles.desc}>
            {loyaltyType === 'stamps'
              ? `Programme à tampons configuré — objectif : ${stampGoal} tampons par récompense.`
              : `Programme à points configuré — ${pointsPerVisit} points par visite.`
            }
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryBtnText}>Accéder au tableau de bord</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Configurer votre commerce</Text>
      <Text style={styles.stepSub}>Ces informations apparaîtront sur les cartes de fidélité</Text>

      {/* Nom */}
      <Text style={styles.label}>Nom du commerce *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ex: Salon Marie, Boulangerie Dupont..."
        placeholderTextColor={Colors.textSecondary}
      />

      <Text style={styles.label}>Description (optionnel)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Ex: Coiffure, boulangerie, restaurant..."
        placeholderTextColor={Colors.textSecondary}
        multiline
      />

      {/* Choix du système */}
      <Text style={styles.label}>Système de fidélité</Text>
      <View style={styles.loyaltyRow}>
        <TouchableOpacity
          style={[styles.loyaltyCard, loyaltyType === 'stamps' && styles.loyaltyCardActive]}
          onPress={() => setLoyaltyType('stamps')}
        >
          <Ionicons name="ribbon" size={32} color={loyaltyType === 'stamps' ? '#000' : Colors.textSecondary} />
          <Text style={[styles.loyaltyCardTitle, loyaltyType === 'stamps' && styles.loyaltyCardTitleActive]}>Tampons</Text>
          <Text style={[styles.loyaltyCardDesc, loyaltyType === 'stamps' && { color: 'rgba(0,0,0,0.6)' }]}>
            Un tampon à chaque visite, une récompense à l'objectif
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loyaltyCard, loyaltyType === 'points' && styles.loyaltyCardActive]}
          onPress={() => setLoyaltyType('points')}
        >
          <Ionicons name="star" size={32} color={loyaltyType === 'points' ? '#000' : Colors.textSecondary} />
          <Text style={[styles.loyaltyCardTitle, loyaltyType === 'points' && styles.loyaltyCardTitleActive]}>Points</Text>
          <Text style={[styles.loyaltyCardDesc, loyaltyType === 'points' && { color: 'rgba(0,0,0,0.6)' }]}>
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
                  style={[styles.sliderDot, stampGoal >= val && { backgroundColor: Colors.gold }]}
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
                  style={[styles.sliderDot, pointsPerVisit >= val && { backgroundColor: Colors.gold }]}
                  onPress={() => setPointsPerVisit(val)}
                />
              ))}
            </View>
            <Text style={styles.sliderLabel}>500</Text>
          </View>
        </>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, { marginTop: Spacing.lg }, isSubmitting && { opacity: 0.6 }]}
        onPress={handleSetup}
        disabled={isSubmitting}
      >
        {isSubmitting
          ? <ActivityIndicator color="#000" />
          : <Text style={styles.primaryBtnText}>Créer mon commerce</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg, justifyContent: 'space-between', paddingVertical: 80 },
  center: { alignItems: 'center', marginTop: 40 },
  scroll: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.lg, paddingBottom: 60 },
  title: { fontSize: 36, fontWeight: '800', color: Colors.gold, marginBottom: Spacing.sm },
  tagline: { fontSize: 20, color: Colors.textPrimary, marginBottom: Spacing.lg },
  desc: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  confirmName: { fontSize: 22, color: Colors.gold, fontWeight: '700', marginBottom: Spacing.md },
  simNote: { textAlign: 'center', color: Colors.textMuted, fontSize: 12, marginTop: Spacing.md },
  stepTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: 60 },
  stepSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xl },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.textPrimary, fontSize: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  textArea: { height: 80, textAlignVertical: 'top' },
  loyaltyRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  loyaltyCard: { flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', borderWidth: 2, borderColor: Colors.border, gap: Spacing.sm },
  loyaltyCardActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  loyaltyCardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  loyaltyCardTitleActive: { color: '#000' },
  loyaltyCardDesc: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', lineHeight: 16 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  sliderLabel: { color: Colors.textSecondary, fontSize: 12, width: 28, textAlign: 'center' },
  sliderTrack: { flex: 1, flexDirection: 'row', gap: 4 },
  sliderDot: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  primaryBtn: { backgroundColor: Colors.gold, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
