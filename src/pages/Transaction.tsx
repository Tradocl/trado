import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Check, AlertCircle, Package, DollarSign, Star, Truck, Users, Store, Eye, RotateCcw, MapPin, Handshake } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Store as StoreIcon } from "lucide-react";
import { TransactionChat } from "@/components/TransactionChat";
import { RatingDialog } from "@/components/RatingDialog";
import { UserRatings } from "@/components/UserRatings";
import { CreateAppealDialog } from "@/components/appeal/CreateAppealDialog";
import { ReturnRequestDialog } from "@/components/ReturnRequestDialog";
import { ReturnStatusPanel } from "@/components/ReturnStatusPanel";
import { MeetingProposalPanel } from "@/components/MeetingProposalPanel";
import { formatCLP } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Transaction {
  id: string;
  seller_id: string;
  buyer_id: string | null;
  product_name: string;
  product_description: string;
  amount: number;
  commission: number;
  state: string;
  appeal_status: string | null;
  invite_code: string;
  created_at: string;
  sale_type: string | null;
  shipped_at: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  reputation_score: number;
  avatar_url: string | null;
}

const stateLabels: Record<string, { label: string; color: string }> = {
  created: { label: "Creada", color: "bg-secondary" },
  invited: { label: "Comprador Unido", color: "bg-info" },
  awaiting_deposit: { label: "Esperando Depósito", color: "bg-warning" },
  funds_secured: { label: "Fondos Asegurados", color: "bg-success" },
  in_delivery: { label: "En Entrega", color: "bg-info" },
  awaiting_buyer_review: { label: "Período de Revisión", color: "bg-warning" },
  return_requested: { label: "Devolución Solicitada", color: "bg-warning" },
  return_in_progress: { label: "Devolución en Proceso", color: "bg-warning" },
  completed: { label: "Completada", color: "bg-success" },
  cancelled: { label: "Cancelada", color: "bg-destructive" },
  in_dispute: { label: "En Disputa", color: "bg-destructive" },
};

