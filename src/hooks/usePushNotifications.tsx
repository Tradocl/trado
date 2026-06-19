import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Capacitor } from "@capacitor/core";

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
  return h.includes("id-preview--") || h === "localhost" || h === "127.0.0.1";
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

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isNative) {
      // Native: check if already registered in DB
      if (!user) return;
      supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .in("platform", ["android", "ios"])
        .maybeSingle()
        .then(({ data }) => {
          setIsSubscribed(!!data);
          setPermission(data ? "granted" : "default");
        });
      return;
    }

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

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [user, isNative]);

  const subscribe = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (isNative) {
        // Native FCM subscription
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== "granted") {
          throw new Error("Permiso denegado");
        }

        await PushNotifications.register();

        await new Promise<void>((resolve, reject) => {
          PushNotifications.addListener("registration", async (token) => {
            const { error } = await supabase.from("push_subscriptions").upsert(
              {
                user_id: user.id,
                endpoint: token.value,
                p256dh: null,
                auth: null,
                platform,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "endpoint" },
            );
            if (error) reject(error);
            else {
              setPermission("granted");
              setIsSubscribed(true);
              resolve();
            }
          });

          PushNotifications.addListener("registrationError", (err) => {
            reject(new Error(err.error));
          });
        });

        // Handle foreground notifications
        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("Push received in foreground:", notification);
        });

        // Handle notification tap
        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          const url = action.notification.data?.url;
          if (url) window.location.href = url;
        });

        return;
      }

      // Web push subscription
      if (permission === "preview-blocked") {
        throw new Error(
          "Las notificaciones solo funcionan en el sitio publicado, no en el editor.",
        );
      }
      if (permission === "unsupported") {
        throw new Error("Tu navegador no soporta notificaciones push.");
      }

      const registration =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register("/sw.js"));

      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermissionState);
      if (perm !== "granted") throw new Error("Permiso denegado");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const json = subscription.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh ?? null,
          auth: json.keys?.auth ?? null,
          platform: "web",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );

      if (error) throw error;
      setIsSubscribed(true);
    } finally {
      setLoading(false);
    }
  }, [user, permission, isNative, platform]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (isNative) {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        await PushNotifications.unregister();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .in("platform", ["android", "ios"]);
        setIsSubscribed(false);
        setPermission("default");
        return;
      }

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
  }, [user, isNative]);

  return {
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    isNative,
    isAvailable: permission !== "unsupported" && permission !== "preview-blocked",
  };
}
