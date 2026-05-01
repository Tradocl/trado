import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export interface SharePayload {
  title: string;
  text: string;
  url: string;
  dialogTitle?: string;
}

export async function nativeShare(payload: SharePayload, onFallback: () => void): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
        dialogTitle: payload.dialogTitle ?? payload.title,
      });
    } catch {
      onFallback();
    }
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({ title: payload.title, text: payload.text, url: payload.url });
    } catch {
      onFallback();
    }
    return;
  }

  onFallback();
}
