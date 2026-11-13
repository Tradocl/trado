import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scale, Clock, MessageSquare } from "lucide-react";

interface ReturnRequest {
  id: string;
  reason: string;
  reason_description: string | null;
  status: string;
  admin_notes: string | null;
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

export const ReturnMediationPanel = ({ 
  returnRequest, 
  isBuyer, 
  isSeller 
}: ReturnMediationPanelProps) => {
  const navigate = useNavigate();

  return (
    <Card className="border-2 border-primary/20 dark:border-primary bg-primary/5 dark:from-primary/30 dark:to-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-primary dark:text-primary" />
          Devolución en Mediación
          <Badge variant="outline" className="ml-auto bg-primary/10 dark:bg-primary text-primary dark:text-primary/70 border-primary/30 dark:border-primary">
            <Clock className="h-3 w-3 mr-1" />
            Esperando decisión
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reason Info */}
        <div className="p-4 bg-background/80 rounded-lg border">
          <p className="text-sm text-muted-foreground mb-1">Motivo de la devolución:</p>
          <p className="font-semibold">
            {reasonLabels[returnRequest.reason] || returnRequest.reason}
          </p>
          {returnRequest.reason_description && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              "{returnRequest.reason_description}"
            </p>
          )}
        </div>

        {/* Info */}
        <div className="p-4 bg-primary/10 dark:bg-primary/50 rounded-lg border border-primary/20 dark:border-primary">
          <div className="flex items-start gap-2">
            <Scale className="h-5 w-5 text-primary dark:text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-primary dark:text-primary/70 mb-2">
                Mediación sobre el costo de envío de retorno
              </p>
              <p className="text-primary dark:text-primary/70 mb-3">
                El vendedor rechazó la solicitud de devolución. Un administrador decidirá quién debe pagar el costo del envío de retorno.
              </p>
              <div className="bg-primary/5 dark:bg-primary/50 rounded-md p-3 mt-2">
                <p className="font-medium text-primary dark:text-primary/70 mb-2">📋 ¿Qué pasará después?</p>
                <ol className="list-decimal ml-4 space-y-1 text-primary dark:text-primary/70">
                  <li>El admin decidirá quién paga el envío de retorno</li>
                  <li>El comprador enviará el producto de vuelta</li>
                  <li>El vendedor confirmará la recepción</li>
                  <li>Se procesará el reembolso al comprador</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button - Navigate to Return Room */}
        <Button 
          className="w-full"
          variant="outline"
          onClick={() => navigate(`/return/${returnRequest.id}`)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Ir a la Sala de Devolución
        </Button>
      </CardContent>
    </Card>
  );
};
