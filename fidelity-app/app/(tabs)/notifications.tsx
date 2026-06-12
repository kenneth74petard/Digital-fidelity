import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform,
} from 'react-native';
import { showAlert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
// DateTimePicker only works on native — use text input fallback on web
const DateTimePicker = Platform.OS !== 'web'
  ? require('@react-native-community/datetimepicker').default
  : null;
import { useRestaurantStore } from '../../stores/restaurantStore';
import { useNotificationsStore } from '../../stores/notificationsStore';
import { useCustomersStore } from '../../stores/customersStore';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Notification, NotificationType } from '../../../shared/types';
import { ScreenHeader, Button, EmptyState, Badge } from '../../components/ui';
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
  const { customers, loadCustomers } = useCustomersStore();

  // Charger aussi les clients : en accès direct à cet onglet, le store est
  // vide et le compteur de destinataires marketing affichait 0
  useEffect(() => {
    if (restaurant) {
      loadNotifications(restaurant.id);
      loadCustomers(restaurant.id);
    }
  }, [restaurant]);

  // SQLite renvoie 0/1 — Boolean() normalise
  const marketingCount = customers.filter((c) => Boolean(c.marketing_consent)).length;
  const scheduled = notifications.filter((n) => n.status === 'scheduled');
  const history = notifications.filter((n) => n.status === 'sent' || n.status === 'failed');

  return (
    <View style={styles.container}>
      <ScreenHeader title="Notifications" />

      {/* Onglets */}
      <View style={styles.tabsBar}>
        {(['send', 'schedule', 'history'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'send' ? 'Envoyer' : tab === 'schedule' ? 'Planifier' : 'Historique'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'send' && (
        <SendTab restaurantId={restaurant?.id || ''} marketingCount={marketingCount} />
      )}
      {activeTab === 'schedule' && (
        <ScheduleTab restaurantId={restaurant?.id || ''} scheduled={scheduled} />
      )}
      {activeTab === 'history' && <HistoryTab notifications={history} />}
    </View>
  );
}

function TypeSelector({ value, onChange }: { value: NotificationType; onChange: (t: NotificationType) => void }) {
  return (
    <View style={styles.typeRow}>
      {NOTIF_TYPES.map(({ type: t, icon, label }) => {
        const active = value === t;
        return (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, active && styles.typeChipActive]}
            onPress={() => onChange(t)}
            activeOpacity={0.7}
          >
            <Ionicons name={icon} size={19} color={active ? Colors.goldDark : Colors.textSecondary} />
            <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SendTab({
  restaurantId, marketingCount,
}: {
  restaurantId: string;
  marketingCount: number;
}) {
  const [type, setType] = useState<NotificationType>('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const { sendNotification } = useNotificationsStore();

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      showAlert('Erreur', 'Le titre et le message sont requis');
      return;
    }
    showAlert(
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
              showAlert('Succès', msg);
              setTitle('');
              setBody('');
            } catch (err: any) {
              showAlert('Erreur', err.message);
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg, paddingTop: Spacing.xs }} showsVerticalScrollIndicator={false}>
      <Text style={styles.fieldLabel}>Type de notification</Text>
      <TypeSelector value={type} onChange={setType} />

      {/* Titre */}
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
        placeholderTextColor={Colors.textMuted}
      />

      {/* Message */}
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
        placeholderTextColor={Colors.textMuted}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      {/* Aperçu écran verrouillé */}
      <Text style={styles.fieldLabel}>Aperçu sur l'écran de verrouillage</Text>
      <View style={styles.lockscreenBg}>
        <View style={styles.lockscreenTime}>
          <Text style={styles.lockscreenClock}>9:41</Text>
          <Text style={styles.lockscreenDateText}>{format(new Date(), 'EEEE d MMMM', { locale: fr })}</Text>
        </View>
        <View style={styles.notifBubble}>
          <View style={styles.notifAppIcon}>
            <Ionicons name="trophy" size={20} color={Colors.onGold} />
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

      <View style={styles.recipientsInfo}>
        <Ionicons name="people-outline" size={15} color={Colors.goldDark} />
        <Text style={styles.recipientsText}>
          Sera envoyé à <Text style={styles.recipientsCount}>{marketingCount}</Text> client(s) avec consentement marketing
        </Text>
      </View>

      <Button
        label="Envoyer maintenant"
        icon="paper-plane"
        onPress={handleSend}
        loading={sending}
        disabled={!title || !body}
        style={{ marginBottom: Spacing.xl }}
      />
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
      showAlert('Erreur', 'Le titre et le message sont requis');
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
      showAlert('Planifiée', `Notification planifiée pour le ${format(scheduledDate, "d MMMM à HH'h'mm", { locale: fr })}`);
      setTitle('');
      setBody('');
    } catch (err: any) {
      showAlert('Erreur', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg, paddingTop: Spacing.xs }} showsVerticalScrollIndicator={false}>
      <TypeSelector value={type} onChange={setType} />

      <Text style={styles.fieldLabel}>Titre</Text>
      <TextInput style={styles.input} value={title} onChangeText={(t) => setTitle(t.slice(0, 50))} placeholder="Titre..." placeholderTextColor={Colors.textMuted} />

      <Text style={styles.fieldLabel}>Message</Text>
      <TextInput style={[styles.input, styles.textArea]} value={body} onChangeText={(t) => setBody(t.slice(0, 150))} placeholder="Message..." placeholderTextColor={Colors.textMuted} multiline textAlignVertical="top" />

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
          placeholderTextColor={Colors.textMuted}
        />
      ) : (
        <>
          <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={16} color={Colors.goldDark} />
            <Text style={styles.datePickerText}>
              {format(scheduledDate, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
            </Text>
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
            />
          )}
        </>
      )}

      <Button
        label="Planifier"
        icon="time-outline"
        onPress={handleSchedule}
        loading={submitting}
        disabled={!title || !body}
        style={{ marginBottom: Spacing.lg }}
      />

      {scheduled.length > 0 && (
        <>
          <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>Notifications planifiées</Text>
          {scheduled.map((n) => (
            <NotifItem key={n.id} notification={n} onCancel={() => {
              showAlert('Annuler ?', 'Voulez-vous annuler cette notification planifiée ?', [
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
        <EmptyState
          icon="mail-unread-outline"
          title="Aucun historique"
          subtitle="Les notifications envoyées apparaîtront ici"
        />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: 100 }}>
      {notifications.map((n) => (
        <NotifItem key={n.id} notification={n} />
      ))}
    </ScrollView>
  );
}

function NotifItem({ notification, onCancel }: { notification: Notification; onCancel?: () => void }) {
  const typeInfo = NOTIF_TYPES.find((t) => t.type === notification.type) || NOTIF_TYPES[3];
  const date = notification.sent_at || notification.scheduled_at || notification.created_at;
  const tone = notification.status === 'sent' ? 'success' : notification.status === 'scheduled' ? 'info' : 'error';
  const statusLabel = notification.status === 'sent' ? '✓ Envoyée' : notification.status === 'scheduled' ? '⏱ Planifiée' : '✗ Échouée';

  return (
    <View style={notifStyles.item}>
      <View style={notifStyles.iconWrap}>
        <Ionicons name={typeInfo.icon} size={19} color={Colors.goldDark} />
      </View>
      <View style={notifStyles.info}>
        <Text style={notifStyles.title}>{notification.title}</Text>
        <Text style={notifStyles.body} numberOfLines={2}>{notification.body}</Text>
        <View style={notifStyles.meta}>
          <Badge label={statusLabel} tone={tone} />
          {date ? <Text style={notifStyles.date}>{format(new Date(date), "d MMM, HH'h'mm", { locale: fr })}</Text> : null}
          {notification.recipients_count > 0 && (
            <Text style={notifStyles.recipients}>{notification.recipients_count} destinataires</Text>
          )}
        </View>
      </View>
      {onCancel && (
        <TouchableOpacity onPress={onCancel} style={notifStyles.cancelBtn}>
          <Ionicons name="close" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabsBar: {
    flexDirection: 'row', backgroundColor: Colors.inputBg,
    marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md, padding: 4,
    marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: BorderRadius.sm },
  tabActive: { backgroundColor: Colors.card, ...Shadows.card },
  tabText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: Colors.goldDark, fontWeight: '700' },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
    marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  charCount: { fontSize: 12, color: Colors.textMuted },
  typeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  typeChip: {
    flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.md,
    paddingVertical: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  typeChipActive: { backgroundColor: Colors.goldSoft, borderColor: Colors.goldSoftBorder },
  typeLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  typeLabelActive: { color: Colors.goldDark, fontWeight: '700' },
  input: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md,
    color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  lockscreenBg: { backgroundColor: '#15171C', borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  lockscreenTime: { alignItems: 'center', marginBottom: Spacing.lg },
  lockscreenClock: { fontSize: 52, fontWeight: '200', color: '#fff' },
  lockscreenDateText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' },
  notifBubble: {
    backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16,
    padding: Spacing.md, flexDirection: 'row', gap: Spacing.md,
  },
  notifAppIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  notifAppName: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  notifTime: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  notifTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  notifBody: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  recipientsInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.goldSoft, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  recipientsText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  recipientsCount: { color: Colors.goldDark, fontWeight: '800' },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  datePickerText: { color: Colors.textPrimary, fontSize: 15 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
});

const notifStyles = StyleSheet.create({
  item: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, flexDirection: 'row', gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.cardBorder, ...Shadows.card,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.goldSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
  body: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.sm, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  date: { fontSize: 11, color: Colors.textMuted },
  recipients: { fontSize: 11, color: Colors.textMuted },
  cancelBtn: { padding: Spacing.sm },
});
