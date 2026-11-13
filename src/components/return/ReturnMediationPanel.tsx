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
    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Devolución en Mediación
          <Badge variant="outline" className="ml-auto bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
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
        <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Mediación sobre el costo de envío de retorno
              </p>
              <p className="text-blue-700 dark:text-blue-300 mb-3">
                El vendedor rechazó la solicitud de devolución. Un administrador decidirá quién debe pagar el costo del envío de retorno.
              </p>
              <div className="bg-blue-50 dark:bg-blue-950/50 rounded-md p-3 mt-2">
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">📋 ¿Qué pasará después?</p>
                <ol className="list-decimal ml-4 space-y-1 text-blue-700 dark:text-blue-300">
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
