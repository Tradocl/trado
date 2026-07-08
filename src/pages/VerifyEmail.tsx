import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as any)?.email || "";
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const checkProfileAndRedirect = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("rut, phone, address, profile_completed")
      .eq("id", userId)
      .maybeSingle();
    const complete = !!(
      data &&
      (data.profile_completed ||
        (data.rut?.trim() && data.phone?.trim() && data.address?.trim()))
    );
    if (complete) {
      navigate("/dashboard", { replace: true });
      return true;
    }
    return false;
  };

  useEffect(() => {
    // Check session immediately — don't show "verify email" if already verified
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.email_confirmed_at) {
        const redirected = await checkProfileAndRedirect(session.user.id);
        if (!redirected) setVerified(true);
      }
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.email_confirmed_at) {
        const redirected = await checkProfileAndRedirect(session.user.id);
        if (!redirected) setVerified(true);
        setChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleCheckVerified = async () => {
    setRefreshing(true);
    try {
      // Try existing session first, then attempt a refresh. When email confirmation
      // is pending there is no session yet, so refreshSession() errors — that is not
      // a failure, it just means the user hasn't clicked the link yet.
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const refreshed = await supabase.auth.refreshSession();
        session = refreshed.data.session;
      }

      if (session?.user?.email_confirmed_at) {
        const redirected = await checkProfileAndRedirect(session.user.id);
        if (!redirected) setVerified(true);
      } else {
        toast.error("Aún no detectamos la verificación. Revisa tu correo y haz clic en el enlace del mensaje.", { duration: 6000 });
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("No se encontró el correo. Intenta registrarte nuevamente.");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Correo de verificación reenviado. Revisa tu bandeja.");
    } catch (e: any) {
      toast.error("No se pudo reenviar: " + (e.message || "Intenta más tarde"));
    } finally {
      setResending(false);
    }
  };

  const handleCompleteProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/dashboard?completeProfile=1");
    } else {
      navigate("/auth", { state: { completeProfileAfterLogin: true } });
    }
  };

  const handleLater = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-light to-info p-4">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-light to-info p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <Logo height={56} />
          </div>
          {verified ? (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-xl font-semibold">¡Correo verificado!</h1>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-xl font-semibold">Verifica tu correo electrónico</h1>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {verified ? (
            <>
              <p className="text-muted-foreground text-sm">
                Tu cuenta ha sido activada correctamente. ¿Quieres completar tu perfil ahora para empezar a transaccionar de inmediato?
              </p>
              <Button onClick={handleCompleteProfile} className="w-full">
                Completar mi perfil ahora
              </Button>
              <Button onClick={handleLater} variant="outline" className="w-full">
                Más tarde, ir al inicio
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">Enviamos un enlace de verificación a:</p>
              {email && <p className="font-medium text-base break-all">{email}</p>}
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2 text-left">
                <p>📬 Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.</p>
                <p>📁 Si no lo encuentras, revisa la carpeta de <strong>spam</strong> o <strong>correo no deseado</strong>.</p>
                <p>⏱️ El enlace puede tardar unos minutos en llegar.</p>
              </div>

              <Button onClick={handleCheckVerified} disabled={refreshing} className="w-full">
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Verificando..." : "Ya verifiqué mi correo"}
              </Button>

              <Button onClick={handleResend} variant="outline" disabled={resending} className="w-full">
                <RefreshCw className={`h-4 w-4 mr-2 ${resending ? "animate-spin" : ""}`} />
                {resending ? "Reenviando..." : "Reenviar correo de verificación"}
              </Button>

              <Button onClick={() => navigate("/auth")} variant="ghost" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Iniciar Sesión
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
