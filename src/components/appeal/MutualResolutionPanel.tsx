import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Handshake, 
  Send, 
  Check, 
  X, 
  RefreshCw,
  MessageSquare,
  ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { formatCLP } from "@/lib/utils";

interface MutualResolutionPanelProps {
  appealId: string;
  currentUserId: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  appealStatus: string;
  onEscalate: () => void;
  escalating: boolean;
}

interface Proposal {
  id: string;
  appeal_id: string;
  proposer_id: string;
  buyer_amount: number;
  seller_amount: number;
  message: string | null;
  status: string;
  created_at: string;
}

export function MutualResolutionPanel({
  appealId,
  currentUserId,
  buyerId,
  sellerId,
  totalAmount,
  appealStatus,
  onEscalate,
  escalating
}: MutualResolutionPanelProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [buyerAmount, setBuyerAmount] = useState(totalAmount / 2);
  const [message, setMessage] = useState("");

  const isBuyer = currentUserId === buyerId;
  const sellerAmount = totalAmount - buyerAmount;

  useEffect(() => {
    fetchProposals();

    const channel = supabase
      .channel(`proposals-${appealId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appeal_mutual_proposals",
          filter: `appeal_id=eq.${appealId}`,
        },
        () => fetchProposals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appealId]);

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from("appeal_mutual_proposals")
        .select("*")
        .eq("appeal_id", appealId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (error) {
      console.error("Error fetching proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  const pendingProposal = proposals.find(p => p.status === "pending");
  const isProposalForMe = pendingProposal && pendingProposal.proposer_id !== currentUserId;
  const hasPendingProposal = !!pendingProposal;

  const handleSubmitProposal = async () => {
    if (buyerAmount < 0 || sellerAmount < 0) {
      toast.error("Los montos no pueden ser negativos");
      return;
    }

    setSubmitting(true);
    try {
      // Reject any pending proposal first
      if (pendingProposal) {
        await supabase
          .from("appeal_mutual_proposals")
          .update({ status: "rejected", responded_at: new Date().toISOString() })
          .eq("id", pendingProposal.id);
      }

      const { error } = await supabase
        .from("appeal_mutual_proposals")
        .insert({
          appeal_id: appealId,
          proposer_id: currentUserId,
          buyer_amount: Math.round(buyerAmount),
          seller_amount: Math.round(sellerAmount),
          message: message || null,
        });

      if (error) throw error;
      
      toast.success("Propuesta enviada correctamente");
      setMessage("");
    } catch (error: any) {
      console.error("Error submitting proposal:", error);
      toast.error("Error al enviar la propuesta");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptProposal = async () => {
    if (!pendingProposal) return;
    
    setSubmitting(true);
    try {
      // 1. Update proposal status
      const { error: proposalError } = await supabase
        .from("appeal_mutual_proposals")
        .update({ 
          status: "accepted", 
          responded_at: new Date().toISOString() 
        })
        .eq("id", pendingProposal.id);

      if (proposalError) throw proposalError;

      // 2. Get wallets for both parties
      const { data: buyerWallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", buyerId)
        .single();

      const { data: sellerWallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", sellerId)
        .single();

      if (!buyerWallet || !sellerWallet) {
        throw new Error("No se encontraron las billeteras");
      }

      // 3. Update wallets and create movements
      if (pendingProposal.buyer_amount > 0) {
        const newBuyerBalance = Number(buyerWallet.balance) + pendingProposal.buyer_amount;
        await supabase
          .from("wallets")
          .update({ balance: newBuyerBalance })
          .eq("id", buyerWallet.id);

        await supabase
          .from("wallet_movements")
          .insert({
            wallet_id: buyerWallet.id,
            type: "refund",
            amount: pendingProposal.buyer_amount,
            balance_after: newBuyerBalance,
            status: "approved",
            description: "Acuerdo mutuo - Reembolso",
          });
      }

      if (pendingProposal.seller_amount > 0) {
        const newSellerBalance = Number(sellerWallet.balance) + pendingProposal.seller_amount;
        await supabase
          .from("wallets")
          .update({ balance: newSellerBalance })
          .eq("id", sellerWallet.id);

        await supabase
          .from("wallet_movements")
          .insert({
            wallet_id: sellerWallet.id,
            type: "sale_release",
            amount: pendingProposal.seller_amount,
            balance_after: newSellerBalance,
            status: "approved",
            description: "Acuerdo mutuo - Liberación",
          });
      }

      // 4. Create appeal decision record
      await supabase
        .from("appeal_decisions")
        .insert({
          appeal_id: appealId,
          resolution: "reembolso_parcial",
          buyer_refund_amount: pendingProposal.buyer_amount,
          seller_payment_amount: pendingProposal.seller_amount,
          resolution_notes: `Acuerdo mutuo entre las partes. ${pendingProposal.message || ""}`,
          is_mutual_agreement: true,
        });

      // 5. Update appeal status
      await supabase
        .from("appeals")
        .update({ status: "resuelta_parcial" })
        .eq("id", appealId);

      toast.success("¡Acuerdo aceptado! Los fondos han sido distribuidos.");
    } catch (error: any) {
      console.error("Error accepting proposal:", error);
      toast.error("Error al aceptar la propuesta");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectProposal = async () => {
    if (!pendingProposal) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("appeal_mutual_proposals")
        .update({ 
          status: "rejected", 
          responded_at: new Date().toISOString() 
        })
        .eq("id", pendingProposal.id);

      if (error) throw error;
      toast.info("Propuesta rechazada. Puedes hacer una contra-propuesta.");
    } catch (error: any) {
      console.error("Error rejecting proposal:", error);
      toast.error("Error al rechazar la propuesta");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-2 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            <span className="text-muted-foreground">Cargando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 shadow-lg border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
        <CardTitle className="flex items-center gap-2">
          <Handshake className="h-5 w-5" />
          Resolución por Acuerdo Mutuo
        </CardTitle>
        <CardDescription>
          Lleguen a un acuerdo sin necesidad de intervención de la plataforma
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Pending Proposal to Review */}
        {isProposalForMe && pendingProposal && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  Propuesta Recibida
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {pendingProposal.proposer_id === buyerId ? "El comprador" : "El vendedor"} propone la siguiente distribución:
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground mb-1">Comprador recibe</p>
                <p className="text-xl font-bold text-primary">{formatCLP(pendingProposal.buyer_amount)}</p>
              </div>
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground mb-1">Vendedor recibe</p>
                <p className="text-xl font-bold text-primary">{formatCLP(pendingProposal.seller_amount)}</p>
              </div>
            </div>

            {pendingProposal.message && (
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium mb-1">Mensaje:</p>
                <p className="text-sm text-muted-foreground">{pendingProposal.message}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                className="flex-1" 
                onClick={handleAcceptProposal}
                disabled={submitting}
              >
                {submitting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Aceptar
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleRejectProposal}
                disabled={submitting}
              >
                <X className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
            </div>
          </div>
        )}

        {/* My Pending Proposal */}
        {!isProposalForMe && pendingProposal && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Tu Propuesta Enviada
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  Esperando respuesta de la otra parte
                </p>
                <div className="flex gap-4 text-sm">
                  <span>Comprador: <strong>{formatCLP(pendingProposal.buyer_amount)}</strong></span>
                  <span>Vendedor: <strong>{formatCLP(pendingProposal.seller_amount)}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create/Update Proposal Form */}
        {(!hasPendingProposal || isProposalForMe) && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">
                  {isProposalForMe ? "Hacer Contra-propuesta" : "Proponer Distribución"}
                </h4>
                <Badge variant="outline">
                  Total: {formatCLP(totalAmount)}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Comprador recibe</Label>
                    <Input
                      type="number"
                      value={Math.round(buyerAmount)}
                      onChange={(e) => setBuyerAmount(Math.min(totalAmount, Math.max(0, Number(e.target.value))))}
                      className="text-center font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vendedor recibe</Label>
                    <Input
                      type="number"
                      value={Math.round(sellerAmount)}
                      onChange={(e) => setBuyerAmount(totalAmount - Math.min(totalAmount, Math.max(0, Number(e.target.value))))}
                      className="text-center font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Distribución</Label>
                  <Slider
                    value={[buyerAmount]}
                    onValueChange={([value]) => setBuyerAmount(value)}
                    max={totalAmount}
                    step={1000}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>100% Comprador</span>
                    <span>100% Vendedor</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mensaje (opcional)</Label>
                  <Textarea
                    placeholder="Explica por qué propones esta distribución..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSubmitProposal}
                  disabled={submitting}
                >
                  {submitting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {isProposalForMe ? "Enviar Contra-propuesta" : "Enviar Propuesta"}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Escalate Option */}
        <Separator />
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            ¿No logran ponerse de acuerdo?
          </p>
          <Button
            variant="outline"
            onClick={onEscalate}
            disabled={escalating}
            className="border-amber-300 dark:border-amber-700"
          >
            {escalating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Escalando...
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4 mr-2" />
                Solicitar Intervención de Plataforma
              </>
            )}
          </Button>
        </div>

        {/* Recent Proposals History */}
        {proposals.filter(p => p.status !== "pending").length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Historial de Propuestas</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {proposals.filter(p => p.status !== "pending").slice(0, 5).map(proposal => (
                  <div key={proposal.id} className="text-xs bg-muted/50 rounded p-2 flex justify-between items-center">
                    <span>
                      {proposal.proposer_id === buyerId ? "Comprador" : "Vendedor"}: {formatCLP(proposal.buyer_amount)} / {formatCLP(proposal.seller_amount)}
                    </span>
                    <Badge variant={proposal.status === "accepted" ? "default" : "secondary"} className="text-xs">
                      {proposal.status === "accepted" ? "Aceptada" : "Rechazada"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
