import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import tradoShield from "@/assets/trado-shield.png";

const contactSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "El nombre no puede exceder 100 caracteres"),
  email: z.string().trim().email("Ingresa un email válido").max(255, "El email no puede exceder 255 caracteres"),
  subject: z.string().min(1, "Selecciona un tema"),
  message: z.string().trim().min(10, "El mensaje debe tener al menos 10 caracteres").max(2000, "El mensaje no puede exceder 2000 caracteres"),
});

const Support = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Create mailto link with form data
      const subjectMap: Record<string, string> = {
        general: "Consulta General",
        transaction: "Problema con Transacción",
        wallet: "Consulta sobre Billetera",
        verification: "Verificación de Identidad",
        appeal: "Disputa o Apelación",
        other: "Otro",
      };

      const mailtoSubject = encodeURIComponent(`[Trado Soporte] ${subjectMap[formData.subject] || formData.subject}`);
      const mailtoBody = encodeURIComponent(
        `Nombre: ${formData.name}\nEmail: ${formData.email}\n\nMensaje:\n${formData.message}`
      );

      // Open mailto link
      window.location.href = `mailto:soporte@trado.cl?subject=${mailtoSubject}&body=${mailtoBody}`;

      // Show success state
      setIsSubmitted(true);
      toast.success("Se abrió tu cliente de correo. Envía el mensaje para contactarnos.");
    } catch (error) {
      toast.error("Hubo un error. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al inicio
          </Button>

          <div className="max-w-lg mx-auto">
            <Card className="border-success/20">
              <CardContent className="pt-8 text-center">
                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">¡Mensaje listo!</h2>
                <p className="text-muted-foreground mb-6">
                  Se abrió tu cliente de correo con el mensaje preparado. Solo presiona "Enviar" para contactarnos.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Si no se abrió automáticamente, puedes escribirnos directamente a{" "}
                  <a href="mailto:soporte@trado.cl" className="text-primary hover:underline font-medium">
                    soporte@trado.cl
                  </a>
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setIsSubmitted(false)}>
                    Enviar otro mensaje
                  </Button>
                  <Button onClick={() => navigate("/")}>
                    Volver al inicio
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary-light to-info py-12">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al inicio
          </Button>
          <div className="text-center text-white">
            <div className="flex justify-center mb-4">
              <img src={tradoShield} alt="Trado" className="h-16 w-16 drop-shadow-lg" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Centro de Soporte</h1>
            <p className="text-white/80 text-lg">Estamos aquí para ayudarte</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-card border-primary/10">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Email</h3>
                <a href="mailto:soporte@trado.cl" className="text-sm text-primary hover:underline">
                  soporte@trado.cl
                </a>
              </CardContent>
            </Card>

            <Card className="bg-card border-primary/10">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="h-6 w-6 text-info" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Respuesta</h3>
                <p className="text-sm text-muted-foreground">Respondemos en 24-48 hrs</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-primary/10">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="h-6 w-6 text-success" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Horario</h3>
                <p className="text-sm text-muted-foreground">Lun - Vie, 9:00 - 18:00</p>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle>Envíanos un mensaje</CardTitle>
              <CardDescription>
                Completa el formulario y te responderemos lo antes posible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      placeholder="Tu nombre"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Tema</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => setFormData({ ...formData, subject: value })}
                  >
                    <SelectTrigger className={errors.subject ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecciona un tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Consulta General</SelectItem>
                      <SelectItem value="transaction">Problema con una Transacción</SelectItem>
                      <SelectItem value="wallet">Depósitos o Retiros</SelectItem>
                      <SelectItem value="verification">Verificación de Identidad</SelectItem>
                      <SelectItem value="appeal">Disputa o Apelación</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.subject && <p className="text-sm text-destructive">{errors.subject}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensaje</Label>
                  <Textarea
                    id="message"
                    placeholder="Describe tu consulta o problema con el mayor detalle posible..."
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className={errors.message ? "border-destructive" : ""}
                  />
                  <div className="flex justify-between">
                    {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
                    <p className="text-sm text-muted-foreground ml-auto">
                      {formData.message.length}/2000
                    </p>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? "Preparando mensaje..." : "Enviar Mensaje"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  También puedes escribirnos directamente a{" "}
                  <a href="mailto:soporte@trado.cl" className="text-primary hover:underline">
                    soporte@trado.cl
                  </a>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-6">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={tradoShield} alt="Trado" className="h-5 w-5" />
            <span className="font-semibold text-foreground">Trado</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Compra y vende con total seguridad © 2024
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Support;
