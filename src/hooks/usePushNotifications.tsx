import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// Public VAPID key (safe to expose in frontend by Web Push design).
const VAPID_PUBLIC_KEY =
  "BOOF8NZHwZnruoLaYXPPEujleD-_oUMyzEsyWhjzrXQ1yxd2MhoQaA3czb3LhqcCTX-GCtSp56s19vZ7a8VnDgk";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h.includes("id-preview--") ||
    h.includes("lovableproject.com") ||
    h.includes("lovable.dev")
  );
}

export type PushPermissionState =
  | "unsupported"
  | "preview-blocked"
  | "default"
  | "granted"
  | "denied";

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Detect support and current permission state
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isPreviewHost() || isInIframe()) {
      setPermission("preview-blocked");
      return;
    }

    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission as PushPermissionState);

    // Check existing subscription
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [user]);

  const subscribe = useCallback(async () => {
    if (!user) return;
    if (permission === "preview-blocked") {
      throw new Error(
        "Las notificaciones solo funcionan en el sitio publicado, no en el editor."
      );
    }
    if (permission === "unsupported") {
      throw new Error("Tu navegador no soporta notificaciones push.");
    }

    setLoading(true);
    try {
      // Register SW
      const registration =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register("/sw.js"));

      await navigator.serviceWorker.ready;

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermissionState);
      if (perm !== "granted") {
        throw new Error("Permiso denegado");
      }

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();
      const endpoint = subscription.endpoint;
      const p256dh = json.keys?.p256dh ?? null;
      const auth = json.keys?.auth ?? null;

      // Upsert in DB (endpoint is unique)
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          platform: "web",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

      if (error) throw error;
      setIsSubscribed(true);
    } finally {
      setLoading(false);
    }
  }, [user, permission]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    isAvailable:
      permission !== "unsupported" && permission !== "preview-blocked",
  };
}
