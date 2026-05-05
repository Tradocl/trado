import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Save, Building2, User, Camera, ChevronDown, ChevronUp, Calendar, Mail, Phone, MapPin, CreditCard, Clock, Edit2, Check, X, Lock, Eye, EyeOff, Image, Sun, Moon, Monitor, Upload, Trash2, AlertCircle, CheckCircle2, Shield } from "lucide-react";
import { CompleteProfileModal } from "@/components/CompleteProfileModal";
import { PushNotificationCard } from "@/components/PushNotificationCard";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Logo } from "@/components/Logo";
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

const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: "", color: "" };
  
  let score = 0;
  
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  
  if (score <= 2) return { score: 25, label: "Débil", color: "bg-destructive" };
  if (score <= 4) return { score: 50, label: "Media", color: "bg-warning" };
  if (score <= 5) return { score: 75, label: "Fuerte", color: "bg-info" };
  return { score: 100, label: "Muy fuerte", color: "bg-success" };
};

interface ProfileData {
  full_name: string;
  email: string;
  phone: string | null;
  rut: string | null;
  address: string | null;
  avatar_url: string | null;
  created_at: string | null;
  is_verified: boolean | null;
  total_transactions: number | null;
  reputation_score: number | null;
  bank_holder_name: string | null;
  bank_holder_rut: string | null;
  bank_name: string | null;
  bank_account_type: string | null;
  bank_account_number: string | null;
  nickname: string | null;
  dashboard_color: string | null;
  dashboard_background_url: string | null;
  dashboard_theme: string | null;
}

const colorOptions = [
  { value: "primary", label: "Azul", gradient: "from-primary to-primary-light" },
  { value: "emerald", label: "Verde", gradient: "from-emerald-600 to-emerald-400" },
  { value: "purple", label: "Púrpura", gradient: "from-purple-600 to-purple-400" },
  { value: "orange", label: "Naranja", gradient: "from-orange-600 to-orange-400" },
  { value: "rose", label: "Rosa", gradient: "from-rose-600 to-rose-400" },
  { value: "cyan", label: "Cian", gradient: "from-cyan-600 to-cyan-400" },
  { value: "amber", label: "Ámbar", gradient: "from-amber-600 to-amber-400" },
  { value: "slate", label: "Gris", gradient: "from-slate-700 to-slate-500" },
];

const bankAccountSchema = z.object({
  bank_holder_name: z.string().trim().min(3, "Nombre debe tener al menos 3 caracteres").max(100, "Nombre muy largo"),
  bank_holder_rut: z.string().trim().min(8, "RUT inválido").max(12, "RUT inválido"),
  bank_name: z.string().min(1, "Selecciona un banco"),
  bank_account_type: z.string().min(1, "Selecciona tipo de cuenta"),
  bank_account_number: z.string().trim().min(5, "Número de cuenta inválido").max(20, "Número de cuenta muy largo"),
});

