import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ReturnRequestDialogProps {
  transactionId: string;
  userId: string;
  onRequestCreated: () => void;
}

const returnReasons = [
  { value: "producto_danado", label: "Producto dañado o defectuoso", description: "El producto llegó con daños físicos o no funciona" },
  { value: "no_corresponde", label: "No corresponde a la descripción", description: "El producto es diferente a lo acordado" },
  { value: "error_envio", label: "Error en el envío", description: "Recibí un producto equivocado" },
  { value: "incompleto", label: "Producto incompleto", description: "Faltan piezas o accesorios" },
  { value: "otro", label: "Otro motivo", description: "Otro problema no listado" },
];

export const ReturnRequestDialog = ({ transactionId, userId, onRequestCreated }: ReturnRequestDialogProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Por favor selecciona un motivo");
      return;
    }

    if (reason === "otro" && !description.trim()) {
      toast.error("Por favor describe el motivo de la devolución");
      return;
    }

    setLoading(true);
    try {
      // Create return request
      const { error: returnError } = await supabase
        .from("return_requests")
        .insert({
          transaction_id: transactionId,
          requester_id: userId,
          reason,
          reason_description: description.trim() || null,
          status: "pending",
        });

      if (returnError) throw returnError;

      // Update transaction state
      const { error: txError } = await supabase
        .from("transactions")
        .update({ state: "return_requested" })
        .eq("id", transactionId);

      if (txError) throw txError;

      toast.success("Solicitud de devolución creada");
      setOpen(false);
      setReason("");
      setDescription("");
      onRequestCreated();
    } catch (error: any) {
      toast.error("Error al crear solicitud: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-2 border-warning/30 hover:bg-warning/10">
          <RotateCcw className="mr-2 h-5 w-5 text-warning" />
          Solicitar Devolución
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-warning" />
            Solicitar Devolución
          </DialogTitle>
          <DialogDescription>
            Selecciona el motivo por el cual deseas devolver el producto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-warning mb-1">Importante</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Deberás enviar el producto de vuelta con seguimiento</li>
                  <li>El costo del envío de retorno es por tu cuenta</li>
                  <li>El reembolso se procesará cuando el vendedor confirme la recepción</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Motivo de la devolución</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-3">
              {returnReasons.map((r) => (
                <div key={r.value} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={r.value} id={r.value} className="mt-1" />
                  <Label htmlFor={r.value} className="flex-1 cursor-pointer">
                    <p className="font-medium">{r.label}</p>
                    <p className="text-sm text-muted-foreground">{r.description}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Descripción adicional {reason === "otro" && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el problema con más detalle..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-warning hover:bg-warning/90">
            {loading ? "Enviando..." : "Enviar Solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
