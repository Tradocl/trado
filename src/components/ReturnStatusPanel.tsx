import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Package, Truck, Check, AlertTriangle, Info, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ReturnSellerResponsePanel } from "@/components/return/ReturnSellerResponsePanel";
import { ReturnMediationPanel } from "@/components/return/ReturnMediationPanel";

interface ReturnRequest {
  id: string;
  transaction_id: string;
  requester_id: string;
  reason: string;
  reason_description: string | null;
  tracking_number: string | null;
  carrier: string | null;
  status: string;
  created_at: string;
  shipped_at: string | null;
  received_at: string | null;
  responsibility_type: string | null;
  seller_response: string | null;
  shipping_paid_by: string | null;
  admin_notes: string | null;
}

interface ReturnStatusPanelProps {
  transactionId: string;
  isBuyer: boolean;
  isSeller: boolean;
  transactionAmount: number;
  onStatusChange: () => void;
}

const reasonLabels: Record<string, string> = {
  producto_danado: "Producto dañado o defectuoso",
  no_corresponde: "No corresponde a la descripción",
  error_envio: "Error en el envío",
  incompleto: "Producto incompleto",
  arrepentimiento: "Cambié de opinión",
  no_esperaba: "No es lo que esperaba",
};

const carriers = [
  { value: "starken", label: "Starken" },
  { value: "chilexpress", label: "Chilexpress" },
  { value: "correos_chile", label: "Correos de Chile" },
  { value: "blue_express", label: "Blue Express" },
  { value: "otro", label: "Otro" },
];