const profileSchema = z.object({
  phone: z.string().trim().min(8, "Teléfono inválido").max(20, "Teléfono muy largo"),
  address: z.string().trim().min(5, "Dirección muy corta").max(200, "Dirección muy larga"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Ingresa tu contraseña actual"),
  newPassword: z.string().min(8, "Mínimo 8 caracteres"),
  confirmPassword: z.string().min(1, "Confirma tu contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
}).refine((data) => {
  return passwordRequirements.every(req => req.test(data.newPassword));
}, {
  message: "La contraseña no cumple con los requisitos",
  path: ["newPassword"],
});

type BankAccountFormValues = z.infer<typeof bankAccountSchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

const chileanBanks = [
  "Banco de Chile",
  "Banco Santander",
  "Banco Estado",
  "Banco BCI",
  "Banco Scotiabank",
  "Banco Itaú",
  "Banco Security",
  "Banco Falabella",
  "Banco Ripley",
  "Banco Consorcio",
  "Banco Internacional",
  "Banco BICE",
  "Banco BTG Pactual",
  "Coopeuch",
  "Otro",
];

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [bankSectionOpen, setBankSectionOpen] = useState(false);
  const [passwordSectionOpen, setPasswordSectionOpen] = useState(false);
  const [dashboardSectionOpen, setDashboardSectionOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingDashboard, setSavingDashboard] = useState(false);
  const [nickname, setNickname] = useState("");
  const [selectedColor, setSelectedColor] = useState("primary");
  const [selectedTheme, setSelectedTheme] = useState("system");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);

  const isProfileComplete = profileData?.rut && profileData?.phone && profileData?.address &&
    profileData.rut.trim() !== '' && profileData.phone.trim() !== '' && profileData.address.trim() !== '';

  const bankForm = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bank_holder_name: "",
      bank_holder_rut: "",
      bank_name: "",
      bank_account_type: "",
      bank_account_number: "",
    },
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: "+56 ",
      address: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      loadProfile();
    }
  }, [user, authLoading, navigate]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfileData(data);
        setNickname(data.nickname || "");
        setSelectedColor(data.dashboard_color || "primary");
        setSelectedTheme(data.dashboard_theme || "system");
        setBackgroundUrl(data.dashboard_background_url || "");
        bankForm.reset({
          bank_holder_name: data.full_name || data.bank_holder_name || "",
          bank_holder_rut: data.rut || data.bank_holder_rut || "",
          bank_name: data.bank_name || "",
          bank_account_type: data.bank_account_type || "",
          bank_account_number: data.bank_account_number || "",
        });
        profileForm.reset({
          phone: data.phone || "+56 ",
          address: data.address || "",
        });
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast.error("Error al cargar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecciona una imagen válida");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no debe superar 2MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfileData(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success("Foto de perfil actualizada");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Error al subir imagen: " + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarNativeCapture = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const photo = await takeNativePhoto('prompt');
      if (!photo) return;
      const file = dataUrlToFile(photo.dataUrl, `avatar-${Date.now()}.${photo.format}`);
      const filePath = `${user.id}/avatar-${Date.now()}.${photo.format}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      setProfileData(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success("Foto de perfil actualizada");
    } catch (error: any) {
      if (error?.message !== 'User cancelled photos app') {
        toast.error("Error al subir imagen: " + error.message);
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarLabelClick = (e: React.MouseEvent) => {
    if (!isNative()) return;
    e.preventDefault();
    handleAvatarNativeCapture();
  };

  const handleBackgroundNativeCapture = async () => {
    if (!user) return;
    setUploadingBackground(true);
    try {
      const photo = await takeNativePhoto('prompt');
      if (!photo) return;
      const file = dataUrlToFile(photo.dataUrl, `background-${Date.now()}.${photo.format}`);
      const filePath = `${user.id}/background-${Date.now()}.${photo.format}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setBackgroundUrl(publicUrl);
      toast.success("Imagen de fondo subida");
    } catch (error: any) {
      if (error?.message !== 'User cancelled photos app') {
        toast.error("Error al subir imagen: " + error.message);
      }
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleBackgroundLabelClick = (e: React.MouseEvent) => {
    if (!isNative()) return;
    e.preventDefault();
    handleBackgroundNativeCapture();
  };

  const onProfileSubmit = async (values: ProfileFormValues) => {
    if (!user) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          phone: values.phone.trim(),
          address: values.address.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfileData(prev => prev ? {
        ...prev,
        phone: values.phone.trim(),
        address: values.address.trim(),
      } : null);

      toast.success("Perfil actualizado correctamente");
      setEditingProfile(false);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    if (!user) return;

    setSavingPassword(true);
    try {
      // First verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email || "",
        password: values.currentPassword,
      });

      if (signInError) {
        toast.error("La contraseña actual es incorrecta");
        return;
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (error) throw error;

      toast.success("Contraseña actualizada correctamente");
      passwordForm.reset();
      setPasswordSectionOpen(false);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error("Error al cambiar contraseña: " + error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const onBankSubmit = async (values: BankAccountFormValues) => {
    if (!user) return;

    // Normalize RUT for comparison
    const normalizeRut = (rut: string | null): string => {
      if (!rut) return "";
      return rut.replace(/[.\-\s]/g, "").toUpperCase();
    };

    // Security validation: Bank RUT must match profile RUT
    if (profileData?.rut && normalizeRut(values.bank_holder_rut) !== normalizeRut(profileData.rut)) {
      toast.error("Por seguridad, el RUT de la cuenta bancaria debe coincidir con el RUT de tu perfil");
      return;
    }

    if (!profileData?.rut) {
      toast.error("Debes completar tu RUT en el perfil antes de agregar datos bancarios");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          bank_holder_name: values.bank_holder_name.trim(),
          bank_holder_rut: values.bank_holder_rut.trim(),
          bank_name: values.bank_name,
          bank_account_type: values.bank_account_type,
          bank_account_number: values.bank_account_number.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Datos bancarios guardados correctamente");
      setBankSectionOpen(false);
    } catch (error: any) {
      console.error("Error saving bank details:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const onDashboardSave = async () => {
    if (!user) return;

    setSavingDashboard(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nickname: nickname.trim() || null,
          dashboard_color: selectedColor,
          dashboard_theme: selectedTheme,
          dashboard_background_url: backgroundUrl.trim() || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfileData(prev => prev ? {
        ...prev,
        nickname: nickname.trim() || null,
        dashboard_color: selectedColor,
        dashboard_theme: selectedTheme,
        dashboard_background_url: backgroundUrl.trim() || null,
      } : null);

      toast.success("Personalización guardada");
      setDashboardSectionOpen(false);
    } catch (error: any) {
      console.error("Error saving dashboard:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setSavingDashboard(false);
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecciona una imagen válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar 5MB");
      return;
    }

    setUploadingBackground(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `background-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setBackgroundUrl(publicUrl);
      toast.success("Imagen de fondo subida");
    } catch (error: any) {
      console.error("Error uploading background:", error);
      toast.error("Error al subir imagen: " + error.message);
    } finally {
      setUploadingBackground(false);
    }
  };

  const removeBackground = () => {
    setBackgroundUrl("");
  };

  const getTimeSinceRegistration = () => {
    if (!profileData?.created_at) return "Desconocido";
    
    const created = new Date(profileData.created_at);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return "Hoy";
    if (diffDays === 1) return "1 día";
    if (diffDays < 30) return `${diffDays} días`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return "1 mes";
    if (diffMonths < 12) return `${diffMonths} meses`;
    
    const diffYears = Math.floor(diffMonths / 12);
    if (diffYears === 1) return "1 año";
    return `${diffYears} años`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-muted">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo height={32} />
            <h1 className="text-lg sm:text-2xl font-bold">Mi Perfil</h1>
          </div>
          <Button variant="ghost" size="sm" className="px-2 sm:px-4" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Volver al inicio</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-2xl space-y-4 sm:space-y-6">
        {/* Profile Card */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary to-primary-light" />
          <CardContent className="relative pt-0">
            {/* Avatar */}
            <div className="flex flex-col items-center -mt-12 mb-4">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={profileData?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {profileData?.full_name ? getInitials(profileData.full_name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <label
                  className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                  onClick={handleAvatarLabelClick}
                >
                  <Camera className="h-4 w-4 text-primary-foreground" />
                  {!isNative() && (
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                  )}
                </label>
              </div>
              {uploadingAvatar && (
                <p className="text-xs text-muted-foreground mt-2">Subiendo...</p>
              )}
            </div>

            {/* Profile Info */}
            {!editingProfile ? (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold">{profileData?.full_name}</h2>
                  <div className="flex items-center justify-center gap-2 mt-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Miembro hace {getTimeSinceRegistration()}</span>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{profileData?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Teléfono</p>
                      <p className="font-medium">{profileData?.phone || "No registrado"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">RUT</p>
                      <p className="font-medium">{profileData?.rut || "No registrado"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Dirección</p>
                      <p className="font-medium">{profileData?.address || "No registrada"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Fecha de registro</p>
                      <p className="font-medium">
                        {profileData?.created_at 
                          ? new Date(profileData.created_at).toLocaleDateString("es-CL", {
                              day: "numeric",
                              month: "long",
                              year: "numeric"
                            })
                          : "Desconocida"}
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={() => setEditingProfile(true)}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Editar Perfil
                </Button>
              </div>
            ) : (
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="+56 9 1234 5678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input placeholder="Av. Principal 123, Santiago" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={savingProfile} className="flex-1">
                      <Check className="mr-2 h-4 w-4" />
                      {savingProfile ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingProfile(false);
                        profileForm.reset({
                          phone: profileData?.phone || "",
                          address: profileData?.address || "",
                        });
                      }}
                      disabled={savingProfile}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Complete Profile Card */}
        <Card className={`border-0 shadow-lg ${isProfileComplete ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isProfileComplete ? (
                  <div className="p-2 rounded-full bg-success/10">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                ) : (
                  <div className="p-2 rounded-full bg-warning/10">
                    <AlertCircle className="h-5 w-5 text-warning" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-sm">
                    {isProfileComplete ? 'Perfil completo' : 'Perfil incompleto'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isProfileComplete 
                      ? 'Tu RUT, teléfono y dirección están registrados' 
                      : 'Completa tu RUT, teléfono y dirección para operar'}
                  </p>
                </div>
              </div>
              {!isProfileComplete && (
                <Button 
                  size="sm" 
                  onClick={() => setShowCompleteProfileModal(true)}
                  className="shrink-0"
                >
                  Completar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Verification Card */}
        <Card className={`border-0 shadow-lg ${profileData?.is_verified ? 'bg-success/5 border-success/20' : 'bg-muted/50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {profileData?.is_verified ? (
                  <div className="p-2 rounded-full bg-success/10">
                    <Shield className="h-5 w-5 text-success" />
                  </div>
                ) : (
                  <div className="p-2 rounded-full bg-muted">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-sm">
                    {profileData?.is_verified ? 'Identidad verificada' : 'Verificar identidad'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {profileData?.is_verified 
                      ? 'Tu identidad ha sido verificada exitosamente' 
                      : 'Verifica tu identidad para aumentar tus límites'}
                  </p>
                </div>
              </div>
              {!profileData?.is_verified && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/verification')}
                  className="shrink-0"
                >
                  Verificar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bank Details Collapsible */}
        <Collapsible open={bankSectionOpen} onOpenChange={setBankSectionOpen}>
          <Card className="border-0 shadow-lg">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">Datos Bancarios</CardTitle>
                      <CardDescription className="text-xs">
                        Para retiros automáticos
                      </CardDescription>
                    </div>
                  </div>
                  {bankSectionOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Form {...bankForm}>
                  <form onSubmit={bankForm.handleSubmit(onBankSubmit)} className="space-y-4">
                    <FormField
                      control={bankForm.control}
                      name="bank_holder_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Nombre del titular</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan Pérez González" {...field} readOnly disabled className="h-9 bg-muted cursor-not-allowed" />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">Solo depositamos a cuentas a nombre del titular del perfil.</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={bankForm.control}
                      name="bank_holder_rut"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">RUT del titular</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="12.345.678-9" 
                              {...field}
                              readOnly
                              disabled
                              className="h-9 bg-muted cursor-not-allowed"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={bankForm.control}
                        name="bank_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Banco</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Selecciona" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {chileanBanks.map((bank) => (
                                  <SelectItem key={bank} value={bank}>
                                    {bank}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={bankForm.control}
                        name="bank_account_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Tipo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Selecciona" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Cuenta Corriente">Cuenta Corriente</SelectItem>
                                <SelectItem value="Cuenta Vista">Cuenta Vista</SelectItem>
                                <SelectItem value="Cuenta de Ahorro">Cuenta de Ahorro</SelectItem>
                                <SelectItem value="Cuenta RUT">Cuenta RUT</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={bankForm.control}
                      name="bank_account_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Número de cuenta</FormLabel>
                          <FormControl>
                            <Input placeholder="1234567890" {...field} className="h-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={saving} className="w-full" size="sm">
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Guardando..." : "Guardar Datos Bancarios"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Dashboard Customization Collapsible */}
        <Collapsible open={dashboardSectionOpen} onOpenChange={setDashboardSectionOpen}>
          <Card className="border-0 shadow-lg">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Edit2 className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">Personalizar panel de control</CardTitle>
                      <CardDescription className="text-xs">
                        Apodo, color, fondo y tema
                      </CardDescription>
                    </div>
                  </div>
                  {dashboardSectionOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-5">
                {/* Nickname */}
                <div className="space-y-2">
                  <Label htmlFor="nickname">Apodo (opcional)</Label>
                  <Input
                    id="nickname"
                    placeholder="Ej: Juan, JuanDev, etc."
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={30}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    Se mostrará en lugar de tu nombre completo en el dashboard
                  </p>
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <Label>Color de la tarjeta</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setSelectedColor(color.value)}
                        className={`relative h-10 rounded-lg bg-gradient-to-br ${color.gradient} transition-all duration-200 ${
                          selectedColor === color.value
                            ? "ring-2 ring-offset-2 ring-foreground scale-105"
                            : "hover:scale-105"
                        }`}
                        title={color.label}
                      >
                        {selectedColor === color.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 bg-white rounded-full" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme */}
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => { setSelectedTheme("light"); setTheme("light"); }}
                      className={`flex items-center justify-center gap-2 h-10 rounded-lg border transition-all duration-200 ${
                        selectedTheme === "light"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Sun className="h-4 w-4" />
                      <span className="text-sm">Claro</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedTheme("dark"); setTheme("dark"); }}
                      className={`flex items-center justify-center gap-2 h-10 rounded-lg border transition-all duration-200 ${
                        selectedTheme === "dark"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Moon className="h-4 w-4" />
                      <span className="text-sm">Oscuro</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedTheme("system"); setTheme("system"); }}
                      className={`flex items-center justify-center gap-2 h-10 rounded-lg border transition-all duration-200 ${
                        selectedTheme === "system"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Monitor className="h-4 w-4" />
                      <span className="text-sm">Sistema</span>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Elige entre modo claro, oscuro o seguir tu configuración del sistema
                  </p>
                </div>

                {/* Background Image */}
                <div className="space-y-2">
                  <Label>Imagen de fondo (opcional)</Label>
                  {backgroundUrl ? (
                    <div className="relative">
                      <div 
                        className="h-24 rounded-lg bg-cover bg-center border border-border"
                        style={{ backgroundImage: `url(${backgroundUrl})` }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeBackground}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  ) : (
                    <label
                      className="flex items-center justify-center h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors"
                      onClick={handleBackgroundLabelClick}
                    >
                      {uploadingBackground ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span className="text-sm">Subiendo...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Upload className="h-6 w-6" />
                          <span className="text-xs">Subir imagen (máx 5MB)</span>
                        </div>
                      )}
                      {!isNative() && (
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleBackgroundUpload}
                          disabled={uploadingBackground}
                        />
                      )}
                    </label>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Se mostrará como fondo de tu tarjeta de bienvenida
                  </p>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label>Vista previa</Label>
                  <div 
                    className={`relative p-3 rounded-lg overflow-hidden ${
                      !backgroundUrl ? `bg-gradient-to-br ${colorOptions.find(c => c.value === selectedColor)?.gradient || colorOptions[0].gradient}` : ''
                    } text-white`}
                    style={backgroundUrl ? { 
                      backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${backgroundUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    } : undefined}
                  >
                    <p className="font-semibold text-sm">
                      ¡Hola, {nickname.trim() || profileData?.full_name || "Usuario"}!
                    </p>
                    <p className="text-xs opacity-80">Bienvenido a tu panel de control seguro</p>
                  </div>
                </div>

                <Button onClick={onDashboardSave} disabled={savingDashboard} className="w-full" size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  {savingDashboard ? "Guardando..." : "Guardar Personalización"}
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Push Notifications Card */}
        <PushNotificationCard />

        {/* Password Change Collapsible */}
        <Collapsible open={passwordSectionOpen} onOpenChange={setPasswordSectionOpen}>
          <Card className="border-0 shadow-lg">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">Cambiar Contraseña</CardTitle>
                      <CardDescription className="text-xs">
                        Actualiza tu contraseña de acceso
                      </CardDescription>
                    </div>
                  </div>
                  {passwordSectionOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Contraseña actual</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showCurrentPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                {...field} 
                                className="h-9 pr-10" 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-9 w-9 px-2"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => {
                        const newPasswordValue = field.value || "";
                        const strength = getPasswordStrength(newPasswordValue);
                        return (
                          <FormItem>
                            <FormLabel className="text-sm">Nueva contraseña</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showNewPassword ? "text" : "password"} 
                                  placeholder="••••••••" 
                                  {...field} 
                                  className="h-9 pr-10" 
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-9 w-9 px-2"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            {newPasswordValue && (
                              <div className="space-y-2 mt-2">
                                {/* Password Strength Bar */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Fortaleza:</span>
                                    <span className={`text-xs font-medium ${
                                      strength.score <= 25 ? "text-destructive" :
                                      strength.score <= 50 ? "text-warning" :
                                      strength.score <= 75 ? "text-info" : "text-success"
                                    }`}>
                                      {strength.label}
                                    </span>
                                  </div>
                                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-300 ${strength.color}`}
                                      style={{ width: `${strength.score}%` }}
                                    />
                                  </div>
                                </div>
                                
                                {/* Requirements List */}
                                <div className="space-y-1">
                                  {passwordRequirements.map((req, index) => {
                                    const passed = req.test(newPasswordValue);
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
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Confirmar nueva contraseña</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showConfirmPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                {...field} 
                                className="h-9 pr-10" 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-9 w-9 px-2"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={savingPassword} className="w-full" size="sm">
                      <Lock className="mr-2 h-4 w-4" />
                      {savingPassword ? "Actualizando..." : "Cambiar Contraseña"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Info Card */}
        <Card className="border-0 shadow-md bg-info/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-info mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Los datos bancarios se usarán para autocompletar tus solicitudes de retiro. 
                Son opcionales y solo tú puedes verlos.
              </p>
            </div>
          </CardContent>
        </Card>

        <CompleteProfileModal
          open={showCompleteProfileModal}
          onClose={() => setShowCompleteProfileModal(false)}
          onComplete={() => {
            setShowCompleteProfileModal(false);
            loadProfile();
          }}
        />
      </main>
    </div>
  );
};

export default Profile;
