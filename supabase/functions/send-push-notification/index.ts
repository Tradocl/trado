import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

interface RequestBody {
  user_id?: string;
  user_ids?: string[];
  payload: PushPayload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT =
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@trado.cl";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ error: "VAPID keys are not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const body = (await req.json()) as RequestBody;

    if (!body.payload || !body.payload.title || !body.payload.body) {
      return new Response(
        JSON.stringify({
          error: "payload.title and payload.body are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const targetUserIds: string[] = body.user_ids ??
      (body.user_id ? [body.user_id] : []);

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "user_id or user_ids is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_id")
      .in("user_id", targetUserIds);

    if (error) {
      console.error("Failed to fetch subscriptions:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, message: "No subscriptions" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const notificationPayload = JSON.stringify(body.payload);
    let sent = 0;
    let failed = 0;
    const expiredIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh ?? "",
                auth: sub.auth ?? "",
              },
            },
            notificationPayload,
          );
          sent += 1;
        } catch (err: unknown) {
          failed += 1;
          const status =
            typeof err === "object" && err !== null && "statusCode" in err
              ? (err as { statusCode: number }).statusCode
              : 0;
          if (status === 404 || status === 410) {
            expiredIds.push(sub.id);
          } else {
            console.error("Push send error:", err);
          }
        }
      }),
    );

    if (expiredIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", expiredIds);
    }

    return new Response(
      JSON.stringify({ sent, failed, removed: expiredIds.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