export const ReturnStatusPanel = ({
  transactionId,
  isBuyer,
  isSeller,
  transactionAmount,
  onStatusChange,
}: ReturnStatusPanelProps) => {
  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [customCarrier, setCustomCarrier] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadReturnRequest();
  }, [transactionId]);

  const loadReturnRequest = async () => {
    try {
      const { data, error } = await supabase
        .from("return_requests")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setReturnRequest(data);
    } catch (error: any) {
      console.error("Error loading return request:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleConfirmShipment = async () => {
    if (!trackingNumber.trim() || !carrier) {
      toast.error("Por favor ingresa el número de seguimiento y el courier");
      return;
    }
    
    if (carrier === "otro" && !customCarrier.trim()) {
      toast.error("Por favor ingresa el nombre del courier");
      return;
    }

    const finalCarrier = carrier === "otro" ? customCarrier.trim() : carrier;

    setLoading(true);
    try {
      const { error: returnError } = await supabase
        .from("return_requests")
        .update({
          tracking_number: trackingNumber.trim(),
          carrier: finalCarrier,
          status: "shipped",
          shipped_at: new Date().toISOString(),
        })
        .eq("id", returnRequest?.id);

      if (returnError) throw returnError;

      const { error: txError } = await supabase
        .from("transactions")
        .update({ state: "return_in_progress" })
        .eq("id", transactionId);

      if (txError) throw txError;

      toast.success("Envío de retorno confirmado");
      onStatusChange();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!returnRequest) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-return-refund", {
        body: {
          returnRequestId: returnRequest.id,
          transactionId,
          userId: (await supabase.auth.getUser()).data.user?.id,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Error al procesar el reembolso");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("Devolución completada - Reembolso procesado");
      onStatusChange();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Card className="border-2 border-warning/30">
        <CardContent className="p-6">
          <div className="animate-pulse flex items-center gap-3">
            <div className="h-8 w-8 bg-muted rounded-full"></div>
            <div className="h-4 bg-muted rounded w-48"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!returnRequest) return null;

  // Show seller response panel if pending and seller_fault
  if (
    isSeller && 
    returnRequest.responsibility_type === "seller_fault" && 
    returnRequest.seller_response === "pending" &&
    returnRequest.status === "pending"
  ) {
    return (
      <ReturnSellerResponsePanel 
        returnRequest={returnRequest} 
        onResponse={() => {
          loadReturnRequest();
          onStatusChange();
        }} 
      />
    );
  }

  // Show mediation panel if disputed
  if (returnRequest.status === "disputed") {
    return (
      <ReturnMediationPanel 
        returnRequest={returnRequest}
        isBuyer={isBuyer}
        isSeller={isSeller}
      />
    );
  }

  // Show waiting for seller response (buyer view)
  if (
    isBuyer && 
    returnRequest.responsibility_type === "seller_fault" && 
    returnRequest.seller_response === "pending" &&
    returnRequest.status === "pending"
  ) {
    return (
      <Card className="border-2 border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <RotateCcw className="h-5 w-5 text-warning" />
            Solicitud de Devolución Enviada
            <Badge variant="outline" className="ml-auto">Esperando respuesta</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-background/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Motivo:</p>
            <p className="font-medium">{reasonLabels[returnRequest.reason] || returnRequest.reason}</p>
          </div>
          <div className="p-4 bg-warning/10 rounded-lg border border-warning/20 text-center">
            <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-2" />
            <p className="font-medium">Esperando respuesta del vendedor</p>
            <p className="text-sm text-muted-foreground">
              El vendedor debe aceptar o rechazar tu solicitud
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Normal return flow (accepted or buyer_fault)
  const canProceedWithShipping = 
    returnRequest.status === "accepted" || 
    (returnRequest.responsibility_type === "buyer_fault" && returnRequest.status !== "shipped" && returnRequest.status !== "completed");

  return (
    <Card className="border-2 border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <RotateCcw className="h-5 w-5 text-warning" />
          Devolución en Proceso
          <Badge variant="outline" className="ml-auto">
            {returnRequest.status === "pending" && "Pendiente"}
            {returnRequest.status === "accepted" && "Aceptada"}
            {returnRequest.status === "shipped" && "En camino"}
            {returnRequest.status === "completed" && "Completada"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reason */}
        <div className="p-3 bg-background/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Motivo:</p>
          <p className="font-medium">{reasonLabels[returnRequest.reason] || returnRequest.reason}</p>
          {returnRequest.reason_description && (
            <p className="text-sm text-muted-foreground mt-1">{returnRequest.reason_description}</p>
          )}
        </div>

        {/* Shipping cost info */}
        {returnRequest.shipping_paid_by && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            returnRequest.shipping_paid_by === "buyer" 
              ? "bg-info/10 border border-info/20" 
              : "bg-warning/10 border border-warning/20"
          }`}>
            <DollarSign className={`h-5 w-5 ${returnRequest.shipping_paid_by === "buyer" ? "text-info" : "text-warning"}`} />
            <p className="text-sm">
              <strong>Costo de envío:</strong>{" "}
              {returnRequest.shipping_paid_by === "buyer" ? "Comprador paga" : "Vendedor paga"}
            </p>
          </div>
        )}

        {/* Progress Steps */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              returnRequest.status !== "pending" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"
            }`}>
              <Package className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Solicitud creada</p>
              <p className="text-xs text-muted-foreground">
                {new Date(returnRequest.created_at).toLocaleDateString("es-CL")}
              </p>
            </div>
            <Check className={`h-5 w-5 text-success`} />
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              ["shipped", "completed"].includes(returnRequest.status) ? "bg-success text-success-foreground" : "bg-muted"
            }`}>
              <Truck className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Producto enviado</p>
              {returnRequest.shipped_at && (
                <p className="text-xs text-muted-foreground">
                  {new Date(returnRequest.shipped_at).toLocaleDateString("es-CL")}
                </p>
              )}
            </div>
            {["shipped", "completed"].includes(returnRequest.status) && (
              <Check className="h-5 w-5 text-success" />
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              returnRequest.status === "completed" ? "bg-success text-success-foreground" : "bg-muted"
            }`}>
              <Check className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Reembolso procesado</p>
              {returnRequest.received_at && (
                <p className="text-xs text-muted-foreground">
                  {new Date(returnRequest.received_at).toLocaleDateString("es-CL")}
                </p>
              )}
            </div>
            {returnRequest.status === "completed" && (
              <Check className="h-5 w-5 text-success" />
            )}
          </div>
        </div>

        {/* Tracking Info */}
        {returnRequest.tracking_number && (
          <div className="p-3 bg-info/10 rounded-lg border border-info/20">
            <p className="text-sm text-muted-foreground mb-1">Número de seguimiento:</p>
            <p className="font-mono font-bold">{returnRequest.tracking_number}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Courier: {carriers.find(c => c.value === returnRequest.carrier)?.label || returnRequest.carrier}
            </p>
          </div>
        )}

        {/* Buyer: Add tracking info */}
        {isBuyer && canProceedWithShipping && !returnRequest.tracking_number && (
          <div className="space-y-3 p-4 bg-background/50 rounded-lg border">
            <div className="flex items-start gap-2 mb-3">
              {returnRequest.shipping_paid_by === "buyer" ? (
                <Info className="h-5 w-5 text-info shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              )}
              <p className="text-sm text-muted-foreground">
                Envía el producto al vendedor usando un courier con seguimiento.
                {returnRequest.shipping_paid_by === "buyer" 
                  ? " Recuerda que tú pagas el costo del envío."
                  : " El vendedor ha aceptado pagar el costo del envío."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tracking">Número de seguimiento *</Label>
              <Input
                id="tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Ej: ABC123456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrier">Empresa de envío *</Label>
              <Select value={carrier} onValueChange={(value) => {
                setCarrier(value);
                if (value !== "otro") setCustomCarrier("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona courier" />
                </SelectTrigger>
                <SelectContent>
                  {carriers.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {carrier === "otro" && (
              <div className="space-y-2">
                <Label htmlFor="customCarrier">Nombre del courier *</Label>
                <Input
                  id="customCarrier"
                  value={customCarrier}
                  onChange={(e) => setCustomCarrier(e.target.value)}
                  placeholder="Ej: DHL, FedEx, etc."
                />
              </div>
            )}
            <Button 
              onClick={handleConfirmShipment} 
              disabled={loading}
              className="w-full"
            >
              <Truck className="mr-2 h-4 w-4" />
              {loading ? "Confirmando..." : "Confirmar Envío de Retorno"}
            </Button>
          </div>
        )}

        {/* Seller: Confirm receipt */}
        {isSeller && returnRequest.status === "shipped" && (
          <div className="space-y-3 p-4 bg-background/50 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              Cuando recibas el producto de vuelta y verifiques que está en buenas condiciones, confirma la recepción para procesar el reembolso.
            </p>
            <Button 
              onClick={handleConfirmReceipt} 
              disabled={loading}
              className="w-full bg-success hover:bg-success/90"
            >
              <Check className="mr-2 h-4 w-4" />
              {loading ? "Procesando..." : "Confirmar Recepción y Procesar Reembolso"}
            </Button>
          </div>
        )}

        {/* Waiting states */}
        {isBuyer && returnRequest.status === "shipped" && (
          <div className="p-4 bg-info/10 rounded-lg border border-info/20 text-center">
            <Truck className="h-8 w-8 text-info mx-auto mb-2" />
            <p className="font-medium">Esperando recepción del vendedor</p>
            <p className="text-sm text-muted-foreground">
              El vendedor confirmará cuando reciba el producto
            </p>
          </div>
        )}

        {isSeller && (returnRequest.status === "accepted" || returnRequest.responsibility_type === "buyer_fault") && !returnRequest.tracking_number && (
          <div className="p-4 bg-warning/10 rounded-lg border border-warning/20 text-center">
            <Package className="h-8 w-8 text-warning mx-auto mb-2" />
            <p className="font-medium">Esperando envío del comprador</p>
            <p className="text-sm text-muted-foreground">
              El comprador debe enviar el producto con seguimiento
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
