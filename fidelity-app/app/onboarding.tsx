import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRestaurantStore } from '../stores/restaurantStore';
import { Colors, Spacing, BorderRadius, FOOD_EMOJIS, PRESET_COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🍽️');
  const [selectedColor, setSelectedColor] = useState('#c9a84c');
  const [stampGoal, setStampGoal] = useState(10);
  const [pointsPerVisit, setPointsPerVisit] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setupRestaurant, setOnboarded } = useRestaurantStore();

  const handleSetup = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom du restaurant est requis');
      return;
    }

    try {
      setIsSubmitting(true);
      await setupRestaurant({
        name: name.trim(),
        description: description.trim() || undefined,
        logo_emoji: selectedEmoji,
        color_primary: selectedColor,
        color_secondary: '#1a1a24',
        stamp_goal: stampGoal,
        points_per_visit: pointsPerVisit,
      });
      const { restaurant } = useRestaurantStore.getState();
      if (restaurant) {
        await setOnboarded(restaurant.id);
        setStep(2);
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de créer le restaurant. Vérifiez que le serveur est démarré.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToDashboard = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
      {step === 1 && (
        <SetupStep
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          selectedEmoji={selectedEmoji}
          setSelectedEmoji={setSelectedEmoji}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          stampGoal={stampGoal}
          setStampGoal={setStampGoal}
          pointsPerVisit={pointsPerVisit}
          setPointsPerVisit={setPointsPerVisit}
          onSubmit={handleSetup}
          isSubmitting={isSubmitting}
        />
      )}
      {step === 2 && (
        <ConfirmationStep
          name={name}
          emoji={selectedEmoji}
          color={selectedColor}
          onDone={goToDashboard}
        />
      )}
    </View>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.stepContainer}>
      <Animated.View entering={FadeInUp.duration(600)} style={styles.welcomeContent}>
        <Text style={styles.welcomeEmoji}>🏆</Text>
        <Text style={styles.welcomeTitle}>FidélitéPro</Text>
        <Text style={styles.welcomeTagline}>Fidélisez vos clients</Text>
        <Text style={styles.welcomeDesc}>
          Créez des cartes de fidélité numériques, gérez vos clients et envoyez des notifications push directement depuis votre téléphone.
        </Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(600).delay(300)}>
        <TouchableOpacity style={styles.primaryButton} onPress={onNext}>
          <Text style={styles.primaryButtonText}>Commencer la configuration</Text>
        </TouchableOpacity>
        <Text style={styles.modeSimulation}>🔶 MODE SIMULATION — Aucun certificat Apple requis</Text>
      </Animated.View>
    </View>
  );
}

function SetupStep({
  name, setName, description, setDescription,
  selectedEmoji, setSelectedEmoji, selectedColor, setSelectedColor,
  stampGoal, setStampGoal, pointsPerVisit, setPointsPerVisit,
  onSubmit, isSubmitting,
}: any) {
  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Configurez votre restaurant</Text>
      <Text style={styles.stepSubtitle}>Ces informations apparaîtront sur les cartes de fidélité</Text>

      <Text style={styles.fieldLabel}>Nom du restaurant *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ex: Le Petit Bistrot"
        placeholderTextColor={Colors.textSecondary}
      />

      <Text style={styles.fieldLabel}>Description (optionnel)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Ex: Cuisine française traditionnelle"
        placeholderTextColor={Colors.textSecondary}
        multiline
        numberOfLines={2}
      />

      <Text style={styles.fieldLabel}>Logo emoji</Text>
      <View style={styles.emojiGrid}>
        {FOOD_EMOJIS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={[styles.emojiItem, selectedEmoji === emoji && { borderColor: Colors.gold, borderWidth: 2 }]}
            onPress={() => setSelectedEmoji(emoji)}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Couleur principale</Text>
      <View style={styles.colorGrid}>
        {PRESET_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[styles.colorItem, { backgroundColor: color }, selectedColor === color && styles.colorSelected]}
            onPress={() => setSelectedColor(color)}
          />
        ))}
      </View>

      <Text style={styles.fieldLabel}>Objectif de tampons: {stampGoal}</Text>
      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>5</Text>
        <View style={styles.sliderTrack}>
          {[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.sliderDot, stampGoal >= val && { backgroundColor: Colors.gold }]}
              onPress={() => setStampGoal(val)}
            />
          ))}
        </View>
        <Text style={styles.sliderLabel}>20</Text>
      </View>

      <Text style={styles.fieldLabel}>Points par visite: {pointsPerVisit}</Text>
      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>50</Text>
        <View style={styles.sliderTrack}>
          {[50, 100, 150, 200, 250, 300, 350, 400, 450, 500].map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.sliderDot, pointsPerVisit >= val && { backgroundColor: Colors.gold }]}
              onPress={() => setPointsPerVisit(val)}
            />
          ))}
        </View>
        <Text style={styles.sliderLabel}>500</Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isSubmitting && { opacity: 0.6 }]}
        onPress={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.primaryButtonText}>Créer mon restaurant</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function ConfirmationStep({ name, emoji, color, onDone }: any) {
  return (
    <View style={styles.stepContainer}>
      <Animated.View entering={FadeInUp.duration(600)} style={styles.confirmContent}>
        <View style={[styles.confirmLogo, { backgroundColor: color }]}>
          <Text style={styles.confirmEmoji}>{emoji}</Text>
        </View>
        <Text style={styles.confirmTitle}>🎉 C'est prêt !</Text>
        <Text style={styles.confirmName}>{name}</Text>
        <Text style={styles.confirmDesc}>
          Votre espace de gestion de fidélité est configuré. Vous pouvez maintenant ajouter vos clients et créer leurs cartes de fidélité.
        </Text>
      </Animated.View>
      <TouchableOpacity style={styles.primaryButton} onPress={onDone}>
        <Text style={styles.primaryButtonText}>Accéder au tableau de bord</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  stepContainer: { flex: 1, padding: Spacing.lg, justifyContent: 'space-between', paddingVertical: 80 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 40 },
  welcomeContent: { alignItems: 'center', marginTop: 60 },
  welcomeEmoji: { fontSize: 72, marginBottom: Spacing.md },
  welcomeTitle: { fontSize: 36, fontWeight: '800', color: Colors.gold, marginBottom: Spacing.sm },
  welcomeTagline: { fontSize: 20, color: Colors.textPrimary, marginBottom: Spacing.lg },
  welcomeDesc: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  modeSimulation: { textAlign: 'center', color: Colors.textSecondary, fontSize: 12, marginTop: Spacing.md },
  stepTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: 60 },
  stepSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xl },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  emojiItem: {
    width: 48, height: 48, borderRadius: BorderRadius.sm,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  emojiText: { fontSize: 24 },
  colorGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  colorItem: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  colorSelected: { borderColor: Colors.textPrimary, transform: [{ scale: 1.15 }] },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  sliderLabel: { color: Colors.textSecondary, fontSize: 12, width: 24, textAlign: 'center' },
  sliderTrack: { flex: 1, flexDirection: 'row', gap: 4, justifyContent: 'space-between' },
  sliderDot: {
    flex: 1, height: 8, borderRadius: 4,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  primaryButton: {
    backgroundColor: Colors.gold, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm,
  },
  primaryButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  confirmContent: { alignItems: 'center', marginTop: 40 },
  confirmLogo: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  confirmEmoji: { fontSize: 48 },
  confirmTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  confirmName: { fontSize: 20, color: Colors.gold, fontWeight: '700', marginBottom: Spacing.md },
  confirmDesc: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
