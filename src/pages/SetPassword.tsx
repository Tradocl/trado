import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Check, X, Lock } from "lucide-react";
import { Logo } from "@/components/Logo";

const requirements = [
  { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Al menos una mayúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Al menos una minúscula", test: (p: string) => /[a-z]/.test(p) },
  { label: "Al menos un número", test: (p: string) => /[0-9]/.test(p) },
];

const SetPassword = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const allValid = useMemo(
    () => requirements.every((r) => r.test(password)) && password === confirm,
    [password, confirm]
  );

  if (!authLoading && !user) {
    navigate("/auth", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) {
      toast.error("Revisa los requisitos de la contraseña");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { password_set: true },
    });
    if (error) {
      toast.error("No se pudo guardar la contraseña: " + error.message);
      setLoading(false);
      return;
    }
    toast.success("Contraseña creada correctamente");
    const redirectUrl = sessionStorage.getItem("redirectAfterLogin");
    if (redirectUrl) {
      sessionStorage.removeItem("redirectAfterLogin");
      navigate(redirectUrl, { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <>
      <Helmet>
        <title>Crear contraseña — Trado</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-light to-info p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              <Logo height={48} />
            </div>
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" /> Crea tu contraseña
            </CardTitle>
            <CardDescription>
              Para mayor seguridad, necesitamos que crees una contraseña para tu cuenta.
              La usarás si alguna vez quieres iniciar sesión sin Google.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pwd">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="pwd"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label="Mostrar contraseña"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <ul className="space-y-1 text-sm">
                {requirements.map((r) => {
                  const ok = r.test(password);
                  return (
                    <li key={r.label} className={`flex items-center gap-2 ${ok ? "text-success" : "text-muted-foreground"}`}>
                      {ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      {r.label}
                    </li>
                  );
                })}
              </ul>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label="Mostrar contraseña"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading || !allValid}>
                {loading ? "Guardando..." : "Crear contraseña y continuar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SetPassword;
