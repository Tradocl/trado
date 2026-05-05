import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import { LogoIcon } from "@/components/Logo";

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as any)?.email || "";
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Detect verification: either via session created by email link, or auth state change
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email_confirmed_at) {
        setVerified(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email_confirmed_at) {
        setVerified(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-light to-info p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <LogoIcon size={80} />
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
