/* =============================================
   Alertes multi-plateformes.
   Alert.alert de React Native est un no-op sur web
   (react-native-web ne l'implémente pas) : toutes les
   erreurs et confirmations étaient silencieuses dans
   le navigateur. Sur web on utilise alert()/confirm().
   ============================================= */

import { Alert, Platform } from 'react-native';

export type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as any);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  // 0 ou 1 bouton : simple information
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  // 2+ boutons : confirmation — OK déclenche le bouton d'action, Annuler le bouton cancel
  const confirmBtn = buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  if (window.confirm(text)) {
    confirmBtn.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
