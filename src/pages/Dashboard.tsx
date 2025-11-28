import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Store, Wallet, Star, LogOut, Plus, Shield, CheckCircle, Settings, ArrowRight, History, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatCLP } from "@/lib/utils";

interface Profile {
  full_name: string;
  reputation_score: number;
  total_transactions: number;
  is_verified: boolean;
  verification_status: string;
}

interface WalletData {
  balance: number;
}

interface Transaction {
  id: string;
  product_name: string;
  amount: number;
  state: string;
  seller_id: string;
  buyer_id: string | null;
  created_at: string;
}

const stateLabels: Record<string, { label: string; color: string }> = {
  created: { label: "Creada", color: "bg-gray-500" },
  invited: { label: "Invitado", color: "bg-blue-500" },
  awaiting_deposit: { label: "Esperando depósito", color: "bg-yellow-500" },
  funds_secured: { label: "Fondos asegurados", color: "bg-green-500" },
  in_delivery: { label: "En entrega", color: "bg-purple-500" },
  completed: { label: "Completada", color: "bg-emerald-500" },
  cancelled: { label: "Cancelada", color: "bg-red-500" },
  in_dispute: { label: "En disputa", color: "bg-orange-500" },
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useAdminRole();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      loadUserData();
    }
  }, [user, authLoading, navigate]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const [profileRes, walletRes, transactionsRes, completedTransactionsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("wallets").select("*").eq("user_id", user.id).single(),
        supabase
          .from("transactions")
          .select("*")
          .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
          .not("state", "in", '("completed","cancelled")')
          .order("created_at", { ascending: false }),
        supabase
          .from("transactions")
          .select("id")
          .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
          .eq("state", "completed")
      ]);

      if (profileRes.error) throw profileRes.error;
      if (walletRes.error) throw walletRes.error;

      // Calculate total transactions dynamically from completed transactions
      const totalTransactions = completedTransactionsRes.data?.length || 0;
      
      setProfile({
        ...profileRes.data,
        total_transactions: totalTransactions
      });
      setWallet(walletRes.data);
      
      if (transactionsRes.data) {
        setTransactions(transactionsRes.data);
      }
    } catch (error: any) {
      toast.error("Error al cargar datos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Intentar cerrar sesión usando el cliente oficial
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
      }
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      // Como respaldo, limpiar cualquier sesión local del backend
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-")) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.error("Error limpiando sesión local:", e);
      }

      // Forzar recarga en la pantalla de auth para evitar estados inconsistentes
      window.location.href = "/auth";
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
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-lg">
              <ShoppingBag className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Trado</h1>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Button>
            )}
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Card */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-primary to-primary-light text-primary-foreground">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  ¡Hola, {profile?.full_name || "Usuario"}!
                  {profile?.is_verified && (
                    <CheckCircle className="h-6 w-6" />
                  )}
                </CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  Bienvenido a tu panel de control seguro
                </CardDescription>
              </div>
              {profile?.verification_status === 'approved' && (
                <Badge className="bg-white/20 text-white border-white/30">
                  <Shield className="w-4 h-4 mr-1" />
                  Verificado
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex gap-6">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <div>
                <p className="text-sm opacity-80">Saldo</p>
                <p className="text-2xl font-bold">${formatCLP(wallet?.balance || 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              <div>
                <p className="text-sm opacity-80">Reputación</p>
                <p className="text-2xl font-bold">
                  {profile?.reputation_score?.toFixed(1) || "0.0"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm opacity-80">Transacciones</p>
              <p className="text-2xl font-bold">{profile?.total_transactions || 0}</p>
            </div>
          </CardContent>
        </Card>

        {/* Transactions in Progress */}
        {transactions.length > 0 && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-primary" />
                Transacciones en Curso
              </CardTitle>
              <CardDescription>
                Tus transacciones activas como vendedor o comprador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    onClick={() => navigate(`/transaction/${transaction.id}`)}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{transaction.product_name}</h4>
                          <Badge className={stateLabels[transaction.state]?.color || "bg-gray-500"}>
                            {stateLabels[transaction.state]?.label || transaction.state}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">${formatCLP(transaction.amount)}</span>
                          <span>
                            {transaction.seller_id === user?.id ? "Vendedor" : "Comprador"}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer border-2 hover:border-primary"
                onClick={() => navigate("/create-sale")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-success/10 rounded-xl">
                  <Store className="h-8 w-8 text-success" />
                </div>
                <div>
                  <CardTitle className="text-xl">Vender</CardTitle>
                  <CardDescription>Crea una transacción segura</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Crea una sala de transacción para vender tu producto de forma segura con escrow
              </p>
              <Button className="w-full bg-success hover:bg-success/90">
                <Plus className="mr-2 h-4 w-4" />
                Crear Venta
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-shadow cursor-pointer border-2 hover:border-info"
                onClick={() => navigate("/join-transaction")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-info/10 rounded-xl">
                  <ShoppingBag className="h-8 w-8 text-info" />
                </div>
                <div>
                  <CardTitle className="text-xl">Comprar</CardTitle>
                  <CardDescription>Únete a una transacción</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Ingresa el código de invitación para unirte a una compra protegida
              </p>
              <Button className="w-full bg-info hover:bg-info/90">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Unirse a Compra
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-shadow cursor-pointer border-2 hover:border-primary/50"
                onClick={() => navigate("/transaction-history")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <History className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Historial</CardTitle>
                  <CardDescription>Revisa tus transacciones</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Ve todas tus compras y ventas completadas
              </p>
              <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                <History className="mr-2 h-4 w-4" />
                Ver Historial
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Card */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              Mi Billetera
            </CardTitle>
            <CardDescription>Administra tu saldo virtual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">Saldo disponible</span>
              <span className="text-2xl font-bold">${formatCLP(wallet?.balance || 0)}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" onClick={() => navigate("/wallet")}>
                <History className="mr-2 h-4 w-4" />
                Movimientos
              </Button>
              <Button onClick={() => navigate("/wallet?action=deposit")}>
                <Plus className="mr-2 h-4 w-4" />
                Depositar
              </Button>
              <Button variant="outline" onClick={() => navigate("/wallet?action=withdraw")}>
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Retirar
              </Button>
            </div>
            
            {profile?.verification_status !== 'approved' && (
              <div className="mt-4 p-4 bg-info/10 border border-info/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-info mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Aumenta tu reputación</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Verifica tu identidad para ganar más confianza
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => navigate("/verification")}
                    >
                      Verificar ahora
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
