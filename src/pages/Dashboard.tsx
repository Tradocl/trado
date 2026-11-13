import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Store, Wallet, Star, LogOut, Plus, Shield, CheckCircle, Settings, ArrowRight, Gift, History, ArrowUpRight, User, Lock, AlertCircle, UserCheck, Truck, Handshake, Ticket, Briefcase, Sparkles } from "lucide-react";
import { PASOS, pasoActual } from "@/components/PasosSala";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatCLP, ESTADOS_FINANCIADOS, MAX_TRANSACTION_AMOUNT } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { useTheme } from "next-themes";
import { calculateUserTotalTransactions, UNVERIFIED_LIMITS } from "@/lib/transaction-limits";
import { CompleteProfileModal } from "@/components/CompleteProfileModal";
import { RecordatorioCuenta } from "@/components/RecordatorioCuenta";
import { InsigniaVerificacion, CheckEnFoto } from "@/components/InsigniaVerificacion";
import { getStateLabel } from "@/lib/transaction-labels";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";
import { PrimerosPasos } from "@/components/PrimerosPasos";

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
  rut: string | null;
  phone: string | null;
  address: string | null;
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
  sale_type?: string | null;
}

// Mismos colores por tipo de venta que en crear sala y el historial
const TIPO_SALA: Record<string, { icon: typeof Store; nombre: string; franja: string; icono: string; barra: string }> = {
  producto_envio: { icon: Truck, nombre: "Envío", franja: "bg-primary", icono: "bg-primary/10 text-primary", barra: "bg-primary" },
  producto_persona: { icon: Handshake, nombre: "En persona", franja: "bg-primary", icono: "bg-primary/10 text-primary", barra: "bg-primary" },
  producto_digital: { icon: Ticket, nombre: "Digital", franja: "bg-primary", icono: "bg-primary/10 text-primary", barra: "bg-primary" },
  servicio: { icon: Briefcase, nombre: "Servicio", franja: "bg-primary", icono: "bg-primary/10 text-primary", barra: "bg-primary" },
};
const TIPO_SALA_OTRO = { icon: ShoppingBag, nombre: "Sala", franja: "bg-primary", icono: "bg-primary/10 text-primary", barra: "bg-primary" };

const resolvedAppealStatuses = [
  "resuelta_a_favor_comprador",
  "resuelta_a_favor_vendedor",
  "resuelta_parcial",
  "cerrada"
];


const appealStatusLabels: Record<string, { label: string; color: string }> = {
  apelacion_abierta: { label: "En Apelación", color: "bg-primary" },
  en_negociacion: { label: "En Negociación", color: "bg-primary" },
  pendiente_intervencion_plataforma: { label: "Esperando Intervención", color: "bg-red-500" },
  en_revision_plataforma: { label: "En Revisión Admin", color: "bg-primary" },
};


