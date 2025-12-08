import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Clock, AlertTriangle, Truck, ArrowRight } from "lucide-react";

interface ReturnRequest {
  id: string;
  reason: string;
  reason_description: string | null;
  responsibility_type: string | null;
  seller_response: string | null;
  admin_notes: string | null;
  shipping_paid_by: string | null;
  status: string;
}

interface ReturnMediationPanelProps {
  returnRequest: ReturnRequest;
  isBuyer: boolean;
  isSeller: boolean;
}

const reasonLabels: Record<string, string> = {
  producto_danado: "Producto dañado o defectuoso",
  no_corresponde: "No corresponde a la descripción",
  error_envio: "Error en el envío",
  incompleto: "Producto incompleto",
};

export const ReturnMediationPanel = ({ returnRequest, isBuyer, isSeller }: ReturnMediationPanelProps) => {
  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-primary" />
          Mediación de Costo de Envío
          <Badge variant="outline" className="ml-auto bg-primary/20 text-primary border-primary/30">
            <Clock className="h-3 w-3 mr-1" />
            En revisión
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status explanation */}
        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-primary mb-1">¿Quién paga el envío de retorno?</p>
              <p className="text-muted-foreground">
                Un administrador está evaluando este caso para determinar quién debe asumir el costo del envío de retorno del producto.
              </p>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="p-4 bg-muted/30 rounded-lg border">
          <p className="text-sm font-medium mb-2 flex items-center gap-2">
            <Truck className="h-4 w-4" />
            ¿Qué pasará después de la mediación?
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mediación resuelta</span>
            <ArrowRight className="h-3 w-3" />
            <span>Comprador envía producto</span>
            <ArrowRight className="h-3 w-3" />
            <span>Vendedor confirma</span>
            <ArrowRight className="h-3 w-3" />
            <span>Reembolso</span>
          </div>
        </div>

        {/* Reason Info */}
        <div className="p-3 bg-background/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Motivo de devolución:</p>
          <p className="font-medium">{reasonLabels[returnRequest.reason] || returnRequest.reason}</p>
          {returnRequest.reason_description && (
            <p className="text-sm text-muted-foreground mt-1 italic">"{returnRequest.reason_description}"</p>
          )}
        </div>

        {/* Seller rejection reason (visible to both) */}
        {returnRequest.admin_notes && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Argumento del vendedor:</p>
            <p className="text-sm">{returnRequest.admin_notes.replace("Vendedor rechazó: ", "")}</p>
          </div>
        )}

        {/* Role-specific messages */}
        {isBuyer && (
          <div className="p-4 bg-info/10 rounded-lg border border-info/20 text-center">
            <p className="text-sm text-muted-foreground">
              El vendedor disputó tu solicitud. Cuando el administrador decida, podrás enviar el producto de vuelta.
              El reembolso se procesará una vez que el vendedor confirme la recepción.
            </p>
          </div>
        )}

        {isSeller && (
          <div className="p-4 bg-warning/10 rounded-lg border border-warning/20 text-center">
            <p className="text-sm text-muted-foreground">
              Has disputado esta solicitud. Un administrador decidirá quién paga el envío de retorno.
              Luego el comprador enviará el producto y tú deberás confirmar cuando lo recibas.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
