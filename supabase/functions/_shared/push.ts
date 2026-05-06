import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

async function getFcmAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const signingInput = `${encode(header)}.${encode(claim)}`;

  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");

  const binaryKey = atob(pemContents);
  const keyBuffer = new Uint8Array(binaryKey.length);
  for (let i = 0; i < binaryKey.length; i++) {
    keyBuffer[i] = binaryKey.charCodeAt(i);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const base64Sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signingInput}.${base64Sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  return data.access_token;
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (userIds.length === 0) return;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, platform")
    .in("user_id", userIds);

  if (!subscriptions || subscriptions.length === 0) return;

  const webSubs = subscriptions.filter((s) => s.platform === "web");
  const fcmSubs = subscriptions.filter(
    (s) => s.platform === "android" || s.platform === "ios",
  );

  const expiredIds: string[] = [];

  // Web push
  if (webSubs.length > 0) {
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT =
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:contacto@trado.cl";

    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      const { default: webpush } = await import(
        "https://esm.sh/web-push@3.6.7"
      );
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

      await Promise.all(
        webSubs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh ?? "", auth: sub.auth ?? "" } },
              JSON.stringify(payload),
            );
          } catch (err: unknown) {
            const status =
              typeof err === "object" && err !== null && "statusCode" in err
                ? (err as { statusCode: number }).statusCode
                : 0;
            if (status === 404 || status === 410) expiredIds.push(sub.id);
            else console.error("Web push error:", err);
          }
        }),
      );
    }
  }

  // FCM push
  if (fcmSubs.length > 0) {
    const serviceAccountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (serviceAccountRaw) {
      try {
        const serviceAccount = JSON.parse(serviceAccountRaw);
        const accessToken = await getFcmAccessToken(serviceAccount);
        const projectId = serviceAccount.project_id;

        await Promise.all(
          fcmSubs.map(async (sub) => {
            try {
              const message = {
                message: {
                  token: sub.endpoint,
                  notification: { title: payload.title, body: payload.body },
                  data: {
                    url: payload.url ?? "",
                    tag: payload.tag ?? "",
                    ...(payload.data
                      ? Object.fromEntries(
                          Object.entries(payload.data).map(([k, v]) => [
                            k,
                            String(v),
                          ]),
                        )
                      : {}),
                  },
                  android: {
                    notification: {
                      icon: "ic_launcher",
                      color: "#1a1a2e",
                      channel_id: "trado_default",
                    },
                  },
                },
              };

              const res = await fetch(
                `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(message),
                },
              );

              if (!res.ok) {
                const err = await res.json();
                if (
                  err?.error?.status === "NOT_FOUND" ||
                  err?.error?.status === "UNREGISTERED"
                ) {
                  expiredIds.push(sub.id);
                } else {
                  console.error("FCM error:", err);
                }
              }
            } catch (err) {
              console.error("FCM send error:", err);
            }
          }),
        );
      } catch (err) {
        console.error("FCM setup error:", err);
      }
    }
  }

  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }
}
