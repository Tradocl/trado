import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, AlertCircle, Gavel } from "lucide-react";
import { toast } from "sonner";
import { TransactionChat } from "@/components/TransactionChat";
import { AppealEvidence } from "@/components/appeal/AppealEvidence";
import { AppealTimeline } from "@/components/appeal/AppealTimeline";
import { formatCLP } from "@/lib/utils";

export default function AdminAppeal() {
  const { appealId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [appeal, setAppeal] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] = useState("");
  const [notes, setNotes] = useState("");
  const [buyerRefund, setBuyerRefund] = useState("");
  const [sellerPayment, setSellerPayment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }
    fetchAppealData();
  }, [adminLoading, isAdmin, appealId]);

  const fetchAppealData = async () => {
    try {
      const { data: appealData, error: appealError } = await supabase
        .from("appeals")
        .select("*")
        .eq("id", appealId)
        .single();

      if (appealError) throw appealError;

      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select(`
          *,
          seller:profiles!transactions_seller_id_fkey(full_name, email),
          buyer:profiles!transactions_buyer_id_fkey(full_name, email)
        `)
        .eq("id", appealData.transaction_id)
        .single();

      if (transactionError) throw transactionError;

      setAppeal(appealData);
      setTransaction(transactionData);
    } catch (error: any) {
      console.error("Error fetching appeal:", error);
      toast.error("Error al cargar la apelación");
    } finally {
      setLoading(false);
    }
  };

  const handleStartReview = async () => {
    try {
      const { error } = await supabase
        .from("appeals")
        .update({
          status: "en_revision_plataforma",
        })
        .eq("id", appealId);

      if (error) throw error;

      toast.success("Apelación en revisión");
      fetchAppealData();
    } catch (error: any) {
      console.error("Error starting review:", error);
      toast.error("Error al iniciar revisión");
    }
  };

  const handleSubmitDecision = async () => {
    if (!resolution || !notes.trim()) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    const buyerAmount = buyerRefund ? parseFloat(buyerRefund) : null;
    const sellerAmount = sellerPayment ? parseFloat(sellerPayment) : null;

    if (
      (resolution === "reembolso_parcial" || resolution === "reembolso_total") &&
      (!buyerAmount || buyerAmount <= 0)
    ) {
      toast.error("Ingresa el monto del reembolso");
      return;
    }

    if (resolution === "liberar_fondos_vendedor" && (!sellerAmount || sellerAmount <= 0)) {
      toast.error("Ingresa el monto a liberar al vendedor");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("resolve-appeal", {
        body: {
          appealId: appealId!,
          resolution,
          resolutionNotes: notes.trim(),
          buyerRefundAmount: buyerAmount,
          sellerPaymentAmount: sellerAmount,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Decisión registrada correctamente");
      navigate("/admin");
    } catch (error: any) {
      console.error("Error submitting decision:", error);
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

  if (!appeal || !transaction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center">Apelación no encontrada</h2>
        </Card>
      </div>
    );
  }

  const canDecide = ["pendiente_intervencion_plataforma", "en_revision_plataforma"].includes(appeal.status);
  const isResolved = ["resuelta_a_favor_comprador", "resuelta_a_favor_vendedor", "resuelta_parcial", "cerrada"].includes(appeal.status);

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
              <h1 className="text-2xl font-bold mb-6">
                Revisión de Apelación #{appeal.id.slice(0, 8)}
              </h1>

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">Información</TabsTrigger>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="evidence">Evidencia</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-6 space-y-6">
                  {/* Appeal Details */}
                  <div className="bg-muted/50 border rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold">Detalles de la Apelación</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Motivo</p>
                        <p className="font-semibold">
                          {appeal.reason === "producto_no_llego" && (transaction.sale_type === "servicio" ? "Servicio no realizado" : "Producto nunca llegó")}
                          {appeal.reason === "producto_diferente" && (transaction.sale_type === "servicio" ? "Servicio distinto al acordado" : "Producto distinto al acordado")}
                          {appeal.reason === "danos_o_fallas" && (transaction.sale_type === "servicio" ? "Trabajo deficiente" : "Daños o fallas")}
                          {appeal.reason === "incumplimiento_acuerdo" && "Incumplimiento del acuerdo"}
                          {appeal.reason === "otro" && "Otro"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Iniciada por</p>
                        <p className="font-semibold">
                          {appeal.initiator_id === transaction.buyer_id 
                            ? `${transaction.buyer?.full_name || "Comprador"} (Comprador)`
                            : `${transaction.seller?.full_name || "Vendedor"} (Vendedor)`
                          }
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Transacción</p>
                        <p className="font-semibold">{transaction.product_name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Monto en disputa</p>
                        <p className="font-semibold text-primary">{formatCLP(transaction.amount)}</p>
                      </div>
                    </div>
                    {appeal.reason_description && (
                      <div className="space-y-1 pt-2 border-t">
                        <p className="text-sm font-medium text-muted-foreground">Descripción del problema</p>
                        <p className="text-sm bg-background p-3 rounded-md">{appeal.reason_description}</p>
                      </div>
                    )}
                  </div>

                  {appeal.status === "pendiente_intervencion_plataforma" && (
                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                      <p className="text-sm mb-4">
                        Esta apelación requiere tu intervención. Revisa toda la información antes de tomar una decisión.
                      </p>
                      <Button onClick={handleStartReview}>
                        <Gavel className="h-4 w-4 mr-2" />
                        Iniciar Revisión
                      </Button>
                    </div>
                  )}

                  {canDecide && !isResolved && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Emitir decisión</h3>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Resolución</Label>
                          <RadioGroup value={resolution} onValueChange={setResolution}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="liberar_fondos_vendedor" id="seller" />
                              <Label htmlFor="seller" className="font-normal cursor-pointer">
                                Liberar fondos al vendedor
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="reembolso_parcial" id="partial" />
                              <Label htmlFor="partial" className="font-normal cursor-pointer">
                                Reembolso parcial al comprador
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="reembolso_total" id="total" />
                              <Label htmlFor="total" className="font-normal cursor-pointer">
                                Reembolso total al comprador
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="solicitar_mas_evidencia" id="evidence" />
                              <Label htmlFor="evidence" className="font-normal cursor-pointer">
                                Solicitar más evidencia
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {resolution === "liberar_fondos_vendedor" && (
                          <div className="space-y-2">
                            <Label htmlFor="seller-payment">Monto a liberar al vendedor</Label>
                            <Input
                              id="seller-payment"
                              type="number"
                              value={sellerPayment}
                              onChange={(e) => setSellerPayment(e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        )}

                        {(resolution === "reembolso_parcial" || resolution === "reembolso_total") && (
                          <div className="space-y-2">
                            <Label htmlFor="buyer-refund">Monto a reembolsar al comprador</Label>
                            <Input
                              id="buyer-refund"
                              type="number"
                              value={buyerRefund}
                              onChange={(e) => setBuyerRefund(e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="notes">Notas de la decisión</Label>
                          <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Explica el razonamiento detrás de tu decisión..."
                            className="min-h-[150px]"
                          />
                        </div>

                        <Button
                          onClick={handleSubmitDecision}
                          disabled={!resolution || !notes.trim() || submitting}
                          className="w-full"
                        >
                          {submitting ? "Registrando..." : "Registrar Decisión"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {isResolved && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                      <p className="text-green-900 dark:text-green-100 font-medium">
                        Esta apelación ya ha sido resuelta
                      </p>
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
                    isAdmin={true}
                    adminName="Administrador"
                  />
                </TabsContent>

                <TabsContent value="evidence" className="mt-6">
                  <AppealEvidence
                    appealId={appeal.id}
                    currentUserId={user?.id || ""}
                    appealStatus={appeal.status}
                    isAdmin={true}
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <AppealTimeline appeal={appeal} transaction={transaction} />
          </div>
        </div>
      </div>
    </div>
  );
}