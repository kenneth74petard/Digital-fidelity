export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'fidelity:theme-mode';

const DarkColors = {
  background: '#ffffff',
  card: '#f9f9fc',
  cardBorder: 'rgba(0,0,0,0.08)',
  gold: '#ffb800',
  goldLight: '#ffd54f',
  textPrimary: '#1a1c1e',
  textSecondary: 'rgba(0,0,0,0.55)',
  textMuted: 'rgba(0,0,0,0.35)',
  success: '#2e7d32',
  error: '#c62828',
  warning: '#ef6c00',
  info: '#1565c0',
  border: 'rgba(0,0,0,0.1)',
  overlay: 'rgba(0,0,0,0.4)',
  tabBar: '#ffffff',
  inputBg: '#f3f3f6',
};

const LightColors = {
  background: '#ffffff',
  card: '#f9f9fc',
  cardBorder: 'rgba(0,0,0,0.08)',
  gold: '#ffb800',
  goldLight: '#ffd54f',
  textPrimary: '#1a1c1e',
  textSecondary: 'rgba(0,0,0,0.55)',
  textMuted: 'rgba(0,0,0,0.35)',
  success: '#2e7d32',
  error: '#c62828',
  warning: '#ef6c00',
  info: '#1565c0',
  border: 'rgba(0,0,0,0.1)',
  overlay: 'rgba(0,0,0,0.4)',
  tabBar: '#ffffff',
  inputBg: '#f3f3f6',
};

function readInitialThemeMode(): ThemeMode {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
  }
  return 'dark';
}

let currentThemeMode: ThemeMode = readInitialThemeMode();

export const Colors = {
  ...(currentThemeMode === 'light' ? LightColors : DarkColors),
};

export function getThemeMode(): ThemeMode {
  return currentThemeMode;
}

export function setThemeMode(mode: ThemeMode): void {
  currentThemeMode = mode;
  Object.assign(Colors, mode === 'light' ? LightColors : DarkColors);
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

export const Typography = {
  get h1() { return { fontSize: 28, fontWeight: '700' as const, color: Colors.textPrimary }; },
  get h2() { return { fontSize: 22, fontWeight: '700' as const, color: Colors.textPrimary }; },
  get h3() { return { fontSize: 18, fontWeight: '600' as const, color: Colors.textPrimary }; },
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
  '#ffb800', // Gold
  '#e63946', // Red
  '#2a9d8f', // Teal
  '#457b9d', // Blue
  '#6a4c93', // Purple
  '#f77f00', // Orange
  '#2d6a4f', // Green
  '#d62828', // Dark Red
];
