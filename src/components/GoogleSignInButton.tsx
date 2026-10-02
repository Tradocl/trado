import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Botón oficial de Google ("Google Identity Services") que inicia sesión desde
 * trado.cl con signInWithIdToken.
 *
 * Con signInWithOAuth la ventana de Google decía "Ir a aekzrackrijuxvopqfbp.supabase.co",
 * porque el flujo pasa por el callback de Supabase; eso espanta a quien llega
 * desde un anuncio. Acá Google ve el origen trado.cl y Supabase no aparece.
 *
 * Usa el cliente "GTrado" del proyecto de Google Cloud de Trado, que tiene
 * trado.cl, www.trado.cl y localhost:8080 como orígenes de JavaScript. Supabase
 * lo acepta porque está en la lista de `external_google_client_id` (el primero
 * de esa lista es el del flujo OAuth antiguo, que sigue de respaldo).
 *
 * Respaldo: en la app nativa (Google no permite su botón dentro de WebViews) o
 * si el script de Google no carga, se muestra `fallback`, que usa el flujo antiguo.
 */
const GOOGLE_CLIENT_ID = "311993626172-gt5k43hj9mfalr99kge6gl0a3ilcmla9.apps.googleusercontent.com";
const GSI_SRC = "https://accounts.google.com/gsi/client";

type GoogleId = {
  initialize: (opts: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
};
declare global {
  interface Window { google?: { accounts: { id: GoogleId } } }
}

let cargaGsi: Promise<void> | null = null;
function cargarGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!cargaGsi) {
    cargaGsi = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = GSI_SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { cargaGsi = null; reject(new Error("gsi")); };
      document.head.appendChild(s);
      setTimeout(() => reject(new Error("gsi timeout")), 6000);
    });
  }
  return cargaGsi;
}

async function sha256Hex(texto: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function GoogleSignInButton({
  modo,
  fallback,
}: {
  modo: "signin" | "signup";
  fallback: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [usarFallback, setUsarFallback] = useState(Capacitor.isNativePlatform());

  useEffect(() => {
    if (usarFallback) return;
    let cancelado = false;

    (async () => {
      try {
        await cargarGsi();
        if (cancelado || !ref.current || !window.google) return;
        // El nonce va hasheado a Google y en claro a Supabase, que lo compara.
        const nonce = crypto.randomUUID();
        const nonceHash = await sha256Hex(nonce);
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: nonceHash,
          use_fedcm_for_button: true,
          callback: async ({ credential }: { credential: string }) => {
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: credential,
              nonce,
            });
            // Si va bien, el listener de sesión de Auth.tsx hace la redirección.
            if (error) toast.error("No pudimos iniciar sesión con Google: " + error.message);
          },
        });
        window.google.accounts.id.renderButton(ref.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: modo === "signup" ? "signup_with" : "continue_with",
          logo_alignment: "center",
          locale: "es",
          width: Math.min(ref.current.offsetWidth || 400, 400),
        });
      } catch {
        if (!cancelado) setUsarFallback(true);
      }
    })();

    return () => { cancelado = true; };
  }, [modo, usarFallback]);

  if (usarFallback) return <>{fallback}</>;
  return <div ref={ref} className="flex w-full justify-center min-h-[44px]" />;
}
