import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert that works on iOS, Android AND web.
 * React Native's Alert.alert() is a no-op on web.
 */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}
