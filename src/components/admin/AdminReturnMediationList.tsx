import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Scale, Package, User, DollarSign, Check, AlertTriangle } from "lucide-react";
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
  const [mediations, setMediations] = useState<ReturnMediation[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedMediation, setSelectedMediation] = useState<ReturnMediation | null>(null);
  const [decision, setDecision] = useState<"buyer" | "seller">("seller");
  const [adminNotes, setAdminNotes] = useState("");
  const [resolving, setResolving] = useState(false);

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

  const openResolveDialog = (mediation: ReturnMediation) => {
    setSelectedMediation(mediation);
    setDecision("seller");
    setAdminNotes("");
    setResolveDialogOpen(true);
  };

  const handleResolve = async () => {
    if (!selectedMediation) return;

    setResolving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update return request with mediation result
      const { error } = await supabase
        .from("return_requests")
        .update({
          status: "accepted",
          shipping_paid_by: decision,
          admin_notes: `${selectedMediation.admin_notes || ""}\n\nResolución admin: ${decision === "seller" ? "Vendedor paga envío" : "Comprador paga envío"}. ${adminNotes}`.trim(),
          mediated_by: user?.id,
          mediated_at: new Date().toISOString(),
        })
        .eq("id", selectedMediation.id);

      if (error) throw error;

      toast.success(`Mediación resuelta - ${decision === "seller" ? "Vendedor" : "Comprador"} pagará el envío`);
      setResolveDialogOpen(false);
      loadMediations();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setResolving(false);
    }
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
    <>
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
                    <Button size="sm" onClick={() => openResolveDialog(mediation)}>
                      <Scale className="h-4 w-4 mr-1" />
                      Resolver
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

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Resolver Mediación de Devolución
            </DialogTitle>
            <DialogDescription>
              Decide quién debe pagar el costo del envío de retorno
            </DialogDescription>
          </DialogHeader>

          {selectedMediation && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Case Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="text-sm"><strong>Producto:</strong> {selectedMediation.transaction?.product_name}</p>
                <p className="text-sm"><strong>Monto:</strong> ${formatCLP(selectedMediation.transaction?.amount || 0)}</p>
                <p className="text-sm"><strong>Comprador:</strong> {selectedMediation.transaction?.buyer?.full_name}</p>
                <p className="text-sm"><strong>Vendedor:</strong> {selectedMediation.transaction?.seller?.full_name}</p>
              </div>

              {/* Reason */}
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm font-medium text-destructive mb-1">Motivo del comprador:</p>
                <p className="text-sm">{reasonLabels[selectedMediation.reason] || selectedMediation.reason}</p>
                {selectedMediation.reason_description && (
                  <p className="text-sm text-muted-foreground mt-1 italic">"{selectedMediation.reason_description}"</p>
                )}
              </div>

              {/* Seller rejection reason */}
              {selectedMediation.admin_notes && (
                <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <p className="text-sm font-medium text-warning mb-1">Argumento del vendedor:</p>
                  <p className="text-sm">{selectedMediation.admin_notes.replace("Vendedor rechazó: ", "")}</p>
                </div>
              )}

              {/* Decision */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">¿Quién debe pagar el envío de retorno?</Label>
                <RadioGroup value={decision} onValueChange={(v) => setDecision(v as "buyer" | "seller")} className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="seller" id="seller" />
                    <Label htmlFor="seller" className="flex-1 cursor-pointer">
                      <p className="font-medium">El vendedor paga</p>
                      <p className="text-sm text-muted-foreground">El comprador tiene razón</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value="buyer" id="buyer" />
                    <Label htmlFor="buyer" className="flex-1 cursor-pointer">
                      <p className="font-medium">El comprador paga</p>
                      <p className="text-sm text-muted-foreground">El vendedor tiene razón</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas de la resolución (opcional)</Label>
                <Textarea
                  id="notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Explica brevemente tu decisión..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)} disabled={resolving}>
              Cancelar
            </Button>
            <Button onClick={handleResolve} disabled={resolving}>
              <Check className="h-4 w-4 mr-2" />
              {resolving ? "Resolviendo..." : "Confirmar Resolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
