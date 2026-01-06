import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Copy, Check, AlertCircle, Package, DollarSign, Star, Truck, Users, Store, Eye, RotateCcw, MapPin, Handshake, Shield, Lock, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { checkTransactionLimits, getUserVerificationStatus, UNVERIFIED_LIMITS } from "@/lib/transaction-limits";
import confetti from "canvas-confetti";

interface Transaction {
  id: string;
  seller_id: string | null;
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
  initiator_role: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  reputation_score: number;
  avatar_url: string | null;
  is_verified: boolean;
  total_transactions: number;
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
  const [appealDecision, setAppealDecision] = useState<any>(null);
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
  const [depositingEscrow, setDepositingEscrow] = useState(false);
  const [markingShipped, setMarkingShipped] = useState(false);
  const [markingReceived, setMarkingReceived] = useState(false);
  const [cancellingTransaction, setCancellingTransaction] = useState(false);
  const [openingDispute, setOpeningDispute] = useState(false);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [shippingTrackingNumber, setShippingTrackingNumber] = useState("");
  const [shippingCarrier, setShippingCarrier] = useState("");
  const [shippingCustomCarrier, setShippingCustomCarrier] = useState("");
  const [joinConfirmDialogOpen, setJoinConfirmDialogOpen] = useState(false);
  const [isUserVerified, setIsUserVerified] = useState<boolean | null>(null);

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
      // Redirect to welcome page for non-authenticated users
      navigate(`/invite/${id}`);
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

  // Load user verification status
  useEffect(() => {
    const loadVerificationStatus = async () => {
      if (!user?.id) return;
      const verified = await getUserVerificationStatus(user.id);
      setIsUserVerified(verified);
    };
    loadVerificationStatus();
  }, [user?.id]);

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

