import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '../stores/auth-store';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Download an image through the authenticated API (rather than straight from
 * blob storage, which is cross-origin and blocked in the browser).
 *
 * On web this triggers a real file download; on native it saves to the app's
 * document directory and opens the share sheet so the user can save to Photos.
 *
 * @param path API path relative to the base URL, e.g. `/studio/shots/123/download`
 */
export async function downloadImage(path: string, filename: string): Promise<void> {
  const token = useAuthStore.getState().token;
  const url = `${API_BASE_URL}${path}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  if (Platform.OS === 'web') {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Download failed');

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
    return;
  }

  const fileUri = `${FileSystem.documentDirectory}${filename}`;
  const result = await FileSystem.downloadAsync(url, fileUri, { headers });
  if (result.status !== 200) throw new Error('Download failed');

  await Share.share({ url: result.uri });
}

/** Strip characters that are unsafe in a filename. */
export function toFileSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'image'
  );
}
