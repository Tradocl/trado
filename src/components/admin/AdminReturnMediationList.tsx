import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scale, Package, User, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatCLP } from "@/lib/utils";

interface ReturnMediation {
  id: string;
  transaction_id: string;
  requester_id: string;
  reason: string;
  reason_description: string | null;
  status: string;
  created_at: string;
  admin_notes: string | null;
  responsibility_type: string | null;
  seller_response: string | null;
  transaction?: {
    id: string;
    product_name: string;
    amount: number;
    seller_id: string;
    buyer_id: string;
    seller?: { full_name: string; email: string };
    buyer?: { full_name: string; email: string };
  };
}

const reasonLabels: Record<string, string> = {
  producto_danado: "Producto dañado o defectuoso",
  no_corresponde: "No corresponde a la descripción",
  error_envio: "Error en el envío",
  incompleto: "Producto incompleto",
};

export const AdminReturnMediationList = () => {
  const navigate = useNavigate();
  const [mediations, setMediations] = useState<ReturnMediation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMediations();
  }, []);

  const loadMediations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("return_requests")
        .select(`
          *,
          transaction:transactions(
            id,
            product_name,
            amount,
            seller_id,
            buyer_id,
            seller:profiles!transactions_seller_id_fkey(full_name, email),
            buyer:profiles!transactions_buyer_id_fkey(full_name, email)
          )
        `)
        .eq("status", "disputed")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMediations(data || []);
    } catch (error) {
      console.error("Error loading mediations:", error);
      toast.error("Error al cargar mediaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReturnRoom = (mediationId: string) => {
    navigate(`/admin/return/${mediationId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Devoluciones en Mediación
        </CardTitle>
        <CardDescription>
          Casos donde el vendedor rechazó la solicitud de devolución y requieren tu decisión
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Comprador</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mediations.map((mediation) => (
              <TableRow key={mediation.id}>
                <TableCell className="font-medium">
                  {mediation.transaction?.product_name || "N/A"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {mediation.transaction?.buyer?.full_name || "N/A"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {mediation.transaction?.seller?.full_name || "N/A"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {reasonLabels[mediation.reason] || mediation.reason}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  ${formatCLP(mediation.transaction?.amount || 0)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(mediation.created_at).toLocaleDateString("es-CL")}
                </TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => handleOpenReturnRoom(mediation.id)}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Revisar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {mediations.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay devoluciones pendientes de mediación
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
