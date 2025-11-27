import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, ArrowUpRight, ArrowDownRight, Clock, History } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Movement {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  status: string;
}

const Wallet = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [balance, setBalance] = useState(0);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [pendingMovements, setPendingMovements] = useState<Movement[]>([]);
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
      
      // Set up realtime subscription for movement status changes
      const channel = supabase
        .channel('wallet_movements_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'wallet_movements',
          },
          (payload: any) => {
            const updatedMovement = payload.new;
            
            // Show notification based on status
            if (updatedMovement.status === 'approved') {
              toast.success(`${updatedMovement.type === 'deposit' ? 'Depósito' : 'Retiro'} aprobado por $${updatedMovement.amount}`, {
                duration: 5000,
              });
              loadWalletData(); // Reload to show updated balance
            } else if (updatedMovement.status === 'rejected') {
              toast.error(`${updatedMovement.type === 'deposit' ? 'Depósito' : 'Retiro'} rechazado por $${updatedMovement.amount}`, {
                duration: 5000,
              });
              loadWalletData();
            }
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
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

      // Load approved movements
      const { data: movementsData, error: movementsError } = await supabase
        .from("wallet_movements")
        .select("*")
        .eq("wallet_id", wallet.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(20);

      if (movementsError) throw movementsError;
      setMovements(movementsData || []);

      // Load pending movements
      const { data: pendingData, error: pendingError } = await supabase
        .from("wallet_movements")
        .select("*")
        .eq("wallet_id", wallet.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;
      setPendingMovements(pendingData || []);
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
        amount: withdrawAmount, // Store as positive, type determines if it's subtracted
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
        {/* Action Buttons at the Top */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            size="lg"
            className="bg-success hover:bg-success/90 h-16"
            onClick={() => setDepositOpen(true)}
          >
            <Plus className="mr-2 h-5 w-5" />
            Depositar Dinero
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-16 border-2"
            onClick={() => setWithdrawOpen(true)}
          >
            <ArrowUpRight className="mr-2 h-5 w-5" />
            Retirar Dinero
          </Button>
        </div>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-primary to-primary-light text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-3xl">Mi Billetera</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Saldo actual disponible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-sm opacity-80 mb-2">Saldo disponible</p>
              <p className="text-5xl font-bold">${balance.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Pending Movements */}
        {pendingMovements.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <Clock className="h-5 w-5" />
                Movimientos Pendientes de Aprobación
              </CardTitle>
              <CardDescription>
                Estos movimientos están esperando revisión del administrador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingMovements.map((movement) => {
                  const isDeposit = movement.type === "deposit";
                  return (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between p-4 border border-warning/30 rounded-lg bg-background"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-warning/10 text-warning">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {isDeposit ? "Depósito" : "Retiro"} Pendiente
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(movement.created_at).toLocaleDateString("es-CL")} - {new Date(movement.created_at).toLocaleTimeString("es-CL")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-warning">
                          {isDeposit ? "+" : "-"}${Math.abs(movement.amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          En revisión
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Movimientos Recientes</CardTitle>
                <CardDescription>Historial de movimientos aprobados</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/movement-history")}
              >
                <History className="mr-2 h-4 w-4" />
                Ver Historial Completo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">No hay movimientos aprobados aún</p>
                <p className="text-sm text-muted-foreground">
                  Los depósitos y retiros requieren aprobación del administrador
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {movements.map((movement) => {
                  const isDeposit = movement.type === "deposit";
                  return (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-full ${
                            isDeposit
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {isDeposit ? (
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
                            isDeposit ? "text-success" : "text-destructive"
                          }`}
                        >
                          {isDeposit ? "+" : "-"}${Math.abs(movement.amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Saldo: ${movement.balance_after}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
              El depósito quedará pendiente hasta que un administrador lo apruebe
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deposit-amount">Monto a depositar</Label>
              <Input
                id="deposit-amount"
                type="number"
                placeholder="10000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
              />
            </div>
            <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
              <p className="text-sm text-muted-foreground">
                ℹ️ Tu solicitud será revisada por un administrador. Te notificaremos cuando sea aprobada.
              </p>
            </div>
            <Button onClick={handleDeposit} className="w-full bg-success hover:bg-success/90">
              Solicitar Depósito
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
              Solicita un retiro de tu billetera (saldo disponible: ${balance})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="withdraw-amount">Monto a retirar</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="5000"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Máximo disponible: ${balance}
              </p>
            </div>
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-muted-foreground">
                ⚠️ Tu solicitud será revisada por un administrador. Los fondos no se descontarán hasta que sea aprobada.
              </p>
            </div>
            <Button onClick={handleWithdraw} className="w-full">
              Solicitar Retiro
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Wallet;
