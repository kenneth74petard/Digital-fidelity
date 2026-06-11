/* =============================================
   UP FIDELITY — Design system de l'app commerçant
   Palette alignée sur la landing (ambre/or premium).
   Le mode est persisté en localStorage ; le changement
   recharge la page (les StyleSheet sont évalués au chargement).
   ============================================= */

export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'fidelity:theme-mode';

/** Mode clair — défaut. Fond gris très doux, cartes blanches, accent ambre. */
const LightColors = {
  background: '#F6F7F9',
  card: '#FFFFFF',
  cardBorder: 'rgba(16,24,40,0.07)',

  // Accent de marque (ambre, même gamme que la landing)
  gold: '#F59E0B',
  goldDark: '#D97706',
  goldLight: '#FBBF24',
  goldSoft: 'rgba(245,158,11,0.12)',
  goldSoftBorder: 'rgba(245,158,11,0.35)',
  onGold: '#2A1A03',

  textPrimary: '#161A20',
  textSecondary: 'rgba(22,26,32,0.58)',
  textMuted: 'rgba(22,26,32,0.38)',

  success: '#16A34A',
  successSoft: 'rgba(22,163,74,0.12)',
  error: '#DC2626',
  errorSoft: 'rgba(220,38,38,0.10)',
  warning: '#EA580C',
  info: '#2563EB',
  infoSoft: 'rgba(37,99,235,0.10)',

  border: 'rgba(16,24,40,0.09)',
  overlay: 'rgba(15,18,24,0.45)',
  tabBar: '#FFFFFF',
  inputBg: '#F2F3F5',
};

/** Mode sombre — vrai sombre : encre profonde, or plus lumineux. */
const DarkColors: typeof LightColors = {
  background: '#0D1117',
  card: '#161C24',
  cardBorder: 'rgba(255,255,255,0.07)',

  gold: '#FBBF24',
  goldDark: '#F59E0B',
  goldLight: '#FCD34D',
  goldSoft: 'rgba(251,191,36,0.14)',
  goldSoftBorder: 'rgba(251,191,36,0.40)',
  onGold: '#221703',

  textPrimary: '#F2F4F8',
  textSecondary: 'rgba(242,244,248,0.62)',
  textMuted: 'rgba(242,244,248,0.40)',

  success: '#4ADE80',
  successSoft: 'rgba(74,222,128,0.14)',
  error: '#F87171',
  errorSoft: 'rgba(248,113,113,0.12)',
  warning: '#FB923C',
  info: '#60A5FA',
  infoSoft: 'rgba(96,165,250,0.14)',

  border: 'rgba(255,255,255,0.09)',
  overlay: 'rgba(0,0,0,0.62)',
  tabBar: '#11161D',
  inputBg: '#1B222C',
};

function readInitialThemeMode(): ThemeMode {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
  }
  return 'light';
}

let currentThemeMode: ThemeMode = readInitialThemeMode();

export const Colors = {
  ...(currentThemeMode === 'dark' ? DarkColors : LightColors),
};

export function getThemeMode(): ThemeMode {
  return currentThemeMode;
}

export function setThemeMode(mode: ThemeMode): void {
  currentThemeMode = mode;
  Object.assign(Colors, mode === 'dark' ? DarkColors : LightColors);
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

/** Ombres douces (rendues en box-shadow sur web). */
export const Shadows = {
  get card() {
    return {
      shadowColor: '#101828',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: currentThemeMode === 'dark' ? 0.45 : 0.06,
      shadowRadius: 12,
      elevation: 2,
    } as const;
  },
  get fab() {
    return {
      shadowColor: Colors.gold,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 6,
    } as const;
  },
};

export const Typography = {
  get h1() { return { fontSize: 28, fontWeight: '800' as const, color: Colors.textPrimary, letterSpacing: -0.5 }; },
  get h2() { return { fontSize: 22, fontWeight: '700' as const, color: Colors.textPrimary, letterSpacing: -0.3 }; },
  get h3() { return { fontSize: 17, fontWeight: '700' as const, color: Colors.textPrimary }; },
  get body() { return { fontSize: 15, fontWeight: '400' as const, color: Colors.textPrimary }; },
  get small() { return { fontSize: 13, fontWeight: '400' as const, color: Colors.textSecondary }; },
  get caption() { return { fontSize: 11, fontWeight: '400' as const, color: Colors.textMuted }; },
  get label() {
    return {
      fontSize: 12,
      fontWeight: '600' as const,
      color: Colors.textSecondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.8,
    };
  },
};

export const FOOD_EMOJIS = ['🏪', '🥐', '🍕', '🍔', '🍣', '🥗', '🍜', '🥩', '🍰', '☕', '💇', '🌸', '🥂', '🌮', '🍱', '🥘', '🍲', '🧆', '🥞', '🫕'];

export const PRESET_COLORS = [
  '#F59E0B', // Ambre (marque)
  '#e63946', // Rouge
  '#2a9d8f', // Teal
  '#457b9d', // Bleu
  '#6a4c93', // Violet
  '#f77f00', // Orange
  '#2d6a4f', // Vert
  '#d62828', // Rouge foncé
];