      // Check if there's an active or resolved appeal
      const resolvedAppealStatusList = ['resuelta_a_favor_comprador', 'resuelta_a_favor_vendedor', 'resuelta_parcial', 'cerrada'];
      if (txData.appeal_status && txData.appeal_status !== "no_hay_apelacion") {
        const { data: appealData } = await supabase
          .from("appeals")
          .select("*")
          .eq("transaction_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        setActiveAppeal(appealData);
        
        // Load decision if appeal is resolved
        if (appealData && resolvedAppealStatusList.includes(txData.appeal_status)) {
          const { data: decisionData } = await supabase
            .from("appeal_decisions")
            .select("*")
            .eq("appeal_id", appealData.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          setAppealDecision(decisionData);
        } else {
          setAppealDecision(null);
        }
      } else {
        setActiveAppeal(null);
        setAppealDecision(null);
      }

      // Load seller profile using safe function (only non-sensitive fields)
      const { data: sellerData } = await supabase
        .rpc("get_safe_profile", { profile_id: txData.seller_id })
        .single();

      setSellerProfile(sellerData);

      // Load buyer profile if exists using safe function
      if (txData.buyer_id) {
        const { data: buyerData } = await supabase
          .rpc("get_safe_profile", { profile_id: txData.buyer_id })
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
      // Use /invite/ path for the invitation link
      const origin = window.location.origin;
      let appUrl = origin;
      if (origin.includes('id-preview--') || origin.includes('localhost')) {
        const match = origin.match(/id-preview--([^.]+)/);
        if (match) {
          appUrl = `https://${match[1]}.lovable.app`;
        } else {
          appUrl = 'https://wpczgwxsriezaubncuom.lovable.app';
        }
      }
      const link = `${appUrl}/invite/${transaction.id}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success("Enlace copiado al portapapeles");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDeposit = async () => {
    if (!user || !transaction || depositingEscrow) return;

    setDepositingEscrow(true);
    try {
      // Call secure edge function to process escrow deposit
      const { data, error } = await supabase.functions.invoke("process-escrow-deposit", {
        body: {
          transactionId: transaction.id,
        },
      });

      // Check for insufficient funds in both error and data responses
      if (error) {
        // Parse error context if available (edge function 400 responses)
        try {
          const errorContext = error.context;
          if (errorContext) {
            const body = await errorContext.json?.() || JSON.parse(await errorContext.text?.() || '{}');
            if (body?.insufficientFunds) {
              toast.error("Saldo insuficiente. Por favor deposita fondos primero.");
              navigate("/wallet?action=deposit");
              return;
            }
          }
        } catch (parseError) {
          // Ignore parse errors, fall through to generic handling
        }
        
        console.error("Edge function error:", error);
        throw new Error(error.message || "Error al procesar el depósito");
      }

      if (data?.insufficientFunds) {
        toast.error("Saldo insuficiente. Por favor deposita fondos primero.");
        navigate("/wallet?action=deposit");
        return;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Notify the seller that buyer deposited funds
      try {
        await supabase.functions.invoke("notify-transaction-action", {
          body: {
            transactionId: transaction.id,
            actionType: "funds_deposited",
            actorId: user.id,
          },
        });
      } catch (notifyError) {
        console.error("Error sending notification:", notifyError);
      }

      toast.success("¡Fondos bloqueados en garantía!");
      setDepositDialogOpen(false);
      loadTransaction();
    } catch (error: any) {
      // Also check if error message indicates insufficient funds
      if (error.message?.includes("insuficiente")) {
        toast.error("Saldo insuficiente. Por favor deposita fondos primero.");
        navigate("/wallet?action=deposit");
        return;
      }
      toast.error("Error al depositar: " + error.message);
    } finally {
      setDepositingEscrow(false);
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

      // Send notification to seller that funds were released
      try {
        const sellerReceives = transaction.amount - (transaction.commission || 0);
        await supabase.functions.invoke("notify-transaction-action", {
          body: {
            transactionId: transaction.id,
            actionType: "funds_released",
            actorId: user.id,
            additionalData: { amount: sellerReceives }
          }
        });
      } catch (notifyError) {
        console.error("Error sending funds released notification:", notifyError);
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
    if (!user || !transaction || !isSeller || markingShipped) return;

    // For producto_envio, require tracking info
    if (transaction.sale_type === "producto_envio") {
      if (!shippingTrackingNumber.trim() || !shippingCarrier) {
        toast.error("Por favor ingresa el número de seguimiento y el courier");
        return;
      }
      
      if (shippingCarrier === "otro" && !shippingCustomCarrier.trim()) {
        toast.error("Por favor ingresa el nombre del courier");
        return;
      }
    }

    setMarkingShipped(true);
    try {
      const finalCarrier = shippingCarrier === "otro" ? shippingCustomCarrier.trim() : shippingCarrier;
      
      // Store shipping info in product_description as JSON for now (could be separate columns)
      const shippingInfo = transaction.sale_type === "producto_envio" 
        ? JSON.stringify({ 
            tracking_number: shippingTrackingNumber.trim(), 
            carrier: finalCarrier 
          })
        : null;
      
      const updateData: any = { 
        state: "in_delivery",
        shipped_at: new Date().toISOString()
      };
      
      // Store shipping metadata in product_description if shipping
      if (shippingInfo && transaction.sale_type === "producto_envio") {
        // We'll store it separately by appending to description
        const existingDesc = transaction.product_description || "";
        updateData.product_description = existingDesc + (existingDesc ? "\n\n" : "") + 
          `📦 Envío: ${finalCarrier} - Tracking: ${shippingTrackingNumber.trim()}`;
      }
      
      await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", transaction.id);

      // Notify the buyer that order was shipped
      try {
        await supabase.functions.invoke("notify-transaction-action", {
          body: {
            transactionId: transaction.id,
            actionType: "marked_shipped",
            actorId: user.id,
            additionalData: transaction.sale_type === "producto_envio" 
              ? { trackingInfo: `${finalCarrier} - ${shippingTrackingNumber.trim()}` }
              : undefined,
          },
        });
      } catch (notifyError) {
        console.error("Error sending notification:", notifyError);
      }

      toast.success("¡Marcado como enviado! El comprador será notificado.");
      setShippingDialogOpen(false);
      setShippingTrackingNumber("");
      setShippingCarrier("");
      setShippingCustomCarrier("");
      loadTransaction();
    } catch (error: any) {
      toast.error("Error al actualizar estado: " + error.message);
    } finally {
      setMarkingShipped(false);
    }
  };

  const handleMarkAsReceived = async () => {
    if (!user || !transaction || !isBuyer || markingReceived) return;

    setMarkingReceived(true);
    try {
      await supabase
        .from("transactions")
        .update({ state: "awaiting_buyer_review" })
        .eq("id", transaction.id);

      // Notify the seller that buyer received the product
      try {
        await supabase.functions.invoke("notify-transaction-action", {
          body: {
            transactionId: transaction.id,
            actionType: "marked_received",
            actorId: user.id,
          },
        });
      } catch (notifyError) {
        console.error("Error sending notification:", notifyError);
      }

      toast.success("¡Producto recibido! Ahora puedes revisarlo con calma.");
      loadTransaction();
    } catch (error: any) {
      toast.error("Error al actualizar estado: " + error.message);
    } finally {
      setMarkingReceived(false);
    }
  };

  const handleCancelTransaction = async () => {
    // Allow initiator to cancel only when no joiner has joined yet
    const initiatorRole = transaction?.initiator_role || 'seller';
    const hasJoiner = initiatorRole === 'seller' ? !!transaction?.buyer_id : !!transaction?.buyer_id;
    const isCreator = initiatorRole === 'seller' 
      ? user?.id === transaction?.seller_id 
      : user?.id === transaction?.seller_id; // Pre-swap: creator is in seller_id
    
    if (!user || !transaction || !isCreator || hasJoiner || cancellingTransaction) return;

    setCancellingTransaction(true);
    try {
      await supabase
        .from("transactions")
        .update({ state: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", transaction.id);

      toast.success("Transacción cancelada correctamente");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error("Error al cancelar la transacción: " + error.message);
    } finally {
      setCancellingTransaction(false);
    }
  };

  const handleOpenDispute = async () => {
    if (!user || !transaction || !disputeReason.trim() || openingDispute) {
      if (!disputeReason.trim()) {
        toast.error("Por favor describe el motivo de la disputa");
      }
      return;
    }

    setOpeningDispute(true);
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
    } finally {
      setOpeningDispute(false);
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

  const initiatorRole = transaction.initiator_role || 'seller';
  
  // Calculate REAL roles based on initiator_role and swap status
  // After JoinTransaction.tsx swap: seller_id = real seller, buyer_id = real buyer
  // Before swap when buyer initiated: creator (buyer) is temporarily in seller_id
  let realSellerId: string | null = null;
  let realBuyerId: string | null = null;
  let creatorId: string | null = null;
  let joinerId: string | null = null;
  
  if (initiatorRole === 'seller') {
    // Normal flow: seller created, buyer joins
    realSellerId = transaction.seller_id;
    realBuyerId = transaction.buyer_id;
    creatorId = transaction.seller_id;
    joinerId = transaction.buyer_id;
  } else {
    // Buyer initiated
    if (transaction.buyer_id) {
      // Post-swap: seller joined, creator moved to buyer_id
      realSellerId = transaction.seller_id;
      realBuyerId = transaction.buyer_id;
      creatorId = transaction.buyer_id; // Creator is now in buyer_id
      joinerId = transaction.seller_id;  // Joiner is in seller_id
    } else {
      // Pre-swap: creator (buyer) still in seller_id, waiting for seller
      realBuyerId = transaction.seller_id; // Creator is buyer but in seller_id
      realSellerId = null;
      creatorId = transaction.seller_id;
      joinerId = null;
    }
  }
  
  // Determine profiles for real roles
  const realSellerProfile = realSellerId === transaction.seller_id ? sellerProfile : 
                            realSellerId === transaction.buyer_id ? buyerProfile : null;
  const realBuyerProfile = realBuyerId === transaction.buyer_id ? buyerProfile :
                           realBuyerId === transaction.seller_id ? sellerProfile : null;
  const creatorProfile = creatorId === transaction.seller_id ? sellerProfile :
                         creatorId === transaction.buyer_id ? buyerProfile : null;
  const joinerProfile = joinerId === transaction.seller_id ? sellerProfile :
                        joinerId === transaction.buyer_id ? buyerProfile : null;
  
  // Determine if current user is REAL seller or buyer
  const isSeller = user?.id === realSellerId;
  const isBuyer = user?.id === realBuyerId;
  const isInitiator = user?.id === creatorId;
  
  // Calculate contextual amounts based on role
  // If buyer initiated: commission added on top, seller receives full amount
  // If seller initiated: commission deducted from seller's payout
  const sellerReceives = initiatorRole === 'buyer' 
    ? transaction.amount 
    : transaction.amount - transaction.commission;
  const buyerPays = initiatorRole === 'buyer' 
    ? transaction.amount + transaction.commission 
    : transaction.amount;
  
  // Can join: only when opposite role is missing
  const canJoinAsBuyer = initiatorRole === 'seller' && !transaction.buyer_id && user?.id !== transaction.seller_id;
  const canJoinAsSeller = initiatorRole === 'buyer' && !transaction.buyer_id && user?.id !== transaction.seller_id;
  const canJoin = canJoinAsBuyer || canJoinAsSeller;
  
  // Labels based on sale type
  const isService = transaction.sale_type === 'servicio';
  const sellerLabel = isService ? 'Proveedor' : 'Vendedor';
  const buyerLabel = isService ? 'Cliente' : 'Comprador';
  const creatorRoleLabel = initiatorRole === 'seller' ? sellerLabel : buyerLabel;
  const joinerRoleLabel = initiatorRole === 'seller' ? buyerLabel : sellerLabel;

  const handleJoin = async () => {
    if (!user || !transaction || joiningTransaction) return;

    setJoiningTransaction(true);
    try {
      // Check transaction limits for unverified users
      const limitCheck = await checkTransactionLimits(
        user.id,
        buyerPays,
        isUserVerified || false
      );

      if (!limitCheck.allowed) {
        toast.error(limitCheck.message);
        setJoiningTransaction(false);
        return;
      }

      // Determine update data based on initiator role
      let updateData: any = { state: "invited" };
      
      if (initiatorRole === "seller") {
        // Seller created, joining user becomes buyer
        updateData.buyer_id = user.id;
      } else {
        // Buyer created (stored in seller_id due to DB constraints)
        // Now we swap: creator becomes buyer, joiner becomes seller
        updateData.buyer_id = transaction.seller_id; // Move creator to buyer
        updateData.seller_id = user.id; // Joiner becomes seller
      }

      const { error: updateError } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", transaction.id);

      if (updateError) throw updateError;

      // Celebration confetti animation
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6']
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6']
        });
      }, 250);

      // Send payment instructions email
      try {
        await supabase.functions.invoke("send-payment-instructions", {
          body: { transactionId: transaction.id },
        });
      } catch (emailError) {
        console.error("Error sending payment instructions:", emailError);
      }

      // Notify the seller/creator that someone joined
      try {
        await supabase.functions.invoke("notify-transaction-action", {
          body: {
            transactionId: transaction.id,
            actionType: "buyer_joined",
            actorId: user.id,
          },
        });
      } catch (notifyError) {
        console.error("Error sending notification:", notifyError);
      }

      toast.success("¡Te uniste a la transacción exitosamente!");
      setJoinConfirmDialogOpen(false);
      await loadTransaction();
    } catch (error: any) {
      console.error("Error joining transaction:", error);
      toast.error("Error al unirse: " + error.message);
    } finally {
      setJoiningTransaction(false);
    }
  };

  // Helper variables for timeline
  const resolvedAppealStatuses = ['resuelta_a_favor_comprador', 'resuelta_a_favor_vendedor', 'resuelta_parcial', 'cerrada'];
  const inReturnProcess = ['return_requested', 'return_in_progress'].includes(transaction.state);
  // Appeal is only considered "resolved" (transaction complete) if NOT in return process
  // Return mediations close the appeal but transaction continues until refund is processed
  const isAppealResolved = transaction.appeal_status && 
    resolvedAppealStatuses.includes(transaction.appeal_status) && 
    !inReturnProcess;
  const isCompleted = transaction.state === 'completed' || isAppealResolved;
  const isInPersonDelivery = transaction.sale_type === 'producto_persona';
  const isInReview = ['awaiting_buyer_review', 'return_requested', 'return_in_progress'].includes(transaction.state);
  const passedDelivery = ['in_delivery', 'awaiting_buyer_review', 'return_requested', 'return_in_progress', 'completed'].includes(transaction.state) || isAppealResolved;
  const passedReceived = ['awaiting_buyer_review', 'return_requested', 'return_in_progress', 'completed'].includes(transaction.state) || isAppealResolved;
  
  const creatorName = creatorProfile?.full_name || creatorRoleLabel;
  const joinerName = joinerProfile?.full_name || joinerRoleLabel;
  const realSellerName = realSellerProfile?.full_name || sellerLabel;
  const realBuyerName = realBuyerProfile?.full_name || buyerLabel;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/30 to-accent/10">
      <header className="border-b bg-card/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <Button variant="ghost" size="sm" className="hover:bg-primary/10 px-2 sm:px-4" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Volver a Inicio</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 animate-fade-in">
        {/* === SECTION 1: REQUIRED ACTIONS (TOP PRIORITY) === */}
        
        {/* Join action - works for both buyer and seller joining */}
        {canJoin && (
          <Card className="border-2 border-info/30 shadow-xl bg-gradient-to-br from-info/10 to-info/5 animate-scale-in">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-info" />
                <h4 className="font-bold text-base sm:text-lg">
                  {canJoinAsBuyer 
                    ? (transaction.sale_type === "servicio" 
                        ? "¿Quieres contratar este servicio?" 
                        : "¿Quieres comprar este producto?")
                    : (transaction.sale_type === "servicio" 
                        ? "¿Quieres ofrecer este servicio?" 
                        : "¿Quieres vender este producto?")}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {canJoinAsBuyer
                  ? (transaction.sale_type === "servicio"
                      ? "Únete a esta transacción para contratar el servicio de forma protegida."
                      : "Únete a esta transacción para iniciar el proceso de compra protegida.")
                  : (transaction.sale_type === "servicio"
                      ? "Únete a esta transacción para proveer el servicio de forma protegida."
                      : "Únete a esta transacción para vender el producto de forma protegida.")}
                {" "}
                <span className="text-info">
                  Revisa la información del {canJoinAsBuyer 
                    ? (transaction.sale_type === "servicio" ? "proveedor" : "vendedor")
                    : (transaction.sale_type === "servicio" ? "cliente" : "comprador")} en la sección de Participantes abajo.
                </span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-info to-info/80 hover:from-info/90 hover:to-info/70 text-sm sm:text-lg py-4 sm:py-6 shadow-xl hover-scale"
                  onClick={() => setJoinConfirmDialogOpen(true)}
                >
                  <Users className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="truncate">
                    {canJoinAsBuyer
                      ? (transaction.sale_type === "servicio" ? "Unirme como Cliente" : "Unirme como Comprador")
                      : (transaction.sale_type === "servicio" ? "Unirme como Proveedor" : "Unirme como Vendedor")}
                  </span>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 text-sm sm:text-lg py-4 sm:py-6"
                  onClick={() => navigate("/dashboard")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Salir
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-3 flex items-center justify-center gap-2">
                🔒 {canJoinAsBuyer 
                  ? (transaction.sale_type === "servicio" ? "Tu pago estará 100% protegido" : "Tu compra estará 100% protegida")
                  : "El pago estará protegido hasta que se confirme la entrega"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Buyer deposit action */}
        {isBuyer && transaction.state === "invited" && (
          <Card className="border-2 border-success/30 shadow-xl bg-gradient-to-br from-success/10 to-success/5 animate-scale-in">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                <h4 className="font-bold text-base sm:text-lg">Acción Requerida</h4>
              </div>
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-sm sm:text-lg py-4 sm:py-6 shadow-xl hover-scale"
                onClick={() => setDepositDialogOpen(true)}
              >
                <DollarSign className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                <span className="truncate">Depositar ${formatCLP(buyerPays)} en Escrow</span>
              </Button>
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-3 flex items-center justify-center gap-2">
                🔒 Tus fondos estarán protegidos hasta que confirmes {transaction.sale_type === "servicio" ? "el servicio" : "la entrega"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Seller mark as shipped (envío) */}
        {isSeller && transaction.state === "funds_secured" && transaction.sale_type === "producto_envio" && (
          <Card className="border-2 border-info/30 shadow-xl bg-gradient-to-br from-info/10 to-info/5 animate-scale-in">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-info" />
                <h4 className="font-bold text-base sm:text-lg">Acción Requerida</h4>
              </div>
              <Button 
                size="lg"
                className="w-full bg-gradient-to-r from-info to-info/80 hover:from-info/90 hover:to-info/70 text-sm sm:text-lg py-4 sm:py-6 shadow-xl hover-scale" 
                onClick={() => setShippingDialogOpen(true)}
                disabled={!!activeAppeal}
              >
                <Truck className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                <span className="truncate">Marcar Producto como Enviado</span>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Service provider confirm (servicio) */}
        {isSeller && transaction.state === "funds_secured" && transaction.sale_type === "servicio" && (
          <Card className="border-2 border-info/30 shadow-xl bg-gradient-to-br from-info/10 to-info/5 animate-scale-in">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-6 w-6 text-info" />
                <h4 className="font-bold text-lg">Acción Requerida</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                ¿Has completado el servicio? Márcalo como realizado para que el cliente pueda confirmar.
              </p>
              <Button 
                size="lg"
                className="w-full bg-gradient-to-r from-info to-info/80 hover:from-info/90 hover:to-info/70 text-lg py-6 shadow-xl hover-scale" 
                onClick={handleMarkAsShipped}
                disabled={markingShipped || !!activeAppeal}
              >
                <Check className="mr-2 h-6 w-6" />
                {markingShipped ? "Procesando..." : "Marcar Servicio como Realizado"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* In-person delivery: Meeting proposal panel */}
        {transaction.sale_type === "producto_persona" && ["funds_secured", "in_delivery"].includes(transaction.state) && realSellerId && realBuyerId && (
          <MeetingProposalPanel
            transactionId={transaction.id}
            userId={user?.id || ""}
            sellerId={realSellerId}
            buyerId={realBuyerId}
            isSeller={isSeller}
            sellerName={realSellerProfile?.full_name || sellerLabel}
            buyerName={realBuyerProfile?.full_name || buyerLabel}
          />
        )}

        {/* Buyer: mark as received (envío) */}
        {isBuyer && transaction.state === "in_delivery" && transaction.sale_type === "producto_envio" && (
          <Card className="border-2 border-success/30 shadow-xl bg-gradient-to-br from-success/10 to-success/5 animate-scale-in">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-6 w-6 text-success" />
                <h4 className="font-bold text-lg">¿Recibiste el producto?</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Cuando recibas el producto físicamente, márcalo como recibido para iniciar tu período de revisión.
              </p>
              <Button 
                size="lg"
                className="w-full bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-lg py-6 shadow-xl hover-scale" 
                onClick={handleMarkAsReceived}
                disabled={markingReceived || !!activeAppeal}
              >
                <Package className="mr-2 h-6 w-6" />
                {markingReceived ? "Procesando..." : "Marcar como Recibido"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Service client: confirm delivery */}
        {isBuyer && transaction.state === "in_delivery" && transaction.sale_type === "servicio" && (
          <Card className="border-2 border-success/30 shadow-xl bg-gradient-to-br from-success/10 to-success/5 animate-scale-in">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-6 w-6 text-success" />
                <h4 className="font-bold text-lg">¿El servicio fue realizado correctamente?</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Si estás satisfecho con el servicio, confirma para liberar el pago al proveedor.
              </p>
              <Button 
                size="lg"
                className="w-full bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-lg py-6 shadow-xl hover-scale" 
                onClick={handleConfirmDelivery}
                disabled={confirmingDelivery || !!activeAppeal}
              >
                <Check className="mr-2 h-6 w-6" />
                {confirmingDelivery ? "Procesando..." : "Confirmar y Liberar Pago"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* In-person delivery: confirm handoff */}
        {isBuyer && transaction.state === "in_delivery" && transaction.sale_type === "producto_persona" && (
          <Card className="border-2 border-success/30 shadow-xl bg-gradient-to-br from-success/10 to-success/5 animate-scale-in">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Handshake className="h-6 w-6 text-success" />
                <h4 className="font-bold text-lg">¿Recibiste el producto en persona?</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Si ya tienes el producto en tus manos y todo está correcto, confirma para liberar el pago.
              </p>
              <Button 
                size="lg"
                className="w-full bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-lg py-6 shadow-xl hover-scale" 
                onClick={handleConfirmDelivery}
                disabled={confirmingDelivery || !!activeAppeal}
              >
                <Handshake className="mr-2 h-6 w-6" />
                {confirmingDelivery ? "Procesando..." : "Confirmar Recepción y Liberar Pago"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Review Period UI */}
        {isBuyer && transaction.state === "awaiting_buyer_review" && (
          <Card className="border-2 border-warning/30 shadow-xl bg-gradient-to-br from-warning/10 to-warning/5 animate-scale-in">
            <CardContent className="p-6 space-y-4">
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
                commission={Number(transaction.commission) || 0}
                onRequestCreated={loadTransaction}
              />

              <p className="text-xs text-muted-foreground text-center">
                ⚠️ Solo confirma si el producto está en perfectas condiciones
              </p>
            </CardContent>
          </Card>
        )}

        {/* Seller waiting for review */}
        {isSeller && transaction.state === "awaiting_buyer_review" && (
          <Card className="border-2 border-info/30 shadow-xl bg-gradient-to-br from-info/10 to-info/5 animate-scale-in">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-6 w-6 text-info" />
                <h4 className="font-bold text-lg">Comprador Revisando</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                El comprador ha recibido el producto y lo está revisando. Cuando confirme que todo está correcto, recibirás el pago.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Return Status Panel */}
        {["return_requested", "return_in_progress"].includes(transaction.state) && transaction.seller_id && transaction.buyer_id && (
          <ReturnStatusPanel
            transactionId={transaction.id}
            sellerId={transaction.seller_id}
            buyerId={transaction.buyer_id}
            isBuyer={isBuyer}
            isSeller={isSeller}
            transactionAmount={transaction.amount}
            onStatusChange={loadTransaction}
          />
        )}

        {/* Resolved Appeal Alert */}
        {isAppealResolved && !activeAppeal && (
          <Card className="border-2 border-green-200 dark:border-green-800 shadow-xl bg-green-50 dark:bg-green-950 animate-scale-in">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0 mt-1" />
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-green-900 dark:text-green-100 mb-1">
                    Apelación Resuelta
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-1">
                    {transaction.appeal_status === 'resuelta_a_favor_comprador' && 'El caso fue resuelto a favor del comprador.'}
                    {transaction.appeal_status === 'resuelta_a_favor_vendedor' && 'El caso fue resuelto a favor del vendedor.'}
                    {transaction.appeal_status === 'resuelta_parcial' && 'El caso fue resuelto con una distribución parcial de fondos.'}
                    {transaction.appeal_status === 'cerrada' && 'El caso ha sido cerrado.'}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Los fondos han sido distribuidos según la resolución.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Appeal Alert - Only show for non-return mediation appeals and when not resolved */}
        {activeAppeal && !activeAppeal.reason_description?.startsWith("[MEDIACIÓN DEVOLUCIÓN]") && !isAppealResolved && (
          <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 animate-scale-in">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Apelación Activa
                <Badge variant="outline" className="ml-auto bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                  {activeAppeal.status === "apelacion_abierta" && "Abierta"}
                  {activeAppeal.status === "en_negociacion" && "En negociación"}
                  {activeAppeal.status === "pendiente_intervencion_plataforma" && "Esperando admin"}
                  {activeAppeal.status === "en_revision_plataforma" && "En revisión"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reason Info */}
              <div className="p-4 bg-background/80 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Motivo de la apelación:</p>
                <p className="font-semibold">
                  {activeAppeal.reason === "producto_no_llego" && "El producto nunca llegó"}
                  {activeAppeal.reason === "producto_diferente" && "Producto distinto al acordado"}
                  {activeAppeal.reason === "danos_o_fallas" && "Daños o fallas en el producto"}
                  {activeAppeal.reason === "incumplimiento_acuerdo" && "Incumplimiento del acuerdo"}
                  {activeAppeal.reason === "servicio_no_realizado" && "Servicio no realizado"}
                  {activeAppeal.reason === "trabajo_deficiente" && "Trabajo deficiente"}
                  {activeAppeal.reason === "otro" && "Otro motivo"}
                </p>
                {activeAppeal.reason_description && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    "{activeAppeal.reason_description}"
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-3">
                  <span className="font-medium">Iniciada por:</span>{" "}
                  {activeAppeal.initiator_id === transaction.seller_id 
                    ? (sellerProfile?.full_name || "Vendedor")
                    : (buyerProfile?.full_name || "Comprador")}
                </p>
              </div>

              {/* Info */}
              <div className="p-4 bg-amber-100 dark:bg-amber-900/50 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      Resolución de conflicto en curso
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 mb-3">
                      Ambas partes pueden negociar una solución o escalar a un administrador para que tome una decisión.
                    </p>
                    <div className="bg-amber-50 dark:bg-amber-950/50 rounded-md p-3 mt-2">
                      <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">📋 ¿Qué pasará después?</p>
                      <ol className="list-decimal ml-4 space-y-1 text-amber-700 dark:text-amber-300">
                        <li>Negocia un acuerdo mutuo con la otra parte</li>
                        <li>Sube evidencia para respaldar tu caso</li>
                        <li>Si no hay acuerdo, un admin tomará la decisión</li>
                        <li>Los fondos se distribuirán según la resolución</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => navigate(`/appeal/${activeAppeal.id}`)}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Ir a la Sala de Apelación
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Dispute state */}
        {transaction.state === "in_dispute" && (
          <Card className="border-2 border-destructive/30 shadow-xl bg-gradient-to-br from-destructive/20 to-destructive/5 animate-scale-in">
            <CardContent className="p-6">
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
            </CardContent>
          </Card>
        )}

        {/* Appeal Resolution Result Panel */}
        {isAppealResolved && appealDecision && (
          <Card className="border-2 border-emerald-200 dark:border-emerald-800 shadow-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 animate-scale-in">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="font-bold text-lg text-emerald-900 dark:text-emerald-100">
                      {appealDecision.is_mutual_agreement ? "Acuerdo Mutuo Alcanzado" : "Apelación Resuelta"}
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      {appealDecision.is_mutual_agreement && "Las partes llegaron a un acuerdo sin intervención del administrador"}
                      {!appealDecision.is_mutual_agreement && transaction.appeal_status === "resuelta_a_favor_comprador" && "Decisión a favor del comprador"}
                      {!appealDecision.is_mutual_agreement && transaction.appeal_status === "resuelta_a_favor_vendedor" && "Decisión a favor del vendedor"}
                      {!appealDecision.is_mutual_agreement && transaction.appeal_status === "resuelta_parcial" && "Resolución parcial acordada"}
                      {!appealDecision.is_mutual_agreement && transaction.appeal_status === "cerrada" && "Caso cerrado"}
                    </p>
                  </div>
                  
                  {/* Distribution amounts */}
                  {(appealDecision.buyer_refund_amount > 0 || appealDecision.seller_payment_amount > 0) && (
                    <div className="grid grid-cols-2 gap-3">
                      {appealDecision.buyer_refund_amount > 0 && (
                        <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Reembolso al Comprador</p>
                          <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">${formatCLP(appealDecision.buyer_refund_amount)}</p>
                        </div>
                      )}
                      {appealDecision.seller_payment_amount > 0 && (
                        <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Pago al Vendedor</p>
                          <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">${formatCLP(appealDecision.seller_payment_amount)}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Resolution notes */}
                  <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                      {appealDecision.is_mutual_agreement ? "Detalle del acuerdo:" : "Notas del administrador:"}
                    </p>
                    <p className="text-sm text-emerald-800 dark:text-emerald-200">
                      {appealDecision.resolution_notes}
                    </p>
                  </div>
                  
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Resuelto el {new Date(appealDecision.created_at).toLocaleDateString("es-CL", { 
                      day: "numeric", 
                      month: "long", 
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed state */}
        {(transaction.state === "completed" || isAppealResolved) && (
          <Card className="border-2 border-success/30 shadow-xl bg-gradient-to-br from-success/20 to-success/5 animate-scale-in">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-success/20 rounded-full">
                  <Check className="h-16 w-16 text-success" />
                </div>
              </div>
              <p className="font-bold text-2xl text-success mb-2">🎉 ¡Transacción Completada!</p>
              <p className="text-muted-foreground">
                Gracias por usar Trado. Los fondos han sido liberados exitosamente.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Rating CTA after completion */}
        {(transaction.state === "completed" || isAppealResolved) && ((isSeller && !hasRatedBuyer && transaction.buyer_id) || (isBuyer && !hasRatedSeller)) && (
          <Card className="border-2 border-warning/30 shadow-xl bg-gradient-to-br from-warning/10 to-warning/5 animate-scale-in">
            <CardContent className="p-6">
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
            </CardContent>
          </Card>
        )}

        {/* Already rated message */}
        {(transaction.state === "completed" || isAppealResolved) && (
          <>
            {isSeller && hasRatedBuyer && isBuyer && hasRatedSeller && (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Ya has calificado esta transacción
                </p>
              </div>
            )}
            
            {isSeller && hasRatedBuyer && !isBuyer && (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Ya has calificado al comprador
                </p>
              </div>
            )}
            
            {isBuyer && hasRatedSeller && !isSeller && (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Ya has calificado al vendedor
                </p>
              </div>
            )}
          </>
        )}

        {/* === SECTION 2: INVITE CODE (when waiting for other party) === */}
        {isInitiator && transaction.state === "created" && !joinerProfile && (
          <Card className="border-2 border-info/30 shadow-lg bg-gradient-to-br from-info/20 to-info/5 animate-scale-in">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 sm:p-2 bg-info rounded-lg animate-pulse">
                  <Copy className="h-4 w-4 sm:h-5 sm:w-5 text-info-foreground" />
                </div>
                <h4 className="font-bold text-info text-base sm:text-lg">
                  ⏳ Esperando {joinerRoleLabel}
                </h4>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Input
                    value={transaction.invite_code}
                    readOnly
                    className="text-center text-lg sm:text-2xl font-mono tracking-widest font-bold bg-background/50 border-2 border-info/30"
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={copyInviteCode} 
                      variant="outline"
                      className="flex-1 border-2 border-info/30 hover:bg-info/20 transition-all"
                    >
                      {copied ? <Check className="h-4 w-4 sm:h-5 sm:w-5 text-success mr-2" /> : <Copy className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />}
                      <span className="text-sm">Copiar código</span>
                    </Button>
                    {isInitiator && (
                      <Button
                        variant="destructive"
                        className="font-semibold text-sm"
                        onClick={handleCancelTransaction}
                        disabled={cancellingTransaction}
                      >
                        {cancellingTransaction ? "..." : "Cancelar"}
                      </Button>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={copyInviteLink} 
                  variant="outline"
                  className="border-2 border-primary/30 hover:bg-primary/20 transition-all w-full text-sm"
                >
                  {copiedLink ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  <span className="ml-2">Copiar enlace de invitación</span>
                </Button>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-3 text-center">
                📱 Comparte el código o el enlace con {joinerRoleLabel.toLowerCase()}
              </p>
            </CardContent>
          </Card>
        )}

        {/* === SECTION 3: PRODUCT DETAILS (compressed) === */}
        <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-card to-card/80">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5 pb-4 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg sm:text-2xl mb-1 font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent break-words">
                  {transaction.product_name}
                </CardTitle>
                {transaction.product_description && (() => {
                  // Separar la descripción normal de la info de envío
                  const descParts = transaction.product_description.split(/\n\n?📦 Envío:/);
                  const mainDesc = descParts[0]?.trim();
                  const shippingInfo = descParts[1] ? `📦 Envío:${descParts[1]}` : null;
                  
                  return (
                    <>
                      {mainDesc && (
                        <CardDescription className="text-xs sm:text-sm line-clamp-2">{mainDesc}</CardDescription>
                      )}
                      {shippingInfo && (
                        <div className="mt-2 p-2 sm:p-3 bg-primary/10 border border-primary/30 rounded-lg">
                          <div className="flex items-center gap-2 text-sm sm:text-base font-medium text-primary">
                            <Package className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                            <span className="break-all">{shippingInfo}</span>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="flex flex-wrap gap-2 items-center sm:items-end shrink-0">
                {transaction.sale_type && (
                  <Badge variant="outline" className="text-xs px-2 py-1">
                    {transaction.sale_type === "servicio" && "🛠️ Servicio"}
                    {transaction.sale_type === "producto_persona" && "🤝 En Persona"}
                    {transaction.sale_type === "producto_envio" && "📦 Envío"}
                  </Badge>
                )}
                {(() => {
                  if (isAppealResolved) {
                    return (
                      <Badge className="bg-success text-xs sm:text-sm px-2 sm:px-3 py-1 shadow-lg">
                        Completada
                      </Badge>
                    );
                  }
                  
                  return (
                    <Badge className={`${stateLabels[transaction.state]?.color || "bg-secondary"} text-xs sm:text-sm px-2 sm:px-3 py-1 shadow-lg`}>
                      {stateLabels[transaction.state]?.label || transaction.state}
                    </Badge>
                  );
                })()}
                {activeAppeal && (
                  <Badge className="bg-amber-500 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 shadow-lg">
                    En Apelación
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 px-4 sm:px-6">
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg blur-xl"></div>
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 sm:p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg border-2 border-primary/20">
                {isBuyer ? (
                  <>
                    <span className="text-sm sm:text-base font-semibold">Tu pago total</span>
                    <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      ${formatCLP(buyerPays)}
                    </span>
                  </>
                ) : isSeller ? (
                  <>
                    <span className="text-sm sm:text-base font-semibold">Recibirás</span>
                    <span className="text-2xl sm:text-3xl font-bold text-success">
                      ${formatCLP(sellerReceives)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm sm:text-base font-semibold">Precio acordado</span>
                    <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      ${formatCLP(transaction.amount)}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Current Status Progress Indicator */}
            {joinerProfile && !['completed', 'cancelled', 'in_dispute'].includes(transaction.state) && !isAppealResolved && (
              <div className="mt-4 p-4 bg-gradient-to-br from-success/20 to-success/5 rounded-xl border border-success/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/20 rounded-full">
                    {transaction.state === 'invited' && <DollarSign className="h-5 w-5 text-success" />}
                    {transaction.state === 'funds_secured' && <Shield className="h-5 w-5 text-success" />}
                    {transaction.state === 'in_delivery' && <Truck className="h-5 w-5 text-success" />}
                    {transaction.state === 'awaiting_buyer_review' && <Eye className="h-5 w-5 text-success" />}
                    {['return_requested', 'return_in_progress'].includes(transaction.state) && <Package className="h-5 w-5 text-warning" />}
                    {!['invited', 'funds_secured', 'in_delivery', 'awaiting_buyer_review', 'return_requested', 'return_in_progress'].includes(transaction.state) && <Check className="h-5 w-5 text-success" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-success">
                      {transaction.state === 'invited' && `⏳ Esperando depósito del ${buyerLabel.toLowerCase()}`}
                      {transaction.state === 'funds_secured' && '✅ Fondos asegurados en escrow'}
                      {transaction.state === 'in_delivery' && `📦 ${transaction.sale_type === 'servicio' ? 'Servicio en proceso' : 'Producto en camino'}`}
                      {transaction.state === 'awaiting_buyer_review' && '👁️ Período de revisión activo'}
                      {transaction.state === 'return_requested' && '📦 Devolución solicitada'}
                      {transaction.state === 'return_in_progress' && '📦 Devolución en progreso'}
                      {transaction.state === 'created' && `✅ ${joinerRoleLabel} se ha unido`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.state === 'invited' && `${joinerProfile?.full_name} se ha unido, falta depositar`}
                      {transaction.state === 'funds_secured' && (
                        transaction.sale_type === 'servicio' 
                          ? `El proveedor debe confirmar que realizó el servicio`
                          : transaction.sale_type === 'producto_persona'
                          ? `Coordinen punto de encuentro para la entrega`
                          : `El vendedor debe marcar el producto como enviado`
                      )}
                      {transaction.state === 'in_delivery' && `${buyerLabel} debe confirmar la recepción`}
                      {transaction.state === 'awaiting_buyer_review' && `${buyerLabel} está revisando el producto`}
                      {transaction.state === 'return_requested' && `Esperando respuesta del ${sellerLabel.toLowerCase()}`}
                      {transaction.state === 'return_in_progress' && `Devolución en tránsito`}
                      {transaction.state === 'created' && joinerProfile?.full_name}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* === SECTION 4: PROGRESS TIMELINE === */}
        <Card className="border-2 border-primary/10 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <h4 className="font-bold text-lg sm:text-xl mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Progreso de la Transacción
            </h4>
            
            {/* Service timeline */}
            {transaction.sale_type === 'servicio' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Step 1: Room Created */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg bg-success text-success-foreground shrink-0">
                    <Store className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Sala Creada</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      ✅ {creatorRoleLabel} ({creatorName}) creó la sala
                    </p>
                  </div>
                </div>

                {/* Step 2: Client Joined */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    joinerProfile ? 'bg-success text-success-foreground' : 'bg-muted'
                  }`}>
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">{joinerRoleLabel} Unido</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {joinerProfile ? `✅ ${joinerRoleLabel} (${joinerName}) confirmado` : `⏳ Esperando ${joinerRoleLabel.toLowerCase()}...`}
                    </p>
                  </div>
                </div>

                {/* Step 3: Escrow */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    passedDelivery || transaction.state === 'funds_secured'
                      ? 'bg-success text-success-foreground' 
                      : transaction.state === 'awaiting_deposit' || transaction.state === 'invited'
                      ? 'bg-warning text-warning-foreground animate-pulse'
                      : 'bg-muted'
                  }`}>
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Pago en Escrow</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {passedDelivery || transaction.state === 'funds_secured'
                        ? '✅ Fondos asegurados'
                        : transaction.state === 'invited'
                        ? `⏳ Esperando depósito...`
                        : '⚪ Pendiente'}
                    </p>
                  </div>
                </div>

                {/* Step 4: Service Performed */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    passedDelivery
                      ? 'bg-success text-success-foreground'
                      : transaction.state === 'funds_secured'
                      ? 'bg-warning text-warning-foreground animate-pulse'
                      : 'bg-muted'
                  }`}>
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Servicio Realizado</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {passedDelivery
                        ? `✅ ${sellerLabel} completó el servicio`
                        : transaction.state === 'funds_secured'
                        ? `⏳ Esperando...`
                        : '⚪ Pendiente'}
                    </p>
                  </div>
                </div>

                {/* Step 5: Client Confirms */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    isCompleted
                      ? 'bg-success text-success-foreground'
                      : passedDelivery
                      ? 'bg-warning text-warning-foreground animate-pulse'
                      : 'bg-muted'
                  }`}>
                    <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Cliente Confirma</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {isCompleted
                        ? '✅ Servicio confirmado'
                        : passedDelivery
                        ? `⏳ Esperando confirmación...`
                        : '⚪ Pendiente'}
                    </p>
                  </div>
                </div>

                {/* Step 6: Completed */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    isCompleted
                      ? 'bg-success text-success-foreground'
                      : 'bg-muted'
                  }`}>
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Completada</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {isCompleted 
                        ? isAppealResolved 
                          ? '✅ Resuelto' 
                          : '✅ ¡Listo!' 
                        : '⚪ Pendiente'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* In-person delivery timeline */}
            {isInPersonDelivery && (
              <div className="space-y-3 sm:space-y-4">
                {/* Step 1: Room Created */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg bg-success text-success-foreground shrink-0">
                    <Store className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Sala Creada</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      ✅ {creatorRoleLabel} ({creatorName}) creó la sala
                    </p>
                  </div>
                </div>

                {/* Step 2: Buyer Joined */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    joinerProfile ? 'bg-success text-success-foreground' : 'bg-muted'
                  }`}>
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">{joinerRoleLabel} Unido</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {joinerProfile ? `✅ ${joinerName} confirmado` : `⏳ Esperando...`}
                    </p>
                  </div>
                </div>

                {/* Step 3: Escrow */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    passedDelivery || transaction.state === 'funds_secured'
                      ? 'bg-success text-success-foreground' 
                      : transaction.state === 'awaiting_deposit' || transaction.state === 'invited'
                      ? 'bg-warning text-warning-foreground animate-pulse'
                      : 'bg-muted'
                  }`}>
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Pago en Escrow</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {passedDelivery || transaction.state === 'funds_secured'
                        ? '✅ Fondos asegurados'
                        : transaction.state === 'invited'
                        ? `⏳ Esperando depósito...`
                        : '⚪ Pendiente'}
                    </p>
                  </div>
                </div>

                {/* Step 4: Ready to Meet */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    passedDelivery
                      ? 'bg-success text-success-foreground'
                      : transaction.state === 'funds_secured'
                      ? 'bg-warning text-warning-foreground animate-pulse'
                      : 'bg-muted'
                  }`}>
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Listo para Entregar</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {passedDelivery
                        ? '✅ Encuentro coordinado'
                        : transaction.state === 'funds_secured'
                        ? '📍 Coordinen lugar y hora'
                        : '⚪ Pendiente'}
                    </p>
                  </div>
                </div>

                {/* Step 5: Meeting / Handoff */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    isCompleted
                      ? 'bg-success text-success-foreground'
                      : passedDelivery
                      ? 'bg-warning text-warning-foreground animate-pulse'
                      : 'bg-muted'
                  }`}>
                    <Handshake className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Confirmar Entrega</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {isCompleted
                        ? '✅ Entrega confirmada'
                        : passedDelivery
                        ? `🤝 Confirmar recepción`
                        : '⚪ Pendiente'}
                    </p>
                  </div>
                </div>

                {/* Step 6: Completed */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    isCompleted
                      ? 'bg-success text-success-foreground'
                      : 'bg-muted'
                  }`}>
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Completada</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {isCompleted 
                        ? isAppealResolved 
                          ? '✅ Resuelto' 
                          : '✅ ¡Listo!' 
                        : '⚪ Pendiente'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Standard shipping timeline */}
            {transaction.sale_type === 'producto_envio' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Step 1: Room Created */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg bg-success text-success-foreground shrink-0">
                    <Store className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Sala Creada</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      ✅ {creatorRoleLabel} ({creatorName}) creó la sala
                    </p>
                  </div>
                </div>

                {/* Step 2: Buyer Joined */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    joinerProfile ? 'bg-success text-success-foreground' : 'bg-muted'
                  }`}>
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">{joinerRoleLabel} Unido</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {joinerProfile ? `✅ ${joinerName} confirmado` : `⏳ Esperando...`}
                    </p>
                  </div>
                </div>

