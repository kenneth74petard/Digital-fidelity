import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { useCustomersStore } from '../../stores/customersStore';
import { customersApi } from '../../lib/api';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { Customer } from '../../../shared/types';

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
  const { customers, loadCustomers, addStamp, createCustomer, isLoading } = useCustomersStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [stampConfirm, setStampConfirm] = useState<Customer | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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
        Alert.alert('Récompense !', result.message);
      } else {
        Alert.alert('Tampon ajouté', result.message);
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
        <View>
          <Text style={styles.title}>Clients</Text>
          <Text style={styles.count}>{customers.length} client{customers.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowQrModal(true)}>
            <Ionicons name="qr-code-outline" size={20} color={Colors.gold} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowImportModal(true)}>
            <Ionicons name="cloud-upload-outline" size={20} color={Colors.gold} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={Colors.textSecondary} style={{ marginRight: Spacing.sm }} />
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
          <Ionicons name="people-outline" size={64} color={Colors.textSecondary} style={{ marginBottom: Spacing.lg }} />
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
              loyaltyType={loyaltyType}
              onStamp={() => setStampConfirm(item)}
              onAddPoints={async () => {
                try {
                  const result = await addStamp(item.id);
                  Alert.alert('Points ajoutés', result.message);
                  loadData();
                } catch { Alert.alert('Erreur', 'Impossible d\'ajouter les points'); }
              }}
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

      {/* QR code d'inscription */}
      <QrRegisterModal
        visible={showQrModal}
        restaurantId={restaurant?.id || ''}
        restaurantName={restaurant?.name || ''}
        onClose={() => setShowQrModal(false)}
      />

      {/* Import CSV */}
      <ImportCsvModal
        visible={showImportModal}
        restaurantId={restaurant?.id || ''}
        onClose={() => setShowImportModal(false)}
        onImported={() => { setShowImportModal(false); loadData(); }}
      />

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
                  <Text style={styles.rewardAlertText}>Cette visite déclenchera une récompense !</Text>
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
  const initials = `${customer.first_name?.[0] ?? ''}${customer.last_name?.[0] ?? ''}`.toUpperCase() || '?';
  const hasReward = customer.stamps >= stampGoal;
  const displayStamps = Math.min(stampGoal, 10);

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onDetail}>
      <View style={cardStyles.top}>
        <View style={[cardStyles.avatar, hasReward && loyaltyType === 'stamps' && cardStyles.avatarGold]}>
          <Text style={cardStyles.initials}>{initials}</Text>
          {hasReward && loyaltyType === 'stamps' && <View style={cardStyles.rewardDot} />}
        </View>
        <View style={cardStyles.info}>
          <Text style={cardStyles.name}>{customer.first_name} {customer.last_name}</Text>
          <Text style={cardStyles.email}>{customer.email}</Text>
        </View>
        <View style={cardStyles.badges}>
          {loyaltyType === 'points' ? (
            <View style={cardStyles.pointsBadge}>
              <Ionicons name="star" size={12} color={Colors.gold} />
              <Text style={cardStyles.pointsBadgeText}>{customer.points} pts</Text>
            </View>
          ) : (
            <Text style={cardStyles.points}>{customer.stamps}/{stampGoal}</Text>
          )}
          {customer.discount_pct > 0 && (
            <View style={cardStyles.discountBadge}>
              <Text style={cardStyles.discountText}>-{customer.discount_pct}%</Text>
            </View>
          )}
        </View>
      </View>

      {loyaltyType === 'stamps' && (
        <View style={cardStyles.stampsRow}>
          <View style={cardStyles.stampDots}>
            {Array.from({ length: displayStamps }).map((_, i) => (
              <View key={i} style={[cardStyles.stampDot, i < customer.stamps && cardStyles.stampDotFilled]} />
            ))}
          </View>
          <Text style={cardStyles.stampsCount}>{customer.stamps}/{stampGoal}</Text>
        </View>
      )}

      {loyaltyType === 'points' && (
        <View style={cardStyles.pointsBar}>
          <Ionicons name="star-outline" size={13} color={Colors.textSecondary} />
          <Text style={cardStyles.pointsBarText}>{customer.total_visits} visite{customer.total_visits !== 1 ? 's' : ''} · {customer.points} points cumulés</Text>
        </View>
      )}

      <View style={cardStyles.actions}>
        {loyaltyType === 'stamps' ? (
          <TouchableOpacity style={cardStyles.actionBtn} onPress={onStamp}>
            <Text style={cardStyles.actionBtnText}>+ Tampon</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={cardStyles.actionBtn} onPress={onAddPoints}>
            <Text style={cardStyles.actionBtnText}>+ Points</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.actionBtnOutline]} onPress={onView}>
          <Ionicons name="eye-outline" size={14} color={Colors.textSecondary} />
          <Text style={cardStyles.actionBtnOutlineText}> Carte</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.actionBtnOutline]} onPress={onDetail}>
          <Ionicons name="ellipsis-horizontal" size={14} color={Colors.textSecondary} />
          <Text style={cardStyles.actionBtnOutlineText}> Plus</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function QrRegisterModal({ visible, restaurantId, restaurantName, onClose }: { visible: boolean; restaurantId: string; restaurantName: string; onClose: () => void }) {
  const url = getRegisterUrl(restaurantId);
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={qrStyles.overlay}>
        <View style={qrStyles.sheet}>
          <View style={qrStyles.handle} />
          <Text style={qrStyles.title}>QR d'inscription</Text>
          <Text style={qrStyles.sub}>Les clients scannent ce QR pour s'inscrire eux-mêmes</Text>
          <View style={qrStyles.qrBox}>
            <QRCode value={url} size={200} backgroundColor="#fff" color="#000" />
          </View>
          <View style={qrStyles.urlBox}>
            <Text style={qrStyles.urlText} numberOfLines={2} selectable>{url}</Text>
          </View>
          <Text style={qrStyles.hint}>Affichez ce QR à la caisse ou imprimez-le</Text>
          <TouchableOpacity style={qrStyles.closeBtn} onPress={onClose}>
            <Text style={qrStyles.closeBtnText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ImportCsvModal({ visible, restaurantId, onClose, onImported }: { visible: boolean; restaurantId: string; onClose: () => void; onImported: () => void }) {
  const [csv, setCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const preview = parseCsv(csv);

  const handleImport = async () => {
    const rows = parseCsv(csv);
    if (rows.length === 0) {
      Alert.alert('Erreur', 'Aucune ligne valide détectée. Vérifiez le format.');
      return;
    }
    setImporting(true);
    try {
      const res = await customersApi.importCsv(restaurantId, rows);
      const { created, duplicates, errors } = res.data.data;
      Alert.alert(
        'Import terminé',
        `${created} client(s) créé(s)\n${duplicates} doublon(s) ignoré(s)${errors.length > 0 ? `\n${errors.length} erreur(s)` : ''}`,
      );
      setCsv('');
      onImported();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Import échoué');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
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
              placeholderTextColor={Colors.textSecondary}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {preview.length > 0 && (
              <Text style={importStyles.preview}>{preview.length} ligne(s) détectée(s) et prête(s) à l'import</Text>
            )}
            <View style={importStyles.buttons}>
              <TouchableOpacity style={importStyles.cancelBtn} onPress={() => { setCsv(''); onClose(); }}>
                <Text style={importStyles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[importStyles.importBtn, (importing || preview.length === 0) && { opacity: 0.5 }]}
                onPress={handleImport}
                disabled={importing || preview.length === 0}
              >
                {importing
                  ? <ActivityIndicator color="#000" />
                  : <Text style={importStyles.importText}>Importer {preview.length > 0 ? `(${preview.length})` : ''}</Text>
                }
              </TouchableOpacity>
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

          {/* Wallet card preview */}
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
            Sans certificat Apple Developer, la carte ne peut pas être installée dans Apple Wallet.
          </Text>

          <TouchableOpacity style={previewStyles.shareBtn}>
            <Text style={previewStyles.shareBtnText}>Partager le QR d'inscription</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={previewStyles.downloadBtn}
            onPress={() => Alert.alert(
              'Wallet non configuré',
              'Cette carte ne peut pas être installée sans certificat Apple Developer. Une fois les certificats configurés, elle pourra être ajoutée au Wallet.',
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

const qrStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, alignItems: 'center' },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, marginBottom: Spacing.lg },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  sub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  qrBox: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: Spacing.lg },
  urlBox: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, width: '100%' },
  urlText: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', fontFamily: 'monospace' },
  hint: { fontSize: 12, color: Colors.textMuted, marginBottom: Spacing.xl, textAlign: 'center' },
  closeBtn: { backgroundColor: Colors.gold, borderRadius: BorderRadius.md, padding: Spacing.md, width: '100%', alignItems: 'center', marginBottom: 8 },
  closeBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
});

const importStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, maxHeight: '90%' },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 18 },
  mono: { fontFamily: 'monospace', color: Colors.gold },
  exampleBox: { backgroundColor: Colors.background, borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  exampleText: { fontSize: 11, color: Colors.textMuted, fontFamily: 'monospace', lineHeight: 18 },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.textPrimary, fontSize: 13, borderWidth: 1, borderColor: Colors.border, height: 140, marginBottom: Spacing.sm, fontFamily: 'monospace' },
  preview: { fontSize: 13, color: Colors.success, marginBottom: Spacing.md, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: Spacing.md, paddingBottom: 32 },
  cancelBtn: { flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  importBtn: { flex: 2, backgroundColor: Colors.gold, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  importText: { color: '#000', fontWeight: '700', fontSize: 15 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  count: { fontSize: 14, color: Colors.textSecondary },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  searchIcon: { marginRight: Spacing.sm },
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
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(201,168,76,0.15)', borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  pointsBadgeText: { fontSize: 13, color: Colors.gold, fontWeight: '700' },
  pointsBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md, paddingTop: 2 },
  pointsBarText: { fontSize: 12, color: Colors.textSecondary },
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
