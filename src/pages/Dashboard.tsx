import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest } from "@/contexts/GuestContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Store, Wallet, Star, LogOut, Plus, Shield, CheckCircle, Settings, ArrowRight, History, ArrowUpRight, User, Lock, AlertCircle, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatCLP } from "@/lib/utils";
import tradoShield from "@/assets/trado-shield.png";
import { useTheme } from "next-themes";
import { calculateUserTotalTransactions, UNVERIFIED_LIMITS } from "@/lib/transaction-limits";
import { GuestActionBlocker } from "@/components/GuestActionBlocker";
import { demoProfile, demoWallet, demoTransactions } from "@/lib/demo-data";

interface Profile {
  full_name: string;
  reputation_score: number;
  total_transactions: number;
  is_verified: boolean;
  verification_status: string;
  nickname: string | null;
  dashboard_color: string;
  dashboard_background_url: string | null;
  dashboard_theme: string | null;
}

interface WalletData {
  balance: number;
  blocked_balance: number;
}

interface Transaction {
  id: string;
  product_name: string;
  amount: number;
  state: string;
  appeal_status: string | null;
  seller_id: string;
  buyer_id: string | null;
  created_at: string;
  initiator_role: string | null;
}

const resolvedAppealStatuses = [
  "resuelta_a_favor_comprador",
  "resuelta_a_favor_vendedor",
  "resuelta_parcial",
  "cerrada"
];

const stateLabels: Record<string, { label: string; color: string }> = {
  created: { label: "Esperando Contraparte", color: "bg-gray-500" },
  invited: { label: "Comprador Unido", color: "bg-blue-500" },
  awaiting_deposit: { label: "Esperando Depósito", color: "bg-yellow-500" },
  funds_secured: { label: "Fondos Asegurados", color: "bg-green-500" },
  in_delivery: { label: "En Entrega", color: "bg-purple-500" },
  awaiting_buyer_review: { label: "Período de Revisión", color: "bg-amber-500" },
  return_requested: { label: "Devolución Solicitada", color: "bg-orange-500" },
  return_in_progress: { label: "Devolución en Proceso", color: "bg-orange-600" },
  completed: { label: "Completada", color: "bg-emerald-500" },
  cancelled: { label: "Cancelada", color: "bg-red-500" },
  in_dispute: { label: "En Disputa", color: "bg-orange-500" },
};

const appealStatusLabels: Record<string, { label: string; color: string }> = {
  apelacion_abierta: { label: "En Apelación", color: "bg-orange-500" },
  en_negociacion: { label: "En Negociación", color: "bg-amber-500" },
  pendiente_intervencion_plataforma: { label: "Esperando Intervención", color: "bg-red-500" },
  en_revision_plataforma: { label: "En Revisión Admin", color: "bg-purple-500" },
};

