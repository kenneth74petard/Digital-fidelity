/* =============================================
   UP FIDELITY — Composants UI partagés
   Toute la couche visuelle commune des écrans :
   boutons, cartes, champs, badges, sheets, etc.
   ============================================= */

import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInputProps, ViewStyle, StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/* ── En-tête d'écran ─────────────────────────── */

export function ScreenHeader({ title, subtitle, right }: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <Text style={s.headerTitle}>{title}</Text>
        {subtitle ? <Text style={s.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/* ── Carte ───────────────────────────────────── */

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

/* ── Libellé de section ──────────────────────── */

export function SectionLabel({ title, style }: { title: string; style?: StyleProp<ViewStyle> }) {
  return <Text style={[s.sectionLabel, style as any]}>{title}</Text>;
}

/* ── Bouton ──────────────────────────────────── */

export function Button({
  label, onPress, variant = 'primary', icon, loading, disabled, style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary:   { bg: Colors.gold, border: Colors.gold, text: Colors.onGold },
    success:   { bg: Colors.success, border: Colors.success, text: '#fff' },
    secondary: { bg: Colors.card, border: Colors.border, text: Colors.textPrimary },
    outline:   { bg: 'transparent', border: Colors.border, text: Colors.textSecondary },
    danger:    { bg: 'transparent', border: Colors.error, text: Colors.error },
  }[variant];

  const isDim = disabled || loading;
  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: palette.bg, borderColor: palette.border }, isDim && { opacity: 0.55 }, style]}
      onPress={onPress}
      disabled={isDim}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={17} color={palette.text} /> : null}
          <Text style={[s.btnText, { color: palette.text }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

/* ── Bouton d'icône rond (actions d'en-tête) ─── */

export function IconButton({ icon, onPress, tone = 'gold' }: {
  icon: IconName;
  onPress: () => void;
  tone?: 'gold' | 'neutral';
}) {
  return (
    <TouchableOpacity style={s.iconBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={19} color={tone === 'gold' ? Colors.goldDark : Colors.textSecondary} />
    </TouchableOpacity>
  );
}

/* ── Champ de saisie ─────────────────────────── */

export function Input({ label, style, multiline, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      {label ? <Text style={s.inputLabel}>{label}</Text> : null}
      <TextInput
        style={[s.input, multiline && s.inputMultiline, style]}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

/* ── Chip (filtres / sélecteurs) ─────────────── */

export function Chip({ label, icon, active, onPress }: {
  label: string;
  icon?: IconName;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.chip, active && s.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon ? <Ionicons name={icon} size={15} color={active ? Colors.goldDark : Colors.textSecondary} /> : null}
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ── Badge de statut ─────────────────────────── */

export function Badge({ label, tone = 'gold' }: {
  label: string;
  tone?: 'gold' | 'success' | 'info' | 'error';
}) {
  const palette = {
    gold:    { bg: Colors.goldSoft, text: Colors.goldDark },
    success: { bg: Colors.successSoft, text: Colors.success },
    info:    { bg: Colors.infoSoft, text: Colors.info },
    error:   { bg: Colors.errorSoft, text: Colors.error },
  }[tone];
  return (
    <View style={[s.badge, { backgroundColor: palette.bg }]}>
      <Text style={[s.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

/* ── Avatar à initiales ──────────────────────── */

export function Avatar({ name, size = 48, highlight }: {
  name: string;
  size?: number;
  highlight?: boolean;
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
  return (
    <View
      style={[
        s.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        highlight && s.avatarHighlight,
      ]}
    >
      <Text style={[s.avatarText, { fontSize: size * 0.34 }]}>{initials}</Text>
      {highlight ? <View style={s.avatarDot} /> : null}
    </View>
  );
}

/* ── Pastilles de tampons ────────────────────── */

export function StampDots({ count, total, size = 12 }: {
  count: number;
  total: number;
  size?: number;
}) {
  return (
    <View style={s.stampRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            s.stampDot,
            { width: size, height: size, borderRadius: size / 2 },
            i < count && s.stampDotFilled,
          ]}
        />
      ))}
    </View>
  );
}

/* ── État vide ───────────────────────────────── */

export function EmptyState({ icon, title, subtitle, inCard }: {
  icon: IconName;
  title: string;
  subtitle?: string;
  inCard?: boolean;
}) {
  return (
    <View style={[s.empty, inCard && s.emptyCard]}>
      <View style={s.emptyIconWrap}>
        <Ionicons name={icon} size={28} color={Colors.goldDark} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={s.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/* ── Carte de statistique ────────────────────── */

export function StatCard({ icon, value, label, style }: {
  icon: IconName;
  value: number | string;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.statCard, style]}>
      <View style={s.statIconWrap}>
        <Ionicons name={icon} size={17} color={Colors.goldDark} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

/* ── Bottom sheet (modales du bas) ───────────── */

export function BottomSheet({ visible, onClose, title, subtitle, children, scrollable }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scrollable?: boolean;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.sheetOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={[s.sheet, scrollable && { maxHeight: '90%' }]}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>{title}</Text>
          {subtitle ? <Text style={s.sheetSubtitle}>{subtitle}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

/* ── Ligne de menu (réglages) ────────────────── */

export function MenuRow({ icon, label, onPress, right, last }: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
  last?: boolean;
}) {
  const content = (
    <>
      <View style={s.menuIconWrap}>
        <Ionicons name={icon} size={16} color={Colors.textSecondary} />
      </View>
      <Text style={s.menuLabel}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
    </>
  );
  if (!onPress) {
    return <View style={[s.menuRow, last && s.menuRowLast]}>{content}</View>;
  }
  return (
    <TouchableOpacity style={[s.menuRow, last && s.menuRowLast]} onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}

/* ── Styles ──────────────────────────────────── */

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
  },
  headerTitle: { ...Typography.h1 },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.cardBorder,
    ...Shadows.card,
  },

  sectionLabel: { ...Typography.label, marginBottom: Spacing.sm },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: BorderRadius.md, borderWidth: 1,
    paddingVertical: 14, paddingHorizontal: Spacing.lg,
  },
  btnText: { fontSize: 15, fontWeight: '700' },

  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.card,
  },

  inputLabel: { ...Typography.label, marginBottom: 6 },
  input: {
    backgroundColor: Colors.inputBg, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    color: Colors.textPrimary, fontSize: 15,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.goldSoft, borderColor: Colors.goldSoftBorder },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: Colors.goldDark, fontWeight: '700' },

  badge: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },

  avatar: {
    backgroundColor: Colors.goldSoft,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.goldSoftBorder,
  },
  avatarHighlight: { borderColor: Colors.gold, borderWidth: 2 },
  avatarText: { fontWeight: '800', color: Colors.goldDark },
  avatarDot: {
    position: 'absolute', top: -1, right: -1, width: 12, height: 12,
    borderRadius: 6, backgroundColor: Colors.gold, borderWidth: 2, borderColor: Colors.card,
  },

  stampRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  stampDot: { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border },
  stampDotFilled: { backgroundColor: Colors.gold, borderColor: Colors.gold },

  empty: { alignItems: 'center', padding: Spacing.xl },
  emptyCard: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.cardBorder, ...Shadows.card,
  },
  emptyIconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.goldSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },

  statCard: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder,
    ...Shadows.card,
  },
  statIconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.goldSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  sheetOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg, paddingBottom: Spacing.xl,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2,
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  sheetTitle: { ...Typography.h2, marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 19 },

  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuIconWrap: {
    width: 30, height: 30, borderRadius: 9, backgroundColor: Colors.inputBg,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.textPrimary },
});
