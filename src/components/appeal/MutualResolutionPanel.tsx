import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Handshake, 
  Send, 
  Check, 
  X, 
  RefreshCw,
  MessageSquare,
  ShieldAlert,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { formatCLP } from "@/lib/utils";

interface MutualResolutionPanelProps {
  appealId: string;
  transactionId: string;
  currentUserId: string;
  buyerId: string;
  sellerId: string;
  buyerName: string;
  sellerName: string;
  totalAmount: number;
  appealStatus: string;
  onSwitchToEscalate: () => void;
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
  transactionId,
  currentUserId,
  buyerId,
  sellerId,
  buyerName,
  sellerName,
  totalAmount,
  appealStatus,
  onSwitchToEscalate
}: MutualResolutionPanelProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<"buyer" | "seller" | null>(null);
  const [message, setMessage] = useState("");

  const isBuyer = currentUserId === buyerId;
  const isSeller = currentUserId === sellerId;
  const buyerAmount = selectedRecipient === "buyer" ? totalAmount : 0;
  const sellerAmount = selectedRecipient === "seller" ? totalAmount : 0;

  // Helper to get display name with "tú" for current user
  const getBuyerDisplayName = () => isBuyer ? `${buyerName} (tú)` : buyerName;
  const getSellerDisplayName = () => isSeller ? `${sellerName} (tú)` : sellerName;
  const getProposerName = (proposerId: string) => {
    if (proposerId === currentUserId) return "Tú";
    if (proposerId === buyerId) return `${buyerName} (Comprador)`;
    return `${sellerName} (Vendedor)`;
  };

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
    if (!selectedRecipient) {
      toast.error("Selecciona quién debe recibir los fondos");
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
      setSelectedRecipient(null);
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
      const { data, error } = await supabase.functions.invoke("accept-mutual-resolution", {
        body: {
          proposalId: pendingProposal.id,
          appealId,
          transactionId,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Error al procesar el acuerdo");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("¡Acuerdo aceptado! Los fondos han sido distribuidos.");
    } catch (error: any) {
      console.error("Error accepting proposal:", error);
      toast.error(error.message || "Error al aceptar la propuesta");
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

  const handleCancelProposal = async () => {
    if (!pendingProposal || pendingProposal.proposer_id !== currentUserId) return;
    
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("appeal_mutual_proposals")
        .update({ 
          status: "cancelled", 
          responded_at: new Date().toISOString() 
        })
        .eq("id", pendingProposal.id);

      if (error) throw error;
      toast.success("Propuesta cancelada");
    } catch (error: any) {
      console.error("Error cancelling proposal:", error);
      toast.error("Error al cancelar la propuesta");
    } finally {
      setCancelling(false);
    }
  };

  const handleEscalate = async () => {
    setEscalating(true);
    try {
      const { error } = await supabase
        .from("appeals")
        .update({
          status: "pendiente_intervencion_plataforma",
          escalated_at: new Date().toISOString(),
        })
        .eq("id", appealId);

      if (error) throw error;
      
      toast.success("Caso enviado a revisión de administradores");
    } catch (error) {
      console.error("Error escalating:", error);
      toast.error("Error al solicitar intervención");
    } finally {
      setEscalating(false);
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
    <Card className="border-2 shadow-lg border-green-200 dark:border-green-800">
      <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10">
        <CardTitle className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-green-600 dark:text-green-400" />
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
                  {getProposerName(pendingProposal.proposer_id)} propone la siguiente distribución:
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground mb-1">{getBuyerDisplayName()} recibe</p>
                <p className="text-xl font-bold text-primary">{formatCLP(pendingProposal.buyer_amount)}</p>
              </div>
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground mb-1">{getSellerDisplayName()} recibe</p>
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
                className="flex-1 bg-green-600 hover:bg-green-700" 
                onClick={handleAcceptProposal}
                disabled={submitting}
              >
                {submitting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Aceptar Acuerdo
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
              <div className="flex-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Tu Propuesta Enviada
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  Esperando respuesta de {pendingProposal.proposer_id === buyerId ? getSellerDisplayName() : getBuyerDisplayName()}
                </p>
                <div className="flex gap-4 text-sm mb-4">
                  <span>{getBuyerDisplayName()}: <strong>{formatCLP(pendingProposal.buyer_amount)}</strong></span>
                  <span>{getSellerDisplayName()}: <strong>{formatCLP(pendingProposal.seller_amount)}</strong></span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelProposal}
                  disabled={cancelling}
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/20"
                >
                  {cancelling ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 mr-2" />
                  )}
                  Cancelar propuesta
                </Button>
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
                  {isProposalForMe ? "Hacer Contra-propuesta" : "Proponer Resolución"}
                </h4>
                <Badge variant="outline">
                  Total: {formatCLP(totalAmount)}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>¿Quién debe recibir los fondos?</Label>
                  <RadioGroup
                    value={selectedRecipient || ""}
                    onValueChange={(value) => setSelectedRecipient(value as "buyer" | "seller")}
                    className="grid grid-cols-1 gap-3"
                  >
                    <div className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${selectedRecipient === "buyer" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                      <RadioGroupItem value="buyer" id="buyer" />
                      <Label htmlFor="buyer" className="flex-1 cursor-pointer">
                        <div className="font-medium">Reembolsar al Comprador</div>
                        <div className="text-sm text-muted-foreground">
                          {getBuyerDisplayName()} recibe {formatCLP(totalAmount)}
                        </div>
                      </Label>
                    </div>
                    <div className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${selectedRecipient === "seller" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                      <RadioGroupItem value="seller" id="seller" />
                      <Label htmlFor="seller" className="flex-1 cursor-pointer">
                        <div className="font-medium">Liberar al Vendedor</div>
                        <div className="text-sm text-muted-foreground">
                          {getSellerDisplayName()} recibe {formatCLP(totalAmount)}
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Mensaje (opcional)</Label>
                  <Textarea
                    placeholder="Explica por qué propones esta resolución..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSubmitProposal}
                  disabled={submitting || !selectedRecipient}
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

        {/* Request Admin Intervention */}
        <Separator />
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  ¿No logran ponerse de acuerdo?
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Un administrador revisará la evidencia y tomará una decisión final. Este proceso puede tomar hasta 48 horas.
                </p>
              </div>
            </div>
            
            <Button
              onClick={handleEscalate}
              disabled={escalating}
              className="w-full bg-amber-600 hover:bg-amber-700"
              size="lg"
            >
              {escalating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Solicitando...
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Solicitar Intervención de Administrador
                </>
              )}
            </Button>
          </div>
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
                      {getProposerName(proposal.proposer_id)} propuso: {proposal.buyer_amount === totalAmount ? `Reembolso a ${getBuyerDisplayName()}` : `Liberar a ${getSellerDisplayName()}`}
                    </span>
                    <Badge variant={proposal.status === "accepted" ? "default" : "secondary"} className="text-xs">
                      {proposal.status === "accepted" ? "Aceptada" : proposal.status === "cancelled" ? "Cancelada" : "Rechazada"}
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
