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

/** Quién es quién en la sala (initiator_role cambia dónde queda el creador antes de que entre el otro) */
function rolEnSala(t: { initiator_role?: string | null; seller_id: string | null; buyer_id: string | null }, uid?: string) {
  const creadaPorComprador = (t.initiator_role || "seller") === "buyer";
  if (creadaPorComprador && !t.buyer_id) return { vende: false, compra: t.seller_id === uid };
  return { vende: t.seller_id === uid, compra: t.buyer_id === uid };
}

/** Lo que tiene que pasar ahora en la sala, y si te toca a ti */
function queToca(t: { state: string; sale_type?: string | null; seller_id: string | null; buyer_id: string | null; appeal_status?: string | null },
  rol: { vende: boolean; compra: boolean }): { mio: boolean; texto: string } {
  const tipo = t.sale_type || "";
  if (t.appeal_status) return { mio: false, texto: "Hay un reclamo en curso" };
  if (!t.seller_id || !t.buyer_id) return { mio: true, texto: "Comparte el link con la otra persona" };
  switch (t.state) {
    case "created":
    case "invited":
    case "awaiting_deposit":
      return rol.compra ? { mio: true, texto: "Paga para asegurar la sala" } : { mio: false, texto: "Esperando que la otra persona pague" };
    case "funds_secured": {
      const accion = tipo === "producto_envio" ? "Envía el producto y deja el seguimiento"
        : tipo === "producto_persona" ? "Coordina la entrega en persona"
        : tipo === "servicio" ? "Haz el trabajo y márcalo como entregado"
        : "Entrega lo acordado";
      return rol.vende ? { mio: true, texto: accion } : { mio: false, texto: "Esperando la entrega" };
    }
    case "in_delivery":
      return rol.compra
        ? { mio: true, texto: tipo === "producto_envio" ? "Márcalo como recibido cuando llegue" : "Revisa y confirma que está todo bien" }
        : { mio: false, texto: "Esperando que la otra persona confirme" };
    case "awaiting_buyer_review":
      return rol.compra ? { mio: true, texto: "Revisa y confirma que está todo bien" } : { mio: false, texto: "La otra persona está revisando" };
    default:
      return { mio: false, texto: "En curso" };
  }
}

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

  const conRol = transactions.map((t) => {
    const rol = rolEnSala(t, user?.id);
    return { t, mio: queToca(t, rol).mio };
  });
  const salasMias = conRol.filter((x) => x.mio).length;
  const salasOrdenadas = [...conRol].sort((a, b) => Number(b.mio) - Number(a.mio)).map((x) => x.t);

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
            <Button onClick={() => navigate("/create-transaction")} className="rounded-full h-10 px-4 sm:px-5 font-bold bg-gradient-to-r from-primary via-medio to-info text-white shadow-md hover:opacity-95">
              <Plus className="h-4 w-4 mr-1" /> Crear sala
            </Button>
          </div>
        </div>
      </header>

      <main className="app-container relative space-y-5 md:space-y-7">
        <PushNotificationBanner />
        {/* Bienvenida con la cara de la landing: degradado de marca, vidrio y la plata en movimiento */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-medio via-55% to-info text-white p-5 sm:p-7 shadow-xl animate-fade-in">
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-16 w-60 h-60 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight break-words">
                Hola, {profile?.nickname || profile?.full_name?.split(" ")[0] || "Usuario"}
              </h2>
              <p className="text-white/80 mt-1 text-sm sm:text-base">
                {salasMias > 0
                  ? `Te ${salasMias === 1 ? "toca algo en 1 sala" : `tocan cosas en ${salasMias} salas`}`
                  : transactions.length > 0
                    ? `Tienes ${transactions.length} ${transactions.length === 1 ? "sala en curso" : "salas en curso"}`
                    : !yaUsaTrado
                      ? "Tu primera sala va sin comisión"
                      : "Todo tranquilo por ahora"}
              </p>
            </div>
            {profile && profile.verification_status !== "in_review" && (
              <InsigniaVerificacion verificado={profile.verification_status === "approved"} sobreColor propia tamano="xs" className="self-start shrink-0 sm:mt-1.5" />
            )}
          </div>

          {/* Tu plata en Trado: lo retenido en el candado y lo disponible, con el pulso entre los dos */}
          <div className="relative mt-5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md p-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate("/wallet")} className="flex-1 min-w-0 text-left">
                <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/70">
                  <span className="relative flex w-7 h-7 rounded-full bg-white text-primary items-center justify-center">
                    <Lock className="h-3.5 w-3.5" />
                    {(wallet?.blocked_balance || 0) > 0 && <span className="absolute inset-0 rounded-full ring-2 ring-white/70 animate-ping" />}
                  </span>
                  Retenido
                </span>
                <p className="text-xl sm:text-2xl font-extrabold mt-1.5 truncate">${formatCLP(wallet?.blocked_balance || 0)}</p>
              </button>
              {/* El camino de la plata: se libera cuando se cumple el trato */}
              <div className="relative w-14 sm:w-auto sm:flex-1 sm:max-w-md h-[2px] bg-white/25 shrink-0" aria-hidden>
                <span className="plata-viaja absolute -top-[5px] w-3 h-3 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
              </div>
              <button type="button" onClick={() => navigate("/wallet")} className="flex-1 min-w-0 text-right">
                <span className="flex items-center justify-end gap-2 text-[11px] font-bold uppercase tracking-wider text-white/70">
                  Disponible
                  <span className="flex w-7 h-7 rounded-full bg-emerald-300 text-emerald-950 items-center justify-center">
                    <Wallet className="h-3.5 w-3.5" />
                  </span>
                </span>
                <p className="text-xl sm:text-2xl font-extrabold mt-1.5 truncate">${formatCLP(wallet?.balance || 0)}</p>
              </button>
            </div>
            <p className="text-xs text-white/65 mt-3 text-center">La plata retenida pasa a disponible cuando se cumple cada trato.</p>
          </div>

          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => navigate("/wallet?action=withdraw")} className="rounded-full bg-white text-primary hover:bg-white/90 font-bold">
              <ArrowUpRight className="h-4 w-4 mr-1" /> Retirar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate("/wallet?action=deposit")} className="rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold">
              <Plus className="h-4 w-4 mr-1" /> Depositar
            </Button>
            {yaUsaTrado && (
              <span className="ml-auto flex items-center gap-3 text-sm text-white/85">
                <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-white/40" /> {Number(profile?.reputation_score) > 0 ? Number(profile?.reputation_score).toFixed(1) : "—"}</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4" /> {profile?.total_transactions || 0}</span>
              </span>
            )}
          </div>
        </section>

        {!loading && !yaUsaTrado && (
          <button
            type="button"
            onClick={() => setPopupPasos(true)}
            className="w-full flex items-center justify-between gap-3 rounded-3xl border border-border bg-card px-4 py-4 text-left shadow-sm hover:shadow-md transition-shadow animate-fade-in"
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
            className="rounded-3xl border border-border shadow-sm overflow-hidden animate-fade-in bg-card cursor-pointer hover:shadow-md transition-shadow"
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
          <Card className="rounded-3xl border border-border shadow-sm bg-card overflow-hidden animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-base">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                Tus salas
              </CardTitle>
              <CardDescription>
                {salasMias > 0 ? "Primero las que te tocan a ti" : "Las que tienes abiertas"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/70">
                {salasOrdenadas.map((transaction, index) => {
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
                  const toca = queToca(transaction, { vende: isRealSeller, compra: isRealBuyer });
                  const tipo = TIPO_SALA[transaction.sale_type || ""] ?? TIPO_SALA_OTRO;
                  const TipoIcon = tipo.icon;
                  const pasos = PASOS[transaction.sale_type || ""] ?? PASOS.producto_digital;
                  const paso = Math.min(pasos.length, pasoActual(transaction.sale_type || "", transaction.state, !!transaction.seller_id && !!transaction.buyer_id));
                  
                  return (
                    <div
                      key={transaction.id}
                      onClick={handleTransactionClick}
                      className={`group relative p-4 pl-5 cursor-pointer transition-all duration-200 animate-fade-in ${toca.mio ? "bg-primary/[0.04] hover:bg-primary/[0.07]" : "hover:bg-muted/40"}`}
                      style={{ animationDelay: `${0.3 + index * 0.05}s`, animationFillMode: 'both' }}
                    >
                      {toca.mio && <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b from-primary to-info" aria-hidden />}
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
                            {/* Lo que tiene que pasar ahora */}
                            <p className={`mt-2 text-sm flex items-start gap-1.5 ${toca.mio ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                              {toca.mio && (
                                <span className="shrink-0 whitespace-nowrap mt-px text-[10px] font-extrabold uppercase tracking-wider bg-emerald-400 text-emerald-950 rounded-full px-2 py-0.5">Te toca</span>
                              )}
                              <span>{toca.texto}</span>
                            </p>
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
            className="w-full relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-6 text-left shadow-sm hover:shadow-md transition-shadow animate-fade-in"
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
          <Card className="rounded-3xl border border-border shadow-sm overflow-hidden animate-fade-in bg-card" 
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
          <Card className="rounded-3xl border border-border shadow-sm overflow-hidden animate-fade-in bg-card" style={{ animationDelay: '0.25s', animationFillMode: 'both' }}>
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
                        className="rounded-full bg-primary/10 text-primary hover:bg-primary/15"
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
