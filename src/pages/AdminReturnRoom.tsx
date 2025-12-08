import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, AlertCircle, Gavel, Package, Truck, User } from "lucide-react";
import { toast } from "sonner";
import { TransactionChat } from "@/components/TransactionChat";
import { AppealEvidence } from "@/components/appeal/AppealEvidence";
import { formatCLP } from "@/lib/utils";

const reasonLabels: Record<string, string> = {
  producto_danado: "Producto dañado o defectuoso",
  no_corresponde: "No corresponde a la descripción",
  error_envio: "Error en el envío",
  incompleto: "Producto incompleto",
};

export default function AdminReturnRoom() {
  const { returnId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [returnRequest, setReturnRequest] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [appeal, setAppeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shippingPaidBy, setShippingPaidBy] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }
    fetchReturnData();
  }, [adminLoading, isAdmin, returnId]);

  const fetchReturnData = async () => {
    try {
      const { data: returnData, error: returnError } = await supabase
        .from("return_requests")
        .select("*")
        .eq("id", returnId)
        .single();

      if (returnError) throw returnError;

      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select(`
          *,
          seller:profiles!transactions_seller_id_fkey(full_name, email),
          buyer:profiles!transactions_buyer_id_fkey(full_name, email)
        `)
        .eq("id", returnData.transaction_id)
        .single();

      if (transactionError) throw transactionError;

      // Fetch associated appeal if exists
      const { data: appealData } = await supabase
        .from("appeals")
        .select("*")
        .eq("transaction_id", returnData.transaction_id)
        .ilike("reason_description", "[MEDIACIÓN DEVOLUCIÓN]%")
        .maybeSingle();

      setReturnRequest(returnData);
      setTransaction(transactionData);
      setAppeal(appealData);
    } catch (error: any) {
      console.error("Error fetching return:", error);
      toast.error("Error al cargar la devolución");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDecision = async () => {
    if (!shippingPaidBy || !notes.trim()) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    setSubmitting(true);
    try {
      // Update return request with shipping decision
      const { error: returnError } = await supabase
        .from("return_requests")
        .update({
          status: "accepted",
          shipping_paid_by: shippingPaidBy,
          mediated_at: new Date().toISOString(),
          mediated_by: user?.id,
          admin_notes: `Decisión: ${shippingPaidBy === 'seller' ? 'Vendedor paga envío' : 'Comprador paga envío'}. ${notes.trim()}`,
        })
        .eq("id", returnId);

      if (returnError) throw returnError;

      // Close the associated appeal if exists
      if (appeal) {
        const { error: appealError } = await supabase
          .from("appeals")
          .update({
            status: "cerrada",
          })
          .eq("id", appeal.id);

        if (appealError) throw appealError;

        // Update transaction appeal status
        const { error: txError } = await supabase
          .from("transactions")
          .update({
            appeal_status: "cerrada",
          })
          .eq("id", transaction.id);

        if (txError) throw txError;
      }

      // Send system message about decision
      const decisionMessage = `[TRADO_SYSTEM]✅ MEDIACIÓN DE DEVOLUCIÓN RESUELTA

El administrador ha tomado una decisión sobre quién paga el costo del envío de retorno:

📦 ${shippingPaidBy === 'seller' ? 'El VENDEDOR pagará el envío de retorno' : 'El COMPRADOR pagará el envío de retorno'}

📝 Notas: ${notes.trim()}

📋 Próximos pasos:
• El comprador debe enviar el producto de vuelta
• El vendedor debe confirmar la recepción
• Una vez confirmado, se procesará el reembolso`;

      await supabase
        .from("chat_messages")
        .insert({
          transaction_id: transaction.id,
          user_id: user?.id || "",
          message: decisionMessage,
        });

      toast.success("Decisión de mediación registrada correctamente");
      navigate("/admin");
    } catch (error: any) {
      console.error("Error submitting return mediation decision:", error);
      toast.error(error.message || "Error al registrar la decisión");
    } finally {
      setSubmitting(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!returnRequest || !transaction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center">Devolución no encontrada</h2>
        </Card>
      </div>
    );
  }

  const canDecide = returnRequest.status === "disputed";
  const isResolved = ["accepted", "shipped", "completed"].includes(returnRequest.status);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al panel de admin
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h1 className="text-2xl font-bold mb-2">
                Mediación de Devolución #{returnRequest.id.slice(0, 8)}
              </h1>
              <p className="text-muted-foreground mb-6">
                Decide quién debe pagar el costo del envío de retorno
              </p>

              <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 px-4 py-2 rounded-lg mb-6 text-sm font-medium">
                ⚖️ Esta mediación es sobre el COSTO DE ENVÍO DE RETORNO, no sobre el reembolso del producto
              </div>

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">Información</TabsTrigger>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="evidence">Evidencia</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-6 space-y-6">
                  {/* Return Details */}
                  <div className="bg-muted/50 border rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Detalles de la Devolución
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Motivo Reportado</p>
                        <p className="font-semibold text-destructive">
                          {reasonLabels[returnRequest.reason] || returnRequest.reason}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Tipo de Responsabilidad</p>
                        <p className="font-semibold">
                          {returnRequest.responsibility_type === "seller_fault" 
                            ? "Culpa del vendedor" 
                            : "Culpa del comprador"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Producto</p>
                        <p className="font-semibold">{transaction.product_name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Monto</p>
                        <p className="font-semibold text-primary">{formatCLP(transaction.amount)}</p>
                      </div>
                    </div>
                    
                    {returnRequest.reason_description && (
                      <div className="space-y-1 pt-2 border-t">
                        <p className="text-sm font-medium text-muted-foreground">Descripción del comprador</p>
                        <p className="text-sm bg-background p-3 rounded-md">{returnRequest.reason_description}</p>
                      </div>
                    )}

                    {returnRequest.admin_notes && (
                      <div className="space-y-1 pt-2 border-t">
                        <p className="text-sm font-medium text-muted-foreground">Razón del rechazo (vendedor)</p>
                        <p className="text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-md border border-red-200 dark:border-red-800">
                          {returnRequest.admin_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Participants */}
                  <div className="bg-muted/50 border rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Participantes
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Comprador (Solicitante)</p>
                        <p className="font-semibold">{transaction.buyer?.full_name || "Comprador"}</p>
                        <p className="text-sm text-muted-foreground">{transaction.buyer?.email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Vendedor</p>
                        <p className="font-semibold">{transaction.seller?.full_name || "Vendedor"}</p>
                        <p className="text-sm text-muted-foreground">{transaction.seller?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Decision Form */}
                  {canDecide && !isResolved && (
                    <div className="space-y-4 border-2 border-primary/20 rounded-lg p-6 bg-primary/5">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Gavel className="h-5 w-5" />
                        Decidir Costo de Envío de Retorno
                      </h3>

                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          <strong>Importante:</strong> Tu decisión determinará quién paga el envío de retorno.
                          Una vez resuelta, el comprador podrá enviar el producto y después se procesará el reembolso completo.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>¿Quién paga el envío de retorno?</Label>
                        <RadioGroup value={shippingPaidBy} onValueChange={setShippingPaidBy}>
                          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                            <RadioGroupItem value="seller" id="seller-pays" />
                            <Label htmlFor="seller-pays" className="font-normal cursor-pointer flex-1">
                              <span className="font-semibold">Vendedor paga el envío</span>
                              <p className="text-sm text-muted-foreground">
                                El producto tiene defectos, no coincide con la descripción, o es culpa del vendedor
                              </p>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                            <RadioGroupItem value="buyer" id="buyer-pays" />
                            <Label htmlFor="buyer-pays" className="font-normal cursor-pointer flex-1">
                              <span className="font-semibold">Comprador paga el envío</span>
                              <p className="text-sm text-muted-foreground">
                                Arrepentimiento del comprador o la devolución no está justificada
                              </p>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Notas de la decisión *</Label>
                        <Textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Explica el razonamiento detrás de tu decisión sobre quién debe pagar el envío..."
                          className="min-h-[120px]"
                        />
                      </div>

                      <Button
                        onClick={handleSubmitDecision}
                        disabled={!shippingPaidBy || !notes.trim() || submitting}
                        className="w-full"
                        size="lg"
                      >
                        <Gavel className="h-4 w-4 mr-2" />
                        {submitting ? "Registrando..." : "Registrar Decisión de Envío"}
                      </Button>
                    </div>
                  )}

                  {/* Resolution Result */}
                  {isResolved && (
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                        ✅ Mediación Resuelta
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                        {returnRequest.shipping_paid_by === "seller" 
                          ? "El vendedor pagará el costo del envío de retorno."
                          : "El comprador pagará el costo del envío de retorno."}
                      </p>
                      {returnRequest.admin_notes && (
                        <p className="text-sm text-muted-foreground">
                          Notas: {returnRequest.admin_notes}
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="chat" className="mt-6">
                  <TransactionChat 
                    transactionId={transaction.id}
                    sellerId={transaction.seller_id}
                    sellerName={transaction.seller?.full_name || "Vendedor"}
                    buyerId={transaction.buyer_id}
                    buyerName={transaction.buyer?.full_name || "Comprador"}
                    isAdmin
                    adminName="Administrador"
                  />
                </TabsContent>

                <TabsContent value="evidence" className="mt-6">
                  {appeal ? (
                    <AppealEvidence 
                      appealId={appeal.id} 
                      currentUserId={user?.id || ""}
                      appealStatus={appeal.status}
                      isAdmin
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay evidencia subida para esta devolución</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Flujo de Devolución
              </h3>
              <div className="space-y-3 text-sm">
                <div className={`flex items-center gap-2 ${returnRequest.status !== 'pending' ? 'text-muted-foreground line-through' : 'text-primary font-medium'}`}>
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">1</span>
                  Comprador solicita devolución
                </div>
                <div className={`flex items-center gap-2 ${returnRequest.status !== 'disputed' ? 'text-muted-foreground line-through' : 'text-primary font-medium'}`}>
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">2</span>
                  Vendedor rechaza → Mediación
                </div>
                <div className={`flex items-center gap-2 ${!isResolved ? 'text-muted-foreground' : 'text-primary font-medium'}`}>
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">3</span>
                  Admin decide costo envío
                </div>
                <div className={`flex items-center gap-2 ${returnRequest.status !== 'shipped' && returnRequest.status !== 'completed' ? 'text-muted-foreground' : 'text-primary font-medium'}`}>
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">4</span>
                  Comprador envía producto
                </div>
                <div className={`flex items-center gap-2 ${returnRequest.status !== 'completed' ? 'text-muted-foreground' : 'text-primary font-medium'}`}>
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">5</span>
                  Vendedor confirma → Reembolso
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
