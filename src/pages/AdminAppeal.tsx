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
import { AppealChat } from "@/components/appeal/AppealChat";
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
      // Create decision record
      const { error: decisionError } = await supabase
        .from("appeal_decisions")
        .insert({
          appeal_id: appealId!,
          admin_id: user!.id,
          resolution: resolution as Database["public"]["Enums"]["appeal_resolution"],
          resolution_notes: notes.trim(),
          buyer_refund_amount: buyerAmount,
          seller_payment_amount: sellerAmount,
        });

      if (decisionError) throw decisionError;

      // Update appeal status
      let newStatus: Database["public"]["Enums"]["appeal_status"] = "cerrada";
      if (resolution === "reembolso_total") newStatus = "resuelta_a_favor_comprador";
      else if (resolution === "liberar_fondos_vendedor") newStatus = "resuelta_a_favor_vendedor";
      else if (resolution === "reembolso_parcial") newStatus = "resuelta_parcial";

      const { error: appealError } = await supabase
        .from("appeals")
        .update({ status: newStatus })
        .eq("id", appealId);

      if (appealError) throw appealError;

      // Update wallets
      if (buyerAmount) {
        const { data: buyerWallet } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", transaction.buyer_id)
          .single();

        if (buyerWallet && buyerWallet.balance !== null) {
          const newBalance = buyerWallet.balance + buyerAmount;
          await supabase
            .from("wallets")
            .update({ balance: newBalance })
            .eq("id", buyerWallet.id);

          await supabase.from("wallet_movements").insert({
            wallet_id: buyerWallet.id,
            type: "deposit",
            amount: buyerAmount,
            balance_after: newBalance,
            description: `Reembolso por apelación - ${transaction.product_name}`,
            transaction_id: transaction.id,
            status: "approved",
          });
        }
      }

      if (sellerAmount) {
        const { data: sellerWallet } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", transaction.seller_id)
          .single();

        if (sellerWallet && sellerWallet.balance !== null) {
          const newBalance = sellerWallet.balance + sellerAmount;
          await supabase
            .from("wallets")
            .update({ balance: newBalance })
            .eq("id", sellerWallet.id);

          await supabase.from("wallet_movements").insert({
            wallet_id: sellerWallet.id,
            type: "deposit",
            amount: sellerAmount,
            balance_after: newBalance,
            description: `Pago liberado por apelación - ${transaction.product_name}`,
            transaction_id: transaction.id,
            status: "approved",
          });
        }
      }

      // Update transaction state and appeal status
      await supabase
        .from("transactions")
        .update({ 
          state: "completed",
          appeal_status: newStatus,
          completed_at: new Date().toISOString()
        })
        .eq("id", transaction.id);

      toast.success("Decisión registrada correctamente");
      navigate("/admin");
    } catch (error: any) {
      console.error("Error submitting decision:", error);
      toast.error("Error al registrar la decisión");
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
                  <AppealChat
                    appealId={appeal.id}
                    currentUserId={user?.id || ""}
                  />
                </TabsContent>

                <TabsContent value="evidence" className="mt-6">
                  <AppealEvidence
                    appealId={appeal.id}
                    currentUserId={user?.id || ""}
                    appealStatus={appeal.status}
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