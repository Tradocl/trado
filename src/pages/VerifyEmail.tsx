import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";
import tradoLogo from "@/assets/trado-logo.png";

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as any)?.email || "";
  const [resending, setResending] = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-light to-info p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <img src={tradoLogo} alt="Trado" className="h-20 w-20" />
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
