import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { showAlert } from '../../lib/alert';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { useCustomersStore } from '../../stores/customersStore';
import { customersApi } from '../../lib/api';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Customer } from '../../../shared/types';
import {
  ScreenHeader, IconButton, Chip, Avatar, StampDots, Badge,
  EmptyState, Button, Input, BottomSheet,
} from '../../components/ui';

type FilterType = 'all' | 'active' | 'reward';

function getRegisterUrl(restaurantId: string): string {
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/register/${restaurantId}`;
  }
  return `http://localhost:3000/register/${restaurantId}`;
}

function parseCsv(raw: string): { first_name: string; last_name: string; email: string; phone?: string }[] {
  const lines = raw.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["\s]/g, ''));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: any = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return {
      first_name: row['prenom'] || row['firstname'] || row['first_name'] || '',
      last_name: row['nom'] || row['lastname'] || row['last_name'] || '',
      email: row['email'] || row['mail'] || '',
      phone: row['telephone'] || row['phone'] || row['tel'] || undefined,
    };
  }).filter((r) => r.first_name && r.last_name && r.email);
}

export default function ClientsScreen() {
  const { restaurant } = useRestaurantStore();
  const { customers, loadCustomers, addStamp, isLoading } = useCustomersStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [stampConfirm, setStampConfirm] = useState<Customer | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const stampGoal = restaurant?.stamp_goal || 10;
  const loyaltyType = restaurant?.loyalty_type || 'stamps';

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
        showAlert('Récompense !', result.message);
      } else {
        showAlert('Tampon ajouté', result.message);
      }
    } catch (err) {
      showAlert('Erreur', 'Impossible d\'ajouter le tampon');
    }
    setStampConfirm(null);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Clients"
        subtitle={`${customers.length} client${customers.length !== 1 ? 's' : ''}`}
        right={
          <View style={styles.headerActions}>
            <IconButton icon="qr-code-outline" onPress={() => setShowQrModal(true)} />
            <IconButton icon="cloud-upload-outline" onPress={() => setShowImportModal(true)} />
          </View>
        }
      />

      {/* Recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={Colors.textMuted} style={{ marginRight: Spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher par nom ou email..."
          placeholderTextColor={Colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={{ gap: Spacing.sm, paddingRight: Spacing.lg }}>
        <Chip label="Tous" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Actifs" active={filter === 'active'} onPress={() => setFilter('active')} />
        <Chip label="Récompense disponible" icon="gift-outline" active={filter === 'reward'} onPress={() => setFilter('reward')} />
      </ScrollView>

      {/* Liste */}
      {isLoading && customers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : customers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="people-outline"
            title="Aucun client"
            subtitle="Ajoutez votre premier client en appuyant sur +"
          />
        </View>
      ) : (
        <FlashList
          data={customers}
          keyExtractor={(item) => item.id}
          estimatedItemSize={150}
          contentContainerStyle={{ padding: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: 110 }}
          renderItem={({ item }) => (
            <CustomerCard
              customer={item}
              stampGoal={stampGoal}
              loyaltyType={loyaltyType}
              onStamp={() => setStampConfirm(item)}
              onAddPoints={async () => {
                try {
                  const result = await addStamp(item.id);
                  showAlert('Points ajoutés', result.message);
                  loadData();
                } catch { showAlert('Erreur', 'Impossible d\'ajouter les points'); }
              }}
              onView={() => { setSelectedCustomer(item); setShowPreviewModal(true); }}
              onDetail={() => router.push(`/clients/${item.id}` as any)}
            />
          )}
        />
      )}

      {/* Bouton flottant */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color={Colors.onGold} />
      </TouchableOpacity>

      {/* Nouveau client */}
      <AddCustomerModal
        visible={showAddModal}
        restaurantId={restaurant?.id || ''}
        onClose={() => setShowAddModal(false)}
        onCreated={() => { setShowAddModal(false); loadData(); }}
      />

      {/* Aperçu carte */}
      {selectedCustomer && (
        <CardPreviewModal
          visible={showPreviewModal}
          customer={selectedCustomer}
          restaurant={restaurant}
          onClose={() => { setShowPreviewModal(false); setSelectedCustomer(null); }}
        />
      )}

      {/* QR d'inscription */}
      <BottomSheet
        visible={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="QR d'inscription"
        subtitle="Les clients scannent ce QR pour s'inscrire eux-mêmes"
      >
        <View style={qrStyles.body}>
          <View style={qrStyles.qrBox}>
            <QRCode value={getRegisterUrl(restaurant?.id || '')} size={200} backgroundColor="#fff" color="#000" />
          </View>
          <View style={qrStyles.urlBox}>
            <Text style={qrStyles.urlText} numberOfLines={2} selectable>{getRegisterUrl(restaurant?.id || '')}</Text>
          </View>
          <Text style={qrStyles.hint}>Affichez ce QR à la caisse ou imprimez-le</Text>
          <Button label="Fermer" onPress={() => setShowQrModal(false)} style={{ alignSelf: 'stretch' }} />
        </View>
      </BottomSheet>

      {/* Import CSV */}
      <ImportCsvModal
        visible={showImportModal}
        restaurantId={restaurant?.id || ''}
        onClose={() => setShowImportModal(false)}
        onImported={() => { setShowImportModal(false); loadData(); }}
      />

      {/* Confirmation tampon */}
      {stampConfirm && (
        <Modal transparent animationType="fade" onRequestClose={() => setStampConfirm(null)}>
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmSheet}>
              <View style={styles.confirmIconWrap}>
                <Ionicons name="ribbon" size={26} color={Colors.goldDark} />
              </View>
              <Text style={styles.confirmTitle}>Ajouter un tampon</Text>
              <Text style={styles.confirmText}>
                Ajouter un tampon pour {stampConfirm.first_name} {stampConfirm.last_name} ?
              </Text>
              <Text style={styles.confirmStamps}>
                {stampConfirm.stamps}/{stampGoal} → {stampConfirm.stamps + 1}/{stampGoal}
              </Text>
              {stampConfirm.stamps + 1 >= stampGoal && (
                <View style={styles.rewardAlert}>
                  <Ionicons name="gift" size={15} color={Colors.success} />
                  <Text style={styles.rewardAlertText}>Cette visite déclenchera une récompense !</Text>
                </View>
              )}
              <View style={styles.confirmButtons}>
                <Button label="Annuler" variant="secondary" onPress={() => setStampConfirm(null)} style={{ flex: 1 }} />
                <Button label="Confirmer" onPress={() => handleAddStamp(stampConfirm)} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function CustomerCard({
  customer, stampGoal, loyaltyType, onStamp, onAddPoints, onView, onDetail,
}: {
  customer: Customer;
  stampGoal: number;
  loyaltyType: 'stamps' | 'points';
  onStamp: () => void;
  onAddPoints: () => void;
  onView: () => void;
  onDetail: () => void;
}) {
  const hasReward = customer.stamps >= stampGoal;

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onDetail} activeOpacity={0.85}>
      <View style={cardStyles.top}>
        <Avatar name={`${customer.first_name} ${customer.last_name}`} highlight={hasReward && loyaltyType === 'stamps'} />
        <View style={cardStyles.info}>
          <Text style={cardStyles.name}>{customer.first_name} {customer.last_name}</Text>
          <Text style={cardStyles.email}>{customer.email}</Text>
        </View>
        <View style={cardStyles.badges}>
          {loyaltyType === 'points' ? (
            <Badge label={`★ ${customer.points} pts`} />
          ) : (
            <Text style={cardStyles.points}>{customer.stamps}/{stampGoal}</Text>
          )}
          {customer.discount_pct > 0 && <Badge label={`-${customer.discount_pct}%`} tone="success" />}
        </View>
      </View>

      {loyaltyType === 'stamps' && (
        <View style={cardStyles.stampsRow}>
          <StampDots count={customer.stamps} total={Math.min(stampGoal, 10)} />
          {hasReward && <Badge label="Récompense !" tone="success" />}
        </View>
      )}

      {loyaltyType === 'points' && (
        <View style={cardStyles.pointsBar}>
          <Ionicons name="star-outline" size={13} color={Colors.textSecondary} />
          <Text style={cardStyles.pointsBarText}>
            {customer.total_visits} visite{customer.total_visits !== 1 ? 's' : ''} · {customer.points} points cumulés
          </Text>
        </View>
      )}

      <View style={cardStyles.actions}>
        {loyaltyType === 'stamps' ? (
          <TouchableOpacity style={cardStyles.actionPrimary} onPress={onStamp} activeOpacity={0.8}>
            <Ionicons name="add" size={15} color={Colors.onGold} />
            <Text style={cardStyles.actionPrimaryText}>Tampon</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={cardStyles.actionPrimary} onPress={onAddPoints} activeOpacity={0.8}>
            <Ionicons name="add" size={15} color={Colors.onGold} />
            <Text style={cardStyles.actionPrimaryText}>Points</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={cardStyles.actionGhost} onPress={onView} activeOpacity={0.7}>
          <Ionicons name="eye-outline" size={14} color={Colors.textSecondary} />
          <Text style={cardStyles.actionGhostText}>Carte</Text>
        </TouchableOpacity>
        <TouchableOpacity style={cardStyles.actionGhost} onPress={onDetail} activeOpacity={0.7}>
          <Ionicons name="ellipsis-horizontal" size={14} color={Colors.textSecondary} />
          <Text style={cardStyles.actionGhostText}>Plus</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function ImportCsvModal({ visible, restaurantId, onClose, onImported }: { visible: boolean; restaurantId: string; onClose: () => void; onImported: () => void }) {
  const [csv, setCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const preview = parseCsv(csv);

  const handleImport = async () => {
    const rows = parseCsv(csv);
    if (rows.length === 0) {
      showAlert('Erreur', 'Aucune ligne valide détectée. Vérifiez le format.');
      return;
    }
    setImporting(true);
    try {
      const res = await customersApi.importCsv(restaurantId, rows);
      const { created, duplicates, errors } = res.data.data;
      showAlert(
        'Import terminé',
        `${created} client(s) créé(s)\n${duplicates} doublon(s) ignoré(s)${errors.length > 0 ? `\n${errors.length} erreur(s)` : ''}`,
      );
      setCsv('');
      onImported();
    } catch (err: any) {
      showAlert('Erreur', err.message || 'Import échoué');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={importStyles.overlay}>
          <View style={importStyles.sheet}>
            <View style={importStyles.handle} />
            <Text style={importStyles.title}>Import CSV</Text>
            <Text style={importStyles.sub}>
              Collez le contenu d'un fichier CSV.{'\n'}
              Colonnes attendues : <Text style={importStyles.mono}>prenom, nom, email, telephone</Text>
            </Text>
            <View style={importStyles.exampleBox}>
              <Text style={importStyles.exampleText}>{'prenom,nom,email,telephone\nMarie,Dupont,marie@email.com,+33612345678\nPaul,Martin,paul@email.com'}</Text>
            </View>
            <TextInput
              style={importStyles.input}
              value={csv}
              onChangeText={setCsv}
              placeholder="Collez votre CSV ici..."
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {preview.length > 0 && (
              <View style={importStyles.previewRow}>
                <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                <Text style={importStyles.preview}>{preview.length} ligne(s) détectée(s) et prête(s) à l'import</Text>
              </View>
            )}
            <View style={importStyles.buttons}>
              <Button label="Annuler" variant="secondary" onPress={() => { setCsv(''); onClose(); }} style={{ flex: 1 }} />
              <Button
                label={`Importer ${preview.length > 0 ? `(${preview.length})` : ''}`}
                onPress={handleImport}
                loading={importing}
                disabled={preview.length === 0}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
      showAlert('Erreur', 'Prénom, nom et email sont requis');
      return;
    }
    if (!gdprConsent) {
      showAlert('Erreur', 'Le consentement RGPD est obligatoire');
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
      showAlert('Erreur', err.message || 'Impossible de créer le client');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>Nouveau client</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={modalStyles.row}>
                <View style={{ flex: 1 }}>
                  <Input label="Prénom *" value={firstName} onChangeText={setFirstName} placeholder="Marie" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Nom *" value={lastName} onChangeText={setLastName} placeholder="Dupont" />
                </View>
              </View>

              <Input
                label="Email *" value={email} onChangeText={setEmail}
                placeholder="marie@email.com" keyboardType="email-address" autoCapitalize="none"
              />
              <Input
                label="Téléphone (optionnel)" value={phone} onChangeText={setPhone}
                placeholder="+33 6 12 34 56 78" keyboardType="phone-pad"
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
                <Button label="Annuler" variant="secondary" onPress={() => { reset(); onClose(); }} style={{ flex: 1 }} />
                <Button label="Créer le client" onPress={handleSubmit} loading={submitting} style={{ flex: 2 }} />
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
  const registerUrl = getRegisterUrl(restaurant?.id || '');

  // Partage natif si dispo (mobile), sinon copie dans le presse-papier (web)
  const handleShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: `Carte de fidélité — ${restaurant?.name}`, url: registerUrl });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(registerUrl);
        showAlert('Lien copié', 'Le lien d\'inscription a été copié dans le presse-papier.');
        return;
      }
      showAlert('Lien d\'inscription', registerUrl);
    } catch {
      showAlert('Lien d\'inscription', registerUrl);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={previewStyles.overlay}>
        <View style={previewStyles.container}>
          <TouchableOpacity style={previewStyles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color={Colors.textPrimary} />
            <Text style={previewStyles.closeBtnText}>Fermer</Text>
          </TouchableOpacity>

          {/* Aperçu de la carte Wallet */}
          <View style={[previewStyles.card, { backgroundColor: restaurant?.color_primary || Colors.gold }]}>
            <View style={previewStyles.cardHeader}>
              <Text style={previewStyles.cardEmoji}>{restaurant?.logo_emoji || '🏪'}</Text>
              <View>
                <Text style={previewStyles.cardRestaurantName}>{restaurant?.name}</Text>
                <View style={previewStyles.simBadge}>
                  <Text style={previewStyles.simBadgeText}>APERÇU WALLET</Text>
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
              <View>
                <Text style={previewStyles.statValue}>{customer.points}</Text>
                <Text style={previewStyles.statLabel}>Points</Text>
              </View>
              <View>
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

            <View style={previewStyles.qrContainer}>
              <View style={previewStyles.fakeQr}>
                <Text style={previewStyles.fakeQrText}>QR</Text>
              </View>
            </View>
          </View>

          <Text style={previewStyles.disclaimer}>
            Sans certificat Apple Developer, la carte ne peut pas être installée dans Apple Wallet.
          </Text>

          <Button label="Partager le QR d'inscription" icon="share-outline" variant="secondary" onPress={handleShare} style={{ marginBottom: Spacing.md }} />
          <Button
            label="Télécharger la carte (.pkpass)"
            onPress={() => showAlert(
              'Wallet non configuré',
              'Cette carte ne peut pas être installée sans certificat Apple Developer. Une fois les certificats configurés, elle pourra être ajoutée au Wallet.',
              [{ text: 'OK' }]
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    ...Shadows.card,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 15, paddingVertical: 12 },
  filtersScroll: { paddingLeft: Spacing.lg, marginBottom: Spacing.md, flexGrow: 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  fab: {
    position: 'absolute', bottom: 96, right: Spacing.lg,
    width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center', ...Shadows.fab,
  },
  confirmOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  confirmSheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  confirmIconWrap: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.goldSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  confirmTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  confirmText: { fontSize: 15, color: Colors.textSecondary, marginBottom: Spacing.sm, lineHeight: 21 },
  confirmStamps: { fontSize: 17, color: Colors.goldDark, fontWeight: '800', marginBottom: Spacing.md },
  rewardAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.successSoft, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  rewardAlertText: { color: Colors.success, fontWeight: '600', flex: 1 },
  confirmButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder,
    ...Shadows.card,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  email: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  badges: { alignItems: 'flex-end', gap: 4 },
  points: { fontSize: 14, color: Colors.goldDark, fontWeight: '800' },
  stampsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md, gap: Spacing.sm },
  pointsBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  pointsBarText: { fontSize: 12, color: Colors.textSecondary },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: Colors.gold, borderRadius: BorderRadius.sm, paddingVertical: 9,
  },
  actionPrimaryText: { fontSize: 12, color: Colors.onGold, fontWeight: '700' },
  actionGhost: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.sm, paddingVertical: 9,
  },
  actionGhostText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
});

const qrStyles = StyleSheet.create({
  body: { alignItems: 'center' },
  qrBox: { backgroundColor: '#fff', padding: 16, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  urlBox: { backgroundColor: Colors.inputBg, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, alignSelf: 'stretch' },
  urlText: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', fontFamily: 'monospace' },
  hint: { fontSize: 12, color: Colors.textMuted, marginBottom: Spacing.lg, textAlign: 'center' },
});

const importStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg, maxHeight: '90%',
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 19 },
  mono: { fontFamily: 'monospace', color: Colors.goldDark },
  exampleBox: { backgroundColor: Colors.inputBg, borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  exampleText: { fontSize: 11, color: Colors.textMuted, fontFamily: 'monospace', lineHeight: 18 },
  input: {
    backgroundColor: Colors.inputBg, borderRadius: BorderRadius.md, padding: Spacing.md,
    color: Colors.textPrimary, fontSize: 13, borderWidth: 1, borderColor: Colors.border,
    height: 140, marginBottom: Spacing.sm, fontFamily: 'monospace',
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  preview: { fontSize: 13, color: Colors.success, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: Spacing.md, paddingBottom: 32 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg, maxHeight: '90%',
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  row: { flexDirection: 'row', gap: Spacing.md },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  consentText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  buttons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg, paddingBottom: 40 },
});

const previewStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay },
  container: { flex: 1, padding: Spacing.lg, paddingTop: 56, maxWidth: 480, width: '100%', alignSelf: 'center' },
  closeBtn: {
    alignSelf: 'flex-end', marginBottom: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.card, borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  closeBtnText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
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
});
