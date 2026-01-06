import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import tradoLogo from "@/assets/trado-logo.png";
import { validateRUT, formatRUT, validateChileanPhone, formatChileanPhone } from "@/lib/validators";
import { regiones, ciudadesPorRegion } from "@/lib/chilean-locations";

const CompleteGoogleProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  // Form fields
  const [rut, setRut] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [apartment, setApartment] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Validation errors
  const [rutError, setRutError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Available cities based on selected region
  const availableCities = region ? ciudadesPorRegion[region] || [] : [];

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

      // Check if user already has complete profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("rut, phone, address")
        .eq("id", user.id)
        .single();

      if (profile?.rut && profile?.phone && profile?.address) {
        // Profile already complete, redirect to dashboard
        navigate("/dashboard");
        return;
      }

      setCheckingProfile(false);
    };

    checkUserProfile();
  }, [user, authLoading, navigate]);

  const formatPhoneInput = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    
    // Format as Chilean phone
    if (digits.startsWith("56")) {
      // Already has country code
      if (digits.length <= 2) return "+56";
      if (digits.length <= 3) return `+56 ${digits.slice(2)}`;
      return `+56 ${digits.slice(2, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)}`.trim();
    } else if (digits.startsWith("9")) {
      // Mobile without country code
      return `+56 ${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5, 9)}`.trim();
    } else if (digits.length > 0) {
      return `+56 ${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5, 9)}`.trim();
    }
    return "";
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRUT(e.target.value);
    setRut(formatted);
    setRutError("");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setPhone(formatted);
    setPhoneError("");
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

    // Validate phone
    if (!validateChileanPhone(phone)) {
      setPhoneError("Teléfono inválido");
      toast.error("El teléfono debe ser un número chileno válido");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Debes aceptar los términos y condiciones");
      return;
    }

    if (!region || !city || !street || !number) {
      toast.error("Por favor completa todos los campos obligatorios");
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

      // Check for duplicate phone
      const formattedPhone = formatChileanPhone(phone);
      const { data: existingPhone } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", formattedPhone)
        .neq("id", user.id)
        .maybeSingle();

      if (existingPhone) {
        setPhoneError("Este teléfono ya está registrado");
        toast.error("Este teléfono ya está asociado a otra cuenta");
        setLoading(false);
        return;
      }

      // Build address
      const fullAddress = `${street} ${number}${apartment ? `, ${apartment}` : ""}, ${city}, ${region}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          rut: rut,
          phone: formattedPhone,
          address: fullAddress,
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

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-light to-info">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-light to-info p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <img src={tradoLogo} alt="Trado" className="h-20 w-20" />
          </div>
          <CardTitle className="text-2xl">Completa tu perfil</CardTitle>
          <CardDescription className="text-base">
            Para usar Trado necesitamos algunos datos adicionales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rut">RUT *</Label>
              <Input
                id="rut"
                placeholder="12.345.678-9"
                value={rut}
                onChange={handleRutChange}
                className={rutError ? "border-destructive" : ""}
              />
              {rutError && <p className="text-sm text-destructive">{rutError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                placeholder="+56 9 1234 5678"
                value={phone}
                onChange={handlePhoneChange}
                className={phoneError ? "border-destructive" : ""}
              />
              {phoneError && <p className="text-sm text-destructive">{phoneError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Región *</Label>
              <Select value={region} onValueChange={(value) => { setRegion(value); setCity(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una región" />
                </SelectTrigger>
                <SelectContent>
                  {regiones.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Comuna *</Label>
              <Select value={city} onValueChange={setCity} disabled={!region}>
                <SelectTrigger>
                  <SelectValue placeholder={region ? "Selecciona una comuna" : "Primero selecciona región"} />
                </SelectTrigger>
                <SelectContent>
                  {availableCities.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="street">Calle *</Label>
                <Input
                  id="street"
                  placeholder="Av. Providencia"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">N° *</Label>
                <Input
                  id="number"
                  placeholder="1234"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apartment">Depto/Casa (opcional)</Label>
              <Input
                id="apartment"
                placeholder="Depto 501"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
              />
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                Acepto los{" "}
                <a href="/terms" target="_blank" className="text-primary hover:underline">
                  Términos y Condiciones
                </a>{" "}
                y la{" "}
                <a href="/privacy" target="_blank" className="text-primary hover:underline">
                  Política de Privacidad
                </a>
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Completar registro"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteGoogleProfile;
