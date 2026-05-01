import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

// ─── Web Push ────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function subscribeWebPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    let sub = await registration.pushManager.getSubscription();

    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
    }

    const { endpoint, keys } = sub.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, platform: 'web' },
      { onConflict: 'endpoint' }
    );
  } catch {
    // User denied permission or browser unsupported — silent fail
  }
}

async function requestWebPushPermission(userId: string): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    await subscribeWebPush(userId);
    return;
  }
  if (Notification.permission === 'denied') return;
  const permission = await Notification.requestPermission();
  if (permission === 'granted') await subscribeWebPush(userId);
}

// ─── Native Push (Capacitor / Firebase — activar cuando esté configurado) ───

const FIREBASE_CONFIGURED = false;

async function setupNativePush(_userId: string): Promise<void> {
  if (!FIREBASE_CONFIGURED) return;
  // TODO: activar con Firebase
  // const { PushNotifications } = await import('@capacitor/push-notifications');
  // await PushNotifications.requestPermissions();
  // await PushNotifications.register();
  // PushNotifications.addListener('registration', async ({ value: token }) => {
  //   await supabase.from('push_subscriptions').upsert(
  //     { user_id: _userId, endpoint: token, platform: Capacitor.getPlatform() },
  //     { onConflict: 'endpoint' }
  //   );
  // });
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export async function setupPushNotifications(userId: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await setupNativePush(userId);
  } else {
    await requestWebPushPermission(userId);
  }
}

export async function removePushListeners(): Promise<void> {
  // Nothing to tear down on web; native listeners auto-clean on sign-out
}
