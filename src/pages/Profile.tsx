import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import tradoShield from "@/assets/trado-shield.png";

const bankAccountSchema = z.object({
  bank_holder_name: z.string().trim().min(3, "Nombre debe tener al menos 3 caracteres").max(100, "Nombre muy largo"),
  bank_holder_rut: z.string().trim().min(8, "RUT inválido").max(12, "RUT inválido"),
  bank_name: z.string().min(1, "Selecciona un banco"),
  bank_account_type: z.string().min(1, "Selecciona tipo de cuenta"),
  bank_account_number: z.string().trim().min(5, "Número de cuenta inválido").max(20, "Número de cuenta muy largo"),
});

type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

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

  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bank_holder_name: "",
      bank_holder_rut: "",
      bank_name: "",
      bank_account_type: "",
      bank_account_number: "",
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
        .select("bank_holder_name, bank_holder_rut, bank_name, bank_account_type, bank_account_number")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        form.reset({
          bank_holder_name: data.bank_holder_name || "",
          bank_holder_rut: data.bank_holder_rut || "",
          bank_name: data.bank_name || "",
          bank_account_type: data.bank_account_type || "",
          bank_account_number: data.bank_account_number || "",
        });
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast.error("Error al cargar perfil");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: BankAccountFormValues) => {
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
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error saving bank details:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-2xl font-bold">Configuración de Perfil</h1>
          </div>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Datos Bancarios
            </CardTitle>
            <CardDescription>
              Guarda tus datos bancarios para autocompletar tus retiros. Esta información es opcional y solo tú puedes verla.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="bank_holder_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del titular</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan Pérez González" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bank_holder_rut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUT del titular</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banco</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona tu banco" />
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
                  control={form.control}
                  name="bank_account_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de cuenta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona tipo de cuenta" />
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

                <FormField
                  control={form.control}
                  name="bank_account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de cuenta</FormLabel>
                      <FormControl>
                        <Input placeholder="1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={saving} className="flex-1">
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Guardando..." : "Guardar Datos"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl mt-6 bg-info/5 border-info/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-info mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">¿Para qué sirven estos datos?</h4>
                <p className="text-xs text-muted-foreground">
                  Cuando solicites un retiro de tu billetera, estos datos se autocompletarán en el formulario 
                  para que sea más rápido y fácil. Puedes modificarlos en cualquier momento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
