import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RotateCcw, AlertTriangle, AlertCircle, Info, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatCLP } from "@/lib/utils";
import { translateError } from "@/lib/error-messages";

interface ReturnRequestDialogProps {
  transactionId: string;
  userId: string;
  commission: number;
  onRequestCreated: () => void;
}

// Category A - Seller fault (seller pays shipping)
const sellerFaultReasons = [
  { value: "producto_danado", label: "Producto dañado o defectuoso", description: "El producto llegó con daños físicos o no funciona" },
  { value: "no_corresponde", label: "No corresponde a la descripción", description: "El producto es diferente a lo acordado" },
  { value: "error_envio", label: "Error en el envío", description: "Recibí un producto equivocado" },
  { value: "incompleto", label: "Producto incompleto", description: "Faltan piezas o accesorios" },
];

// Category B - Buyer fault (buyer pays shipping)
const buyerFaultReasons = [
  { value: "arrepentimiento", label: "Cambié de opinión", description: "Ya no quiero el producto" },
  { value: "no_esperaba", label: "No es lo que esperaba", description: "Aunque corresponde a la descripción, no me sirve" },
];

type ResponsibilityType = "seller_fault" | "buyer_fault" | null;

export const ReturnRequestDialog = ({ transactionId, userId, commission, onRequestCreated }: ReturnRequestDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"category" | "reason" | "confirm">("category");
  const [responsibilityType, setResponsibilityType] = useState<ResponsibilityType>(null);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCategorySelect = (type: ResponsibilityType) => {
    setResponsibilityType(type);
    setReason("");
    setStep("reason");
  };

  const handleReasonSelect = (selectedReason: string) => {
    setReason(selectedReason);
    setStep("confirm");
  };

  const handleBack = () => {
    if (step === "reason") {
      setStep("category");
      setResponsibilityType(null);
    } else if (step === "confirm") {
      setStep("reason");
    }
  };

  const handleSubmit = async () => {
    if (!reason || !responsibilityType) {
      toast.error("Por favor selecciona un motivo");
      return;
    }

    setLoading(true);
    try {
      // Create return request with responsibility info
      const { error: returnError } = await supabase
        .from("return_requests")
        .insert({
          transaction_id: transactionId,
          requester_id: userId,
          reason,
          reason_description: description.trim() || null,
          status: responsibilityType === "buyer_fault" ? "accepted" : "pending",
          responsibility_type: responsibilityType,
          seller_response: responsibilityType === "buyer_fault" ? "accepted" : "pending",
          shipping_paid_by: responsibilityType === "buyer_fault" ? "buyer" : null,
        });

      if (returnError) throw returnError;

      // Update transaction state
      const { error: txError } = await supabase
        .from("transactions")
        .update({ state: "return_requested" })
        .eq("id", transactionId);

      if (txError) throw txError;

      // Notify seller about return request
      const reasonLabel = [...sellerFaultReasons, ...buyerFaultReasons].find(r => r.value === reason)?.label;
      try {
        await supabase.functions.invoke("notify-transaction-action", {
          body: {
            transactionId,
            actionType: "return_requested",
            actorId: userId,
            additionalData: { reason: reasonLabel },
          },
        });
      } catch (notifyError) {
        console.error("Error sending notification:", notifyError);
      }

      toast.success(
        responsibilityType === "buyer_fault" 
          ? "Solicitud de devolución creada - Procede a enviar el producto" 
          : "Solicitud de devolución enviada - Esperando respuesta del vendedor"
      );
      resetAndClose();
      onRequestCreated();
    } catch (error: any) {
      toast.error(translateError(error));
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setOpen(false);
    setStep("category");
    setResponsibilityType(null);
    setReason("");
    setDescription("");
  };

  const reasons = responsibilityType === "seller_fault" ? sellerFaultReasons : buyerFaultReasons;
  const selectedReasonLabel = [...sellerFaultReasons, ...buyerFaultReasons].find(r => r.value === reason)?.label;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetAndClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-2 border-warning/30 hover:bg-warning/10 transition-all duration-200 hover:scale-[1.01]">
          <RotateCcw className="mr-2 h-5 w-5 text-warning" />
          Solicitar Devolución
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden overscroll-contain">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-warning/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        
        <DialogHeader className="relative animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          {/* Animated icon */}
          <div className="mx-auto mb-4 relative">
            <div className="absolute inset-0 bg-warning/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-16 h-16 bg-gradient-to-br from-warning to-warning/80 rounded-full flex items-center justify-center shadow-lg animate-scale-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              <RotateCcw className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Solicitar Devolución</DialogTitle>
          <DialogDescription className="text-center">
            {step === "category" && "Selecciona el tipo de motivo para tu devolución"}
            {step === "reason" && "Selecciona el motivo específico"}
            {step === "confirm" && "Confirma tu solicitud de devolución"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 relative">
          {/* Step 1: Category Selection */}
          {step === "category" && (
            <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              <button
                onClick={() => handleCategorySelect("seller_fault")}
                className="w-full p-4 rounded-lg border-2 border-destructive/30 hover:border-destructive/50 hover:bg-destructive/5 transition-all duration-200 text-left hover:scale-[1.01]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-semibold text-destructive">Problema con el producto</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      El producto llegó dañado, defectuoso, no corresponde a la descripción, o está incompleto
                    </p>
                    <p className="text-xs text-destructive/80 mt-2 font-medium">
                      → El vendedor podría pagar el envío de retorno
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleCategorySelect("buyer_fault")}
                className="w-full p-4 rounded-lg border-2 border-info/30 hover:border-info/50 hover:bg-info/5 transition-all duration-200 text-left hover:scale-[1.01]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center flex-shrink-0">
                    <Info className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="font-semibold text-info">Arrepentimiento</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cambié de opinión, ya no quiero el producto, o no es lo que esperaba (aunque corresponde a la descripción)
                    </p>
                    <p className="text-xs text-info/80 mt-2 font-medium">
                      → Tú pagarás el envío de retorno
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Reason Selection */}
          {step === "reason" && (
            <div className="space-y-4 animate-fade-in" style={{ animationFillMode: 'both' }}>
              <div className={`p-3 rounded-lg transition-all duration-200 ${responsibilityType === "seller_fault" ? "bg-destructive/10 border border-destructive/20" : "bg-info/10 border border-info/20"}`}>
                <p className="text-sm font-medium">
                  {responsibilityType === "seller_fault" 
                    ? "⚠️ Problema con el producto - El vendedor evaluará tu solicitud"
                    : "ℹ️ Arrepentimiento - Tú pagarás el envío de retorno"
                  }
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Selecciona el motivo específico</Label>
                <RadioGroup value={reason} onValueChange={handleReasonSelect} className="space-y-3">
                  {reasons.map((r, index) => (
                    <div 
                      key={r.value} 
                      className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-all duration-200 cursor-pointer hover:scale-[1.01] animate-fade-in"
                      style={{ animationDelay: `${0.1 * index}s`, animationFillMode: 'both' }}
                    >
                      <RadioGroupItem value={r.value} id={r.value} className="mt-1" />
                      <Label htmlFor={r.value} className="flex-1 cursor-pointer">
                        <p className="font-medium">{r.label}</p>
                        <p className="text-sm text-muted-foreground">{r.description}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Button variant="outline" onClick={handleBack} className="w-full transition-all duration-200 hover:scale-[1.02]">
                ← Volver
              </Button>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === "confirm" && (
            <div className="space-y-4 animate-fade-in" style={{ animationFillMode: 'both' }}>
              {/* Summary */}
              <div 
                className="p-4 bg-muted/50 rounded-lg space-y-2 animate-fade-in transition-all duration-200 hover:bg-muted/70"
                style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
              >
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tipo:</span>
                  <span className="text-sm font-medium">
                    {responsibilityType === "seller_fault" ? "Problema con producto" : "Arrepentimiento"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Motivo:</span>
                  <span className="text-sm font-medium">{selectedReasonLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Costo de envío:</span>
                  <span className={`text-sm font-medium ${responsibilityType === "seller_fault" ? "text-warning" : "text-info"}`}>
                    {responsibilityType === "seller_fault" ? "Por definir" : "Tú pagas"}
                  </span>
                </div>
              </div>

              {/* Warning based on type */}
              {responsibilityType === "seller_fault" ? (
                <div 
                  className="p-4 bg-warning/10 rounded-lg border border-warning/20 animate-fade-in transition-all duration-200 hover:bg-warning/15"
                  style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-warning mb-1">El vendedor evaluará tu solicitud</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li>El vendedor puede <strong>aceptar</strong> (él paga envío)</li>
                        <li>O puede <strong>rechazar</strong> (se escala a mediación)</li>
                        <li>Un administrador decidirá si hay disputa</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  className="p-4 bg-info/10 rounded-lg border border-info/20 animate-fade-in transition-all duration-200 hover:bg-info/15"
                  style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-info/20 flex items-center justify-center flex-shrink-0">
                      <Info className="h-4 w-4 text-info" />
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-info mb-1">Proceso automático</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li>Deberás enviar el producto con seguimiento</li>
                        <li><strong>Tú pagas</strong> el costo del envío de retorno</li>
                        <li>El reembolso se procesa cuando el vendedor reciba el producto</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Commission warning - always shown */}
              <div 
                className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 animate-fade-in transition-all duration-200 hover:bg-destructive/15"
                style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-destructive mb-1">
                      Comisión de {formatCLP(commission)} será cobrada
                    </p>
                    <p className="text-muted-foreground">
                      Al solicitar una devolución, la comisión de la plataforma será descontada de tu reembolso. 
                      Recibirás el monto depositado menos la comisión.
                    </p>
                  </div>
                </div>
              </div>

              {/* Optional description */}
              <div 
                className="space-y-2 animate-fade-in"
                style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
              >
                <Label htmlFor="description">
                  Descripción adicional (opcional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe el problema con más detalle..."
                  rows={3}
                  className="transition-all duration-200 focus:ring-2 focus:ring-warning/20"
                />
              </div>

              <div 
                className="flex gap-2 animate-fade-in"
                style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
              >
                <Button variant="outline" onClick={handleBack} className="flex-1 transition-all duration-200 hover:scale-[1.02]">
                  ← Volver
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading} 
                  className={`flex-1 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${responsibilityType === "seller_fault" ? "bg-warning hover:bg-warning/90 hover:shadow-warning/25" : "bg-info hover:bg-info/90 hover:shadow-info/25"}`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Enviando...
                    </>
                  ) : (
                    "Confirmar Solicitud"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {step === "category" && (
          <DialogFooter className="animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <Button variant="outline" onClick={() => setOpen(false)} className="transition-all duration-200 hover:scale-[1.02]">
              Cancelar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};