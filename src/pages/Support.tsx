import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, LifeBuoy, Loader2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const MAX_SUBJECT = 120;
const MAX_MESSAGE = 4000;

const FAQ = [
  {
    q: "¿Cómo funciona el escrow de Trado?",
    a: "El comprador transfiere el monto y queda retenido, no llega al vendedor todavía. El vendedor entrega el producto o servicio, y cuando el comprador confirma la recepción se libera el pago menos la comisión. Si el comprador no confirma, los fondos se liberan solos al terminar el plazo de revisión.",
  },
  {
    q: "¿Cuánto cobra Trado?",
    a: "La comisión es 5% del monto, con un mínimo de $1.000 y un máximo de $20.000 CLP, redondeada a la decena. Por el tope, mientras más grande la operación, menor es el porcentaje real: en una transacción de $2.000.000 la comisión es $20.000, es decir un 1%.",
  },
  {
    q: "¿Cuánto tiempo tengo para revisar antes de que se libere el pago?",
    a: "Depende del tipo de venta: 72 horas en productos con envío, y 24 horas en entregas en persona y servicios. El plazo empieza cuando se marca la entrega. Si dentro de ese tiempo no confirmas ni reportas un problema, el pago se libera automáticamente al vendedor.",
  },
  {
    q: "¿Cómo retiro mi dinero?",
    a: "Desde tu billetera solicitas el retiro y un administrador transfiere a tu cuenta bancaria. Los retiros se procesan de forma manual en horario hábil. Importante: el RUT de la cuenta bancaria tiene que coincidir con el RUT de tu perfil.",
  },
  {
    q: "¿Por qué me conviene verificar mi identidad?",
    a: "La verificación es opcional, pero sin ella tienes un límite de $100.000 CLP por transacción y $200.000 acumulado. Para verificarte subes tu cédula y una selfie en la sección de verificación, y un administrador la revisa. Además tu perfil muestra el sello de verificado, lo que da más confianza a la otra parte.",
  },
  {
    q: "En mi billetera, ¿qué diferencia hay entre saldo disponible y bloqueado?",
    a: "El saldo disponible es el que puedes retirar cuando quieras. El bloqueado es el que está en custodia respaldando una operación en curso: no se puede retirar hasta que esa transacción se cierre.",
  },
  {
    q: "¿Qué hago si tengo un problema con una transacción?",
    a: "Cualquiera de las dos partes puede abrir una apelación. Se abren 48 horas para que lleguen a un acuerdo directo y, si no lo hay, un administrador de Trado revisa la evidencia de ambos lados y resuelve. Ten en cuenta que la comisión no se devuelve, ni siquiera en apelaciones o acuerdos mutuos.",
  },
  {
    q: "¿Puedo pedir una devolución?",
    a: "Sí, en productos con envío y antes de confirmar la recepción. Al procesarla se determina de quién es la responsabilidad, y eso define quién paga el envío de vuelta.",
  },
];

export default function Support() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = subject.trim();
    const m = message.trim();
    if (!s || !m) {
      toast.error("Completa el asunto y el mensaje");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-support-message", {
        body: { subject: s, message: m },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSent(true);
      setSubject("");
      setMessage("");
      toast.success("Mensaje enviado. Te respondemos a tu correo.");
    } catch (err) {
      console.error("Error enviando mensaje de soporte:", err);
      toast.error("No pudimos enviar tu mensaje. Escríbenos a contacto@trado.cl.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Helmet>
        <title>Centro de Ayuda · Trado</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="container max-w-3xl mx-auto p-3 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <LifeBuoy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Centro de Ayuda</h1>
              <p className="text-xs text-muted-foreground">
                Preguntas frecuentes y contacto directo
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Preguntas frecuentes</CardTitle>
            <CardDescription>
              Lo que más nos consultan. Si no encuentras tu respuesta, escríbenos más abajo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Escríbenos</CardTitle>
            <CardDescription>
              Te respondemos por correo dentro de 24 horas hábiles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center py-6">
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-6 w-6 text-success" />
                </div>
                <p className="font-medium mb-1">Mensaje enviado</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Te llegó una copia a tu correo. Respondemos dentro de 24 horas hábiles.
                </p>
                <Button variant="outline" onClick={() => setSent(false)}>
                  Enviar otro mensaje
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="support-subject">Asunto</Label>
                  <Input
                    id="support-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={MAX_SUBJECT}
                    placeholder="Ej: No puedo retirar mi saldo"
                    disabled={sending}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="support-message">Mensaje</Label>
                    <span className="text-xs text-muted-foreground">
                      {message.length}/{MAX_MESSAGE}
                    </span>
                  </div>
                  <Textarea
                    id="support-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={MAX_MESSAGE}
                    rows={6}
                    placeholder="Cuéntanos qué pasó. Si es sobre una transacción, incluye el código de referencia, el monto y la fecha."
                    disabled={sending}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Nunca te pediremos contraseñas ni claves bancarias.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={sending || !subject.trim() || !message.trim()}
                  className="w-full bg-gradient-to-r from-primary to-accent"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar mensaje
                    </>
                  )}
                </Button>

                {user?.email && (
                  <p className="text-xs text-muted-foreground text-center">
                    Responderemos a {user.email}
                  </p>
                )}
              </form>
            )}

            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-xs text-muted-foreground">
                También puedes escribirnos directamente a{" "}
                <a href="mailto:contacto@trado.cl" className="text-primary hover:underline">
                  contacto@trado.cl
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
