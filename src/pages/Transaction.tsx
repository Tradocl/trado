import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Check, AlertCircle, Package, DollarSign, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Transaction {
  id: string;
  seller_id: string;
  buyer_id: string | null;
  product_name: string;
  product_description: string;
  amount: number;
  commission: number;
  state: string;
  invite_code: string;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  reputation_score: number;
}

const stateLabels: Record<string, { label: string; color: string }> = {
  created: { label: "Creada", color: "bg-secondary" },
  invited: { label: "Comprador Unido", color: "bg-info" },
  awaiting_deposit: { label: "Esperando Depósito", color: "bg-warning" },
  funds_secured: { label: "Fondos Asegurados", color: "bg-success" },
  in_delivery: { label: "En Entrega", color: "bg-info" },
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
  const [copied, setCopied] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");

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

  const handleDeposit = async () => {
    if (!user || !transaction) return;

    try {
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

      // Lock funds in escrow
      const newBalance = wallet.balance - transaction.amount;

      await supabase.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);

      await supabase.from("wallet_movements").insert({
        wallet_id: wallet.id,
        transaction_id: transaction.id,
        type: "escrow_lock",
        amount: -transaction.amount,
        balance_after: newBalance,
        description: `Fondos bloqueados - ${transaction.product_name}`,
      });

      await supabase
        .from("transactions")
        .update({ state: "funds_secured", deposited_at: new Date().toISOString() })
        .eq("id", transaction.id);

      toast.success("¡Fondos depositados en escrow!");
      setDepositDialogOpen(false);
      loadTransaction();
    } catch (error: any) {
      toast.error("Error al depositar: " + error.message);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!user || !transaction) return;

    try {
      // Get seller wallet
      const { data: sellerWallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", transaction.seller_id)
        .single();

      if (!sellerWallet) throw new Error("Billetera del vendedor no encontrada");

      const amountAfterCommission = transaction.amount - transaction.commission;
      const newSellerBalance = sellerWallet.balance + amountAfterCommission;

      // Release funds to seller
      await supabase
        .from("wallets")
        .update({ balance: newSellerBalance })
        .eq("id", sellerWallet.id);

      await supabase.from("wallet_movements").insert({
        wallet_id: sellerWallet.id,
        transaction_id: transaction.id,
        type: "escrow_release",
        amount: amountAfterCommission,
        balance_after: newSellerBalance,
        description: `Pago liberado - ${transaction.product_name}`,
      });

      // Update transaction
      await supabase
        .from("transactions")
        .update({ state: "completed", completed_at: new Date().toISOString() })
        .eq("id", transaction.id);

      // Update seller stats
      const { data: sellerProfileData } = await supabase
        .from("profiles")
        .select("total_transactions")
        .eq("id", transaction.seller_id)
        .single();

      if (sellerProfileData) {
        await supabase
          .from("profiles")
          .update({ total_transactions: sellerProfileData.total_transactions + 1 })
          .eq("id", transaction.seller_id);
      }

      toast.success("¡Pago liberado al vendedor!");
      setRatingDialogOpen(true);
      loadTransaction();
    } catch (error: any) {
      toast.error("Error al confirmar entrega: " + error.message);
    }
  };

  const handleSubmitRating = async () => {
    if (!user || !transaction) return;

    try {
      const ratedId = user.id === transaction.seller_id ? transaction.buyer_id : transaction.seller_id;

      if (!ratedId) return;

      await supabase.from("ratings").insert({
        transaction_id: transaction.id,
        rater_id: user.id,
        rated_id: ratedId,
        stars: rating,
        comment: ratingComment,
      });

      toast.success("¡Calificación enviada!");
      setRatingDialogOpen(false);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error("Error al enviar calificación: " + error.message);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-muted">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Status Card */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2">{transaction.product_name}</CardTitle>
                <CardDescription>{transaction.product_description}</CardDescription>
              </div>
              <Badge className={stateLabels[transaction.state]?.color || "bg-secondary"}>
                {stateLabels[transaction.state]?.label || transaction.state}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">Monto</span>
              <span className="text-2xl font-bold">${transaction.amount}</span>
            </div>

            {isSeller && !transaction.buyer_id && (
              <div className="p-4 bg-info/10 rounded-lg border border-info/20">
                <h4 className="font-semibold text-info mb-2">Código de Invitación</h4>
                <div className="flex gap-2">
                  <Input
                    value={transaction.invite_code}
                    readOnly
                    className="text-center text-xl font-mono tracking-widest"
                  />
                  <Button onClick={copyInviteCode} variant="outline">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Comparte este código con el comprador
                </p>
              </div>
            )}

            {/* Participants */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Vendedor</h4>
                <p className="text-sm">{sellerProfile?.full_name}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 text-warning fill-warning" />
                  <span className="text-sm">{sellerProfile?.reputation_score?.toFixed(1) || "0.0"}</span>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Comprador</h4>
                {buyerProfile ? (
                  <>
                    <p className="text-sm">{buyerProfile.full_name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-4 w-4 text-warning fill-warning" />
                      <span className="text-sm">{buyerProfile.reputation_score?.toFixed(1) || "0.0"}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Esperando comprador...</p>
                )}
              </div>
            </div>

            {/* Actions */}
            {isBuyer && transaction.state === "invited" && (
              <Button
                className="w-full"
                onClick={() => setDepositDialogOpen(true)}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Depositar Fondos en Escrow
              </Button>
            )}

            {isBuyer && transaction.state === "funds_secured" && (
              <div className="space-y-2">
                <Button className="w-full bg-success hover:bg-success/90" onClick={handleConfirmDelivery}>
                  <Package className="mr-2 h-4 w-4" />
                  Confirmar que Recibí el Producto
                </Button>
                <Button variant="destructive" className="w-full">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Abrir Disputa
                </Button>
              </div>
            )}

            {transaction.state === "completed" && (
              <div className="p-4 bg-success/10 rounded-lg border border-success/20 text-center">
                <Check className="h-12 w-12 text-success mx-auto mb-2" />
                <p className="font-semibold text-success">¡Transacción Completada!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Deposit Confirmation Dialog */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Depósito</DialogTitle>
            <DialogDescription>
              Se bloquearán ${transaction.amount} de tu billetera hasta que confirmes la entrega
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

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calificar {isSeller ? "Comprador" : "Vendedor"}</DialogTitle>
            <DialogDescription>Comparte tu experiencia con la transacción</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Calificación</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= rating ? "text-warning fill-warning" : "text-muted"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="comment">Comentario (opcional)</Label>
              <Textarea
                id="comment"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Describe tu experiencia..."
                rows={3}
              />
            </div>
            <Button onClick={handleSubmitRating} className="w-full">
              Enviar Calificación
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transaction;
