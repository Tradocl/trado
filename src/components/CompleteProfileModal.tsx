import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Shield, User, MapPin, Phone } from "lucide-react";
import { validateRUT, validateChileanPhone, formatRUT } from "@/lib/validators";
import { regiones, ciudadesPorRegion } from "@/lib/chilean-locations";

interface CompleteProfileModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const CompleteProfileModal = ({ open, onClose, onComplete }: CompleteProfileModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [rutValue, setRutValue] = useState("");
  const [rutError, setRutError] = useState("");
  const [phoneValue, setPhoneValue] = useState("+56 9 ");
  const [phoneError, setPhoneError] = useState("");

  // Address fields
  const [region, setRegion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [calle, setCalle] = useState("");
  const [numero, setNumero] = useState("");
  const [depto, setDepto] = useState("");

  // Lock fields that already have a saved value (cannot be overridden)
  const [rutLocked, setRutLocked] = useState(false);
  const [phoneLocked, setPhoneLocked] = useState(false);

  // Pre-fill with existing profile data when modal opens
  useEffect(() => {
    if (!open || !user) return;

    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('rut, phone, address')
        .eq('id', user.id)
        .maybeSingle();

      if (error || !data) return;

      if (data.rut) {
        setRutValue(formatRUT(data.rut.replace(/[^0-9kK]/g, '').toUpperCase()));
        setRutLocked(true);
      }
      if (data.phone) {
        setPhoneValue(data.phone);
        setPhoneLocked(true);
      }
      if (data.address) {
        // Best-effort parse of "Calle Numero[, Depto], Ciudad, Region"
        const parts = data.address.split(',').map((p: string) => p.trim()).filter(Boolean);
        if (parts.length >= 3) {
          const regionPart = parts[parts.length - 1];
          const ciudadPart = parts[parts.length - 2];
          const street = parts[0];
          const deptoPart = parts.length >= 4 ? parts[1] : "";

          if (regiones.includes(regionPart)) setRegion(regionPart);
          if (regionPart && ciudadesPorRegion[regionPart]?.includes(ciudadPart)) {
            setCiudad(ciudadPart);
          }
          // Split "Calle Numero" — number is the last token
          const tokens = street.split(' ');
          if (tokens.length > 1) {
            const last = tokens[tokens.length - 1];
            setNumero(last);
            setCalle(tokens.slice(0, -1).join(' '));
          } else {
            setCalle(street);
          }
          setDepto(deptoPart);
        }
      }
    })();
  }, [open, user]);

  const formatPhoneInput = (value: string) => {
    let digits = value.replace(/[^\d+]/g, '');
    
    if (!digits.startsWith('+56')) {
      if (digits.startsWith('56')) {
        digits = '+' + digits;
      } else if (digits.startsWith('+')) {
        digits = '+56' + digits.slice(1).replace(/\D/g, '');
      } else {
        digits = '+56' + digits;
      }
    }
    
    const afterPrefix = digits.slice(3).replace(/\D/g, '');
    
    let formatted = '+56';
    if (afterPrefix.length > 0) {
      formatted += ' ' + afterPrefix.slice(0, 1);
    }
    if (afterPrefix.length > 1) {
      formatted += ' ' + afterPrefix.slice(1, 5);
    }
    if (afterPrefix.length > 5) {
      formatted += ' ' + afterPrefix.slice(5, 9);
    }
    
    return formatted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Reset errors
    setRutError("");
    setPhoneError("");

    // Validate RUT
    if (!validateRUT(rutValue)) {
      setRutError("RUT inválido");
      toast.error("RUT inválido. Verifica el formato y dígito verificador.");
      return;
    }

    // Validate phone
    if (!validateChileanPhone(phoneValue)) {
      setPhoneError("Teléfono inválido");
      toast.error("Teléfono inválido. Debe ser un número chileno válido.");
      return;
    }

    // Validate address
    if (!region || !ciudad || !calle || !numero) {
      toast.error("Por favor completa todos los campos de dirección obligatorios");
      return;
    }

    setLoading(true);

    try {
      // Check for duplicate RUT
      const { data: existingRut } = await supabase
        .from('profiles')
        .select('id')
        .eq('rut', rutValue)
        .neq('id', user.id)
        .maybeSingle();

      if (existingRut) {
        setRutError("Este RUT ya está registrado en otra cuenta");
        toast.error("Este RUT ya está registrado en otra cuenta.");
        setLoading(false);
        return;
      }

      // Check for duplicate phone
      const { data: existingPhone } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phoneValue)
        .neq('id', user.id)
        .maybeSingle();

      if (existingPhone) {
        setPhoneError("Este teléfono ya está registrado en otra cuenta");
        toast.error("Este teléfono ya está registrado en otra cuenta.");
        setLoading(false);
        return;
      }

      // Build address
      let address = `${calle} ${numero}`;
      if (depto) address += `, ${depto}`;
      address += `, ${ciudad}, ${region}`;

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          rut: rutValue,
          phone: phoneValue,
          address: address,
          profile_completed: true
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("¡Perfil completado exitosamente!");
      onComplete();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Error al actualizar perfil: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Completa tu perfil</DialogTitle>
              <DialogDescription>
                Para realizar transacciones necesitamos algunos datos adicionales
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* RUT Field */}
          <div className="space-y-2">
            <Label htmlFor="rut" className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              RUT
            </Label>
            <Input
              id="rut"
              type="text"
              placeholder="12.345.678-9"
              value={rutValue}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/[^0-9kK]/g, '').toUpperCase();
                if (rawValue.length <= 9) {
                  const formatted = formatRUT(rawValue);
                  setRutValue(formatted);
                  if (rutError.includes("ya está")) {
                    setRutError("");
                  }
                  if (rawValue.length >= 8) {
                    if (validateRUT(rawValue)) {
                      setRutError("");
                    } else {
                      setRutError("RUT inválido");
                    }
                  } else if (!rutError.includes("ya está")) {
                    setRutError("");
                  }
                }
              }}
              required
              className={rutError ? "border-destructive" : ""}
            />
            {rutError && <p className="text-xs text-destructive">{rutError}</p>}
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Teléfono
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phoneValue}
              onChange={(e) => {
                const formatted = formatPhoneInput(e.target.value);
                setPhoneValue(formatted);
                if (phoneError.includes("ya está")) {
                  setPhoneError("");
                }
                const digits = formatted.replace(/\D/g, '');
                if (digits.length >= 11) {
                  if (validateChileanPhone(formatted)) {
                    setPhoneError("");
                  } else {
                    setPhoneError("Teléfono inválido");
                  }
                } else if (!phoneError.includes("ya está")) {
                  setPhoneError("");
                }
              }}
              placeholder="+56 9 1234 5678"
              required
              className={phoneError ? "border-destructive" : ""}
            />
            {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
          </div>

          {/* Address Section */}
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Dirección
            </Label>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="region" className="text-xs text-muted-foreground">Región *</Label>
                <Select 
                  value={region} 
                  onValueChange={(value) => {
                    setRegion(value);
                    setCiudad("");
                  }}
                  required
                >
                  <SelectTrigger id="region" className="bg-background">
                    <SelectValue placeholder="Selecciona región" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50 max-h-60">
                    {regiones.map((reg) => (
                      <SelectItem key={reg} value={reg}>{reg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ciudad" className="text-xs text-muted-foreground">Comuna *</Label>
                <Select 
                  value={ciudad} 
                  onValueChange={setCiudad}
                  disabled={!region}
                  required
                >
                  <SelectTrigger id="ciudad" className="bg-background">
                    <SelectValue placeholder={region ? "Selecciona comuna" : "Primero selecciona región"} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50 max-h-60">
                    {region && ciudadesPorRegion[region]?.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="calle" className="text-xs text-muted-foreground">Calle *</Label>
                <Input
                  id="calle"
                  type="text"
                  placeholder="Av. Principal"
                  value={calle}
                  onChange={(e) => setCalle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="numero" className="text-xs text-muted-foreground">Número *</Label>
                <Input
                  id="numero"
                  type="text"
                  placeholder="123"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="depto" className="text-xs text-muted-foreground">Depto/Casa (opcional)</Label>
              <Input
                id="depto"
                type="text"
                placeholder="Depto 501"
                value={depto}
                onChange={(e) => setDepto(e.target.value)}
              />
            </div>
          </div>

          {/* Info message */}
          <div className="p-3 bg-info/10 rounded-lg border border-info/20">
            <p className="text-xs text-muted-foreground">
              <strong className="text-info">¿Por qué pedimos estos datos?</strong><br />
              Tu RUT y teléfono son necesarios para verificar tu identidad y proteger las transacciones. 
              La dirección es importante para entregas en persona.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Guardando..." : "Completar perfil"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
