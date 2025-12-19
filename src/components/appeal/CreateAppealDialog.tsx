import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, Scale } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CreateAppealDialogProps {
  transactionId: string;
  userId: string;
  saleType?: string;
}

export function CreateAppealDialog({ transactionId, userId, saleType }: CreateAppealDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const isService = saleType === "servicio";

  const reasons = isService
    ? [
        { value: "producto_no_llego", label: "Servicio no realizado" },
        { value: "producto_diferente", label: "Servicio distinto al acordado" },
        { value: "danos_o_fallas", label: "Trabajo deficiente" },
        { value: "incumplimiento_acuerdo", label: "Incumplimiento del acuerdo" },
        { value: "otro", label: "Otro" },
      ]
    : [
        { value: "producto_no_llego", label: "Producto nunca llegó" },
        { value: "producto_diferente", label: "Producto distinto al acordado" },
        { value: "danos_o_fallas", label: "Daños o fallas" },
        { value: "incumplimiento_acuerdo", label: "Incumplimiento del acuerdo" },
        { value: "otro", label: "Otro" },
      ];

  const handleCreate = async () => {
    if (!reason) {
      toast.error("Por favor selecciona un motivo");
      return;
    }

    if (!description.trim()) {
      toast.error("Por favor describe el problema");
      return;
    }

    setCreating(true);
    try {
      // Create deadline 48 hours from now
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 48);

      const { data: appeal, error: appealError } = await supabase
        .from("appeals")
        .insert({
          transaction_id: transactionId,
          initiator_id: userId,
          reason: reason as Database["public"]["Enums"]["appeal_reason"],
          reason_description: description.trim(),
          status: "apelacion_abierta" as Database["public"]["Enums"]["appeal_status"],
          negotiation_deadline: deadline.toISOString(),
        })
        .select()
        .single();

      if (appealError) throw appealError;

      // Update transaction appeal status
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ appeal_status: "apelacion_abierta" as Database["public"]["Enums"]["appeal_status"] })
        .eq("id", transactionId);

      if (updateError) throw updateError;

      // Get reason label for notification
      const reasonLabel = reasons.find(r => r.value === reason)?.label || reason;

      // Notify the other party
      try {
        await supabase.functions.invoke("notify-transaction-action", {
          body: {
            transactionId,
            actionType: "appeal_created",
            actorId: userId,
            additionalData: {
              reason: reasonLabel,
              appealId: appeal.id,
            },
          },
        });
      } catch (notifyError) {
        console.error("Error sending notification:", notifyError);
      }

      toast.success("Apelación creada correctamente");
      setOpen(false);
      navigate(`/appeal/${appeal.id}`);
    } catch (error: any) {
      console.error("Error creating appeal:", error);
      toast.error("Error al crear la apelación");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="transition-all duration-200 hover:scale-[1.02]">
          <AlertCircle className="h-4 w-4 mr-2" />
          Iniciar Apelación
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-destructive/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-warning/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        
        <DialogHeader className="relative animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          {/* Animated icon */}
          <div className="mx-auto mb-4 relative">
            <div className="absolute inset-0 bg-destructive/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-16 h-16 bg-gradient-to-br from-destructive to-destructive/80 rounded-full flex items-center justify-center shadow-lg animate-scale-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              <Scale className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Iniciar apelación</DialogTitle>
          <DialogDescription className="text-center">
            Describe el problema para iniciar el proceso de resolución
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 relative">
          <div 
            className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 rounded-lg animate-fade-in transition-all duration-200 hover:bg-amber-100/50 dark:hover:bg-amber-900/50"
            style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-sm space-y-2">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Antes de continuar
                </p>
                <ul className="text-amber-700 dark:text-amber-300 space-y-1.5 list-disc list-inside">
                  <li>
                    Tendrás <strong>48 horas</strong> para intentar resolver el problema directamente con la otra parte. 
                    Si no llegan a un acuerdo, automáticamente un administrador entrará como mediador.
                  </li>
                  <li>
                    También puedes solicitar la intervención de un administrador antes de que se cumplan las 48 horas si lo deseas.
                  </li>
                  <li>
                    <strong>Importante:</strong> En caso de reembolso, la comisión de la transacción se cobrará igualmente.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div 
              className="space-y-2 animate-fade-in"
              style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
            >
              <Label>¿Cuál es el motivo de la apelación?</Label>
              <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
                {reasons.map((r, index) => (
                  <div 
                    key={r.value} 
                    className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-all duration-200 cursor-pointer hover:scale-[1.01] animate-fade-in"
                    style={{ animationDelay: `${0.05 * index + 0.35}s`, animationFillMode: 'both' }}
                  >
                    <RadioGroupItem value={r.value} id={r.value} />
                    <Label htmlFor={r.value} className="font-normal cursor-pointer flex-1">
                      {r.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div 
              className="space-y-2 animate-fade-in"
              style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
            >
              <Label htmlFor="description">Describe el problema en detalle</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explica qué sucedió y por qué estás iniciando esta apelación..."
                className="min-h-[120px] transition-all duration-200 focus:ring-2 focus:ring-destructive/20"
              />
              <p className="text-xs text-muted-foreground">
                Proporciona la mayor cantidad de detalles posible. Esto ayudará a resolver el problema más rápido.
              </p>
            </div>
          </div>

          <div 
            className="flex flex-col-reverse sm:flex-row gap-3 pt-2 animate-fade-in"
            style={{ animationDelay: '0.6s', animationFillMode: 'both' }}
          >
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:flex-1 transition-all duration-200 hover:scale-[1.02]"
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!reason || !description.trim() || creating}
              className="w-full sm:flex-1 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/25"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creando...
                </>
              ) : (
                "Crear apelación"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}