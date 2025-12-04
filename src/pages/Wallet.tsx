import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, ArrowUpRight, ArrowDownRight, Clock, History, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatCLP, formatAmountInput, parseFormattedAmount } from "@/lib/utils";

interface Movement {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  status: string;
  bank_holder_name?: string;
  bank_holder_rut?: string;
  bank_name?: string;
  bank_account_type?: string;
  bank_account_number?: string;
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
  const [editMovementOpen, setEditMovementOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [amount, setAmount] = useState("");
  const [amountDisplay, setAmountDisplay] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Withdrawal form fields
  const [bankHolderName, setBankHolderName] = useState("");
  const [bankHolderRut, setBankHolderRut] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountType, setBankAccountType] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");

  // Company bank details for deposits
  const companyBankDetails = {
    name: "Trado SpA",
    rut: "76.XXX.XXX-X",
    bank: "Banco de Chile",
    accountType: "Cuenta Corriente",
    accountNumber: "XXXX-XXXX-XXXX",
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      loadWalletData();
      
      const movementsChannel = supabase
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
            
            if (updatedMovement.status === 'approved') {
              toast.success(`${updatedMovement.type === 'deposit' ? 'Depósito' : 'Retiro'} aprobado por $${formatCLP(updatedMovement.amount)}`, {
                duration: 5000,
              });
              loadWalletData();
            } else if (updatedMovement.status === 'rejected') {
              toast.error(`${updatedMovement.type === 'deposit' ? 'Depósito' : 'Retiro'} rechazado por $${formatCLP(updatedMovement.amount)}`, {
                duration: 5000,
              });
              loadWalletData();
            }
          }
        )
        .subscribe();

      const walletChannel = supabase
        .channel('wallet_balance_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'wallets',
            filter: `user_id=eq.${user.id}`
          },
          (payload: any) => {
            console.log('Balance actualizado:', payload.new.balance);
            setBalance(payload.new.balance);
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(movementsChannel);
        supabase.removeChannel(walletChannel);
      };
    }

    if (searchParams.get("action") === "deposit") {
      setDepositOpen(true);
    } else if (searchParams.get("action") === "withdraw") {
      loadBankDetails().then(() => setWithdrawOpen(true));
    }
  }, [user, authLoading, navigate, searchParams]);

  const loadBankDetails = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("bank_holder_name, bank_holder_rut, bank_name, bank_account_type, bank_account_number")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setBankHolderName(data.bank_holder_name || "");
        setBankHolderRut(data.bank_holder_rut || "");
        setBankName(data.bank_name || "");
        setBankAccountType(data.bank_account_type || "");
        setBankAccountNumber(data.bank_account_number || "");
      }
    } catch (error: any) {
      console.error("Error loading bank details:", error);
    }
  };

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
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(20);

      if (movementsError) throw movementsError;
      setMovements(movementsData || []);

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

  const handleAmountChange = (value: string) => {
    const formatted = formatAmountInput(value);
    setAmountDisplay(formatted);
    setAmount(parseFormattedAmount(value).toString());
  };

  const handleDeposit = async () => {
    if (!user || !amount || submitting) return;

    const depositAmount = parseFormattedAmount(amount);
    if (depositAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    setSubmitting(true);
    try {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!wallet) throw new Error("Billetera no encontrada");

      const { data: movement, error: movementError } = await supabase
        .from("wallet_movements")
        .insert({
          wallet_id: wallet.id,
          type: "deposit",
          amount: depositAmount,
          balance_after: wallet.balance,
          description: "Depósito",
          status: "pending",
        })
        .select()
        .single();

      if (movementError) throw movementError;

      // Get user profile for email
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      // Send notification email
      try {
        await supabase.functions.invoke("notify-wallet-movement", {
          body: {
            movementId: movement.id,
            userEmail: profile?.email || user.email,
            userName: profile?.full_name || "Usuario",
            type: "deposit",
            amount: depositAmount,
          },
        });
      } catch (emailError) {
        console.error("Error sending notification email:", emailError);
        // Don't fail the deposit if email fails
      }

      toast.success("Solicitud de depósito enviada. Por favor realiza la transferencia a la cuenta indicada.");
      setDepositOpen(false);
      setAmount("");
      setAmountDisplay("");
      loadWalletData();
    } catch (error: any) {
      toast.error("Error al solicitar depósito: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user || !amount || submitting) return;

    const withdrawAmount = parseFormattedAmount(amount);
    if (withdrawAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    if (withdrawAmount > balance) {
      toast.error("Saldo insuficiente");
      return;
    }

    if (!bankHolderName || !bankHolderRut || !bankName || !bankAccountType || !bankAccountNumber) {
      toast.error("Por favor completa todos los datos bancarios");
      return;
    }

    setSubmitting(true);
    try {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!wallet) throw new Error("Billetera no encontrada");

      const { data: movement, error: movementError } = await supabase
        .from("wallet_movements")
        .insert({
          wallet_id: wallet.id,
          type: "withdrawal",
          amount: withdrawAmount,
          balance_after: wallet.balance,
          description: "Retiro",
          status: "pending",
          bank_holder_name: bankHolderName,
          bank_holder_rut: bankHolderRut,
          bank_name: bankName,
          bank_account_type: bankAccountType,
          bank_account_number: bankAccountNumber,
        })
        .select()
        .single();

      if (movementError) throw movementError;

      // Get user profile for email
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      // Send notification email
      try {
        await supabase.functions.invoke("notify-wallet-movement", {
          body: {
            movementId: movement.id,
            userEmail: profile?.email || user.email,
            userName: profile?.full_name || "Usuario",
            type: "withdrawal",
            amount: withdrawAmount,
            bankDetails: {
              holderName: bankHolderName,
              holderRut: bankHolderRut,
              bankName: bankName,
              accountType: bankAccountType,
              accountNumber: bankAccountNumber,
            },
          },
        });
      } catch (emailError) {
        console.error("Error sending notification email:", emailError);
        // Don't fail the withdrawal if email fails
      }

      toast.success("Solicitud de retiro enviada para aprobación");
      setWithdrawOpen(false);
      setAmount("");
      setAmountDisplay("");
      setBankHolderName("");
      setBankHolderRut("");
      setBankName("");
      setBankAccountType("");
      setBankAccountNumber("");
      loadWalletData();
    } catch (error: any) {
      toast.error("Error al solicitar retiro: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditMovement = (movement: Movement) => {
    setSelectedMovement(movement);
    setAmount(movement.amount.toString());
    setAmountDisplay(formatAmountInput(movement.amount.toString()));
    if (movement.type === "withdrawal") {
      // Pre-fill withdrawal form fields
      setBankHolderName(movement.bank_holder_name || "");
      setBankHolderRut(movement.bank_holder_rut || "");
      setBankName(movement.bank_name || "");
      setBankAccountType(movement.bank_account_type || "");
      setBankAccountNumber(movement.bank_account_number || "");
    }
    setEditMovementOpen(true);
  };

  const handleUpdateMovement = async () => {
    if (!selectedMovement || !amount || submitting) return;

    const newAmount = parseFormattedAmount(amount);
    if (newAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    if (selectedMovement.type === "withdrawal" && newAmount > balance) {
      toast.error("Saldo insuficiente");
      return;
    }

    if (selectedMovement.type === "withdrawal") {
      if (!bankHolderName || !bankHolderRut || !bankName || !bankAccountType || !bankAccountNumber) {
        toast.error("Por favor completa todos los datos bancarios");
        return;
      }
    }

    setSubmitting(true);
    try {
      const updateData: any = {
        amount: newAmount,
      };

      if (selectedMovement.type === "withdrawal") {
        updateData.bank_holder_name = bankHolderName;
        updateData.bank_holder_rut = bankHolderRut;
        updateData.bank_name = bankName;
        updateData.bank_account_type = bankAccountType;
        updateData.bank_account_number = bankAccountNumber;
      }

      const { error } = await supabase
        .from("wallet_movements")
        .update(updateData)
        .eq("id", selectedMovement.id)
        .eq("status", "pending"); // Only allow editing pending movements

      if (error) throw error;

      toast.success("Movimiento actualizado correctamente");
      setEditMovementOpen(false);
      setSelectedMovement(null);
      setAmount("");
      setAmountDisplay("");
      setBankHolderName("");
      setBankHolderRut("");
      setBankName("");
      setBankAccountType("");
      setBankAccountNumber("");
      loadWalletData();
    } catch (error: any) {
      toast.error("Error al actualizar movimiento: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelMovement = async (movementId: string) => {
    try {
      const { error } = await supabase
        .from("wallet_movements")
        .update({ status: "cancelled" })
        .eq("id", movementId)
        .eq("status", "pending");

      if (error) throw error;

      toast.success("Movimiento cancelado");
      loadWalletData();
    } catch (error: any) {
      toast.error("Error al cancelar movimiento: " + error.message);
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
            onClick={() => {
              loadBankDetails();
              setWithdrawOpen(true);
            }}
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
              <p className="text-5xl font-bold">${formatCLP(balance)}</p>
            </div>
          </CardContent>
        </Card>

        {pendingMovements.filter((m) => m.type === "deposit" || m.type === "withdrawal").length > 0 && (
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
                {pendingMovements
                  .filter((movement) => movement.type === "deposit" || movement.type === "withdrawal")
                  .map((movement) => {
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
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-bold text-warning">
                              {isDeposit ? "+" : "-"}${formatCLP(Math.abs(movement.amount))}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              En revisión
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditMovement(movement)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelMovement(movement.id)}
                            >
                              Cancelar
                            </Button>
                          </div>
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
                  const isDeposit = movement.type === "deposit" || movement.type === "escrow_release";
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
                          {isDeposit ? "+" : "-"}${formatCLP(Math.abs(movement.amount))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Saldo: ${formatCLP(movement.balance_after)}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Depositar Fondos</DialogTitle>
            <DialogDescription>
              Realiza una transferencia a nuestra cuenta bancaria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deposit-amount">Monto a depositar</Label>
              <Input
                id="deposit-amount"
                type="text"
                inputMode="numeric"
                placeholder="10.000"
                value={amountDisplay}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
            </div>

            <div className="p-4 bg-info/10 border border-info/20 rounded-lg space-y-3">
              <p className="font-semibold text-sm">📋 Datos de la cuenta de Trado</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Titular:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{companyBankDetails.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(companyBankDetails.name)}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">RUT:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{companyBankDetails.rut}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(companyBankDetails.rut)}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Banco:</span>
                  <span className="font-medium">{companyBankDetails.bank}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">{companyBankDetails.accountType}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Número de cuenta:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{companyBankDetails.accountNumber}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(companyBankDetails.accountNumber)}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-muted-foreground">
                ⚠️ <strong>Instrucciones importantes:</strong><br/>
                1. Realiza la transferencia por el monto exacto indicado<br/>
                2. Usa como referencia tu nombre completo<br/>
                3. Una vez realizada la transferencia, presiona "Confirmar Depósito"<br/>
                4. Tu saldo se actualizará una vez que el administrador apruebe el depósito
              </p>
            </div>

            <Button 
              onClick={handleDeposit} 
              className="w-full bg-success hover:bg-success/90"
              disabled={submitting || !amount}
            >
              {submitting ? "Procesando..." : "Confirmar Depósito"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Retirar Fondos</DialogTitle>
            <DialogDescription>
              Solicita un retiro a tu cuenta bancaria (saldo disponible: ${formatCLP(balance)})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="withdraw-amount">Monto a retirar</Label>
              <Input
                id="withdraw-amount"
                type="text"
                inputMode="numeric"
                placeholder="5.000"
                value={amountDisplay}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Máximo disponible: ${formatCLP(balance)}
              </p>
            </div>

            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <p className="font-semibold text-sm">Datos de tu cuenta bancaria</p>
              
              <div>
                <Label htmlFor="bank-holder-name">Nombre del titular</Label>
                <Input
                  id="bank-holder-name"
                  value={bankHolderName}
                  onChange={(e) => setBankHolderName(e.target.value)}
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <Label htmlFor="bank-holder-rut">RUT del titular</Label>
                <Input
                  id="bank-holder-rut"
                  value={bankHolderRut}
                  onChange={(e) => setBankHolderRut(e.target.value)}
                  placeholder="12.345.678-9"
                />
              </div>

              <div>
                <Label htmlFor="bank-name">Banco</Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger id="bank-name">
                    <SelectValue placeholder="Selecciona tu banco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Banco de Chile">Banco de Chile</SelectItem>
                    <SelectItem value="Banco Estado">Banco Estado</SelectItem>
                    <SelectItem value="Banco Santander">Banco Santander</SelectItem>
                    <SelectItem value="BCI">BCI</SelectItem>
                    <SelectItem value="Scotiabank">Scotiabank</SelectItem>
                    <SelectItem value="Banco Security">Banco Security</SelectItem>
                    <SelectItem value="Banco Falabella">Banco Falabella</SelectItem>
                    <SelectItem value="Banco Itaú">Banco Itaú</SelectItem>
                    <SelectItem value="Banco Bice">Banco Bice</SelectItem>
                    <SelectItem value="Banco Consorcio">Banco Consorcio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bank-account-type">Tipo de cuenta</Label>
                <Select value={bankAccountType} onValueChange={setBankAccountType}>
                  <SelectTrigger id="bank-account-type">
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cuenta Corriente">Cuenta Corriente</SelectItem>
                    <SelectItem value="Cuenta Vista">Cuenta Vista</SelectItem>
                    <SelectItem value="Cuenta de Ahorro">Cuenta de Ahorro</SelectItem>
                    <SelectItem value="Cuenta RUT">Cuenta RUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bank-account-number">Número de cuenta</Label>
                <Input
                  id="bank-account-number"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="1234567890"
                />
              </div>
            </div>

            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-muted-foreground">
                ⚠️ Tu solicitud será revisada por un administrador. Los fondos se transferirán a la cuenta bancaria que proporcionaste una vez aprobada.
              </p>
            </div>
            
            <Button 
              onClick={handleWithdraw} 
              className="w-full"
              disabled={submitting || !amount}
            >
              {submitting ? "Procesando..." : "Solicitar Retiro"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Movement Dialog */}
      <Dialog open={editMovementOpen} onOpenChange={setEditMovementOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar {selectedMovement?.type === "deposit" ? "Depósito" : "Retiro"}</DialogTitle>
            <DialogDescription>
              Modifica los datos de tu solicitud pendiente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-amount">Monto</Label>
              <Input
                id="edit-amount"
                type="text"
                inputMode="numeric"
                placeholder="10.000"
                value={amountDisplay}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
            </div>

            {selectedMovement?.type === "withdrawal" && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <p className="font-semibold text-sm">Datos de tu cuenta bancaria</p>
                
                <div>
                  <Label htmlFor="edit-bank-holder-name">Nombre del titular</Label>
                  <Input
                    id="edit-bank-holder-name"
                    value={bankHolderName}
                    onChange={(e) => setBankHolderName(e.target.value)}
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-bank-holder-rut">RUT del titular</Label>
                  <Input
                    id="edit-bank-holder-rut"
                    value={bankHolderRut}
                    onChange={(e) => setBankHolderRut(e.target.value)}
                    placeholder="12.345.678-9"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-bank-name">Banco</Label>
                  <Select value={bankName} onValueChange={setBankName}>
                    <SelectTrigger id="edit-bank-name">
                      <SelectValue placeholder="Selecciona tu banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Banco de Chile">Banco de Chile</SelectItem>
                      <SelectItem value="Banco Estado">Banco Estado</SelectItem>
                      <SelectItem value="Banco Santander">Banco Santander</SelectItem>
                      <SelectItem value="BCI">BCI</SelectItem>
                      <SelectItem value="Scotiabank">Scotiabank</SelectItem>
                      <SelectItem value="Banco Security">Banco Security</SelectItem>
                      <SelectItem value="Banco Falabella">Banco Falabella</SelectItem>
                      <SelectItem value="Banco Itaú">Banco Itaú</SelectItem>
                      <SelectItem value="Banco Bice">Banco Bice</SelectItem>
                      <SelectItem value="Banco Consorcio">Banco Consorcio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-bank-account-type">Tipo de cuenta</Label>
                  <Select value={bankAccountType} onValueChange={setBankAccountType}>
                    <SelectTrigger id="edit-bank-account-type">
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cuenta Corriente">Cuenta Corriente</SelectItem>
                      <SelectItem value="Cuenta Vista">Cuenta Vista</SelectItem>
                      <SelectItem value="Cuenta de Ahorro">Cuenta de Ahorro</SelectItem>
                      <SelectItem value="Cuenta RUT">Cuenta RUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-bank-account-number">Número de cuenta</Label>
                  <Input
                    id="edit-bank-account-number"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="1234567890"
                  />
                </div>
              </div>
            )}

            <Button 
              onClick={handleUpdateMovement} 
              className="w-full"
              disabled={submitting || !amount}
            >
              {submitting ? "Procesando..." : `Actualizar ${selectedMovement?.type === "deposit" ? "Depósito" : "Retiro"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Wallet;
