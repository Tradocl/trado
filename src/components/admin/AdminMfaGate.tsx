import { ReactNode, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

/**
 * Segundo factor obligatorio para el panel de admin.
 *
 * Un admin puede aprobar retiros, tocar saldos y resolver disputas: con sólo la
 * contraseña, robarla equivalía a robar plata. La base exige `aal2` para todas
 * esas acciones (is_admin_mfa), así que sin pasar por acá el panel no puede
 * escribir nada. Para quien no es admin esta puerta no hace nada.
 */
type Paso = "cargando" | "listo" | "enrolar" | "verificar";

export function AdminMfaGate({ children }: { children: ReactNode }) {
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const [paso, setPaso] = useState<Paso>("cargando");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin) {
      setPaso("listo");
      return;
    }
    evaluar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, roleLoading]);

  const evaluar = async () => {
    const { data: nivel } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (nivel?.currentLevel === "aal2") {
      setPaso("listo");
      return;
    }
    const { data: factores } = await supabase.auth.mfa.listFactors();
    const verificado = factores?.totp?.find((f) => f.status === "verified");
    if (verificado) {
      setFactorId(verificado.id);
      setPaso("verificar");
      return;
    }
    // Un enrolamiento a medias bloquea el siguiente: se limpia antes.
    for (const f of factores?.all ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data: nuevo, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Trado admin ${new Date().toISOString().slice(0, 10)}`,
    });
    if (error || !nuevo) {
      toast.error("No se pudo iniciar la verificación en dos pasos: " + (error?.message ?? ""));
      return;
    }
    setFactorId(nuevo.id);
    setQr(nuevo.totp.qr_code);
    setSecret(nuevo.totp.secret);
    setPaso("enrolar");
  };

  const confirmar = async () => {
    if (!factorId || code.trim().length < 6) return;
    setEnviando(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setEnviando(false);
    if (error) {
      toast.error("Código incorrecto o vencido. Prueba con el código actual de tu app.");
      return;
    }
    setCode("");
    setPaso("listo");
    toast.success("Verificación en dos pasos confirmada");
  };

  if (paso === "listo") return <>{children}</>;

  if (paso === "cargando") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verificación en dos pasos
          </CardTitle>
          <CardDescription>
            {paso === "enrolar"
              ? "El panel de administración mueve plata. Configúrala una sola vez: escanea el código con Google Authenticator, Authy o 1Password e ingresa los 6 dígitos que te muestre."
              : "Ingresa el código de 6 dígitos de tu app de autenticación."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paso === "enrolar" && qr && (
            <div className="flex flex-col items-center gap-2">
              <img src={qr} alt="Código QR para la app de autenticación" className="h-48 w-48 bg-white p-2 rounded" />
              {secret && (
                <p className="text-xs text-muted-foreground text-center break-all">
                  ¿No puedes escanear? Ingresa esta clave a mano: <span className="font-mono">{secret}</span>
                </p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Código</Label>
            <Input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && confirmar()}
              placeholder="123456"
            />
          </div>
          <Button className="w-full" onClick={confirmar} disabled={enviando || code.length < 6}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