                {/* Step 3: Escrow */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    passedDelivery || transaction.state === 'funds_secured'
                      ? 'bg-success text-success-foreground' 
                      : transaction.state === 'awaiting_deposit' || transaction.state === 'invited'
                      ? 'bg-warning text-warning-foreground animate-pulse'
                      : 'bg-muted'
                  }`}>
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Pago en Escrow</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {passedDelivery || transaction.state === 'funds_secured'
                        ? '✅ Fondos asegurados'
                        : transaction.state === 'invited'
                        ? `⏳ Esperando depósito...`
                        : '⚪ Pendiente'}
                    </p>
                  </div>
                </div>

                {/* Step 4: Shipped */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    passedDelivery
                      ? 'bg-success text-success-foreground'
                      : transaction.state === 'funds_secured'
                      ? 'bg-warning text-warning-foreground animate-pulse'
                      : 'bg-muted'
                  }`}>
                    <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Producto Enviado</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {passedDelivery
                        ? `✅ Enviado`
                        : transaction.state === 'funds_secured'
                        ? `⏳ Esperando envío...`
                        : '⚪ Pendiente'}
                    </p>
                  </div>
                </div>

                {/* Step 5: Received */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    passedReceived
                      ? 'bg-success text-success-foreground'
                      : transaction.state === 'in_delivery'
                      ? 'bg-warning text-warning-foreground animate-pulse'
                      : 'bg-muted'
                  }`}>
                    <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Producto Recibido</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {passedReceived
                        ? `✅ Recibido`
                        : transaction.state === 'in_delivery'
                        ? `🚚 En camino...`
                        : '⚪ Pendiente'}
                    </p>
                  </div>
                </div>

                {/* Step 6: Review Period */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    isCompleted
                      ? 'bg-success text-success-foreground'
                      : isInReview
                      ? 'bg-warning text-warning-foreground animate-pulse'
                      : 'bg-muted'
                  }`}>
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Período de Revisión</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {isCompleted
                        ? '✅ Completado'
                        : ['return_requested', 'return_in_progress'].includes(transaction.state)
                        ? '🔄 Devolución en proceso'
                        : transaction.state === 'awaiting_buyer_review'
                        ? `🔍 Revisando...`
                        : '⚪ Pendiente'}
                    </p>
                  </div>
                </div>

                {/* Step 7: Completed */}
                <div className="flex items-center gap-3 sm:gap-4 group">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    isCompleted
                      ? 'bg-success text-success-foreground'
                      : 'bg-muted'
                  }`}>
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">Completada</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {isCompleted 
                        ? isAppealResolved 
                          ? '✅ Resuelto' 
                          : '✅ ¡Listo!' 
                        : '⚪ Pendiente'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* === SECTION 5: CHAT (PROMINENT) === */}
        {transaction.buyer_id && (
          <TransactionChat
            transactionId={transaction.id}
            sellerId={transaction.seller_id}
            sellerName={sellerProfile?.full_name || "Vendedor"}
            buyerId={transaction.buyer_id || undefined}
            buyerName={buyerProfile?.full_name}
          />
        )}

        {/* Create Appeal Button */}
        {!activeAppeal && transaction && ["funds_secured", "in_delivery", "awaiting_buyer_review", "return_requested", "return_in_progress"].includes(transaction.state) && (
          <div className="flex justify-center">
            <CreateAppealDialog
              transactionId={transaction.id}
              userId={user?.id || ""}
              saleType={transaction.sale_type || undefined}
            />
          </div>
        )}

        {/* === SECTION 6: PARTICIPANTS WITH RATINGS === */}
        <Card className="border border-muted">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Participantes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <Accordion type="single" collapsible className="w-full space-y-2">
              {/* Real Seller/Provider */}
              <AccordionItem value="seller-ratings" className="border rounded-lg bg-gradient-to-br from-success/5 to-transparent px-2 sm:px-3">
                <AccordionTrigger className="hover:no-underline py-2 sm:py-3">
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    {realSellerProfile ? (
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-success/30 shrink-0">
                        <AvatarImage src={realSellerProfile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-success/20 text-success font-bold text-xs sm:text-sm">
                          {realSellerProfile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || (isService ? "P" : "V")}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                        <Store className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-xs sm:text-sm">{sellerLabel}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {realSellerProfile?.full_name || "Esperando..."}
                      </p>
                    </div>
                    {realSellerProfile && (
                      <div className="flex items-center gap-1 mr-1 sm:mr-2 shrink-0">
                        {realSellerProfile.is_verified ? (
                          <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-1.5 bg-success/10 text-success border-success/30">
                            <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-1.5 bg-warning/10 text-warning border-warning/30">
                            <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-1.5">
                          <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-warning fill-warning mr-0.5 sm:mr-1" />
                          {realSellerProfile.reputation_score?.toFixed(1) || "0.0"}
                        </Badge>
                      </div>
                    )}
                  </div>
                </AccordionTrigger>
                {realSellerProfile && (
                  <AccordionContent className="pt-2 pb-3 sm:pb-4">
                    <UserRatings userId={realSellerProfile.id} maxRatings={5} />
                  </AccordionContent>
                )}
              </AccordionItem>
              
              {/* Real Buyer/Client */}
              <AccordionItem value="buyer-ratings" className="border rounded-lg bg-gradient-to-br from-info/5 to-transparent px-2 sm:px-3">
                <AccordionTrigger className="hover:no-underline py-2 sm:py-3">
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    {realBuyerProfile ? (
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-info/30 shrink-0">
                        <AvatarImage src={realBuyerProfile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-info/20 text-info font-bold text-xs sm:text-sm">
                          {realBuyerProfile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || "C"}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-info/20 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-info" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-xs sm:text-sm">{buyerLabel}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {realBuyerProfile?.full_name || "Esperando..."}
                      </p>
                    </div>
                    {realBuyerProfile && (
                      <div className="flex items-center gap-1 mr-1 sm:mr-2 shrink-0">
                        {realBuyerProfile.is_verified ? (
                          <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-1.5 bg-success/10 text-success border-success/30">
                            <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-1.5 bg-warning/10 text-warning border-warning/30">
                            <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-1.5">
                          <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-warning fill-warning mr-0.5 sm:mr-1" />
                          {realBuyerProfile.reputation_score?.toFixed(1) || "0.0"}
                        </Badge>
                      </div>
                    )}
                  </div>
                </AccordionTrigger>
                {realBuyerProfile && (
                  <AccordionContent className="pt-2 pb-3 sm:pb-4">
                    <UserRatings userId={realBuyerProfile.id} maxRatings={5} />
                  </AccordionContent>
                )}
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
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
        <DialogContent className="overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-success/10 rounded-full blur-xl animate-pulse" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          
          <DialogHeader className="relative animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            {/* Animated icon */}
            <div className="mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-success/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative w-16 h-16 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center shadow-lg animate-scale-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Confirmar Depósito en Escrow</DialogTitle>
            <DialogDescription className="text-center">
              Revisa el desglose antes de confirmar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 relative">
            {/* Desglose financiero */}
            <div 
              className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border/50 animate-fade-in transition-all duration-200 hover:bg-muted/70" 
              style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
            >
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Precio del {transaction.sale_type === "servicio" ? "servicio" : "producto"}</span>
                <span className="font-medium">${formatCLP(transaction.amount)}</span>
              </div>
              {initiatorRole === 'buyer' && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Comisión Trado</span>
                  <span className="font-medium">${formatCLP(transaction.commission)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total a depositar</span>
                <span className="font-bold text-lg text-primary">${formatCLP(buyerPays)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{sellerLabel} recibirá</span>
                <span className="text-success font-medium">${formatCLP(sellerReceives)}</span>
              </div>
            </div>
            
            <div 
              className="p-4 bg-warning/10 rounded-lg border border-warning/20 animate-fade-in transition-all duration-200 hover:bg-warning/15"
              style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-warning" />
                </div>
                <p className="text-sm">
                  Tu dinero estará 100% seguro. Solo se liberará al {sellerLabel.toLowerCase()} cuando confirmes que
                  recibiste {transaction.sale_type === "servicio" ? "el servicio" : "el producto"}.
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleDeposit} 
              className="w-full bg-success hover:bg-success/90 animate-fade-in group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-success/25"
              style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
              disabled={depositingEscrow}
            >
              {depositingEscrow ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <DollarSign className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
              )}
              {depositingEscrow ? "Procesando..." : `Confirmar Depósito de $${formatCLP(buyerPays)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent className="overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-destructive/10 rounded-full blur-xl animate-pulse" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-warning/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          
          <DialogHeader className="relative animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            {/* Animated icon */}
            <div className="mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-destructive/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative w-16 h-16 bg-gradient-to-br from-destructive to-destructive/80 rounded-full flex items-center justify-center shadow-lg animate-scale-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Abrir Disputa</DialogTitle>
            <DialogDescription className="text-center">
              Describe el problema con esta transacción. Un administrador lo revisará.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 relative">
            <div 
              className="p-4 bg-warning/10 rounded-lg border border-warning/20 animate-fade-in transition-all duration-200 hover:bg-warning/15"
              style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-warning" />
                </div>
                <p className="text-sm">
                  <strong>Importante:</strong> Solo abre una disputa si hay un problema real. 
                  El uso indebido puede afectar tu reputación.
                </p>
              </div>
            </div>
            
            <div 
              className="animate-fade-in"
              style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
            >
              <Label htmlFor="disputeReason">Motivo de la Disputa</Label>
              <Textarea
                id="disputeReason"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe detalladamente el problema..."
                rows={4}
                required
                className="mt-2 transition-all duration-200 focus:ring-2 focus:ring-destructive/20"
              />
            </div>
            
            <div 
              className="flex gap-2 animate-fade-in"
              style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
            >
              <Button 
                variant="outline" 
                className="flex-1 transition-all duration-200 hover:scale-[1.02]"
                onClick={() => setDisputeDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-destructive/25"
                onClick={handleOpenDispute}
                disabled={openingDispute}
              >
                {openingDispute ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Procesando...
                  </>
                ) : (
                  "Abrir Disputa"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shipping Dialog - for producto_envio */}
      <Dialog open={shippingDialogOpen} onOpenChange={setShippingDialogOpen}>
        <DialogContent className="overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-info/10 rounded-full blur-xl animate-pulse" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          
          <DialogHeader className="relative animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            {/* Animated icon */}
            <div className="mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-info/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative w-16 h-16 bg-gradient-to-br from-info to-info/80 rounded-full flex items-center justify-center shadow-lg animate-scale-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                <Truck className="w-8 h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Información de Envío</DialogTitle>
            <DialogDescription className="text-center">
              Ingresa los datos del envío para que el comprador pueda rastrear su pedido
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 relative">
            <div 
              className="space-y-2 animate-fade-in"
              style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
            >
              <Label htmlFor="shippingTracking">Número de seguimiento *</Label>
              <Input
                id="shippingTracking"
                value={shippingTrackingNumber}
                onChange={(e) => setShippingTrackingNumber(e.target.value)}
                placeholder="Ej: ABC123456789"
                className="transition-all duration-200 focus:ring-2 focus:ring-info/20"
              />
            </div>
            
            <div 
              className="space-y-2 animate-fade-in"
              style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
            >
              <Label htmlFor="shippingCarrier">Empresa de envío *</Label>
              <Select 
                value={shippingCarrier} 
                onValueChange={(value) => {
                  setShippingCarrier(value);
                  if (value !== "otro") setShippingCustomCarrier("");
                }}
              >
                <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-info/20">
                  <SelectValue placeholder="Selecciona courier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starken">Starken</SelectItem>
                  <SelectItem value="chilexpress">Chilexpress</SelectItem>
                  <SelectItem value="correos_chile">Correos de Chile</SelectItem>
                  <SelectItem value="blue_express">Blue Express</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {shippingCarrier === "otro" && (
              <div 
                className="space-y-2 animate-fade-in"
                style={{ animationFillMode: 'both' }}
              >
                <Label htmlFor="shippingCustomCarrier">Nombre del courier *</Label>
                <Input
                  id="shippingCustomCarrier"
                  value={shippingCustomCarrier}
                  onChange={(e) => setShippingCustomCarrier(e.target.value)}
                  placeholder="Ej: DHL, FedEx, etc."
                  className="transition-all duration-200 focus:ring-2 focus:ring-info/20"
                />
              </div>
            )}
            
            <div 
              className="flex gap-2 animate-fade-in"
              style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
            >
              <Button 
                variant="outline" 
                className="flex-1 transition-all duration-200 hover:scale-[1.02]"
                onClick={() => setShippingDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-info hover:bg-info/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-info/25"
                onClick={handleMarkAsShipped}
                disabled={markingShipped}
              >
                {markingShipped ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Procesando...
                  </>
                ) : (
                  "Confirmar Envío"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Confirmation Dialog */}
      <Dialog open={joinConfirmDialogOpen} onOpenChange={setJoinConfirmDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-center pb-4">
            <div 
              className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-info to-info/60 flex items-center justify-center mb-4 animate-scale-in"
              style={{ animationFillMode: 'both' }}
            >
              <ShieldCheck className="h-8 w-8 text-white animate-pulse" />
            </div>
            <DialogTitle className="text-xl">
              {canJoinAsBuyer 
                ? `Confirmar ${transaction?.sale_type === "servicio" ? "Contratación" : "Compra"}`
                : `Confirmar como ${transaction?.sale_type === "servicio" ? "Proveedor" : "Vendedor"}`}
            </DialogTitle>
            <DialogDescription>
              Revisa los detalles antes de unirte a esta transacción
            </DialogDescription>
          </DialogHeader>

          {transaction && (
            <div className="space-y-4">
              {/* Product/Service Details */}
              <div 
                className="bg-muted/50 rounded-lg p-4 space-y-3 animate-fade-in"
                style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
              >
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{transaction.product_name}</p>
                    {transaction.product_description && (
                      <p className="text-sm text-muted-foreground mt-1">{transaction.product_description}</p>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {initiatorRole === 'seller' 
                        ? (isService ? 'Proveedor' : 'Vendedor')
                        : (isService ? 'Cliente' : 'Comprador')}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{creatorProfile?.full_name || 'Cargando...'}</p>
                      {creatorProfile?.is_verified && (
                        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Creator Reputation */}
                <div className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-warning" />
                    <span className="text-sm">Reputación</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {creatorProfile?.reputation_score !== undefined && creatorProfile.reputation_score > 0 ? (
                      <>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < Math.round(creatorProfile.reputation_score)
                                ? "text-warning fill-warning"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                        <span className="text-sm font-medium ml-1">
                          ({creatorProfile.reputation_score.toFixed(1)})
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin calificaciones</span>
                    )}
                  </div>
                </div>

                {/* Verification warning if not verified */}
                {creatorProfile && !creatorProfile.is_verified && (
                  <div className="flex items-center gap-2 p-2 bg-warning/10 rounded-lg text-warning text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Este usuario aún no ha verificado su identidad</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">
                    {transaction.sale_type === "servicio" 
                      ? "Servicio" 
                      : transaction.sale_type === "producto_envio" 
                        ? "Producto con envío" 
                        : "Producto en persona"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {creatorProfile?.total_transactions || 0} transacciones
                  </span>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div 
                className="bg-success/10 border border-success/20 rounded-lg p-4 space-y-3 animate-fade-in"
                style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
              >
                <h4 className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-success" />
                  Desglose Financiero
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Precio del {isService ? 'servicio' : 'producto'}</span>
                    <span>${formatCLP(transaction.amount)}</span>
                  </div>
                  
                  {/* Commission is already factored into the amounts shown */}
                  
                  <Separator />
                  
                  {canJoinAsBuyer ? (
                    <>
                      <div className="flex justify-between font-bold text-base">
                        <span>Total a depositar</span>
                        <span className="text-success">${formatCLP(buyerPays)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Lo que recibe el {isService ? 'proveedor' : 'vendedor'}</span>
                        <span>${formatCLP(sellerReceives)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between font-bold text-base">
                        <span>Recibirás</span>
                        <span className="text-success">${formatCLP(sellerReceives)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>El {isService ? 'cliente' : 'comprador'} depositará</span>
                        <span>${formatCLP(buyerPays)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Verification Warning for Unverified Users */}
              {isUserVerified === false && (
                <div 
                  className="bg-warning/10 border border-warning/30 rounded-lg p-4 space-y-3 animate-fade-in"
                  style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="font-medium text-warning">Usuario no verificado</p>
                      <p className="text-sm text-muted-foreground">
                        Tienes límites de transacción activos:
                      </p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                        <li>Máximo ${formatCLP(UNVERIFIED_LIMITS.PER_TRANSACTION)} por transacción</li>
                        <li>Máximo ${formatCLP(UNVERIFIED_LIMITS.TOTAL_ACCUMULATED)} acumulado total</li>
                      </ul>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 border-warning/50 text-warning hover:bg-warning/10"
                        onClick={() => {
                          setJoinConfirmDialogOpen(false);
                          navigate("/verification");
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Verificar identidad
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Protection Message */}
              <div 
                className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 animate-fade-in"
                style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
              >
                <Lock className="h-4 w-4 text-info" />
                <p>
                  {canJoinAsBuyer 
                    ? `Tu pago estará 100% protegido hasta que confirmes ${isService ? 'el servicio' : 'la recepción del producto'}.`
                    : `El pago estará protegido en escrow hasta que ${isService ? 'el cliente confirme el servicio' : 'el comprador confirme la entrega'}.`}
                </p>
              </div>
            </div>
          )}

          <DialogFooter 
            className="flex gap-3 pt-4 animate-fade-in"
            style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
          >
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setJoinConfirmDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-info hover:bg-info/90"
              onClick={handleJoin}
              disabled={joiningTransaction}
            >
              {joiningTransaction ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Uniéndose...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar y Unirme
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transaction;