const getCardGradient = (color: string): string => {
  const gradients: Record<string, string> = {
    primary: "bg-gradient-to-br from-primary to-primary-light",
    emerald: "bg-gradient-to-br from-emerald-600 to-emerald-400",
    purple: "bg-gradient-to-br from-purple-600 to-purple-400",
    orange: "bg-gradient-to-br from-orange-600 to-orange-400",
    rose: "bg-gradient-to-br from-rose-600 to-rose-400",
    cyan: "bg-gradient-to-br from-cyan-600 to-cyan-400",
    amber: "bg-gradient-to-br from-amber-600 to-amber-400",
    slate: "bg-gradient-to-br from-slate-700 to-slate-500",
  };
  return gradients[color] || gradients.primary;
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isGuestMode, promptRegistration } = useGuest();
  const { isAdmin } = useAdminRole();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [accumulatedTotal, setAccumulatedTotal] = useState<number>(0);

  useEffect(() => {
    // Allow guest mode access
    if (isGuestMode) {
      setProfile(demoProfile as any);
      setWallet(demoWallet as any);
      setTransactions(demoTransactions as any);
      setLoading(false);
      return;
    }

    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      loadUserData();
    }
  }, [user, authLoading, navigate, isGuestMode]);

  // Realtime subscription for transactions
  useEffect(() => {
    if (!user || isGuestMode) return;

    const channel = supabase
      .channel('dashboard-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          console.log("Transaction updated:", payload);
          // Reload transactions when any change occurs
          loadUserData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isGuestMode]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const [profileRes, walletRes, transactionsRes, completedTransactionsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("transactions")
          .select("*")
          .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
          .not("state", "in", '("completed","cancelled")')
          .order("created_at", { ascending: false }),
        supabase
          .from("transactions")
          .select("id, appeal_status, state")
          .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      ]);

      if (profileRes.error) throw profileRes.error;
      if (walletRes.error) throw walletRes.error;
      
      if (!profileRes.data || !walletRes.data) {
        // User profile or wallet doesn't exist - sign out and redirect
        await supabase.auth.signOut();
        window.location.href = "/auth";
        return;
      }
      // Calculate total completed transactions (state = completed OR appeal resolved)
      const completedCount = completedTransactionsRes.data?.filter(t => 
        (t as any).state === 'completed' || 
        resolvedAppealStatuses.includes(t.appeal_status || '')
      ).length || 0;
      
      const profileData = {
        ...profileRes.data,
        total_transactions: completedCount
      };
      setProfile(profileData);
      
      // Apply user's theme preference
      if (profileData.dashboard_theme && profileData.dashboard_theme !== 'system') {
        setTheme(profileData.dashboard_theme);
      } else if (profileData.dashboard_theme === 'system') {
        setTheme('system');
      }
      setWallet(walletRes.data);
      
      // Load accumulated total for unverified users
      if (!profileData.is_verified) {
        const total = await calculateUserTotalTransactions(user.id);
        setAccumulatedTotal(total);
      }
      
      // Filter out transactions with resolved appeals from "in progress" list
      // EXCEPT for return mediations where return is still in progress
      if (transactionsRes.data) {
        const activeTransactions = transactionsRes.data.filter(t => {
          // If return is still in progress, keep it in active list regardless of appeal status
          const inReturnProcess = ['return_requested', 'return_in_progress'].includes(t.state);
          if (inReturnProcess) return true;
          
          // Otherwise, exclude resolved appeals
          return !resolvedAppealStatuses.includes(t.appeal_status || '');
        });
        setTransactions(activeTransactions);
      }
    } catch (error: any) {
      toast.error("Error al cargar datos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (isGuestMode) {
      navigate("/");
      return;
    }
    
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

  const handleGuestAction = (action: string, navigateTo?: string) => {
    if (isGuestMode) {
      promptRegistration(action);
    } else if (navigateTo) {
      navigate(navigateTo);
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
      {/* Beta Banner */}
      <div className="bg-warning/90 text-warning-foreground py-3 px-4">
        <div className="container mx-auto flex items-center justify-center gap-2 text-center">
          <span className="text-lg">🚧</span>
          <p className="text-sm md:text-base font-medium">
            <strong>Marcha Blanca:</strong> Estamos en fase de pruebas. Depósitos y retiros son simulados y se aprueban automáticamente.
          </p>
          <span className="text-lg">🚧</span>
        </div>
      </div>

      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={tradoShield} alt="Trado" className="h-8 w-8 sm:h-10 sm:w-10" />
            <h1 className="text-xl sm:text-2xl font-bold">Trado</h1>
            {isGuestMode && (
              <Badge variant="outline" className="ml-2 border-info text-info">
                <Eye className="h-3 w-3 mr-1" />
                Modo Invitado
              </Badge>
            )}
          </div>
          <div className="flex gap-1 sm:gap-2">
            <GuestActionBlocker action="editar perfil">
              <Button variant="outline" size="sm" className="px-2 sm:px-4" onClick={() => !isGuestMode && navigate("/profile")}>
                <User className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Perfil</span>
              </Button>
            </GuestActionBlocker>
            {isAdmin && !isGuestMode && (
              <Button variant="outline" size="sm" className="px-2 sm:px-4" onClick={() => navigate("/admin")}>
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" className="px-2 sm:px-4" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{isGuestMode ? "Salir" : "Salir"}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Welcome Card */}
        <Card 
          className={`border-0 shadow-xl text-white overflow-hidden animate-fade-in ${!profile?.dashboard_background_url ? getCardGradient(profile?.dashboard_color || 'primary') : ''}`}
          style={{
            animationDelay: '0.1s',
            animationFillMode: 'both',
            ...(profile?.dashboard_background_url ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${profile.dashboard_background_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {})
          }}
        >
          <CardHeader className="pb-2 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-lg sm:text-2xl flex items-center gap-2 flex-wrap">
                  <span className="truncate max-w-[200px] sm:max-w-none">¡Hola, {profile?.nickname || profile?.full_name?.split(' ')[0] || "Usuario"}!</span>
                  {profile?.is_verified && (
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                  )}
                </CardTitle>
                <CardDescription className="text-white/80 text-xs sm:text-sm">
                  Panel de control seguro
                </CardDescription>
              </div>
              {profile?.verification_status === 'approved' && (
                <Badge className="bg-white/20 text-white border-white/30 w-fit text-xs animate-scale-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Verificado
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 pt-0">
            <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs opacity-80 truncate">Saldo</p>
                <p className="text-base sm:text-2xl font-bold truncate">${formatCLP(wallet?.balance || 0)}</p>
              </div>
            </div>
            {(wallet?.blocked_balance || 0) > 0 && (
              <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '0.25s', animationFillMode: 'both' }}>
                <Lock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs opacity-80 truncate">Escrow</p>
                  <p className="text-base sm:text-2xl font-bold truncate">${formatCLP(wallet?.blocked_balance || 0)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
              <Star className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <div>
                <p className="text-xs opacity-80">Reputación</p>
                <p className="text-base sm:text-2xl font-bold">
                  {profile?.reputation_score?.toFixed(1) || "0.0"}
                </p>
              </div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.35s', animationFillMode: 'both' }}>
              <p className="text-xs opacity-80">Transacciones</p>
              <p className="text-base sm:text-2xl font-bold">{profile?.total_transactions || 0}</p>
            </div>
            
            {/* Límites de transacción para usuarios no verificados */}
            {!profile?.is_verified && (
              <div className="col-span-2 w-full mt-2 animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-warning" />
                  <div className="flex justify-between w-full text-xs opacity-80">
                    <span>Límite acumulado</span>
                    <span>${formatCLP(accumulatedTotal)} / ${formatCLP(UNVERIFIED_LIMITS.TOTAL_ACCUMULATED)}</span>
                  </div>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-warning rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (accumulatedTotal / UNVERIFIED_LIMITS.TOTAL_ACCUMULATED) * 100)}%` }}
                  />
                </div>
                <p className="text-xs opacity-70 mt-1">
                  Disponible: <strong>${formatCLP(Math.max(0, UNVERIFIED_LIMITS.TOTAL_ACCUMULATED - accumulatedTotal))}</strong> • Máx. $100.000/tx
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions in Progress */}
        {transactions.length > 0 && (
          <Card className="border-0 shadow-xl overflow-hidden animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                Transacciones en Curso
              </CardTitle>
              <CardDescription>
                Tus transacciones activas
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {transactions.map((transaction, index) => {
                  // Calculate REAL role of current user based on initiator_role
                  const initiatorRole = transaction.initiator_role || 'seller';
                  let isRealSeller = false;
                  let isRealBuyer = false;
                  
                  // In guest mode, just show demo data visualization
                  if (isGuestMode) {
                    isRealSeller = transaction.seller_id === demoProfile.id;
                    isRealBuyer = transaction.buyer_id !== null && transaction.buyer_id !== demoProfile.id;
                  } else if (initiatorRole === 'seller') {
                    isRealSeller = transaction.seller_id === user?.id;
                    isRealBuyer = transaction.buyer_id === user?.id;
                  } else {
                    // Buyer initiated
                    if (transaction.buyer_id) {
                      // Post-swap
                      isRealSeller = transaction.seller_id === user?.id;
                      isRealBuyer = transaction.buyer_id === user?.id;
                    } else {
                      // Pre-swap: creator (buyer) is in seller_id
                      isRealBuyer = transaction.seller_id === user?.id;
                    }
                  }
                  
                  const handleTransactionClick = () => {
                    if (isGuestMode) {
                      promptRegistration("ver detalles de transacción");
                    } else {
                      navigate(`/transaction/${transaction.id}`);
                    }
                  };
                  
                  return (
                    <div
                      key={transaction.id}
                      onClick={handleTransactionClick}
                      className="group p-4 hover:bg-muted/30 cursor-pointer transition-all duration-200 animate-fade-in"
                      style={{ animationDelay: `${0.3 + index * 0.05}s`, animationFillMode: 'both' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`p-2.5 rounded-xl transition-colors duration-200 ${
                            isRealSeller
                              ? 'bg-emerald-500/10 text-emerald-600' 
                              : 'bg-info/10 text-info'
                          }`}>
                            {isRealSeller ? (
                              <Store className="h-5 w-5" />
                            ) : (
                              <ShoppingBag className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold truncate">{transaction.product_name}</h4>
                              {/* Show appeal status if active, otherwise show transaction state */}
                              {transaction.appeal_status && appealStatusLabels[transaction.appeal_status] ? (
                                <Badge className={`${appealStatusLabels[transaction.appeal_status].color} text-xs`}>
                                  {appealStatusLabels[transaction.appeal_status].label}
                                </Badge>
                              ) : (
                                <Badge className={`${stateLabels[transaction.state]?.color || "bg-gray-500"} text-xs`}>
                                  {stateLabels[transaction.state]?.label || transaction.state}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="font-semibold text-foreground">${formatCLP(transaction.amount)}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                isRealSeller
                                  ? 'bg-emerald-500/10 text-emerald-600' 
                                  : 'bg-info/10 text-info'
                              }`}>
                                {isRealSeller ? "Vendiendo" : "Comprando"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Card - Show for unverified users */}
        {profile?.verification_status !== 'approved' && (
          <Card className={`border-2 shadow-xl overflow-hidden animate-fade-in bg-gradient-to-br ${
            profile?.verification_status === 'in_review' 
              ? 'border-info/30 from-info/5' 
              : 'border-warning/30 from-warning/5'
          } to-transparent`} style={{ animationDelay: '0.25s', animationFillMode: 'both' }}>
            <CardContent className="py-4 sm:py-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${
                  profile?.verification_status === 'in_review' ? 'bg-info/10' : 'bg-warning/10'
                }`}>
                  <Shield className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    profile?.verification_status === 'in_review' ? 'text-info' : 'text-warning'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  {profile?.verification_status === 'in_review' ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm sm:text-base">Verificación en revisión</h4>
                        <Badge variant="outline" className="border-info text-info text-xs">
                          En proceso
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                        Estamos revisando tus documentos. Te notificaremos cuando el proceso esté completo.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Mientras tanto, puedes seguir usando Trado con los límites actuales.
                      </p>
                    </>
                  ) : (
                    <>
                      <h4 className="font-semibold text-sm sm:text-base mb-1">Verifica tu identidad</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                        Genera mayor confianza y elimina los límites de transacción
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-0.5 mb-3">
                        <li>• Sin verificar: máx <strong>$100.000</strong> por transacción, <strong>$200.000</strong> acumulado</li>
                        <li>• Verificado: <strong>sin límites</strong> de monto</li>
                      </ul>
                      <Button 
                        size="sm" 
                        className="bg-warning hover:bg-warning/90 text-warning-foreground transition-all duration-200 hover:scale-[1.02]"
                        onClick={() => navigate("/verification")}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Verificar Ahora
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          <GuestActionBlocker action="crear transacción">
            <Card 
              className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-success/20 hover:border-success hover:-translate-y-1 bg-gradient-to-br from-success/5 to-transparent animate-fade-in"
              style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
              onClick={() => !isGuestMode && navigate("/create-transaction")}
            >
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-gradient-to-br from-success/30 to-success/10 rounded-xl sm:rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-success" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-xl">Crear Sala</CardTitle>
                    <CardDescription className="text-xs truncate">Nueva transacción segura</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 pt-0">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed hidden sm:block">
                  Inicia una transacción protegida con escrow para intercambiar <span className="font-medium text-success">productos</span> o <span className="font-medium text-success">servicios</span> de forma segura
                </p>
                <Button className="w-full bg-success hover:bg-success/90 group-hover:shadow-lg transition-shadow text-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Sala
                </Button>
              </CardContent>
            </Card>
          </GuestActionBlocker>

          <GuestActionBlocker action="unirse">
            <Card 
              className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-info/20 hover:border-info hover:-translate-y-1 bg-gradient-to-br from-info/5 to-transparent animate-fade-in"
              style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
              onClick={() => !isGuestMode && navigate("/join-transaction")}
            >
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-gradient-to-br from-info/30 to-info/10 rounded-xl sm:rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-info" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-xl">Unirse</CardTitle>
                    <CardDescription className="text-xs truncate">Ingresa con código</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 pt-0">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed hidden sm:block">
                  Ingresa el <span className="font-medium text-info">código de invitación</span> para unirte a una transacción existente
                </p>
                <Button className="w-full bg-info hover:bg-info/90 group-hover:shadow-lg transition-shadow text-sm">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Unirse
                </Button>
              </CardContent>
            </Card>
          </GuestActionBlocker>

          <GuestActionBlocker action="ver historial">
            <Card 
              className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-primary/20 hover:border-primary hover:-translate-y-1 bg-gradient-to-br from-primary/5 to-transparent sm:col-span-2 lg:col-span-1 animate-fade-in"
              style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
              onClick={() => !isGuestMode && navigate("/transaction-history")}
            >
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-gradient-to-br from-primary/30 to-primary/10 rounded-xl sm:rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    <History className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-xl">Historial</CardTitle>
                    <CardDescription className="text-xs truncate">Revisa tus transacciones</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 pt-0">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed hidden sm:block">
                  Consulta todas tus <span className="font-medium text-primary">transacciones completadas</span> y su detalle
                </p>
                <Button className="w-full group-hover:shadow-lg transition-shadow text-sm">
                  <History className="mr-2 h-4 w-4" />
                  Ver Historial
                </Button>
              </CardContent>
            </Card>
          </GuestActionBlocker>
        </div>

        {/* Wallet Card */}
        <Card className="border-0 shadow-xl overflow-hidden animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
          <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/10 py-3 sm:py-6">
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
              <div className="p-2 sm:p-2.5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg sm:rounded-xl shadow-sm">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              Mi Billetera
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Administra tu saldo virtual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 pt-4 sm:pt-6">
            <div className="flex justify-between items-center p-3 sm:p-4 bg-gradient-to-r from-primary/5 to-muted/50 rounded-lg sm:rounded-xl border border-primary/10 animate-fade-in" style={{ animationDelay: '0.7s', animationFillMode: 'both' }}>
              <span className="text-xs sm:text-sm font-medium">Saldo disponible</span>
              <span className="text-lg sm:text-2xl font-bold text-primary">${formatCLP(wallet?.balance || 0)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 animate-fade-in" style={{ animationDelay: '0.75s', animationFillMode: 'both' }}>
              <GuestActionBlocker action="ver historial">
                <Button size="sm" className="w-full bg-gray-500 hover:bg-gray-600 text-white shadow-md text-xs sm:text-sm px-2 sm:px-4 transition-all duration-200 hover:scale-[1.02]" onClick={() => !isGuestMode && navigate("/wallet")}>
                  <History className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Movimientos</span>
                </Button>
              </GuestActionBlocker>
              <GuestActionBlocker action="depositar">
                <Button size="sm" className="w-full bg-success hover:bg-success/90 shadow-md text-xs sm:text-sm px-2 sm:px-4 transition-all duration-200 hover:scale-[1.02]" onClick={() => !isGuestMode && navigate("/wallet?action=deposit")}>
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Depositar</span>
                </Button>
              </GuestActionBlocker>
              <GuestActionBlocker action="retirar">
                <Button size="sm" className="w-full bg-destructive hover:bg-destructive/90 shadow-md text-xs sm:text-sm px-2 sm:px-4 transition-all duration-200 hover:scale-[1.02]" onClick={() => !isGuestMode && navigate("/wallet?action=withdraw")}>
                  <ArrowUpRight className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Retirar</span>
                </Button>
              </GuestActionBlocker>
            </div>
            
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
