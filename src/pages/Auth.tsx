import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest } from "@/contexts/GuestContext";
import { supabase, signIn, signUp } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Shield, Lock, Upload, Camera, Check, X, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { validateRUT, validateChileanPhone, formatRUT } from "@/lib/validators";
import { regiones, ciudadesPorRegion } from "@/lib/chilean-locations";
import tradoShield from "@/assets/trado-shield.png";

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
  const { enterGuestMode } = useGuest();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showVerificationChoice, setShowVerificationChoice] = useState(false);
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
  const [activeTab, setActiveTab] = useState("signin");
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
  const [referencia, setReferencia] = useState("");
  
  // Field error states
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const formatPhoneInput = (value: string) => {
    // Remove all non-digits except +
    let digits = value.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +56
    if (!digits.startsWith('+56')) {
      if (digits.startsWith('56')) {
        digits = '+' + digits;
      } else if (digits.startsWith('+')) {
        digits = '+56' + digits.slice(1).replace(/\D/g, '');
      } else {
        digits = '+56' + digits;
      }
    }
    
    // Get just the numbers after +56
    const afterPrefix = digits.slice(3).replace(/\D/g, '');
    
    // Format: +56 9 XXXX XXXX
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

  useEffect(() => {
    const checkGoogleUser = async () => {
      // Bloquear redirección si estamos en flujo de verificación post-registro
      if (showVerificationChoice || showVerificationDialog) {
        return;
      }
      const blockRedirect = sessionStorage.getItem('blockRedirectAfterSignup') === 'true';
      if (blockRedirect) {
        return;
      }

      if (user) {
        // Check if this is a Google user who just signed up (no profile data yet)
        const { data: profile } = await supabase
          .from('profiles')
          .select('rut, phone, address, email')
          .eq('id', user.id)
          .maybeSingle();

        // If Google user has no RUT/phone, they need to complete registration
        const isGoogleProvider = user.app_metadata?.provider === 'google';
        const needsRegistration = isGoogleProvider && (!profile?.rut || !profile?.phone);

        if (needsRegistration) {
          // Check if email already exists in another profile (registered via email/password)
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', user.email || '')
            .neq('id', user.id)
            .maybeSingle();

          // Save the incomplete user's ID before signing out
          const incompleteUserId = user.id;

          // Sign out the Google user first
          await supabase.auth.signOut();
          
          // Clear any localStorage remnants
          const keysToRemove = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
          keysToRemove.forEach(key => localStorage.removeItem(key));

          // Delete the incomplete user from auth.users so email is free for registration
          try {
            await supabase.functions.invoke('delete-incomplete-user', {
              body: { userId: incompleteUserId }
            });
            console.log("Deleted incomplete Google user:", incompleteUserId);
          } catch (deleteError) {
            console.error("Error deleting incomplete user:", deleteError);
            // Continue anyway - worst case user will see "already registered" error
          }
          
          if (existingProfile) {
            // Email already registered with another account
            setActiveTab("signin");
            toast.error("Este correo ya está registrado. Por favor, inicia sesión con tu contraseña.");
          } else {
            // New user - redirect to signup with error message
            setActiveTab("signup");
            toast.error("No existe una cuenta con este correo. Debes crear una cuenta primero.");
          }
          return;
        }

        // Existing user with complete profile - redirect to dashboard
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
          sessionStorage.removeItem('redirectAfterLogin');
          navigate(redirectUrl);
        } else {
          navigate("/dashboard");
        }
      }
    };

    checkGoogleUser();
  }, [user, navigate, showVerificationChoice, showVerificationDialog]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signIn(email, password);

    if (error) {
      if (error.message === "Invalid login credentials" || error.message === "Invalid login credentials.") {
        toast.error("Credenciales incorrectas. Verifica tu correo y contraseña o regístrate si no tienes cuenta.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("¡Bienvenido a Trado!");
      // Redirect is handled by useEffect when user state changes
    }

    setLoading(false);
  };
  const handleGoogleSignIn = async () => {
    setLoading(true);
    // Always redirect back to /auth so we can check if user needs registration
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth`
      }
    });
    
    if (error) {
      toast.error("Error al iniciar sesión con Google: " + error.message);
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = signupPassword;
    const fullName = formData.get("fullName") as string;
    const phone = phoneValue;
    const rut = rutValue;
    
    // Construir dirección completa
    let address = `${calle} ${numero}`;
    if (depto) address += `, ${depto}`;
    address += `, ${ciudad}, ${region}`;
    if (referencia) address += ` (${referencia})`;

    // Reset all field errors
    setRutError("");
    setPhoneError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setConfirmPasswordError("Las contraseñas no coinciden");
      toast.error("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    // Validar requisitos de contraseña
    const failedRequirements = passwordRequirements.filter(req => !req.test(password));
    if (failedRequirements.length > 0) {
      setPasswordError("No cumple con los requisitos");
      toast.error("La contraseña no cumple con los requisitos de seguridad");
      setLoading(false);
      return;
    }

    // Validar RUT
    if (!validateRUT(rut)) {
      setRutError("RUT inválido");
      toast.error("RUT inválido. Verifica el formato y dígito verificador.");
      setLoading(false);
      return;
    }

    // Validar teléfono
    if (!validateChileanPhone(phone)) {
      setPhoneError("Teléfono inválido");
      toast.error("Teléfono inválido. Debe ser un número chileno válido.");
      setLoading(false);
      return;
    }

    // Check for duplicate RUT
    const { data: existingRut } = await supabase
      .from('profiles')
      .select('id')
      .eq('rut', rut)
      .maybeSingle();

    if (existingRut) {
      setRutError("Este RUT ya existe. Intenta iniciar sesión o recuperar contraseña.");
      toast.error("Este RUT ya está registrado en otra cuenta.");
      setLoading(false);
      return;
    }

    // Check for duplicate phone
    const { data: existingPhone } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existingPhone) {
      setPhoneError("Este teléfono ya existe. Intenta iniciar sesión o recuperar contraseña.");
      toast.error("Este teléfono ya está registrado en otra cuenta.");
      setLoading(false);
      return;
    }

    // Check for duplicate email
    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingEmail) {
      setEmailError("Esta cuenta ya existe. Intenta iniciar sesión o recuperar contraseña.");
      toast.error("Este correo ya está registrado. Intenta iniciar sesión.");
      setLoading(false);
      return;
    }

    // Bloquear redirección automática tras registro hasta que el usuario decida
    sessionStorage.setItem('blockRedirectAfterSignup', 'true');

    // Normal registration flow
    const { data, error } = await signUp(email, password, fullName, phone, rut, address);

    if (error) {
      // Handle specific error messages
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes("user already registered") || errorMsg.includes("already registered") || errorMsg.includes("user_already_exists") || errorMsg.includes("already exists")) {
        setEmailError("Esta cuenta ya existe. Intenta iniciar sesión o recuperar contraseña.");
        toast.error("Esta cuenta ya existe en el sistema.", {
          description: "Si no recuerdas tu contraseña, usa 'Recuperar contraseña' en Iniciar Sesión.",
          duration: 6000
        });
      } else if (errorMsg.includes("profiles_rut_unique") || (errorMsg.includes("duplicate") && errorMsg.includes("rut"))) {
        setRutError("Este RUT ya existe. Intenta iniciar sesión o recuperar contraseña.");
        toast.error("Este RUT ya está registrado en otra cuenta.", {
          description: "Si ya tienes una cuenta, intenta iniciar sesión.",
          duration: 5000
        });
      } else if (errorMsg.includes("profiles_phone_unique") || (errorMsg.includes("duplicate") && errorMsg.includes("phone"))) {
        setPhoneError("Este teléfono ya existe. Intenta iniciar sesión o recuperar contraseña.");
        toast.error("Este teléfono ya está registrado en otra cuenta.", {
          description: "Si ya tienes una cuenta, intenta iniciar sesión.",
          duration: 5000
        });
      } else if (errorMsg.includes("email") || (errorMsg.includes("invalid") && errorMsg.includes("email"))) {
        setEmailError("Correo electrónico inválido");
        toast.error("El formato del correo electrónico no es válido");
      } else if (errorMsg.includes("password")) {
        setPasswordError("Error con la contraseña");
        toast.error(error.message);
      } else if (errorMsg.includes("phone")) {
        setPhoneError("Error con el teléfono");
        toast.error(error.message);
      } else if (errorMsg.includes("database error")) {
        // Generic database error - likely a unique constraint violation
        toast.error("Error al crear cuenta: Datos duplicados", {
          description: "Verifica que tu RUT y teléfono no estén registrados en otra cuenta.",
          duration: 5000
        });
      } else {
        toast.error("Error al crear cuenta: " + error.message);
      }
      sessionStorage.removeItem('blockRedirectAfterSignup');
      setLoading(false);
    } else if (data.user) {
      toast.success("¡Cuenta creada exitosamente!");
      setNewUserId(data.user.id);
      
      // Send welcome email
      const fullName = formData.get("fullName") as string;
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: { 
            email,
            userName: fullName
          }
        });
        console.log("Welcome email sent successfully");
      } catch (welcomeEmailError) {
        console.log("Welcome email sending failed:", welcomeEmailError);
        // Don't fail registration if email fails
      }
      
      setShowVerificationChoice(true);
      setSignupPassword("");
      setConfirmPassword("");
      setRutValue("");
      setPhoneValue("+56 9 ");
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
      sessionStorage.removeItem('blockRedirectAfterSignup');
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
    setShowVerificationChoice(false);
    navigate("/dashboard");
  };

  const handleChooseVerifyNow = () => {
    setShowVerificationChoice(false);
    setShowVerificationDialog(true);
  };

  const handleChooseVerifyLater = () => {
    sessionStorage.removeItem('blockRedirectAfterSignup');
    setShowVerificationChoice(false);
    toast.info("Puedes verificar tu cuenta más tarde desde tu perfil");
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
              <img src={tradoShield} alt="Trado" className="h-24 w-24" />
            </div>
            <CardDescription className="text-base">
              Compra y vende con seguridad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                      
                      // Trigger Supabase password reset - the auth-email-hook will send our custom email
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/reset-password`
                      });
                      
                      if (error) {
                        console.error("Password reset error:", error);
                        toast.error("Error al enviar email de recuperación: " + error.message);
                      } else {
                        toast.success("Te hemos enviado un email con instrucciones para recuperar tu contraseña", {
                          description: "Revisa tu bandeja de entrada y carpeta de spam.",
                          duration: 6000
                        });
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
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">O</span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      enterGuestMode();
                      navigate("/dashboard");
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Explorar sin cuenta
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
                      value={rutValue}
                      onChange={(e) => {
                        // Solo permitir números y K
                        const rawValue = e.target.value.replace(/[^0-9kK]/g, '').toUpperCase();
                        if (rawValue.length <= 9) {
                          const formatted = formatRUT(rawValue);
                          setRutValue(formatted);
                          // Limpiar error de duplicado al modificar
                          if (rutError.includes("ya existe")) {
                            setRutError("");
                          }
                          // Validar RUT en tiempo real
                          if (rawValue.length >= 8) {
                            if (validateRUT(rawValue)) {
                              setRutError("");
                            } else {
                              setRutError("RUT inválido");
                            }
                          } else if (!rutError.includes("ya existe")) {
                            setRutError("");
                          }
                        }
                      }}
                      required
                      className={rutError ? "border-destructive" : ""}
                    />
                    {rutError && (
                      <p className="text-xs text-destructive">{rutError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Teléfono</Label>
                    <Input
                      id="signup-phone"
                      name="phone"
                      type="tel"
                      value={phoneValue}
                      onChange={(e) => {
                        const formatted = formatPhoneInput(e.target.value);
                        setPhoneValue(formatted);
                        // Limpiar error de duplicado al modificar
                        if (phoneError.includes("ya existe")) {
                          setPhoneError("");
                        }
                        // Validar teléfono
                        const digits = formatted.replace(/\D/g, '');
                        if (digits.length >= 11) {
                          if (validateChileanPhone(formatted)) {
                            setPhoneError("");
                          } else {
                            setPhoneError("Teléfono inválido");
                          }
                        } else if (!phoneError.includes("ya existe")) {
                          setPhoneError("");
                        }
                      }}
                      placeholder="+56 9 1234 5678"
                      required
                      className={phoneError ? "border-destructive" : ""}
                    />
                    {phoneError && (
                      <p className="text-xs text-destructive">{phoneError}</p>
                    )}
                  </div>
                  
                  {/* Address fields */}
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <Label className="text-sm font-medium">Dirección</Label>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="signup-region" className="text-xs text-muted-foreground">Región *</Label>
                        <Select 
                          value={region} 
                          onValueChange={(value) => {
                            setRegion(value);
                            setCiudad(""); // Reset city when region changes
                          }}
                          required
                        >
                          <SelectTrigger id="signup-region" className="bg-background">
                            <SelectValue placeholder="Selecciona región" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50 max-h-60">
                            {regiones.map((reg) => (
                              <SelectItem key={reg} value={reg}>
                                {reg}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="signup-ciudad" className="text-xs text-muted-foreground">Comuna *</Label>
                        <Select 
                          value={ciudad} 
                          onValueChange={setCiudad}
                          disabled={!region}
                          required
                        >
                          <SelectTrigger id="signup-ciudad" className="bg-background">
                            <SelectValue placeholder={region ? "Selecciona comuna" : "Primero selecciona región"} />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50 max-h-60">
                            {region && ciudadesPorRegion[region]?.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <Label htmlFor="signup-calle" className="text-xs text-muted-foreground">Calle *</Label>
                        <Input
                          id="signup-calle"
                          type="text"
                          placeholder="Av. Principal"
                          value={calle}
                          onChange={(e) => setCalle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="signup-numero" className="text-xs text-muted-foreground">Número *</Label>
                        <Input
                          id="signup-numero"
                          type="text"
                          placeholder="123"
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="signup-depto" className="text-xs text-muted-foreground">Depto/Casa</Label>
                        <Input
                          id="signup-depto"
                          type="text"
                          placeholder="Depto 501"
                          value={depto}
                          onChange={(e) => setDepto(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="signup-referencia" className="text-xs text-muted-foreground">Referencia</Label>
                        <Input
                          id="signup-referencia"
                          type="text"
                          placeholder="Cerca del metro"
                          value={referencia}
                          onChange={(e) => setReferencia(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      required
                      className={emailError ? "border-destructive" : ""}
                      onChange={() => setEmailError("")}
                    />
                    {emailError && (
                      <p className="text-xs text-destructive">{emailError}</p>
                    )}
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
                        onChange={(e) => {
                          setSignupPassword(e.target.value);
                          setPasswordError("");
                        }}
                        required
                        className={`pr-10 ${passwordError ? "border-destructive" : ""}`}
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
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setConfirmPasswordError("");
                        }}
                        required
                        className={`pr-10 ${confirmPasswordError ? "border-destructive" : ""}`}
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
                  
                  {/* Terms and Privacy Agreement Checkbox */}
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                    <Checkbox
                      id="accept-terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="accept-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                      He leído y acepto los{" "}
                      <button
                        type="button"
                        onClick={() => navigate("/terms")}
                        className="text-primary hover:underline font-medium"
                      >
                        Términos y Condiciones
                      </button>{" "}
                      y la{" "}
                      <button
                        type="button"
                        onClick={() => navigate("/privacy")}
                        className="text-primary hover:underline font-medium"
                      >
                        Política de Privacidad
                      </button>{" "}
                      de Trado.
                    </label>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading || !acceptedTerms}>
                    <Shield className="mr-2 h-4 w-4" />
                    {loading ? "Creando cuenta..." : "Crear Cuenta"}
                  </Button>
                  
                  {!acceptedTerms && (
                    <p className="text-xs text-muted-foreground text-center">
                      Debes aceptar los términos para continuar
                    </p>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Verification Choice Dialog */}
      <Dialog open={showVerificationChoice} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-6 w-6 text-primary" />
              ¡Cuenta creada exitosamente!
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Te recomendamos verificar tu identidad para generar mayor confianza con otros usuarios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <h4 className="font-medium text-success mb-2">✓ Beneficios de verificarte</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Mayor confianza de la contraparte en tus transacciones</li>
                <li>• Tu perfil mostrará un distintivo de usuario verificado</li>
                <li>• <strong>Transacciones sin límite de monto</strong></li>
              </ul>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <h4 className="font-medium text-warning mb-2">⚠️ Sin verificación</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Máximo <strong>$100.000 CLP</strong> por transacción</li>
                <li>• Máximo <strong>$200.000 CLP</strong> en total acumulado</li>
                <li>• La otra parte verá que no estás verificado</li>
              </ul>
            </div>

            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Nota:</strong> Puedes realizar transacciones sin estar verificado, pero con límites de monto. La verificación aumenta la confianza y elimina estas restricciones.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleChooseVerifyNow}
              className="w-full"
              size="lg"
            >
              <Camera className="mr-2 h-5 w-5" />
              Verificar Ahora
            </Button>
            <Button
              variant="outline"
              onClick={handleChooseVerifyLater}
              className="w-full"
            >
              Verificar Después
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verification Document Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Verificación de Identidad
            </DialogTitle>
            <DialogDescription>
              Sube la parte frontal de tu cédula de identidad y una selfie sosteniendo el carnet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Parte Frontal de tu Carnet</Label>
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
                    {verificationFile ? verificationFile.name : "Sube la parte frontal de tu carnet"}
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
