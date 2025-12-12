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
import { Shield, Lock, Upload, Camera, Check, X, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { validateRUT, validateChileanPhone } from "@/lib/validators";
import tradoLogo from "@/assets/trado-logo.png";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: "Mínimo 8 caracteres", test: (p) => p.length >= 8 },
  { label: "Al menos una mayúscula", test: (p) => /[A-Z]/.test(p) },
  { label: "Al menos una minúscula", test: (p) => /[a-z]/.test(p) },
  { label: "Al menos un número", test: (p) => /[0-9]/.test(p) },
];

const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: "", color: "" };
  
  let score = 0;
  
  // Length checks
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character variety
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  
  // Determine strength level
  if (score <= 2) return { score: 25, label: "Débil", color: "bg-destructive" };
  if (score <= 4) return { score: 50, label: "Media", color: "bg-warning" };
  if (score <= 5) return { score: 75, label: "Fuerte", color: "bg-info" };
  return { score: 100, label: "Muy fuerte", color: "bg-success" };
};

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [verificationSelfie, setVerificationSelfie] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewSelfieUrl, setPreviewSelfieUrl] = useState<string>("");
  const [newUserId, setNewUserId] = useState<string>("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user) {
      // Check if there's a redirect URL saved
      const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
      if (redirectUrl) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectUrl);
      } else {
        navigate("/dashboard");
      }
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
      // Redirect is handled by useEffect when user state changes
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    // Check for saved redirect URL and append to redirectTo
    const savedRedirect = sessionStorage.getItem('redirectAfterLogin');
    const redirectTo = savedRedirect 
      ? `${window.location.origin}${savedRedirect}`
      : window.location.origin;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo
      }
    });
    
    if (error) {
      toast.error("Error al iniciar sesión con Google: " + error.message);
      setLoading(false);
    } else {
      // Clear the redirect after initiating OAuth
      sessionStorage.removeItem('redirectAfterLogin');
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = signupPassword;
    const fullName = formData.get("fullName") as string;
    const phone = formData.get("phone") as string;
    const rut = formData.get("rut") as string;
    const address = formData.get("address") as string;

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    // Validar requisitos de contraseña
    const failedRequirements = passwordRequirements.filter(req => !req.test(password));
    if (failedRequirements.length > 0) {
      toast.error("La contraseña no cumple con los requisitos de seguridad");
      setLoading(false);
      return;
    }

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
      setSignupPassword("");
      setConfirmPassword("");
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

  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setVerificationSelfie(file);
      setPreviewSelfieUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadVerification = async () => {
    if (!verificationFile || !verificationSelfie || !newUserId) {
      toast.error("Por favor selecciona ambas imágenes");
      return;
    }

    setUploadingDoc(true);

    try {
      // Upload document to Supabase Storage
      const fileExt = verificationFile.name.split('.').pop();
      const fileName = `${newUserId}-doc-${Date.now()}.${fileExt}`;
      const filePath = `${newUserId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(filePath, verificationFile);

      if (uploadError) throw uploadError;

      // Upload selfie to Supabase Storage
      const selfieExt = verificationSelfie.name.split('.').pop();
      const selfieName = `${newUserId}-selfie-${Date.now()}.${selfieExt}`;
      const selfiePath = `${newUserId}/${selfieName}`;

      const { error: selfieUploadError } = await supabase.storage
        .from('verification-documents')
        .upload(selfiePath, verificationSelfie);

      if (selfieUploadError) throw selfieUploadError;

      // Get public URLs
      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(filePath);

      const { data: { publicUrl: selfiePublicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(selfiePath);

      // Update profile with verification documents
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          verification_document_url: publicUrl,
          verification_selfie_url: selfiePublicUrl,
          verification_status: 'in_review',
          verification_submitted_at: new Date().toISOString(),
        })
        .eq('id', newUserId);

      if (updateError) throw updateError;

      // Notificar al admin
      try {
        await supabase.functions.invoke('notify-verification-submitted', {});
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // No mostramos error al usuario, el documento fue subido correctamente
      }

      toast.success("¡Documentos enviados! Tu verificación será revisada pronto");
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
        <Card className="w-full max-w-md shadow-2xl border-0 relative">
          <CardHeader className="text-center space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Inicio
            </Button>
            <div className="flex justify-center mb-4">
              <img src={tradoLogo} alt="Trado" className="h-32 w-auto" />
            </div>
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
                    <div className="relative">
                      <Input
                        id="signin-password"
                        name="password"
                        type={showSigninPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowSigninPassword(!showSigninPassword)}
                      >
                        {showSigninPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm"
                    onClick={async () => {
                      const email = (document.getElementById('signin-email') as HTMLInputElement)?.value;
                      if (!email) {
                        toast.error("Por favor ingresa tu email primero");
                        return;
                      }
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/auth`
                      });
                      if (error) {
                        console.error("Password reset error:", error);
                        toast.error("Error al enviar email de recuperación: " + error.message);
                      } else {
                        toast.success("Te hemos enviado un email con instrucciones para recuperar tu contraseña");
                      }
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </Button>
                  <Button type="submit" className="w-full" disabled={loading}>
                    <Lock className="mr-2 h-4 w-4" />
                    {loading ? "Ingresando..." : "Iniciar Sesión"}
                  </Button>
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">O continúa con</span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continuar con Google
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
                      defaultValue="+56 "
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
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                      >
                        {showSignupPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {signupPassword && (
                      <div className="space-y-2 mt-2">
                        {/* Password Strength Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Fortaleza:</span>
                            <span className={`text-xs font-medium ${
                              getPasswordStrength(signupPassword).score <= 25 ? "text-destructive" :
                              getPasswordStrength(signupPassword).score <= 50 ? "text-warning" :
                              getPasswordStrength(signupPassword).score <= 75 ? "text-info" : "text-success"
                            }`}>
                              {getPasswordStrength(signupPassword).label}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${getPasswordStrength(signupPassword).color}`}
                              style={{ width: `${getPasswordStrength(signupPassword).score}%` }}
                            />
                          </div>
                        </div>
                        
                        {/* Requirements List */}
                        <div className="space-y-1">
                          {passwordRequirements.map((req, index) => {
                            const passed = req.test(signupPassword);
                            return (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                {passed ? (
                                  <Check className="h-3 w-3 text-success" />
                                ) : (
                                  <X className="h-3 w-3 text-destructive" />
                                )}
                                <span className={passed ? "text-success" : "text-muted-foreground"}>
                                  {req.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirmar Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="signup-confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {confirmPassword && signupPassword && (
                      <div className="flex items-center gap-2 text-xs mt-1">
                        {confirmPassword === signupPassword ? (
                          <>
                            <Check className="h-3 w-3 text-success" />
                            <span className="text-success">Las contraseñas coinciden</span>
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 text-destructive" />
                            <span className="text-destructive">Las contraseñas no coinciden</span>
                          </>
                        )}
                      </div>
                    )}
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
              Sube tu cédula de identidad y una selfie sosteniendo el carnet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Foto de tu Carnet</Label>
              {previewUrl && (
                <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden mb-2">
                  <img 
                    src={previewUrl} 
                    alt="Preview Carnet" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {verificationFile ? verificationFile.name : "Sube tu carnet"}
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

            <div>
              <Label className="text-sm font-medium mb-2 block">Selfie con Carnet</Label>
              {previewSelfieUrl && (
                <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden mb-2">
                  <img 
                    src={previewSelfieUrl} 
                    alt="Preview Selfie" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center">
                  <Camera className="h-6 w-6 text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {verificationSelfie ? verificationSelfie.name : "Toma una selfie con tu carnet"}
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleSelfieChange}
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
                disabled={!verificationFile || !verificationSelfie || uploadingDoc}
              >
                {uploadingDoc ? "Subiendo..." : "Enviar Documentos"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Auth;
