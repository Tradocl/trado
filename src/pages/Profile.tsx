import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Save, Building2, User, Camera, ChevronDown, ChevronUp, Calendar, Mail, Phone, MapPin, CreditCard, Clock, Edit2, Check, X, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import tradoShield from "@/assets/trado-shield.png";

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
}

const bankAccountSchema = z.object({
  bank_holder_name: z.string().trim().min(3, "Nombre debe tener al menos 3 caracteres").max(100, "Nombre muy largo"),
  bank_holder_rut: z.string().trim().min(8, "RUT inválido").max(12, "RUT inválido"),
  bank_name: z.string().min(1, "Selecciona un banco"),
  bank_account_type: z.string().min(1, "Selecciona tipo de cuenta"),
  bank_account_number: z.string().trim().min(5, "Número de cuenta inválido").max(20, "Número de cuenta muy largo"),
});

const profileSchema = z.object({
  full_name: z.string().trim().min(3, "Nombre debe tener al menos 3 caracteres").max(100, "Nombre muy largo"),
  phone: z.string().trim().min(8, "Teléfono inválido").max(20, "Teléfono muy largo"),
  address: z.string().trim().min(5, "Dirección muy corta").max(200, "Dirección muy larga"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Mínimo 6 caracteres"),
  newPassword: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Mínimo 6 caracteres"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [bankSectionOpen, setBankSectionOpen] = useState(false);
  const [passwordSectionOpen, setPasswordSectionOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      full_name: "",
      phone: "",
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
        bankForm.reset({
          bank_holder_name: data.bank_holder_name || "",
          bank_holder_rut: data.bank_holder_rut || "",
          bank_name: data.bank_name || "",
          bank_account_type: data.bank_account_type || "",
          bank_account_number: data.bank_account_number || "",
        });
        profileForm.reset({
          full_name: data.full_name || "",
          phone: data.phone || "",
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

  const onProfileSubmit = async (values: ProfileFormValues) => {
    if (!user) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name.trim(),
          phone: values.phone.trim(),
          address: values.address.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfileData(prev => prev ? {
        ...prev,
        full_name: values.full_name.trim(),
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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={tradoShield} alt="Trado" className="h-12 w-12" />
            <h1 className="text-2xl font-bold">Mi Perfil</h1>
          </div>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
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
                <label className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="h-4 w-4 text-primary-foreground" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
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
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Juan Pérez" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                          full_name: profileData?.full_name || "",
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
                            <Input placeholder="Juan Pérez González" {...field} className="h-9" />
                          </FormControl>
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
                            <Input placeholder="12345678-9" {...field} className="h-9" />
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
                      render={({ field }) => (
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
                          <FormMessage />
                        </FormItem>
                      )}
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
      </main>
    </div>
  );
};

export default Profile;
