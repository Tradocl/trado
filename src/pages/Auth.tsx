import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, signIn, signUp } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Shield, Lock, Upload, Camera, Check, X, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { TradoLogo } from "@/components/TradoLogo";
import { isNative, takeNativePhoto, dataUrlToFile } from "@/lib/native/camera";

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

const normalizeEmail = (value: FormDataEntryValue | string | null) =>
  String(value ?? "").trim().toLowerCase();

const isValidEmailAddress = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const getErrorStatus = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
};

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
  
  // Field error states
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      // Bloquear redirección si estamos en flujo de verificación post-registro
      if (showVerificationChoice || showVerificationDialog) {
        return;
      }
      const blockRedirect = sessionStorage.getItem('blockRedirectAfterSignup') === 'true';
      if (blockRedirect) {
        return;
      }

      if (user) {
        // All users (including Google) go directly to dashboard
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
          sessionStorage.removeItem('redirectAfterLogin');
          navigate(redirectUrl);
        } else {
          navigate("/dashboard");
        }
      }
    };

    checkUser();
  }, [user, navigate, showVerificationChoice, showVerificationDialog]);

  const lastSubmit = useRef(0);
  const THROTTLE_MS = 3000;

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastSubmit.current < THROTTLE_MS) {
      toast.info("Espera unos segundos antes de intentar de nuevo");
      return;
    }
    lastSubmit.current = now;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = normalizeEmail(formData.get("email"));
    const password = formData.get("password") as string;

    const { data, error } = await signIn(email, password);

    if (error) {
      if (error.message === "Email not confirmed") {
        toast.error("Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.", { duration: 6000 });
        try {
          await supabase.auth.resend({ type: 'signup', email });
          toast.info("Te reenviamos el correo de verificación.");
        } catch (e) {
          // silent
        }
      } else if (error.message === "Invalid login credentials" || error.message === "Invalid login credentials.") {
        toast.error("Credenciales incorrectas. Verifica tu correo y contraseña o regístrate si no tienes cuenta.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("¡Bienvenido a Trado!");
    }

    setLoading(false);
  };
  const handleGoogleSignIn = async () => {
    setLoading(true);
    // Redirect directly to dashboard for Google users
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    
    if (error) {
      toast.error("Error al iniciar sesión con Google: " + error.message);
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastSubmit.current < THROTTLE_MS) {
      toast.info("Espera unos segundos antes de intentar de nuevo");
      return;
    }
    lastSubmit.current = now;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = normalizeEmail(formData.get("email"));
    const password = signupPassword;
    const fullName = formData.get("fullName") as string;

    // Reset all field errors
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    if (!isValidEmailAddress(email)) {
      setEmailError("Ingresa un correo válido, por ejemplo admin@trado.cl");
      toast.error("Ingresa un correo válido, por ejemplo admin@trado.cl");
      setLoading(false);
      return;
    }

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

    // Simplified registration flow - only email, password, fullName
    const { data, error } = await signUp(email, password, fullName);

    if (error) {
      // Handle specific error messages
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes("user already registered") || errorMsg.includes("already registered") || errorMsg.includes("user_already_exists") || errorMsg.includes("already exists")) {
        setEmailError("Esta cuenta ya existe. Intenta iniciar sesión o recuperar contraseña.");
        toast.error("Esta cuenta ya existe en el sistema.", {
          description: "Si no recuerdas tu contraseña, usa 'Recuperar contraseña' en Iniciar Sesión.",
          duration: 6000
        });
      } else if (errorMsg.includes("rate limit") || errorMsg.includes("over_email_send_rate_limit") || getErrorStatus(error) === 429) {
        toast.error("Demasiados intentos de registro. Espera unos minutos antes de volver a intentarlo.", { duration: 6000 });
      } else if (errorMsg.includes("invalid") && errorMsg.includes("email")) {
        if (isValidEmailAddress(email)) {
          toast.error("No pudimos crear la cuenta con este correo. Intenta nuevamente en unos minutos.", { duration: 6000 });
          return;
        }
        setEmailError("Correo electrónico inválido");
        toast.error("El formato del correo electrónico no es válido");
      } else if (errorMsg.includes("password")) {
        setPasswordError("Error con la contraseña");
        toast.error(error.message);
      } else {
        toast.error("Error al crear cuenta: " + error.message);
      }
      sessionStorage.removeItem('blockRedirectAfterSignup');
      setLoading(false);
    } else if (data.user) {
      // Send welcome email
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: { 
            email,
            userName: fullName
          }
        });
      } catch (welcomeEmailError) {
        console.log("Welcome email sending failed:", welcomeEmailError);
      }
      
      setSignupPassword("");
      setConfirmPassword("");
      setLoading(false);
      sessionStorage.removeItem('blockRedirectAfterSignup');
      // Redirect to email verification pending page
      navigate("/verificar-email", { state: { email } });
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

  const handleDocumentNativeCapture = async () => {
    try {
      const photo = await takeNativePhoto('prompt');
      if (!photo) return;
      const file = dataUrlToFile(photo.dataUrl, `document-${Date.now()}.${photo.format}`);
      setVerificationFile(file);
      setPreviewUrl(photo.dataUrl);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      if (message !== 'User cancelled photos app') {
        toast.error("Error al capturar imagen: " + message);
      }
    }
  };

  const handleSelfieNativeCapture = async () => {
    try {
      const photo = await takeNativePhoto('camera');
      if (!photo) return;
      const file = dataUrlToFile(photo.dataUrl, `selfie-${Date.now()}.${photo.format}`);
      setVerificationSelfie(file);
      setPreviewSelfieUrl(photo.dataUrl);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      if (message !== 'User cancelled photos app') {
        toast.error("Error al capturar selfie: " + message);
      }
    }
  };

  const handleDocumentLabelClick = (e: React.MouseEvent) => {
    if (!isNative()) return;
    e.preventDefault();
    handleDocumentNativeCapture();
  };

  const handleSelfieLabelClick = (e: React.MouseEvent) => {
    if (!isNative()) return;
    e.preventDefault();
    handleSelfieNativeCapture();
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
    } catch (error: unknown) {
      console.error("Error uploading document:", error);
      toast.error("Error al subir el documento: " + getErrorMessage(error));
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
              <TradoLogo size={96} id="auth" />
            </div>
            <CardDescription className="text-base">
              Negocia seguro, sin riesgos
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
                      
                      // First, use Supabase to generate the reset link
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

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">O regístrate con</span>
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
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Registrarse con Google
                  </Button>
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
              <label
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handleDocumentLabelClick}
              >
                <div className="flex flex-col items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {verificationFile ? verificationFile.name : "Sube la parte frontal de tu carnet"}
                  </p>
                </div>
                {!isNative() && (
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                )}
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
              <label
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handleSelfieLabelClick}
              >
                <div className="flex flex-col items-center justify-center">
                  <Camera className="h-6 w-6 text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {verificationSelfie ? verificationSelfie.name : "Toma una selfie con tu carnet"}
                  </p>
                </div>
                {!isNative() && (
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleSelfieChange}
                  />
                )}
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
