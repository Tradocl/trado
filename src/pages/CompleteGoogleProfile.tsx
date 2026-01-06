import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import tradoLogo from "@/assets/trado-logo.png";
import { validateRUT, formatRUT } from "@/lib/validators";

const CompleteGoogleProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  // Form fields - only RUT now
  const [rut, setRut] = useState("");

  // Validation errors
  const [rutError, setRutError] = useState("");

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) {
      return;
    }

    const checkUserProfile = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user already has RUT (complete profile)
      const { data: profile } = await supabase
        .from("profiles")
        .select("rut")
        .eq("id", user.id)
        .single();

      if (profile?.rut) {
        // Profile already has RUT, redirect to dashboard
        navigate("/dashboard");
        return;
      }

      setCheckingProfile(false);
    };

    checkUserProfile();
  }, [user, authLoading, navigate]);

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRUT(e.target.value);
    setRut(formatted);
    setRutError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("No hay usuario autenticado");
      navigate("/auth");
      return;
    }

    // Validate RUT
    if (!validateRUT(rut)) {
      setRutError("RUT inválido");
      toast.error("El RUT ingresado no es válido");
      return;
    }

    setLoading(true);

    try {
      // Check for duplicate RUT
      const { data: existingRut } = await supabase
        .from("profiles")
        .select("id")
        .eq("rut", rut)
        .neq("id", user.id)
        .maybeSingle();

      if (existingRut) {
        setRutError("Este RUT ya está registrado");
        toast.error("Este RUT ya está asociado a otra cuenta");
        setLoading(false);
        return;
      }

      // Update profile with RUT only
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          rut: rut,
          profile_completed: true,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Send welcome email
      try {
        await supabase.functions.invoke("send-welcome-email", {
          body: {
            email: user.email,
            userName: user.user_metadata?.full_name || user.email,
          },
        });
      } catch (emailError) {
        console.log("Welcome email failed:", emailError);
      }

      toast.success("¡Perfil completado exitosamente!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Error al guardar el perfil: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    toast.info("Puedes completar tu RUT más tarde desde tu perfil");
    navigate("/dashboard");
  };

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-light to-info">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-light to-info p-4">
      <Card className="w-full max-w-sm shadow-2xl border-0">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <img src={tradoLogo} alt="Trado" className="h-20 w-20" />
          </div>
          <CardTitle className="text-2xl">Un último paso</CardTitle>
          <CardDescription className="text-base">
            Ingresa tu RUT para poder operar en Trado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rut">RUT</Label>
              <Input
                id="rut"
                placeholder="12.345.678-9"
                value={rut}
                onChange={handleRutChange}
                className={rutError ? "border-destructive" : ""}
                autoFocus
              />
              {rutError && <p className="text-sm text-destructive">{rutError}</p>}
              <p className="text-xs text-muted-foreground">
                Tu RUT es necesario para las transacciones seguras
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button type="submit" className="w-full" disabled={loading || !rut}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Continuar"
                )}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full text-muted-foreground"
                onClick={handleSkip}
              >
                Completar después
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteGoogleProfile;
