import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, X, Package, Scale } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

interface ReturnRequest {
  id: string;
  reason: string;
  reason_description: string | null;
  responsibility_type: string | null;
  seller_response: string | null;
  created_at: string;
}

interface ReturnSellerResponsePanelProps {
  returnRequest: ReturnRequest;
  transactionId: string;
  sellerId: string;
  buyerId: string;
  onResponse: () => void;
}

const reasonLabels: Record<string, string> = {
  producto_danado: "Producto dañado o defectuoso",
  no_corresponde: "No corresponde a la descripción",
  error_envio: "Error en el envío",
  incompleto: "Producto incompleto",
};

export const ReturnSellerResponsePanel = ({ 
  returnRequest, 
  transactionId, 
  sellerId, 
  buyerId, 
  onResponse 
}: ReturnSellerResponsePanelProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("return_requests")
        .update({
          seller_response: "accepted",
          status: "accepted",
          shipping_paid_by: "seller",
        })
        .eq("id", returnRequest.id);

      if (error) throw error;

      toast.success("Has aceptado la devolución - Tú pagarás el envío de retorno");
      onResponse();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Por favor explica por qué rechazas la solicitud");
      return;
    }

    setLoading(true);
    try {
      // Update return request status
      const { error: returnError } = await supabase
        .from("return_requests")
        .update({
          seller_response: "rejected",
          status: "disputed",
          admin_notes: `Vendedor rechazó: ${rejectionReason.trim()}`,
        })
        .eq("id", returnRequest.id);

      if (returnError) throw returnError;

      // Create an appeal so both parties can submit evidence
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 48);

      const { data: appeal, error: appealError } = await supabase
        .from("appeals")
        .insert({
          transaction_id: transactionId,
          initiator_id: sellerId, // The seller is rejecting and escalating, so they initiate the appeal
          reason: "incumplimiento_acuerdo" as Database["public"]["Enums"]["appeal_reason"],
          reason_description: `Devolución rechazada por el vendedor. Motivo original: ${returnRequest.reason}${returnRequest.reason_description ? ` - ${returnRequest.reason_description}` : ''}. Razón del rechazo del vendedor: ${rejectionReason.trim()}`,
          status: "pendiente_intervencion_plataforma" as Database["public"]["Enums"]["appeal_status"],
          negotiation_deadline: deadline.toISOString(),
        })
        .select()
        .single();

      if (appealError) throw appealError;

      // Update transaction appeal status and state
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ 
          appeal_status: "pendiente_intervencion_plataforma" as Database["public"]["Enums"]["appeal_status"],
          state: "in_dispute" as Database["public"]["Enums"]["transaction_state"]
        })
        .eq("id", transactionId);

      if (updateError) throw updateError;

      // Send system message to transaction chat
      const systemMessage = `[TRADO_SYSTEM]⚖️ SOLICITUD DE DEVOLUCIÓN EN DISPUTA

El vendedor ha rechazado la solicitud de devolución. Se ha abierto una apelación para que un administrador medie el caso.

📋 ¿Qué deben hacer ahora?

• Ambas partes deben subir toda la evidencia posible (fotos, capturas, videos) en la sección de evidencia de la apelación
• Un administrador revisará las pruebas de ambos y el historial de este chat
• La decisión será tomada de forma imparcial basándose en las pruebas disponibles

📎 Importante:

Mientras más evidencia suban, mejor podrá el administrador tomar una decisión informada.

⏱️ El proceso de revisión puede tomar hasta 48 horas.`;

      await supabase
        .from("chat_messages")
        .insert({
          transaction_id: transactionId,
          user_id: sellerId,
          message: systemMessage,
        });

      toast.success("Se ha abierto una apelación - Un administrador revisará el caso");
      
      // Navigate to the appeal page
      if (appeal) {
        navigate(`/appeal/${appeal.id}`);
      } else {
        onResponse();
      }
    } catch (error: any) {
      console.error("Error rejecting return:", error);
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5 text-warning" />
          Solicitud de Devolución Recibida
          <Badge variant="outline" className="ml-auto bg-warning/20 text-warning border-warning/30">
            Requiere tu respuesta
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reason Info */}
        <div className="p-4 bg-background/50 rounded-lg border">
          <p className="text-sm text-muted-foreground mb-1">El comprador reporta:</p>
          <p className="font-semibold text-destructive">
            {reasonLabels[returnRequest.reason] || returnRequest.reason}
          </p>
          {returnRequest.reason_description && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              "{returnRequest.reason_description}"
            </p>
          )}
        </div>

        {/* Warning */}
        <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-warning mb-2">¿Qué deseas hacer?</p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span><strong>Aceptar:</strong> Reconoces el problema y tú pagarás el envío de retorno</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span><strong>Rechazar:</strong> El caso se escalará a mediación de un administrador</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {!showRejectForm ? (
          <div className="flex gap-3">
            <Button
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 bg-success hover:bg-success/90"
            >
              <Check className="mr-2 h-4 w-4" />
              {loading ? "Procesando..." : "Aceptar Devolución"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRejectForm(true)}
              disabled={loading}
              className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <X className="mr-2 h-4 w-4" />
              Rechazar y Mediar
            </Button>
          </div>
        ) : (
          <div className="space-y-3 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive">
              <Scale className="h-5 w-5" />
              <p className="font-semibold">Solicitar Mediación</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Explica por qué crees que no deberías pagar el envío de retorno. Un administrador revisará tu caso y el del comprador.
            </p>
            <div className="space-y-2">
              <Label htmlFor="rejection">Tu explicación *</Label>
              <Textarea
                id="rejection"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej: El producto fue enviado exactamente como se describió, las fotos muestran el mismo estado..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectionReason("");
                }}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleReject}
                disabled={loading || !rejectionReason.trim()}
                className="flex-1 bg-destructive hover:bg-destructive/90"
              >
                <Scale className="mr-2 h-4 w-4" />
                {loading ? "Enviando..." : "Enviar a Mediación"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
