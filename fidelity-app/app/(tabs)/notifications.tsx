import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// DateTimePicker only works on native — use text input fallback on web
const DateTimePicker = Platform.OS !== 'web'
  ? require('@react-native-community/datetimepicker').default
  : null;
import { useRestaurantStore } from '../../stores/restaurantStore';
import { useNotificationsStore } from '../../stores/notificationsStore';
import { useCustomersStore } from '../../stores/customersStore';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { Notification, NotificationType } from '../../../shared/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type TabType = 'send' | 'schedule' | 'history';

const NOTIF_TYPES: { type: NotificationType; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { type: 'menu', icon: 'restaurant-outline', label: 'Menu' },
  { type: 'offer', icon: 'pricetag-outline', label: 'Offre' },
  { type: 'event', icon: 'sparkles-outline', label: 'Événement' },
  { type: 'general', icon: 'megaphone-outline', label: 'Général' },
];

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('send');
  const { restaurant } = useRestaurantStore();
  const { notifications, loadNotifications } = useNotificationsStore();
  const { customers } = useCustomersStore();

  useEffect(() => {
    if (restaurant) loadNotifications(restaurant.id);
  }, [restaurant]);

  const marketingCount = customers.filter((c) => c.marketing_consent).length;
  const scheduled = notifications.filter((n) => n.status === 'scheduled');
  const history = notifications.filter((n) => n.status === 'sent' || n.status === 'failed');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsBar}>
        {(['send', 'schedule', 'history'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'send' ? 'Envoyer' : tab === 'schedule' ? 'Planifier' : 'Historique'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'send' && (
        <SendTab restaurantId={restaurant?.id || ''} restaurantName={restaurant?.name || ''} marketingCount={marketingCount} />
      )}
      {activeTab === 'schedule' && (
        <ScheduleTab restaurantId={restaurant?.id || ''} scheduled={scheduled} />
      )}
      {activeTab === 'history' && <HistoryTab notifications={history} />}
    </View>
  );
}