const Transaction = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [sellerProfile, setSellerProfile] = useState<Profile | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAppeal, setActiveAppeal] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [hasRatedBuyer, setHasRatedBuyer] = useState(false);
  const [hasRatedSeller, setHasRatedSeller] = useState(false);
  const [ratedUserId, setRatedUserId] = useState<string>("");
  const [ratedUserName, setRatedUserName] = useState<string>("");
  const [isRatingSeller, setIsRatingSeller] = useState(false);
  const [joiningTransaction, setJoiningTransaction] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);

  const [disputeReason, setDisputeReason] = useState("");

  const checkIfUserHasRated = async () => {
    if (!user || !id || !transaction) return;

    try {
      // Check if user rated the buyer
      if (transaction.buyer_id) {
        const { data: buyerRating } = await supabase
          .from("ratings")
          .select("id")
          .eq("rater_id", user.id)
          .eq("rated_id", transaction.buyer_id)
          .eq("transaction_id", id)
          .maybeSingle();
        setHasRatedBuyer(!!buyerRating);
      }

      // Check if user rated the seller
      const { data: sellerRating } = await supabase
        .from("ratings")
        .select("id")
        .eq("rater_id", user.id)
        .eq("rated_id", transaction.seller_id)
        .eq("transaction_id", id)
        .maybeSingle();
      setHasRatedSeller(!!sellerRating);
    } catch (error: any) {
      console.error("Error checking rating:", error);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadTransaction();

    // Set up realtime subscription
    const channel = supabase
      .channel(`transaction-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log("Transaction updated:", payload);
          
          // Check if buyer just joined
          if (payload.eventType === "UPDATE") {
            const oldData = payload.old as any;
            const newData = payload.new as any;
            
            if (!oldData.buyer_id && newData.buyer_id) {
              toast.success("¡El comprador se ha unido a la transacción!");
            }
          }
          
          loadTransaction();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, id, navigate]);

  const loadTransaction = async () => {
    if (!id) return;

    try {
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", id)
        .single();

      if (txError) throw txError;

      setTransaction(txData);
      checkIfUserHasRated();

      // Check if there's an active appeal
      if (txData.appeal_status && txData.appeal_status !== "no_hay_apelacion" && txData.appeal_status !== "cerrada") {
        const { data: appealData } = await supabase
          .from("appeals")
          .select("*")
          .eq("transaction_id", id)
          .single();
        
        setActiveAppeal(appealData);
      } else {
        setActiveAppeal(null);
      }

      // Load seller profile
      const { data: sellerData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", txData.seller_id)
        .single();

      setSellerProfile(sellerData);

      // Load buyer profile if exists
      if (txData.buyer_id) {
        const { data: buyerData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", txData.buyer_id)
          .single();

        setBuyerProfile(buyerData);
      }
    } catch (error: any) {
      toast.error("Error al cargar transacción: " + error.message);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (transaction?.invite_code) {
      navigator.clipboard.writeText(transaction.invite_code);
      setCopied(true);
      toast.success("Código copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyInviteLink = () => {
    if (transaction?.id) {
      const link = `${window.location.origin}/transaction/${transaction.id}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success("Enlace copiado al portapapeles");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDeposit = async () => {
    if (!user || !transaction) return;

    try {
      // CRITICAL: First check if escrow_lock already exists for this transaction (pending = blocked, approved = spent)
      const { data: existingLock } = await supabase
        .from("wallet_movements")
        .select("id")
        .eq("transaction_id", transaction.id)
        .eq("type", "escrow_lock")
        .in("status", ["pending", "approved"])
        .maybeSingle();

      if (existingLock) {
        toast.info("Los fondos ya fueron bloqueados en esta transacción");
        setDepositDialogOpen(false);
        loadTransaction();
        return;
      }

      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!wallet || wallet.balance < transaction.amount) {
        toast.error("Saldo insuficiente. Por favor deposita fondos primero.");
        navigate("/wallet?action=deposit");
        return;
      }

      // Block funds in escrow (don't spend yet, just hold them)
      const currentBlocked = Number(wallet.blocked_balance ?? 0);
      const newBlockedBalance = currentBlocked + transaction.amount;
      const newAvailableBalance = wallet.balance - transaction.amount;
      const typeLabel = transaction.sale_type === "servicio" ? "Servicio" : "Compra";

      // Update wallet: reduce available balance, increase blocked balance
      await supabase.from("wallets").update({ 
        balance: newAvailableBalance,
        blocked_balance: newBlockedBalance 
      }).eq("id", wallet.id);

      await supabase.from("wallet_movements").insert({
        wallet_id: wallet.id,
        transaction_id: transaction.id,
        type: "escrow_lock",
        amount: -transaction.amount,
        balance_after: newAvailableBalance,
        description: `${typeLabel} "${transaction.product_name}"`,
        status: "pending", // Pending until transaction completes
      });

      await supabase
        .from("transactions")
        .update({ state: "funds_secured", deposited_at: new Date().toISOString() })
        .eq("id", transaction.id);

      toast.success("¡Fondos bloqueados en garantía!");
      setDepositDialogOpen(false);
      loadTransaction();
    } catch (error: any) {
      toast.error("Error al depositar: " + error.message);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!user || !transaction || confirmingDelivery) return;

    setConfirmingDelivery(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-delivery", {
        body: { transactionId: transaction.id },
      });

      if (error) {
        throw error;
      }

      if (!data || !(data as any).success) {
        throw new Error("No se pudo completar la transacción");
      }

      const successMessage = transaction.sale_type === "servicio" 
        ? "¡Pago liberado al proveedor!" 
        : "¡Pago liberado al vendedor!";
      toast.success(successMessage);
      setRatingDialogOpen(true);
      await loadTransaction();
    } catch (error: any) {
      console.error("Error al confirmar entrega:", error);
      toast.error("Error al confirmar: " + (error.message || "Intenta nuevamente"));
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const handleMarkAsShipped = async () => {
    if (!user || !transaction || !isSeller) return;

    try {
      await supabase
        .from("transactions")
        .update({ 
          state: "in_delivery",
          shipped_at: new Date().toISOString()
        })
        .eq("id", transaction.id);

      toast.success("¡Marcado como enviado! El comprador será notificado.");
      loadTransaction();
    } catch (error: any) {
      toast.error("Error al actualizar estado: " + error.message);
    }
  };

  const handleMarkAsReceived = async () => {
    if (!user || !transaction || !isBuyer) return;

    try {
      await supabase
        .from("transactions")
        .update({ state: "awaiting_buyer_review" })
        .eq("id", transaction.id);

      toast.success("¡Producto recibido! Ahora puedes revisarlo con calma.");
      loadTransaction();
    } catch (error: any) {
      toast.error("Error al actualizar estado: " + error.message);
    }
  };

  const handleCancelTransaction = async () => {
    if (!user || !transaction || !isSeller || transaction.buyer_id) return;

    try {
      await supabase
        .from("transactions")
        .update({ state: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", transaction.id);

      toast.success("Transacción cancelada correctamente");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error("Error al cancelar la transacción: " + error.message);
    }
  };

  const handleOpenDispute = async () => {
    if (!user || !transaction || !disputeReason.trim()) {
      toast.error("Por favor describe el motivo de la disputa");
      return;
    }

    try {
      await supabase
        .from("transactions")
        .update({
          state: "in_dispute",
          dispute_opened_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      // You could also create a disputes table to track dispute details
      toast.success("Disputa abierta. Un administrador la revisará pronto.");
      setDisputeDialogOpen(false);
      loadTransaction();
    } catch (error: any) {
      toast.error("Error al abrir disputa: " + error.message);
    }
  };

  const handleOpenRatingDialog = (otherUserId: string, otherUserName: string, ratingSeller: boolean) => {
    setRatedUserId(otherUserId);
    setRatedUserName(otherUserName);
    setIsRatingSeller(ratingSeller);
    setRatingDialogOpen(true);
  };

  const handleRatingComplete = async () => {
    await checkIfUserHasRated();
    await loadTransaction();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando transacción...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return null;
  }

  const isSeller = user?.id === transaction.seller_id;
  const isBuyer = user?.id === transaction.buyer_id;
  const canJoinAsBuyer = !transaction.buyer_id && !isSeller;

  console.log("Transaction state:", transaction.state);
  console.log("Is seller:", isSeller);
  console.log("Is buyer:", isBuyer);
  console.log("Can join as buyer:", canJoinAsBuyer);
  console.log("Buyer ID:", transaction.buyer_id);
  console.log("User ID:", user?.id);

  const handleJoinAsBuyer = async () => {
    if (!user || !transaction || joiningTransaction) return;

    setJoiningTransaction(true);
    try {
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          buyer_id: user.id,
          state: "invited",
        })
        .eq("id", transaction.id);

      if (updateError) throw updateError;

      toast.success("¡Te uniste a la transacción exitosamente!");
      await loadTransaction();
    } catch (error: any) {
      console.error("Error joining transaction:", error);
      toast.error("Error al unirse: " + error.message);
    } finally {
      setJoiningTransaction(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/30 to-accent/10">
      <header className="border-b bg-card/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="hover:bg-primary/10">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 animate-fade-in">
        {/* Status Card */}
        <Card className="border-2 border-primary/20 shadow-2xl bg-gradient-to-br from-card to-card/80">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl mb-2 font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {transaction.product_name}
                </CardTitle>
                <CardDescription className="text-base">{transaction.product_description}</CardDescription>
              </div>
              <div className="flex flex-col gap-2 items-end">
                {/* Sale type badge */}
                {transaction.sale_type && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {transaction.sale_type === "servicio" && "🛠️ Servicio"}
                    {transaction.sale_type === "producto_persona" && "🤝 Entrega en Persona"}
                    {transaction.sale_type === "producto_envio" && "📦 Envío"}
                  </Badge>
                )}
                {(() => {
                  const resolvedAppealStatuses = [
                    "resuelta_a_favor_comprador",
                    "resuelta_a_favor_vendedor",
                    "resuelta_parcial",
                    "cerrada"
                  ];
                  const isAppealResolved = transaction.appeal_status && resolvedAppealStatuses.includes(transaction.appeal_status);
                  
                  if (isAppealResolved) {
                    return (
                      <Badge className="bg-success text-base px-4 py-2 shadow-lg">
                        Completada
                      </Badge>
                    );
                  }
                  
                  return (
                    <Badge className={`${stateLabels[transaction.state]?.color || "bg-secondary"} text-base px-4 py-2 shadow-lg animate-pulse`}>
                      {stateLabels[transaction.state]?.label || transaction.state}
                    </Badge>
                  );
                })()}
                {activeAppeal && (
                  <Badge className="bg-amber-500 text-white text-base px-4 py-2 shadow-lg animate-pulse">
                    En Apelación
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg blur-xl"></div>
              <div className="relative flex justify-between items-center p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg border-2 border-primary/20">
                <span className="text-lg font-semibold">Monto Total</span>
                <span className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  ${formatCLP(transaction.amount)}
                </span>
              </div>
            </div>

            {isSeller && !transaction.buyer_id && transaction.state === "created" && (
              <div className="p-6 bg-gradient-to-br from-info/20 to-info/5 rounded-xl border-2 border-info/30 shadow-lg animate-scale-in">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-info rounded-lg animate-pulse">
                    <Copy className="h-5 w-5 text-info-foreground" />
                  </div>
                  <h4 className="font-bold text-info text-lg">
                    ⏳ {transaction.sale_type === "servicio" ? "Esperando Cliente" : "Esperando Comprador"}
                  </h4>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col md:flex-row gap-2">
                    <Input
                      value={transaction.invite_code}
                      readOnly
                      className="text-center text-2xl font-mono tracking-widest font-bold bg-background/50 border-2 border-info/30 flex-1"
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={copyInviteCode} 
                        variant="outline"
                        className="border-2 border-info/30 hover:bg-info/20 transition-all"
                      >
                        {copied ? <Check className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5" />}
                      </Button>
                      <Button
                        variant="destructive"
                        className="font-semibold"
                        onClick={handleCancelTransaction}
                      >
                        Cancelar sala
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <Input
                      value={`${window.location.origin}/transaction/${transaction.id}`}
                      readOnly
                      className="text-sm font-mono bg-background/50 border-2 border-primary/30 flex-1"
                    />
                    <Button 
                      onClick={copyInviteLink} 
                      variant="outline"
                      className="border-2 border-primary/30 hover:bg-primary/20 transition-all"
                    >
                      {copiedLink ? <Check className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5" />}
                      <span className="ml-2">Copiar enlace</span>
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  📱 Comparte el código o el enlace directo con {transaction.sale_type === "servicio" ? "el cliente" : "el comprador"}
                </p>
              </div>
            )}

            {/* Buyer joined notification */}
            {transaction.buyer_id && !['completed', 'cancelled', 'in_dispute'].includes(transaction.state) && (
              <div className="p-5 bg-gradient-to-br from-success/20 to-success/5 rounded-xl border-2 border-success/30 shadow-lg animate-scale-in">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-success/20 rounded-full">
                    <Check className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-success">
                      ✅ {transaction.sale_type === "servicio" ? "El cliente se ha unido" : "El comprador se ha unido"}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {buyerProfile?.full_name} se ha unido a la transacción
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Participants */}
            {(() => {
              const isService = transaction.sale_type === "servicio";
              const sellerLabel = isService ? "Proveedor" : "Vendedor";
              const buyerLabel = isService ? "Cliente" : "Comprador";
              const sellerFallback = isService ? "P" : "V";
              const buyerFallback = isService ? "C" : "C";
              const waitingLabel = isService ? "Esperando cliente..." : "Esperando comprador...";
              
              return (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 border-2 border-success/30 rounded-xl bg-gradient-to-br from-success/10 to-success/5 shadow-md hover-scale">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-12 w-12 border-2 border-success/30">
                        <AvatarImage src={sellerProfile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-success/20 text-success font-bold">
                          {sellerProfile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || sellerFallback}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-bold text-lg">{sellerLabel}</h4>
                        <p className="font-semibold">{sellerProfile?.full_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Star className="h-5 w-5 text-warning fill-warning" />
                      <span className="font-bold">{sellerProfile?.reputation_score?.toFixed(1) || "0.0"}</span>
                    </div>
                    {sellerProfile && <UserRatings userId={sellerProfile.id} maxRatings={3} />}
                  </div>
                  <div className="p-5 border-2 border-info/30 rounded-xl bg-gradient-to-br from-info/10 to-info/5 shadow-md hover-scale">
                    <div className="flex items-center gap-3 mb-3">
                      {buyerProfile ? (
                        <Avatar className="h-12 w-12 border-2 border-info/30">
                          <AvatarImage src={buyerProfile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-info/20 text-info font-bold">
                            {buyerProfile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || buyerFallback}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-info/20 flex items-center justify-center">
                          <Users className="h-6 w-6 text-info" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-lg">{buyerLabel}</h4>
                        {buyerProfile ? (
                          <p className="font-semibold">{buyerProfile.full_name}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Esperando...</p>
                        )}
                      </div>
                    </div>
                    {buyerProfile ? (
                      <>
                        <div className="flex items-center gap-2 mt-2">
                          <Star className="h-5 w-5 text-warning fill-warning" />
                          <span className="font-bold">{buyerProfile.reputation_score?.toFixed(1) || "0.0"}</span>
                        </div>
                        <UserRatings userId={buyerProfile.id} maxRatings={3} />
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground animate-pulse mt-2">
                        <div className="h-3 w-3 rounded-full bg-warning"></div>
                        <p className="text-sm font-medium">{waitingLabel}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <Separator className="my-6" />

            {/* Progress Timeline */}
            {(() => {
              const resolvedAppealStatuses = ['resuelta_a_favor_comprador', 'resuelta_a_favor_vendedor', 'resuelta_parcial', 'cerrada'];
              const isAppealResolved = transaction.appeal_status && resolvedAppealStatuses.includes(transaction.appeal_status);
              const isCompleted = transaction.state === 'completed' || isAppealResolved;
              const isInPersonDelivery = transaction.sale_type === 'producto_persona';
              const isService = transaction.sale_type === 'servicio';
              const isInReview = ['awaiting_buyer_review', 'return_requested', 'return_in_progress'].includes(transaction.state);
              const passedDelivery = ['in_delivery', 'awaiting_buyer_review', 'return_requested', 'return_in_progress', 'completed'].includes(transaction.state) || isAppealResolved;
              const passedReceived = ['awaiting_buyer_review', 'return_requested', 'return_in_progress', 'completed'].includes(transaction.state) || isAppealResolved;
              
              // For services, simplified flow without shipping or meeting
              if (isService) {
                return (
                  <div className="space-y-4 bg-gradient-to-br from-muted/50 to-background p-6 rounded-xl border-2 border-primary/10">
                    <h4 className="font-bold text-xl mb-4 flex items-center gap-2">
                      <StoreIcon className="h-6 w-6 text-primary" />
                      Progreso del Servicio
                    </h4>
                    <div className="space-y-4">
                      {/* Step 1: Client Joined */}
                      <div className="flex items-center gap-4 group">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                          transaction.state !== 'created' ? 'bg-success text-success-foreground scale-110' : 'bg-muted scale-100'
                        }`}>
                          <Users className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg">Cliente Confirmado</p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.buyer_id ? '✅ Cliente confirmado' : '⏳ Esperando cliente...'}
                          </p>
                        </div>
                      </div>

                      {/* Step 2: Escrow */}
                      <div className="flex items-center gap-4 group">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                          passedDelivery || transaction.state === 'funds_secured'
                            ? 'bg-success text-success-foreground scale-110' 
                            : transaction.state === 'awaiting_deposit' || transaction.state === 'invited'
                            ? 'bg-warning text-warning-foreground scale-105 animate-pulse'
                            : 'bg-muted'
                        }`}>
                          <DollarSign className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg">Pago en Escrow</p>
                          <p className="text-sm text-muted-foreground">
                            {passedDelivery || transaction.state === 'funds_secured'
                              ? '✅ Fondos asegurados y protegidos'
                              : transaction.state === 'invited'
                              ? '⏳ Esperando depósito del cliente...'
                              : '⚪ Pendiente'}
                          </p>
                        </div>
                      </div>

                      {/* Step 3: Service in Progress */}
                      <div className="flex items-center gap-4 group">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                          isCompleted
                            ? 'bg-success text-success-foreground scale-110'
                            : passedDelivery || transaction.state === 'funds_secured'
                            ? 'bg-warning text-warning-foreground scale-105 animate-pulse'
                            : 'bg-muted'
                        }`}>
                          <StoreIcon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg">Servicio en Progreso</p>
                          <p className="text-sm text-muted-foreground">
                            {isCompleted
                              ? '✅ Servicio completado'
                              : passedDelivery || transaction.state === 'funds_secured'
                              ? '🛠️ El proveedor realiza el servicio'
                              : '⚪ Pendiente'}
                          </p>
                        </div>
                      </div>

                      {/* Step 4: Completed */}
                      <div className="flex items-center gap-4 group">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                          isCompleted
                            ? 'bg-success text-success-foreground scale-110'
                            : 'bg-muted'
                        }`}>
                          <Check className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg">Servicio Completado</p>
                          <p className="text-sm text-muted-foreground">
                            {isCompleted 
                              ? isAppealResolved 
                                ? '✅ Caso resuelto por la plataforma' 
                                : '✅ ¡Servicio finalizado!' 
                              : '⚪ Pendiente'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // For in-person delivery, different flow
              if (isInPersonDelivery) {
                return (
                  <div className="space-y-4 bg-gradient-to-br from-muted/50 to-background p-6 rounded-xl border-2 border-primary/10">
                    <h4 className="font-bold text-xl mb-4 flex items-center gap-2">
                      <Handshake className="h-6 w-6 text-primary" />
                      Progreso del Encuentro
                    </h4>
                    <div className="space-y-4">
                      {/* Step 1: Buyer Joined */}
                      <div className="flex items-center gap-4 group">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                          transaction.state !== 'created' ? 'bg-success text-success-foreground scale-110' : 'bg-muted scale-100'
                        }`}>
                          <Users className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg">Comprador Unido</p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.buyer_id ? '✅ Comprador confirmado' : '⏳ Esperando comprador...'}
                          </p>
                        </div>
                      </div>

                      {/* Step 2: Escrow */}
                      <div className="flex items-center gap-4 group">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                          passedDelivery || transaction.state === 'funds_secured'
                            ? 'bg-success text-success-foreground scale-110' 
                            : transaction.state === 'awaiting_deposit' || transaction.state === 'invited'
                            ? 'bg-warning text-warning-foreground scale-105 animate-pulse'
                            : 'bg-muted'
                        }`}>
                          <DollarSign className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg">Pago en Escrow</p>
                          <p className="text-sm text-muted-foreground">
                            {passedDelivery || transaction.state === 'funds_secured'
                              ? '✅ Fondos asegurados y protegidos'
                              : transaction.state === 'invited'
                              ? '⏳ Esperando depósito del comprador...'
                              : '⚪ Pendiente'}
                          </p>
                        </div>
                      </div>

                      {/* Step 3: Ready to Meet / Coordinate */}
                      <div className="flex items-center gap-4 group">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                          passedDelivery
                            ? 'bg-success text-success-foreground scale-110'
                            : transaction.state === 'funds_secured'
                            ? 'bg-warning text-warning-foreground scale-105 animate-pulse'
                            : 'bg-muted'
                        }`}>
                          <MapPin className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg">Listo para Entregar</p>
                          <p className="text-sm text-muted-foreground">
                            {passedDelivery
                              ? '✅ Encuentro coordinado'
                              : transaction.state === 'funds_secured'
                              ? '📍 Coordinen lugar y hora de encuentro'
                              : '⚪ Pendiente'}
                          </p>
                        </div>
                      </div>

                      {/* Step 4: Meeting / Handoff */}
                      <div className="flex items-center gap-4 group">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                          isCompleted
                            ? 'bg-success text-success-foreground scale-110'
                            : passedDelivery
                            ? 'bg-warning text-warning-foreground scale-105 animate-pulse'
                            : 'bg-muted'
                        }`}>
                          <Handshake className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg">Confirmar Entrega</p>
                          <p className="text-sm text-muted-foreground">
                            {isCompleted
                              ? '✅ Entrega confirmada'
                              : passedDelivery
                              ? '🤝 Juntarse y confirmar recibimiento'
                              : '⚪ Pendiente'}
                          </p>
                        </div>
                      </div>

                      {/* Step 5: Completed */}
                      <div className="flex items-center gap-4 group">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                          isCompleted
                            ? 'bg-success text-success-foreground scale-110'
                            : 'bg-muted'
                        }`}>
                          <Check className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg">Transacción Completada</p>
                          <p className="text-sm text-muted-foreground">
                            {isCompleted 
                              ? isAppealResolved 
                                ? '✅ Caso resuelto por la plataforma' 
                                : '✅ ¡Todo listo!' 
                              : '⚪ Pendiente'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Standard shipping flow
              return (
                <div className="space-y-4 bg-gradient-to-br from-muted/50 to-background p-6 rounded-xl border-2 border-primary/10">
                  <h4 className="font-bold text-xl mb-4 flex items-center gap-2">
                    <Package className="h-6 w-6 text-primary" />
                    Progreso de la Transacción
                  </h4>
                  <div className="space-y-4">
                    {/* Step 1: Buyer Joined */}
                    <div className="flex items-center gap-4 group">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                        transaction.state !== 'created' ? 'bg-success text-success-foreground scale-110' : 'bg-muted scale-100'
                      }`}>
                        <Users className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg">Comprador Unido</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.buyer_id ? '✅ Comprador confirmado' : '⏳ Esperando comprador...'}
                        </p>
                      </div>
                    </div>

                    {/* Step 2: Escrow */}
                    <div className="flex items-center gap-4 group">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                        passedDelivery || transaction.state === 'funds_secured'
                          ? 'bg-success text-success-foreground scale-110' 
                          : transaction.state === 'awaiting_deposit' || transaction.state === 'invited'
                          ? 'bg-warning text-warning-foreground scale-105 animate-pulse'
                          : 'bg-muted'
                      }`}>
                        <DollarSign className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg">Pago en Escrow</p>
                        <p className="text-sm text-muted-foreground">
                          {passedDelivery || transaction.state === 'funds_secured'
                            ? '✅ Fondos asegurados y protegidos'
                            : transaction.state === 'invited'
                            ? '⏳ Esperando depósito del comprador...'
                            : '⚪ Pendiente'}
                        </p>
                      </div>
                    </div>

                    {/* Step 3: Shipped */}
                    <div className="flex items-center gap-4 group">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                        passedDelivery
                          ? 'bg-success text-success-foreground scale-110'
                          : transaction.state === 'funds_secured'
                          ? 'bg-warning text-warning-foreground scale-105 animate-pulse'
                          : 'bg-muted'
                      }`}>
                        <Truck className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg">Producto Enviado</p>
                        <p className="text-sm text-muted-foreground">
                          {passedDelivery
                            ? '✅ Producto enviado'
                            : transaction.state === 'funds_secured'
                            ? '⏳ Esperando envío del vendedor...'
                            : '⚪ Pendiente'}
                        </p>
                      </div>
                    </div>

                    {/* Step 4: Received */}
                    <div className="flex items-center gap-4 group">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                        passedReceived
                          ? 'bg-success text-success-foreground scale-110'
                          : transaction.state === 'in_delivery'
                          ? 'bg-warning text-warning-foreground scale-105 animate-pulse'
                          : 'bg-muted'
                      }`}>
                        <Package className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg">Producto Recibido</p>
                        <p className="text-sm text-muted-foreground">
                          {passedReceived
                            ? '✅ Comprador recibió el producto'
                            : transaction.state === 'in_delivery'
                            ? '🚚 En camino al comprador...'
                            : '⚪ Pendiente'}
                        </p>
                      </div>
                    </div>

                    {/* Step 5: Review Period */}
                    <div className="flex items-center gap-4 group">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                        isCompleted
                          ? 'bg-success text-success-foreground scale-110'
                          : isInReview
                          ? 'bg-warning text-warning-foreground scale-105 animate-pulse'
                          : 'bg-muted'
                      }`}>
                        <Eye className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg">Período de Revisión</p>
                        <p className="text-sm text-muted-foreground">
                          {isCompleted
                            ? '✅ Revisión completada'
                            : ['return_requested', 'return_in_progress'].includes(transaction.state)
                            ? '🔄 Devolución en proceso'
                            : transaction.state === 'awaiting_buyer_review'
                            ? '🔍 Comprador revisando el producto...'
                            : '⚪ Pendiente'}
                        </p>
                      </div>
                    </div>

                    {/* Step 6: Completed */}
                    <div className="flex items-center gap-4 group">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                        isCompleted
                          ? 'bg-success text-success-foreground scale-110'
                          : 'bg-muted'
                      }`}>
                        <Check className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg">Transacción Completada</p>
                        <p className="text-sm text-muted-foreground">
                          {isCompleted 
                            ? isAppealResolved 
                              ? '✅ Caso resuelto por la plataforma' 
                              : '✅ ¡Todo listo!' 
                            : '⚪ Pendiente'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <Separator className="my-6" />

            <Separator className="my-6" />

            {/* Join as buyer action - Show when no buyer and user is not seller */}
            {canJoinAsBuyer && (
              <div className="space-y-3 p-6 bg-gradient-to-br from-info/10 to-info/5 rounded-xl border-2 border-info/30 animate-scale-in">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-6 w-6 text-info" />
                  <h4 className="font-bold text-lg">
                    {transaction.sale_type === "servicio" 
                      ? "¿Quieres contratar este servicio?" 
                      : "¿Quieres comprar este producto?"}
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {transaction.sale_type === "servicio"
                    ? "Únete a esta transacción para contratar el servicio de forma protegida."
                    : "Únete a esta transacción para iniciar el proceso de compra protegida."}
                </p>
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-info to-info/80 hover:from-info/90 hover:to-info/70 text-lg py-6 shadow-xl hover-scale"
                  onClick={handleJoinAsBuyer}
                  disabled={joiningTransaction}
                >
                  <Users className="mr-2 h-6 w-6" />
                  {joiningTransaction 
                    ? "Uniéndose..." 
                    : transaction.sale_type === "servicio" 
                      ? "Unirme como Cliente" 
                      : "Unirme como Comprador"}
                </Button>
                <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                  🔒 {transaction.sale_type === "servicio" ? "Tu pago estará 100% protegido" : "Tu compra estará 100% protegida"}
                </p>
              </div>
            )}

            {/* Actions based on role and state */}
            {isBuyer && transaction.state === "invited" && (
              <div className="space-y-3 p-6 bg-gradient-to-br from-success/10 to-success/5 rounded-xl border-2 border-success/30 animate-scale-in">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-6 w-6 text-success" />
                  <h4 className="font-bold text-lg">Acción Requerida</h4>
                </div>
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-lg py-6 shadow-xl hover-scale"
                  onClick={() => setDepositDialogOpen(true)}
                >
                  <DollarSign className="mr-2 h-6 w-6" />
                  Depositar ${formatCLP(transaction.amount)} en Escrow
                </Button>
                <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                  🔒 Tus fondos estarán protegidos hasta que confirmes {transaction.sale_type === "servicio" ? "el servicio" : "la entrega"}
                </p>
              </div>
            )}

            {isSeller && transaction.state === "funds_secured" && transaction.sale_type === "producto_envio" && (
              <div className="space-y-3 p-6 bg-gradient-to-br from-info/10 to-info/5 rounded-xl border-2 border-info/30 animate-scale-in">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-6 w-6 text-info" />
                  <h4 className="font-bold text-lg">Acción Requerida</h4>
                </div>
                <Button 
                  size="lg"
                  className="w-full bg-gradient-to-r from-info to-info/80 hover:from-info/90 hover:to-info/70 text-lg py-6 shadow-xl hover-scale" 
                  onClick={handleMarkAsShipped}
                  disabled={!!activeAppeal}
                >
                  <Truck className="mr-2 h-6 w-6" />
                  Marcar Producto como Enviado
                </Button>
                <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                  {activeAppeal ? "⚠️ Acción bloqueada durante apelación" : "📦 Marca cuando hayas enviado el producto al comprador"}
                </p>
              </div>
            )}

            {/* Service: Provider marks service as complete, client confirms */}
            {transaction.sale_type === "servicio" && transaction.state === "funds_secured" && (
              <div className="space-y-3 p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/30 animate-scale-in">
                <div className="flex items-center gap-2 mb-2">
                  <StoreIcon className="h-6 w-6 text-primary" />
                  <h4 className="font-bold text-lg">
                    {isSeller ? "Servicio en Progreso" : "Esperando Servicio"}
                  </h4>
                </div>
                {isSeller ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Realiza el servicio acordado. Cuando termines, el cliente podrá confirmar y liberar el pago.
                    </p>
                    <Button 
                      size="lg"
                      className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-lg py-6 shadow-xl hover-scale" 
                      onClick={handleMarkAsShipped}
                      disabled={!!activeAppeal}
                    >
                      <Check className="mr-2 h-6 w-6" />
                      Marcar Servicio como Completado
                    </Button>
                    <p className="text-sm text-muted-foreground text-center">
                      {activeAppeal ? "⚠️ Acción bloqueada durante apelación" : "🛠️ Marca cuando hayas finalizado el servicio"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    El proveedor está realizando el servicio. Cuando termine, podrás confirmar y liberar el pago.
                  </p>
                )}
              </div>
            )}

            {/* Service: Client confirms completion */}
            {transaction.sale_type === "servicio" && transaction.state === "in_delivery" && (
              <div className="space-y-3 p-6 bg-gradient-to-br from-success/10 to-success/5 rounded-xl border-2 border-success/30 animate-scale-in">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-6 w-6 text-success" />
                  <h4 className="font-bold text-lg">
                    {isBuyer ? "Confirmar Servicio Completado" : "Esperando Confirmación del Cliente"}
                  </h4>
                </div>
                {isBuyer ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      El proveedor ha marcado el servicio como completado. Si estás satisfecho, confirma para liberar el pago.
                    </p>
                    <Button 
                      size="lg"
                      className="w-full bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-lg py-6 shadow-xl hover-scale" 
                      onClick={handleConfirmDelivery}
                      disabled={confirmingDelivery || !!activeAppeal}
                    >
                      <Check className="mr-2 h-6 w-6" />
                      {confirmingDelivery ? "Procesando..." : "Confirmar Servicio - Liberar Pago"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      ⚠️ Solo confirma si estás satisfecho con el servicio recibido
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    El cliente debe confirmar que el servicio fue completado satisfactoriamente para que recibas el pago.
                  </p>
                )}
              </div>
            )}

            {/* In-person delivery: Meeting Proposal Panel */}
            {transaction.sale_type === "producto_persona" && transaction.state === "funds_secured" && transaction.buyer_id && (
              <MeetingProposalPanel
                transactionId={transaction.id}
                userId={user?.id || ""}
                sellerId={transaction.seller_id}
                buyerId={transaction.buyer_id}
                sellerName={sellerProfile?.full_name || "Vendedor"}
                buyerName={buyerProfile?.full_name || "Comprador"}
                isSeller={isSeller}
                onMeetingConfirmed={() => {
                  // Automatically move to in_delivery when meeting is confirmed
                  supabase
                    .from("transactions")
                    .update({ state: "in_delivery", shipped_at: new Date().toISOString() })
                    .eq("id", transaction.id)
                    .then(() => loadTransaction());
                }}
              />
            )}

            {/* In-person delivery: Ready to confirm - both parties */}
            {transaction.sale_type === "producto_persona" && transaction.state === "in_delivery" && (
              <div className="space-y-3 p-6 bg-gradient-to-br from-success/10 to-success/5 rounded-xl border-2 border-success/30 animate-scale-in">
                <div className="flex items-center gap-2 mb-2">
                  <Handshake className="h-6 w-6 text-success" />
                  <h4 className="font-bold text-lg">
                    {isBuyer ? "Confirmar Recepción" : "Esperando Confirmación"}
                  </h4>
                </div>
                {isBuyer ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Cuando recibas el producto en persona y verifiques que está todo bien, confirma para liberar el pago.
                    </p>
                    <Button 
                      size="lg"
                      className="w-full bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-lg py-6 shadow-xl hover-scale" 
                      onClick={handleConfirmDelivery}
                      disabled={confirmingDelivery || !!activeAppeal}
                    >
                      <Check className="mr-2 h-6 w-6" />
                      {confirmingDelivery ? "Procesando..." : "Confirmar Entrega - Liberar Pago"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      ⚠️ Solo confirma si el producto está en perfectas condiciones
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    El comprador debe confirmar la recepción del producto para que recibas el pago.
                  </p>
                )}
              </div>
            )}

            {isBuyer && transaction.state === "in_delivery" && transaction.sale_type === "producto_envio" && (
              <div className="space-y-3 p-6 bg-gradient-to-br from-info/10 to-info/5 rounded-xl border-2 border-info/30 animate-scale-in">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-6 w-6 text-info" />
                  <h4 className="font-bold text-lg">Producto en Camino</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  El vendedor ha enviado el producto. Cuando lo recibas, marca que lo tienes para iniciar el período de revisión.
                </p>
                <Button 
                  size="lg"
                  className="w-full bg-gradient-to-r from-info to-info/80 hover:from-info/90 hover:to-info/70 text-lg py-6 shadow-xl hover-scale" 
                  onClick={handleMarkAsReceived}
                  disabled={!!activeAppeal}
                >
                  <Package className="mr-2 h-6 w-6" />
                  Ya Recibí el Paquete
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  {activeAppeal ? "⚠️ Acción bloqueada durante apelación" : "📦 Recuerda pedir el comprobante de envío al vendedor"}
                </p>
              </div>
            )}

            {/* Review Period UI */}
            {isBuyer && transaction.state === "awaiting_buyer_review" && (
              <div className="space-y-4 p-6 bg-gradient-to-br from-warning/10 to-warning/5 rounded-xl border-2 border-warning/30 animate-scale-in">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-6 w-6 text-warning" />
                  <h4 className="font-bold text-lg">Período de Revisión</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  El producto está en tus manos. Revísalo con calma y decide si todo está correcto.
                </p>
                
                <Button 
                  size="lg"
                  className="w-full bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-lg py-6 shadow-xl hover-scale" 
                  onClick={handleConfirmDelivery}
                  disabled={confirmingDelivery || !!activeAppeal}
                >
                  <Check className="mr-2 h-6 w-6" />
                  {confirmingDelivery ? "Procesando..." : "Todo Correcto - Liberar Pago"}
                </Button>

                <ReturnRequestDialog
                  transactionId={transaction.id}
                  userId={user?.id || ""}
                  onRequestCreated={loadTransaction}
                />

                <p className="text-xs text-muted-foreground text-center">
                  ⚠️ Solo confirma si el producto está en perfectas condiciones
                </p>
              </div>
            )}

            {/* Seller waiting for review */}
            {isSeller && transaction.state === "awaiting_buyer_review" && (
              <div className="space-y-3 p-6 bg-gradient-to-br from-info/10 to-info/5 rounded-xl border-2 border-info/30 animate-scale-in">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-6 w-6 text-info" />
                  <h4 className="font-bold text-lg">Comprador Revisando</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  El comprador ha recibido el producto y lo está revisando. Cuando confirme que todo está correcto, recibirás el pago.
                </p>
              </div>
            )}

            {/* Return Status Panel */}
            {["return_requested", "return_in_progress"].includes(transaction.state) && (
              <ReturnStatusPanel
                transactionId={transaction.id}
                isBuyer={isBuyer}
                isSeller={isSeller}
                transactionAmount={transaction.amount}
                onStatusChange={loadTransaction}
              />
            )}

            {/* Active Appeal Alert */}
            {activeAppeal && (
              <div className="mt-4 p-6 bg-amber-50 dark:bg-amber-950 border-2 border-amber-200 dark:border-amber-800 rounded-xl animate-scale-in">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-1" />
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-amber-900 dark:text-amber-100 mb-1">
                      Apelación Activa
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                      Hay una apelación en curso para esta transacción. Puedes revisar los detalles y participar en la resolución.
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => navigate(`/appeal/${activeAppeal.id}`)}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Ir a Sala de Apelación
                </Button>
              </div>
            )}

            {/* Create Appeal Button - Only show if no active appeal */}
            {!activeAppeal && transaction && ["funds_secured", "in_delivery"].includes(transaction.state) && (
              <div className="mt-4">
                <CreateAppealDialog
                  transactionId={transaction.id}
                  userId={user?.id || ""}
                />
              </div>
            )}

            {transaction.state === "in_dispute" && (
              <div className="p-6 bg-gradient-to-br from-destructive/20 to-destructive/5 rounded-xl border-2 border-destructive/30 animate-scale-in">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-destructive/20 rounded-full">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <div>
                    <p className="font-bold text-xl text-destructive mb-2">⚠️ Disputa Abierta</p>
                    <p className="text-muted-foreground">
                      Un administrador está revisando esta transacción. Te contactaremos pronto para resolver el problema.
                    </p>
                    <p className="text-sm text-muted-foreground mt-3">
                      Tiempo estimado de respuesta: 24-48 horas
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(transaction.state === "completed" || (transaction.appeal_status && ["resuelta_a_favor_comprador", "resuelta_a_favor_vendedor", "resuelta_parcial", "cerrada"].includes(transaction.appeal_status))) && (
              <>
                <div className="p-8 bg-gradient-to-br from-success/20 to-success/5 rounded-xl border-2 border-success/30 text-center animate-scale-in">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-success/20 rounded-full">
                      <Check className="h-16 w-16 text-success" />
                    </div>
                  </div>
                  <p className="font-bold text-2xl text-success mb-2">🎉 ¡Transacción Completada!</p>
                  <p className="text-muted-foreground">
                    Gracias por usar Trado. Los fondos han sido liberados exitosamente.
                  </p>
                </div>

                {((isSeller && !hasRatedBuyer && transaction.buyer_id) || (isBuyer && !hasRatedSeller)) && (
                  <div className="mt-6 p-6 bg-gradient-to-br from-warning/10 to-warning/5 rounded-xl border-2 border-warning/30 animate-scale-in">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-warning/20 rounded-full">
                        <Star className="h-8 w-8 text-warning" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-xl mb-2">¡Ayúdanos a crecer la confianza!</p>
                        <p className="text-muted-foreground text-sm">
                          Tu opinión es muy importante. Califica tu experiencia para ayudar a otros usuarios a tomar mejores decisiones.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {isSeller && !hasRatedBuyer && transaction.buyer_id && (
                        <Button
                          size="lg"
                          className="w-full bg-gradient-to-r from-warning to-warning/80 hover:from-warning/90 hover:to-warning/70 text-lg py-6 shadow-xl"
                          onClick={() => {
                            handleOpenRatingDialog(transaction.buyer_id!, buyerProfile?.full_name || "Comprador", false);
                          }}
                        >
                          <Star className="mr-2 h-6 w-6" />
                          Calificar al Comprador
                        </Button>
                      )}
                      {isBuyer && !hasRatedSeller && (
                        <Button
                          size="lg"
                          className="w-full bg-gradient-to-r from-warning to-warning/80 hover:from-warning/90 hover:to-warning/70 text-lg py-6 shadow-xl"
                          onClick={() => {
                            handleOpenRatingDialog(transaction.seller_id, sellerProfile?.full_name || "Vendedor", true);
                          }}
                        >
                          <Star className="mr-2 h-6 w-6" />
                          Calificar al Vendedor
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {isSeller && hasRatedBuyer && isBuyer && hasRatedSeller && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      Ya has calificado esta transacción
                    </p>
                  </div>
                )}
                
                {isSeller && hasRatedBuyer && !isBuyer && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      Ya has calificado al comprador
                    </p>
                  </div>
                )}
                
                {isBuyer && hasRatedSeller && !isSeller && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      Ya has calificado al vendedor
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Chat Section - Only show when buyer has joined */}
        {transaction.buyer_id && (
          <div className="animate-fade-in">
            <TransactionChat
              transactionId={transaction.id}
              sellerId={transaction.seller_id}
              sellerName={sellerProfile?.full_name || "Vendedor"}
              buyerId={transaction.buyer_id || undefined}
              buyerName={buyerProfile?.full_name}
            />
          </div>
        )}
      </main>

      {/* Rating Dialog */}
      {ratedUserId && (
        <RatingDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          transactionId={transaction.id}
          ratedUserId={ratedUserId}
          ratedUserName={ratedUserName}
          isRatingSeller={isRatingSeller}
          onRatingComplete={handleRatingComplete}
        />
      )}

      {/* Deposit Confirmation Dialog */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Depósito</DialogTitle>
            <DialogDescription>
              Se bloquearán ${formatCLP(transaction.amount)} de tu billetera hasta que confirmes la entrega
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
              <p className="text-sm">
                Tu dinero estará 100% seguro. Solo se liberará al vendedor cuando confirmes que
                recibiste el producto.
              </p>
            </div>
            <Button onClick={handleDeposit} className="w-full">
              Confirmar Depósito
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Disputa</DialogTitle>
            <DialogDescription>
              Describe el problema con esta transacción. Un administrador lo revisará.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
              <p className="text-sm">
                <strong>Importante:</strong> Solo abre una disputa si hay un problema real. 
                El uso indebido puede afectar tu reputación.
              </p>
            </div>
            <div>
              <Label htmlFor="disputeReason">Motivo de la Disputa</Label>
              <Textarea
                id="disputeReason"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe detalladamente el problema..."
                rows={4}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setDisputeDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={handleOpenDispute}
              >
                Abrir Disputa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transaction;
