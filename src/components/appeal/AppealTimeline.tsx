import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  MessageSquare, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCLP } from "@/lib/utils";

interface AppealTimelineProps {
  appeal: any;
  transaction: any;
}

export function AppealTimeline({ appeal, transaction }: AppealTimelineProps) {
  const [decision, setDecision] = useState<any>(null);

  useEffect(() => {
    if (["resuelta_a_favor_comprador", "resuelta_a_favor_vendedor", "resuelta_parcial", "cerrada"].includes(appeal.status)) {
      fetchDecision();
    }
  }, [appeal.status]);

  const fetchDecision = async () => {
    try {
      const { data, error } = await supabase
        .from("appeal_decisions")
        .select(`
          *,
          admin:profiles(full_name)
        `)
        .eq("appeal_id", appeal.id)
        .maybeSingle();

      if (error) throw error;
      setDecision(data);
    } catch (error: any) {
      console.error("Error fetching decision:", error);
    }
  };

  const timelineSteps = [
    {
      id: "created",
      label: "Apelación creada",
      icon: AlertCircle,
      completed: true,
      date: appeal.created_at,
    },
    {
      id: "negotiation",
      label: "Negociación entre partes",
      icon: MessageSquare,
      completed: ["en_negociacion", "pendiente_intervencion_plataforma", "en_revision_plataforma", "resuelta_a_favor_comprador", "resuelta_a_favor_vendedor", "resuelta_parcial", "cerrada"].includes(appeal.status),
      date: appeal.status === "en_negociacion" ? new Date().toISOString() : null,
    },
    {
      id: "escalated",
      label: "En revisión por plataforma",
      icon: Eye,
      completed: ["en_revision_plataforma", "resuelta_a_favor_comprador", "resuelta_a_favor_vendedor", "resuelta_parcial", "cerrada"].includes(appeal.status),
      date: appeal.escalated_at,
    },
    {
      id: "resolved",
      label: "Resolución final",
      icon: appeal.status.includes("favor_comprador") || appeal.status === "resuelta_parcial" ? CheckCircle : XCircle,
      completed: ["resuelta_a_favor_comprador", "resuelta_a_favor_vendedor", "resuelta_parcial", "cerrada"].includes(appeal.status),
      date: decision?.created_at,
    },
  ];

  const getResolutionLabel = (resolution: string) => {
    const labels: Record<string, string> = {
      liberar_fondos_vendedor: "Fondos liberados al vendedor",
      reembolso_parcial: "Reembolso parcial al comprador",
      reembolso_total: "Reembolso total al comprador",
      solicitar_mas_evidencia: "Se solicitó más evidencia",
    };
    return labels[resolution] || resolution;
  };

  return (
    <Card className="p-6 space-y-6">
      <h3 className="font-semibold text-lg">Estado de la apelación</h3>

      <div className="space-y-4">
        {timelineSteps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === timelineSteps.length - 1;
          
          return (
            <div key={step.id} className="relative">
              <div className="flex items-start gap-3">
                <div className={`rounded-full p-2 ${step.completed ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${step.completed ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                  {step.date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(step.date), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                  )}
                </div>
              </div>
              {!isLast && (
                <div className={`ml-5 mt-2 mb-2 w-0.5 h-8 ${step.completed ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>

      {decision && (
        <div className="border-t pt-6 space-y-4">
          <h4 className="font-semibold">Decisión Final</h4>
          
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Resolución</p>
              <p className="font-medium">{getResolutionLabel(decision.resolution)}</p>
            </div>

            {decision.buyer_refund_amount && (
              <div>
                <p className="text-sm text-muted-foreground">Monto reembolsado al comprador</p>
                <p className="font-medium text-green-600">
                  {formatCLP(decision.buyer_refund_amount)}
                </p>
              </div>
            )}

            {decision.seller_payment_amount && (
              <div>
                <p className="text-sm text-muted-foreground">Monto liberado al vendedor</p>
                <p className="font-medium text-green-600">
                  {formatCLP(decision.seller_payment_amount)}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">Notas del árbitro</p>
              <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                {decision.resolution_notes}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Revisado por</p>
              <p className="text-sm">{decision.admin?.full_name || "Administrador"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="border-t pt-6 space-y-2">
        <h4 className="font-semibold text-sm">Detalles de la transacción</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Producto</span>
            <span className="font-medium">{transaction.product_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monto</span>
            <span className="font-medium">{formatCLP(transaction.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vendedor</span>
            <span className="font-medium">{transaction.seller?.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Comprador</span>
            <span className="font-medium">{transaction.buyer?.full_name}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}