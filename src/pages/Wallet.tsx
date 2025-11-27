import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Movement {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

const Wallet = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [balance, setBalance] = useState(0);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      loadWalletData();
    }

    // Check if we should open deposit dialog
    if (searchParams.get("action") === "deposit") {
      setDepositOpen(true);
    }
  }, [user, authLoading, navigate, searchParams]);

  const loadWalletData = async () => {
    if (!user) return;

    try {
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (walletError) throw walletError;

      setBalance(wallet.balance);

      const { data: movementsData, error: movementsError } = await supabase
        .from("wallet_movements")
        .select("*")
        .eq("wallet_id", wallet.id)
        .eq("status", "approved") // Only show approved movements
        .order("created_at", { ascending: false })
        .limit(20);

      if (movementsError) throw movementsError;

      setMovements(movementsData || []);
    } catch (error: any) {
      toast.error("Error al cargar billetera: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!user || !amount) return;

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    try {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!wallet) throw new Error("Billetera no encontrada");

      // Create pending movement (requires admin approval)
      await supabase.from("wallet_movements").insert({
        wallet_id: wallet.id,
        type: "deposit",
        amount: depositAmount,
        balance_after: wallet.balance, // Balance doesn't change until approved
        description: "Depósito pendiente de aprobación",
        status: "pending",
      });

      toast.success("Depósito enviado para aprobación");
      setDepositOpen(false);
      setAmount("");
      loadWalletData();
    } catch (error: any) {
      toast.error("Error al depositar: " + error.message);
    }
  };

  const handleWithdraw = async () => {
    if (!user || !amount) return;

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    if (withdrawAmount > balance) {
      toast.error("Saldo insuficiente");
      return;
    }

    try {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!wallet) throw new Error("Billetera no encontrada");

      // Create pending movement (requires admin approval)
      await supabase.from("wallet_movements").insert({
        wallet_id: wallet.id,
        type: "withdrawal",
        amount: -withdrawAmount,
        balance_after: wallet.balance, // Balance doesn't change until approved
        description: "Retiro pendiente de aprobación",
        status: "pending",
      });

      toast.success("Retiro enviado para aprobación");
      setWithdrawOpen(false);
      setAmount("");
      loadWalletData();
    } catch (error: any) {
      toast.error("Error al retirar: " + error.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

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
        <Card className="border-0 shadow-xl bg-gradient-to-br from-primary to-primary-light text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-3xl">Mi Billetera</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Administra tu saldo virtual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="text-sm opacity-80 mb-2">Saldo disponible</p>
              <p className="text-5xl font-bold">${balance.toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="secondary"
                className="bg-white/20 hover:bg-white/30"
                onClick={() => setDepositOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Depositar
              </Button>
              <Button
                variant="secondary"
                className="bg-white/20 hover:bg-white/30"
                onClick={() => setWithdrawOpen(true)}
              >
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Retirar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimientos Recientes</CardTitle>
            <CardDescription>Historial de transacciones</CardDescription>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay movimientos aún
              </p>
            ) : (
              <div className="space-y-4">
                {movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-full ${
                          movement.amount > 0
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {movement.amount > 0 ? (
                          <ArrowDownRight className="h-5 w-5" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{movement.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(movement.created_at).toLocaleDateString("es-CL")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          movement.amount > 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {movement.amount > 0 ? "+" : ""}${Math.abs(movement.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Saldo: ${movement.balance_after}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Depositar Fondos</DialogTitle>
            <DialogDescription>
              Simula un depósito a tu billetera virtual
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deposit-amount">Monto</Label>
              <Input
                id="deposit-amount"
                type="number"
                placeholder="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <Button onClick={handleDeposit} className="w-full">
              Depositar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirar Fondos</DialogTitle>
            <DialogDescription>
              Retira dinero de tu billetera (saldo: ${balance})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="withdraw-amount">Monto</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="1000"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <Button onClick={handleWithdraw} className="w-full">
              Retirar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Wallet;
