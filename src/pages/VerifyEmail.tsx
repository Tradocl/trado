import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import { TradoLogo } from "@/components/TradoLogo";

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as any)?.email || "";
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Detect if user arrived from clicking the verification email link
    const hash = window.location.hash;
    const isFromEmail = hash.includes("type=signup") || hash.includes("type=email_confirmation");

    if (isFromEmail) {
      setVerified(true);
      return;
    }

    // Also listen for auth state change (SIGNED_IN after email confirmation)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user?.email_confirmed_at) {
            setVerified(true);
          }
        });
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

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-light to-info p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="flex justify-center">
              <TradoLogo size={80} id="verified" />
            </div>
            <div className="mx-auto w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold">¡Correo verificado!</h1>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground text-sm">
              Tu cuenta ha sido activada exitosamente. Ya puedes comenzar a comprar y vender con total seguridad.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full"
              size="lg"
            >
              Ir al inicio
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-light to-info p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <TradoLogo size={80} id="verify" />
          </div>
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Verifica tu correo electrónico</h1>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground text-sm">
            Enviamos un enlace de verificación a:
          </p>
          {email && (
            <p className="font-medium text-base break-all">{email}</p>
          )}
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2 text-left">
            <p>📬 Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.</p>
            <p>📁 Si no lo encuentras, revisa la carpeta de <strong>spam</strong> o <strong>correo no deseado</strong>.</p>
            <p>⏱️ El enlace puede tardar unos minutos en llegar.</p>
          </div>

          <Button
            onClick={handleResend}
            variant="outline"
            disabled={resending}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${resending ? "animate-spin" : ""}`} />
            {resending ? "Reenviando..." : "Reenviar correo de verificación"}
          </Button>

          <Button
            onClick={() => navigate("/auth")}
            variant="ghost"
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Iniciar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
