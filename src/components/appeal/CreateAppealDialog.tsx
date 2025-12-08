import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle } from "lucide-react";
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
        <Button variant="destructive">
          <AlertCircle className="h-4 w-4 mr-2" />
          Iniciar Apelación
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Iniciar apelación</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
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
            <div className="space-y-2">
              <Label>¿Cuál es el motivo de la apelación?</Label>
              <RadioGroup value={reason} onValueChange={setReason}>
                {reasons.map((r) => (
                  <div key={r.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={r.value} id={r.value} />
                    <Label htmlFor={r.value} className="font-normal cursor-pointer">
                      {r.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Describe el problema en detalle</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explica qué sucedió y por qué estás iniciando esta apelación..."
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Proporciona la mayor cantidad de detalles posible. Esto ayudará a resolver el problema más rápido.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:flex-1"
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!reason || !description.trim() || creating}
              className="w-full sm:flex-1"
            >
              {creating ? "Creando..." : "Crear apelación"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}