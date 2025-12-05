import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Clock, AlertTriangle } from "lucide-react";

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
          En Mediación
          <Badge variant="outline" className="ml-auto bg-primary/20 text-primary border-primary/30">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status explanation */}
        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-primary mb-1">Caso en revisión por la plataforma</p>
              <p className="text-muted-foreground">
                Un administrador está evaluando este caso para determinar quién debe pagar el envío de retorno.
              </p>
            </div>
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
              El vendedor disputó tu solicitud. Espera mientras un administrador revisa el caso. 
              Recibirás una notificación cuando se tome una decisión.
            </p>
          </div>
        )}

        {isSeller && (
          <div className="p-4 bg-warning/10 rounded-lg border border-warning/20 text-center">
            <p className="text-sm text-muted-foreground">
              Has disputado esta solicitud. Un administrador revisará los argumentos de ambas partes 
              y determinará quién debe pagar el envío de retorno.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