function SendTab({
  restaurantId, restaurantName, marketingCount,
}: {
  restaurantId: string;
  restaurantName: string;
  marketingCount: number;
}) {
  const [type, setType] = useState<NotificationType>('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const { sendNotification } = useNotificationsStore();

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Erreur', 'Le titre et le message sont requis');
      return;
    }
    Alert.alert(
      'Confirmer l\'envoi',
      `Envoyer "${title}" à ${marketingCount} client(s) avec consentement marketing ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          style: 'default',
          onPress: async () => {
            try {
              setSending(true);
              const result = await sendNotification({ restaurant_id: restaurantId, title, body, type });
              const msg = result.push_dry_run
                ? `Notification enregistrée. En mode live, elle sera envoyée à ${result.sent_count} client(s).`
                : `Notification envoyée à ${result.sent_count} client(s)`;
              Alert.alert('Succès', msg);
              setTitle('');
              setBody('');
            } catch (err: any) {
              Alert.alert('Erreur', err.message);
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
      {/* Type selector */}
      <Text style={styles.fieldLabel}>Type de notification</Text>
      <View style={styles.typeRow}>
        {NOTIF_TYPES.map(({ type: t, icon, label }) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, type === t && styles.typeChipActive]}
            onPress={() => setType(t)}
          >
            <Ionicons name={icon} size={20} color={type === t ? '#000' : Colors.textSecondary} />
            <Text style={[styles.typeLabel, type === t && styles.typeLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Title */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Titre (max 50 caractères)</Text>
        <Text style={[styles.charCount, title.length > 45 && { color: Colors.error }]}>
          {title.length}/50
        </Text>
      </View>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={(t) => setTitle(t.slice(0, 50))}
        placeholder="Ex: Menu du jour disponible !"
        placeholderTextColor={Colors.textSecondary}
      />

      {/* Body */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Message (max 150 caractères)</Text>
        <Text style={[styles.charCount, body.length > 140 && { color: Colors.error }]}>
          {body.length}/150
        </Text>
      </View>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={body}
        onChangeText={(t) => setBody(t.slice(0, 150))}
        placeholder="Découvrez notre sélection de ce midi..."
        placeholderTextColor={Colors.textSecondary}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      {/* iPhone lock screen preview */}
      <Text style={styles.fieldLabel}>Aperçu sur l'écran de verrouillage</Text>
      <View style={styles.lockscreenPreview}>
        <View style={styles.lockscreenBg}>
          <View style={styles.lockscreenTime}>
            <Text style={styles.lockscreenClock}>9:41</Text>
            <Text style={styles.lockscreenDateText}>Vendredi 4 avril</Text>
          </View>
          <View style={styles.notifBubble}>
            <View style={styles.notifAppIcon}>
              <Ionicons name="trophy" size={20} color="#000" />
            </View>
            <View style={styles.notifContent}>
              <View style={styles.notifHeader}>
                <Text style={styles.notifAppName}>UP Fidelity</Text>
                <Text style={styles.notifTime}>maintenant</Text>
              </View>
              <Text style={styles.notifTitle} numberOfLines={1}>
                {title || 'Titre de la notification'}
              </Text>
              <Text style={styles.notifBody} numberOfLines={2}>
                {body || 'Votre message apparaîtra ici...'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.recipientsInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="mail-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.recipientsText}>
            Sera envoyé à <Text style={styles.recipientsCount}>{marketingCount}</Text> client(s) avec consentement marketing
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.sendButton, (sending || !title || !body) && { opacity: 0.5 }]}
        onPress={handleSend}
        disabled={sending || !title || !body}
      >
        {sending ? <ActivityIndicator color="#000" /> : <Text style={styles.sendButtonText}>Envoyer maintenant</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function ScheduleTab({
  restaurantId, scheduled,
}: {
  restaurantId: string;
  scheduled: Notification[];
}) {
  const [type, setType] = useState<NotificationType>('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { scheduleNotification, cancelNotification } = useNotificationsStore();

  const handleSchedule = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Erreur', 'Le titre et le message sont requis');
      return;
    }
    try {
      setSubmitting(true);
      await scheduleNotification({
        restaurant_id: restaurantId,
        title,
        body,
        type,
        scheduled_at: scheduledDate.toISOString(),
      });
      Alert.alert('Planifiée', `Notification planifiée pour le ${format(scheduledDate, "d MMMM à HH'h'mm", { locale: fr })}`);
      setTitle('');
      setBody('');
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
      <View style={styles.typeRow}>
        {NOTIF_TYPES.map(({ type: t, icon, label }) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, type === t && styles.typeChipActive]}
            onPress={() => setType(t)}
          >
            <Ionicons name={icon} size={20} color={type === t ? '#000' : Colors.textSecondary} />
            <Text style={[styles.typeLabel, type === t && styles.typeLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Titre</Text>
      <TextInput style={styles.input} value={title} onChangeText={(t) => setTitle(t.slice(0, 50))} placeholder="Titre..." placeholderTextColor={Colors.textSecondary} />

      <Text style={styles.fieldLabel}>Message</Text>
      <TextInput style={[styles.input, styles.textArea]} value={body} onChangeText={(t) => setBody(t.slice(0, 150))} placeholder="Message..." placeholderTextColor={Colors.textSecondary} multiline textAlignVertical="top" />

      <Text style={styles.fieldLabel}>Date et heure d'envoi</Text>
      {Platform.OS === 'web' ? (
        <TextInput
          style={styles.input}
          value={scheduledDate.toISOString().slice(0, 16)}
          onChangeText={(val) => {
            const d = new Date(val);
            if (!isNaN(d.getTime())) setScheduledDate(d);
          }}
          placeholder="YYYY-MM-DDTHH:MM"
          placeholderTextColor={Colors.textSecondary}
        />
      ) : (
        <>
          <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.datePickerText}>
                {format(scheduledDate, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
              </Text>
            </View>
          </TouchableOpacity>
          {showDatePicker && DateTimePicker && (
            <DateTimePicker
              value={scheduledDate}
              mode="datetime"
              minimumDate={new Date(Date.now() + 60 * 60 * 1000)}
              onChange={(_: any, date?: Date) => {
                setShowDatePicker(false);
                if (date) setScheduledDate(date);
              }}
              display="spinner"
              themeVariant="dark"
            />
          )}
        </>
      )}

      <TouchableOpacity
        style={[styles.sendButton, (submitting || !title || !body) && { opacity: 0.5 }]}
        onPress={handleSchedule}
        disabled={submitting || !title || !body}
      >
        {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.sendButtonText}>Planifier</Text>}
      </TouchableOpacity>

      {scheduled.length > 0 && (
        <>
          <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>Notifications planifiées</Text>
          {scheduled.map((n) => (
            <NotifItem key={n.id} notification={n} onCancel={() => {
              Alert.alert('Annuler ?', 'Voulez-vous annuler cette notification planifiée ?', [
                { text: 'Non', style: 'cancel' },
                { text: 'Oui', onPress: () => cancelNotification(n.id, restaurantId) },
              ]);
            }} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function HistoryTab({ notifications }: { notifications: Notification[] }) {
  if (notifications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="mail-unread-outline" size={64} color={Colors.textSecondary} style={{ marginBottom: Spacing.lg }} />
        <Text style={styles.emptyTitle}>Aucun historique</Text>
        <Text style={styles.emptySubtitle}>Les notifications envoyées apparaîtront ici</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg }}>
      {notifications.map((n) => (
        <NotifItem key={n.id} notification={n} />
      ))}
    </ScrollView>
  );
}

function NotifItem({ notification, onCancel }: { notification: Notification; onCancel?: () => void }) {
  const typeInfo = NOTIF_TYPES.find((t) => t.type === notification.type) || NOTIF_TYPES[3];
  const date = notification.sent_at || notification.scheduled_at || notification.created_at;

  return (
    <View style={notifStyles.item}>
      <View style={notifStyles.left}>
        <Ionicons name={typeInfo.icon} size={24} color={Colors.textSecondary} />
      </View>
      <View style={notifStyles.info}>
        <Text style={notifStyles.title}>{notification.title}</Text>
        <Text style={notifStyles.body} numberOfLines={2}>{notification.body}</Text>
        <View style={notifStyles.meta}>
          <View style={[notifStyles.badge, {
            backgroundColor: notification.status === 'sent' ? 'rgba(76,175,80,0.15)' :
              notification.status === 'scheduled' ? 'rgba(33,150,243,0.15)' : 'rgba(244,67,54,0.15)',
          }]}>
            <Text style={[notifStyles.badgeText, {
              color: notification.status === 'sent' ? Colors.success :
                notification.status === 'scheduled' ? Colors.info : Colors.error,
            }]}>
              {notification.status === 'sent' ? '✓ Envoyée' : notification.status === 'scheduled' ? '⏱ Planifiée' : '✗ Échouée'}
            </Text>
          </View>
          {date && <Text style={notifStyles.date}>{format(new Date(date), "d MMM, HH'h'mm", { locale: fr })}</Text>}
          {notification.recipients_count > 0 && (
            <Text style={notifStyles.recipients}>{notification.recipients_count} destinataires</Text>
          )}
        </View>
      </View>
      {onCancel && (
        <TouchableOpacity onPress={onCancel} style={notifStyles.cancelBtn}>
          <Text style={notifStyles.cancelBtnText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.lg, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  tabsBar: { flexDirection: 'row', backgroundColor: Colors.card, marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.sm },
  tabActive: { backgroundColor: Colors.gold },
  tabText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#000' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  charCount: { fontSize: 12, color: Colors.textSecondary },
  typeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  typeChip: {
    flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.sm,
    padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  typeChipActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  typeIcon: { fontSize: 20, marginBottom: 2 },
  typeLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600' },
  typeLabelActive: { color: '#000' },
  input: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md,
    color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  lockscreenPreview: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
  lockscreenBg: { backgroundColor: '#1c1c1e', borderRadius: 20, padding: Spacing.lg },
  lockscreenTime: { alignItems: 'center', marginBottom: Spacing.lg },
  lockscreenClock: { fontSize: 52, fontWeight: '200', color: '#fff' },
  lockscreenDateText: { fontSize: 15, color: 'rgba(255,255,255,0.7)' },
  notifBubble: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16,
    padding: Spacing.md, flexDirection: 'row', gap: Spacing.md,
  },
  notifAppIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  notifAppName: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  notifTime: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  notifTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  notifBody: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  recipientsInfo: { backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)' },
  recipientsText: { fontSize: 14, color: Colors.textSecondary },
  recipientsCount: { color: Colors.gold, fontWeight: '700' },
  sendButton: { backgroundColor: Colors.gold, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.xl },
  sendButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  datePicker: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  datePickerText: { color: Colors.textPrimary, fontSize: 15 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});

const notifStyles = StyleSheet.create({
  item: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, flexDirection: 'row', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  left: { paddingTop: 2 },
  icon: { fontSize: 24 },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  body: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.sm, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 11, color: Colors.textMuted },
  recipients: { fontSize: 11, color: Colors.textMuted },
  cancelBtn: { padding: Spacing.sm },
  cancelBtnText: { color: Colors.textSecondary, fontSize: 16 },
});
