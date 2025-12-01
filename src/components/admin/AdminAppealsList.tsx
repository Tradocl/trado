import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCLP } from "@/lib/utils";

export function AdminAppealsList() {
  const navigate = useNavigate();
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppeals();

    const channel = supabase
      .channel("admin-appeals")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appeals",
        },
        () => fetchAppeals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAppeals = async () => {
    try {
      const { data, error } = await supabase
        .from("appeals")
        .select(`
          *,
          transaction:transactions(
            id,
            product_name,
            amount,
            seller:profiles!transactions_seller_id_fkey(full_name),
            buyer:profiles!transactions_buyer_id_fkey(full_name)
          ),
          initiator:profiles!appeals_initiator_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAppeals(data || []);
    } catch (error: any) {
      console.error("Error fetching appeals:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      apelacion_abierta: { label: "Abierta", variant: "default" },
      en_negociacion: { label: "En Negociación", variant: "secondary" },
      pendiente_intervencion_plataforma: { label: "Pendiente Intervención", variant: "outline" },
      en_revision_plataforma: { label: "En Revisión", variant: "destructive" },
      resuelta_a_favor_comprador: { label: "Resuelta - Comprador", variant: "default" },
      resuelta_a_favor_vendedor: { label: "Resuelta - Vendedor", variant: "default" },
      resuelta_parcial: { label: "Resuelta Parcial", variant: "default" },
      cerrada: { label: "Cerrada", variant: "secondary" },
    };
    
    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getReasonLabel = (reason: string) => {
    const reasons: Record<string, string> = {
      producto_no_llego: "Producto no llegó",
      producto_diferente: "Producto diferente",
      danos_o_fallas: "Daños o fallas",
      incumplimiento_acuerdo: "Incumplimiento",
      otro: "Otro",
    };
    return reasons[reason] || reason;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {appeals.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No hay apelaciones registradas</p>
        </Card>
      ) : (
        appeals.map((appeal) => (
          <Card key={appeal.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold">
                    {appeal.transaction?.product_name}
                  </h3>
                  {getStatusBadge(appeal.status)}
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  ID: {appeal.id.slice(0, 8)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Creada {format(new Date(appeal.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/appeal/${appeal.id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Revisar
              </Button>
            </div>

            <div className="grid gap-2 md:grid-cols-3 text-sm">
              <div>
                <p className="text-muted-foreground">Motivo</p>
                <p className="font-medium">{getReasonLabel(appeal.reason)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Monto</p>
                <p className="font-medium">{formatCLP(appeal.transaction?.amount || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Iniciada por</p>
                <p className="font-medium">{appeal.initiator?.full_name}</p>
              </div>
            </div>

            {appeal.reason_description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Descripción</p>
                <p className="text-sm">{appeal.reason_description}</p>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}