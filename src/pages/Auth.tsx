import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, signIn, signUp } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, Lock, Upload, Camera } from "lucide-react";
import { validateRUT, validateChileanPhone } from "@/lib/validators";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [newUserId, setNewUserId] = useState<string>("");

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("¡Bienvenido a Trado!");
      navigate("/dashboard");
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const phone = formData.get("phone") as string;
    const rut = formData.get("rut") as string;
    const address = formData.get("address") as string;

    // Validar RUT
    if (!validateRUT(rut)) {
      toast.error("RUT inválido. Verifica el formato y dígito verificador.");
      setLoading(false);
      return;
    }

    // Validar teléfono
    if (!validateChileanPhone(phone)) {
      toast.error("Teléfono inválido. Debe ser un número chileno válido.");
      setLoading(false);
      return;
    }

    const { data, error } = await signUp(email, password, fullName, phone, rut, address);

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else if (data.user) {
      toast.success("¡Cuenta creada! Ahora sube tu documento de identidad");
      setNewUserId(data.user.id);
      setShowVerificationDialog(true);
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor selecciona una imagen válida");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error("La imagen no debe superar 5MB");
        return;
      }

      setVerificationFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadVerification = async () => {
    if (!verificationFile || !newUserId) {
      toast.error("Por favor selecciona una imagen");
      return;
    }

    setUploadingDoc(true);

    try {
      // Upload to Supabase Storage
      const fileExt = verificationFile.name.split('.').pop();
      const fileName = `${newUserId}-${Date.now()}.${fileExt}`;
      const filePath = `${newUserId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(filePath, verificationFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(filePath);

      // Update profile with verification document
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          verification_document_url: publicUrl,
          verification_status: 'pending',
          verification_submitted_at: new Date().toISOString(),
        })
        .eq('id', newUserId);

      if (updateError) throw updateError;

      // Obtener datos del perfil para la notificación
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, rut, phone')
        .eq('id', newUserId)
        .single();

      // Notificar al admin
      if (profileData) {
        try {
          await supabase.functions.invoke('notify-verification-submitted', {
            body: {
              userName: profileData.full_name,
              userEmail: profileData.email,
              userRut: profileData.rut || 'No especificado',
              userPhone: profileData.phone || 'No especificado',
              documentUrl: publicUrl,
              userId: newUserId
            }
          });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
          // No mostramos error al usuario, el documento fue subido correctamente
        }
      }

      toast.success("¡Documento enviado! Tu verificación será revisada pronto");
      setShowVerificationDialog(false);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error("Error al subir el documento: " + error.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSkipVerification = () => {
    toast.info("Puedes verificar tu cuenta más tarde desde tu perfil");
    setShowVerificationDialog(false);
    navigate("/dashboard");
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-light to-info p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary rounded-2xl">
                <Shield className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Trado</CardTitle>
            <CardDescription className="text-base">
              Compra y vende con seguridad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Contraseña</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    <Lock className="mr-2 h-4 w-4" />
                    {loading ? "Ingresando..." : "Iniciar Sesión"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre Completo</Label>
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder="Juan Pérez"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-rut">RUT</Label>
                    <Input
                      id="signup-rut"
                      name="rut"
                      type="text"
                      placeholder="12.345.678-9"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Teléfono</Label>
                    <Input
                      id="signup-phone"
                      name="phone"
                      type="tel"
                      placeholder="+56 9 1234 5678"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-address">Dirección</Label>
                    <Input
                      id="signup-address"
                      name="address"
                      type="text"
                      placeholder="Av. Principal 123, Santiago"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      minLength={6}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    <Shield className="mr-2 h-4 w-4" />
                    {loading ? "Creando cuenta..." : "Crear Cuenta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Verification Document Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Verificación de Identidad
            </DialogTitle>
            <DialogDescription>
              Para mayor seguridad, sube una foto tuya sosteniendo tu cédula de identidad o carnet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {previewUrl && (
              <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {verificationFile ? verificationFile.name : "Haz clic para subir una imagen"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG hasta 5MB
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="bg-info/10 border border-info/20 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                ℹ️ Asegúrate de que tu rostro y los datos del documento sean visibles y legibles
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleSkipVerification}
                className="flex-1"
                disabled={uploadingDoc}
              >
                Verificar Después
              </Button>
              <Button
                onClick={handleUploadVerification}
                className="flex-1"
                disabled={!verificationFile || uploadingDoc}
              >
                {uploadingDoc ? "Subiendo..." : "Enviar Documento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Auth;