const POPUP_PASOS_KEY = "trado_primeros_pasos_cerrado";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useAdminRole();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [accumulatedTotal, setAccumulatedTotal] = useState<number>(0);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  const [pendingRatingCount, setPendingRatingCount] = useState(0);
  const [firstPendingRatingId, setFirstPendingRatingId] = useState<string | null>(null);
  // Hasta que alguna sala tenga plata, el panel muestra los primeros pasos arriba. Parte en
  // true para no mostrarlos un instante a quien ya usa Trado mientras carga.
  const [yaUsaTrado, setYaUsaTrado] = useState(true);
  const [salaPendienteId, setSalaPendienteId] = useState<string | null>(null);
  // El popup de bienvenida sale solo una vez al día: si lo cierra, la franja lo vuelve a abrir
  const [popupPasos, setPopupPasos] = useState(false);
  const cerrarPopupPasos = () => {
    setPopupPasos(false);
    try { localStorage.setItem(POPUP_PASOS_KEY, String(Date.now())); } catch { /* sin storage: vuelve a salir */ }
  };
  useEffect(() => {
    if (loading || yaUsaTrado) return;
    let cerradoHace = Infinity;
    try { cerradoHace = Date.now() - Number(localStorage.getItem(POPUP_PASOS_KEY) || 0); } catch { /* sin storage */ }
    if (cerradoHace > 24 * 60 * 60 * 1000) setPopupPasos(true);
  }, [loading, yaUsaTrado]);

  const isProfileComplete = profile?.rut && profile?.phone && profile?.address &&
    profile.rut.trim() !== '' && profile.phone.trim() !== '' && profile.address.trim() !== '';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      loadUserData();
    }
  }, [user, authLoading, navigate]);

  // Auto-open complete profile modal when redirected with ?completeProfile=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("completeProfile") === "1" && user) {
      setShowCompleteProfileModal(true);
      params.delete("completeProfile");
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
      window.history.replaceState({}, "", newUrl);
    }
  }, [user]);

  // Realtime subscription for transactions
  useEffect(() => {
    if (!user) return;

    const txChannel = supabase
      .channel('dashboard-transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => loadUserData()
      )
      .subscribe();

    // Realtime for wallet movements — keeps accumulated total in sync
    const movChannel = supabase
      .channel('dashboard-wallet-movements')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_movements' },
        async () => {
          if (!user) return;
          const total = await calculateUserTotalTransactions(user.id);
          setAccumulatedTotal(total);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(movChannel);
    };
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const [profileRes, walletRes, transactionsRes, completedTransactionsRes, myRatingsRes] = await Promise.all([
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
          .select("id, appeal_status, state, seller_id, buyer_id, product_name")
          .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`),
        supabase
          .from("ratings")
          .select("transaction_id")
          .eq("rater_id", user.id),
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
      const allCompleted = completedTransactionsRes.data?.filter(t =>
        (t as any).state === 'completed' ||
        resolvedAppealStatuses.includes(t.appeal_status || '')
      ) || [];
      const completedCount = allCompleted.length;

      // Compute pending ratings
      const ratedIds = new Set((myRatingsRes.data || []).map(r => r.transaction_id));
      const pending = allCompleted.filter(t => {
        if (ratedIds.has(t.id)) return false;
        const isSeller = t.seller_id === user.id;
        const isBuyer = t.buyer_id === user.id;
        if (isSeller && t.buyer_id) return true;
        if (isBuyer) return true;
        return false;
      });
      const todas = completedTransactionsRes.data || [];
      setYaUsaTrado(todas.some(t => (ESTADOS_FINANCIADOS as readonly string[]).includes(t.state)));
      // Sala creada que todavía no tiene a la otra persona: la de quien la creó
      setSalaPendienteId(todas.find(t => ["created", "invited"].includes(t.state))?.id ?? null);

      setPendingRatingCount(pending.length);
      setFirstPendingRatingId(pending[0]?.id ?? null);
      
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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
      }
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-")) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.error("Error limpiando sesión local:", e);
      }
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
    <div className="app-shell relative bg-background">
      <Helmet>
        <title>Mi panel — Trado</title>
        <meta name="description" content="Tu panel Trado: balance en escrow, transacciones activas y acceso rápido a depósitos, retiros y verificación." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="sr-only">Panel de control de Trado</h1>
      {/* Header */}
      <header className="app-header">
        <div className="app-container !py-3 md:!py-4 flex justify-between items-center">
          <Logo height={32} />
          <div className="flex items-center gap-2">
            {/* Botones redondos en azul muy suave y una sola píldora fuerte */}
            <button type="button" aria-label="Perfil" onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full bg-primary/[0.06] text-foreground flex items-center justify-center hover:bg-primary/10 transition-colors">
              <User className="h-[18px] w-[18px]" />
            </button>
            {isAdmin && (
              <button type="button" aria-label="Admin" onClick={() => navigate("/admin")} className="w-10 h-10 rounded-full bg-primary/[0.06] text-foreground flex items-center justify-center hover:bg-primary/10 transition-colors">
                <Settings className="h-[18px] w-[18px]" />
              </button>
            )}
            <button type="button" aria-label="Salir" onClick={handleSignOut} className="w-10 h-10 rounded-full bg-primary/[0.06] text-muted-foreground flex items-center justify-center hover:bg-primary/10 transition-colors">
              <LogOut className="h-[18px] w-[18px]" />
            </button>
            <Button onClick={() => navigate("/create-transaction")} className="rounded-full h-10 px-4 sm:px-5 font-semibold">
              Crear sala
            </Button>
          </div>
        </div>
      </header>

      <main className="app-container relative space-y-5 md:space-y-7">
        <PushNotificationBanner />
        {/* Bienvenida: el saludo grande sobre blanco, sin bloque de color */}
        <section className="text-center pt-4 sm:pt-8 pb-1 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Hola {profile?.nickname || profile?.full_name?.split(" ")[0] || "Usuario"}
          </h2>
          <p className="text-muted-foreground mt-2">
            {transactions.length > 0
              ? `Tienes ${transactions.length} ${transactions.length === 1 ? "sala en curso" : "salas en curso"}`
              : !yaUsaTrado
                ? "Tu primera sala va sin comisión"
                : "Todo listo para tu próximo trato"}
          </p>
          {profile && profile.verification_status !== "in_review" && (
            <div className="mt-3 flex justify-center">
              <InsigniaVerificacion verificado={profile.verification_status === "approved"} propia />
            </div>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          {[
            { icon: Wallet, etiqueta: "Saldo", valor: `$${formatCLP(wallet?.balance || 0)}`, ir: "/wallet" },
            ...((wallet?.blocked_balance || 0) > 0
              ? [{ icon: Lock, etiqueta: "Retenido en salas", valor: `$${formatCLP(wallet?.blocked_balance || 0)}`, ir: "/wallet" }]
              : []),
            ...(yaUsaTrado
              ? [
                  { icon: Star, etiqueta: "Tu nota", valor: Number(profile?.reputation_score) > 0 ? Number(profile?.reputation_score).toFixed(1) : "—", ir: "/profile" },
                  { icon: CheckCircle, etiqueta: "Salas completadas", valor: String(profile?.total_transactions || 0), ir: "/transaction-history" },
                ]
              : [{ icon: Star, etiqueta: "Tu reputación", valor: "Por empezar", ir: "/profile" }]),
          ].map(({ icon: Icon, etiqueta, valor, ir }, i, lista) => (
            <button
              key={etiqueta}
              type="button"
              onClick={() => navigate(ir)}
              // Si quedan en número impar, la última ocupa el ancho completo (sin hueco)
              className={`text-left rounded-3xl bg-primary/[0.04] hover:bg-primary/[0.07] transition-colors p-4 sm:p-5 ${
                lista.length % 2 === 1 && i === lista.length - 1 ? "col-span-2" : ""
              }`}
            >
              <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </span>
              <p className="text-sm text-muted-foreground mt-7 sm:mt-9">{etiqueta}</p>
              <p className="text-xl sm:text-2xl font-semibold text-foreground mt-0.5 truncate">{valor}</p>
            </button>
          ))}
        </div>

        {!loading && !yaUsaTrado && (
          <button
            type="button"
            onClick={() => setPopupPasos(true)}
            className="w-full flex items-center justify-between gap-3 rounded-3xl bg-primary/[0.04] px-4 py-4 text-left hover:bg-primary/[0.07] transition-colors animate-fade-in"
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Gift className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-sm">
                  {salaPendienteId ? "Tu sala está lista: compártela" : "Tu primera sala va sin comisión"}
                </span>
                <span className="block text-xs text-muted-foreground truncate">
                  {salaPendienteId ? "Mándale el link a la otra persona" : "Mira cómo empezar según lo que vas a hacer"}
                </span>
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-primary flex items-center gap-1">
              Empezar <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        )}
        <PrimerosPasos
          abierto={popupPasos}
          onCerrar={cerrarPopupPasos}
          perfilCompleto={!!isProfileComplete}
          salaPendienteId={salaPendienteId}
          onCompletarPerfil={() => setShowCompleteProfileModal(true)}
        />
        {user && profile && (
          <RecordatorioCuenta
            userId={user.id}
            perfilCompleto={!!isProfileComplete}
            estadoVerificacion={profile.verification_status}
            bloqueado={popupPasos || showCompleteProfileModal}
            onCompletarPerfil={() => setShowCompleteProfileModal(true)}
          />
        )}

        {/* Pending Ratings Banner */}
        {pendingRatingCount > 0 && (
          <Card
            className="border-0 shadow-none rounded-3xl overflow-hidden animate-fade-in bg-primary/[0.04] cursor-pointer hover:bg-primary/[0.07] transition-colors"
            style={{ animationDelay: '0.15s', animationFillMode: 'both' }}
            onClick={() => firstPendingRatingId && navigate(`/transaction/${firstPendingRatingId}`)}
          >
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-primary/10 rounded-full flex-shrink-0 flex items-center justify-center">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {pendingRatingCount === 1
                        ? "Tienes 1 sala pendiente de calificar"
                        : `Tienes ${pendingRatingCount} salas pendientes de calificar`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tu calificación ayuda a construir confianza en la comunidad
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions in Progress */}
        {transactions.length > 0 && (
          <>
          <h2 className="sr-only">Salas en curso</h2>
          <Card className="border-0 shadow-none rounded-3xl bg-primary/[0.04] overflow-hidden animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-base">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                Salas en curso
              </CardTitle>
              <CardDescription>
                Las salas que tienes abiertas
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-primary/10">
                {transactions.map((transaction, index) => {
                  // Calculate REAL role of current user based on initiator_role
                  const initiatorRole = transaction.initiator_role || 'seller';
                  let isRealSeller = false;
                  let isRealBuyer = false;
                  
                  if (initiatorRole === 'seller') {
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
                    navigate(`/transaction/${transaction.id}`);
                  };
                  const tipo = TIPO_SALA[transaction.sale_type || ""] ?? TIPO_SALA_OTRO;
                  const TipoIcon = tipo.icon;
                  const pasos = PASOS[transaction.sale_type || ""] ?? PASOS.producto_digital;
                  const paso = Math.min(pasos.length, pasoActual(transaction.sale_type || "", transaction.state, !!transaction.seller_id && !!transaction.buyer_id));
                  
                  return (
                    <div
                      key={transaction.id}
                      onClick={handleTransactionClick}
                      className="group relative p-4 pl-5 hover:bg-primary/[0.04] cursor-pointer transition-all duration-200 animate-fade-in"
                      style={{ animationDelay: `${0.3 + index * 0.05}s`, animationFillMode: 'both' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center ${tipo.icono}`} title={tipo.nombre}>
                            <TipoIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate text-sm sm:text-base mb-1">
                              {transaction.product_name}
                            </h4>
                            <div className="flex items-center flex-wrap gap-2 text-sm">
                              <span className="font-semibold text-foreground">${formatCLP(transaction.amount)}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {isRealSeller ? "Vendiendo" : "Comprando"}
                              </span>
                              {/* Un solo color para los estados; solo un reclamo se marca distinto */}
                              {transaction.appeal_status && appealStatusLabels[transaction.appeal_status] ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                                  {appealStatusLabels[transaction.appeal_status].label}
                                </span>
                              ) : (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                  {getStateLabel(transaction.state).label}
                                </span>
                              )}
                            </div>
                            {transaction.state !== "cancelled" && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex gap-1 flex-1 max-w-[220px]">
                                  {pasos.map((_, i) => (
                                    <span key={i} className={`h-1.5 flex-1 rounded-full ${i < paso ? tipo.barra : "bg-muted"}`} />
                                  ))}
                                </div>
                                <span className="text-[11px] text-muted-foreground truncate">
                                  Paso {paso} de {pasos.length} · {pasos[paso - 1]}
                                </span>
                              </div>
                            )}
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
          </>
        )}

        {!loading && transactions.length === 0 && yaUsaTrado && (
          <button
            type="button"
            onClick={() => navigate("/create-transaction")}
            className="w-full relative overflow-hidden rounded-3xl bg-primary/[0.04] p-5 sm:p-6 text-left hover:bg-primary/[0.07] transition-colors animate-fade-in"
          >
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0" aria-hidden>
                <span className="absolute left-0 top-2 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center -rotate-12"><Truck className="h-5 w-5" /></span>
                <span className="absolute right-0 top-0 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center rotate-12"><Briefcase className="h-5 w-5" /></span>
                <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md"><Lock className="h-5 w-5" /></span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-primary flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> No tienes salas en curso</p>
                <p className="font-semibold text-lg sm:text-xl tracking-tight mt-0.5">Crea tu próxima sala en 1 minuto</p>
                <p className="text-sm text-muted-foreground mt-0.5">Vende, compra o cobra un trabajo con la plata retenida hasta que se cumpla</p>
              </div>
              <ArrowRight className="hidden sm:block h-6 w-6 text-primary shrink-0" />
            </div>
          </button>
        )}

        {/* Complete Profile Card - Show for users with incomplete profile */}
        {!isProfileComplete && (
          <Card className="border-0 shadow-none rounded-3xl overflow-hidden animate-fade-in bg-primary/[0.04]" 
            style={{ animationDelay: '0.22s', animationFillMode: 'both' }}>
            <CardContent className="py-4 sm:py-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-11 h-11 rounded-full flex-shrink-0 bg-primary/10 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm sm:text-base mb-1">Completa tu perfil</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                    Agrega tu RUT, teléfono y dirección para poder operar
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 mb-3">
                    <li>• Necesario para crear y unirse a transacciones</li>
                    <li>• Necesario para depositar y retirar fondos</li>
                  </ul>
                  <Button 
                    size="sm" 
                    className="transition-all duration-200 hover:scale-[1.02]"
                    onClick={() => setShowCompleteProfileModal(true)}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Completar Perfil
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Card - Show for unverified users */}
        {profile?.verification_status !== 'approved' && (
          <Card className="border-0 shadow-none rounded-3xl overflow-hidden animate-fade-in bg-primary/[0.04]" style={{ animationDelay: '0.25s', animationFillMode: 'both' }}>
            <CardContent className="py-4 sm:py-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-11 h-11 rounded-full flex-shrink-0 bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  {profile?.verification_status === 'in_review' ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm sm:text-base">Verificación en revisión</h4>
                        <Badge variant="outline" className="border-primary/40 text-primary text-xs">
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
                      <h4 className="font-semibold text-sm sm:text-base mb-1">¿Necesitas salas de montos mayores?</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                        Sin verificar puedes usar salas de hasta <strong>${formatCLP(UNVERIFIED_LIMITS.PER_TRANSACTION)}</strong>.
                        Verifica tu identidad con tu carnet para salas de hasta ${formatCLP(MAX_TRANSACTION_AMOUNT)}.
                      </p>
                      {accumulatedTotal > 0 && (
                        <div className="mb-3 max-w-sm">
                          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                            <span>Usado sin verificar</span>
                            <span>${formatCLP(accumulatedTotal)} de ${formatCLP(UNVERIFIED_LIMITS.TOTAL_ACCUMULATED)}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (accumulatedTotal / UNVERIFIED_LIMITS.TOTAL_ACCUMULATED) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full bg-card text-primary hover:bg-card/80"
                        onClick={() => navigate("/verification")}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Verificar identidad
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Acciones: crear (lo principal) y unirse con código. El historial queda como link. */}
        <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          {/* "Crear sala" ya está arriba como la única píldora fuerte */}
          <Button size="lg" variant="ghost" className="w-full h-14 rounded-full text-base font-semibold bg-primary/[0.06] text-primary hover:bg-primary/10" onClick={() => navigate("/join-transaction")}>
            <ShoppingBag className="mr-2 h-5 w-5" />
            ¿Te mandaron un código? Únete a su sala
          </Button>
          <button
            type="button"
            onClick={() => navigate("/transaction-history")}
            className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <History className="h-4 w-4" />
            Ver historial de salas
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Wallet Card */}
        <Card className="border-0 shadow-none rounded-3xl bg-primary/[0.04] overflow-hidden animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
          <CardHeader className="py-4 sm:py-5 pb-0 sm:pb-0">
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-base">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              Mi Billetera
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {(wallet?.balance || 0) > 0
                ? "Lo que tienes disponible en Trado"
                : "Cuando te paguen en una sala, la plata llega aquí y la retiras a tu cuenta bancaria"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 pt-4 sm:pt-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 animate-fade-in" style={{ animationDelay: '0.75s', animationFillMode: 'both' }}>
              <Button variant="ghost" className="w-full h-10 rounded-full bg-card hover:bg-card/80 text-xs sm:text-sm px-2 sm:px-4 transition-all duration-200 hover:scale-[1.02] flex-col gap-0.5 sm:flex-row sm:gap-2" onClick={() => navigate("/wallet")}>
                <History className="h-4 w-4" />
                <span className="text-xs leading-none">Movimientos</span>
              </Button>
              <Button className="w-full h-10 rounded-full text-xs sm:text-sm px-2 sm:px-4 transition-all duration-200 hover:scale-[1.02] flex-col gap-0.5 sm:flex-row sm:gap-2" onClick={() => navigate("/wallet?action=deposit")}>
                <Plus className="h-4 w-4" />
                <span className="text-xs leading-none">Depositar</span>
              </Button>
              <Button variant="ghost" className="w-full h-10 rounded-full bg-card hover:bg-card/80 text-primary text-xs sm:text-sm px-2 sm:px-4 transition-all duration-200 hover:scale-[1.02] flex-col gap-0.5 sm:flex-row sm:gap-2" onClick={() => navigate("/wallet?action=withdraw")}>
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-xs leading-none">Retirar</span>
              </Button>
            </div>
            
          </CardContent>
        </Card>
      </main>

      <CompleteProfileModal
        open={showCompleteProfileModal}
        onClose={() => setShowCompleteProfileModal(false)}
        onComplete={() => {
          setShowCompleteProfileModal(false);
          loadUserData();
        }}
      />
    </div>
  );
};

export default Dashboard;
