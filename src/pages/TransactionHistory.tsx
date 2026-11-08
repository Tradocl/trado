import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { fetchProfileNames } from "@/lib/profile-names";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ShoppingBag, Store, Calendar, User, Package, Star, Check, ArrowUpDown, Truck, Handshake, Ticket, Briefcase, Scale, ChevronRight, Plus, History } from "lucide-react";
import { Logo } from "@/components/Logo";

// Mismos colores que los casos del panel y de crear sala, para reconocer el tipo de un vistazo
const TIPO: Record<string, { icon: typeof Package; nombre: string; franja: string; icono: string }> = {
  producto_envio: { icon: Truck, nombre: "Envío", franja: "bg-emerald-500", icono: "bg-emerald-500 text-white" },
  producto_persona: { icon: Handshake, nombre: "En persona", franja: "bg-amber-500", icono: "bg-amber-500 text-white" },
  producto_digital: { icon: Ticket, nombre: "Digital", franja: "bg-rose-500", icono: "bg-rose-500 text-white" },
  servicio: { icon: Briefcase, nombre: "Servicio", franja: "bg-violet-500", icono: "bg-violet-500 text-white" },
};
const TIPO_OTRO = { icon: Package, nombre: "Sala", franja: "bg-primary", icono: "bg-primary text-white" };

// Lo que de verdad pagó o recibió cada uno. Si la sala la creó el comprador, la comisión
// se suma a lo que paga y el vendedor recibe el monto completo; si la creó el vendedor,
// se descuenta de lo que recibe (misma regla que la sala, src/pages/Transaction.tsx).
const montoNeto = (t: { amount: number; commission: number; initiator_role?: string | null }, isSale: boolean) => {
  const monto = Number(t.amount) || 0;
  const comision = Number(t.commission) || 0;
  const creaComprador = t.initiator_role === "buyer";
  if (isSale) return creaComprador ? monto : monto - comision;
  return creaComprador ? monto + comision : monto;
};
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCLP } from "@/lib/utils";

interface Transaction {
  id: string;
  product_name: string;
  product_description: string | null;
  amount: number;
  commission: number;
  state: string;
  appeal_status: string | null;
  created_at: string;
  completed_at: string | null;
  seller_id: string;
  buyer_id: string | null;
  sale_type?: string | null;
  initiator_role?: string | null;
  seller_profile?: {
    full_name: string;
    reputation_score: number;
  };
  buyer_profile?: {
    full_name: string;
    reputation_score: number;
  };
}

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'pending_rating';

const resolvedAppealStatuses = [
  "resuelta_a_favor_comprador",
  "resuelta_a_favor_vendedor",
  "resuelta_parcial",
  "cerrada"
];

export default function TransactionHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRatings, setUserRatings] = useState<Set<string>>(new Set());
  const [purchasesSort, setPurchasesSort] = useState<SortOption>('date_desc');
  const [salesSort, setSalesSort] = useState<SortOption>('date_desc');

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadTransactions();
    loadUserRatings();
  }, [user, navigate]);

  const loadUserRatings = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("ratings")
        .select("transaction_id")
        .eq("rater_id", user.id);
      
      if (data) {
        setUserRatings(new Set(data.map(r => r.transaction_id)));
      }
    } catch (error) {
      console.error("Error loading ratings:", error);
    }
  };

  const loadTransactions = async () => {
    try {
      // Load completed purchases (state = completed OR appeal resolved)
      const { data: purchaseData, error: purchaseError } = await supabase
        .from("transactions")
        .select("*")
        .eq("buyer_id", user!.id)
        .order("completed_at", { ascending: false });

      if (purchaseError) throw purchaseError;

      // Load completed sales (state = completed OR appeal resolved)
      const { data: salesData, error: salesError } = await supabase
        .from("transactions")
        .select("*")
        .eq("seller_id", user!.id)
        .order("completed_at", { ascending: false });

      if (salesError) throw salesError;

      // Filter to only completed or resolved appeals (but not return mediations still in progress)
      const isCompletedOrResolved = (t: Transaction) => {
        // If state is completed, it's done
        if (t.state === 'completed') return true;
        
        // For resolved appeals, only count if state is also completed (not return_requested or return_in_progress)
        const inReturnProcess = ['return_requested', 'return_in_progress'].includes(t.state);
        if (inReturnProcess) return false; // Don't show in history if return is still in progress
        
        // Otherwise check if appeal was resolved
        return resolvedAppealStatuses.includes(t.appeal_status || '');
      };

      // Nombre y reputación de la contraparte por la RPC segura.
      const nombres = await fetchProfileNames([
        ...(purchaseData || []).map((t) => t.seller_id),
        ...(salesData || []).map((t) => t.buyer_id),
      ]);
      const perfil = (id: string | null) => {
        const p = id ? nombres.get(id) : undefined;
        return p ? { full_name: p.full_name ?? "", reputation_score: Number(p.reputation_score ?? 0) } : null;
      };
      setPurchases((purchaseData || [])
        .map((t) => ({ ...t, seller_profile: perfil(t.seller_id) }) as Transaction)
        .filter(isCompletedOrResolved));
      setSales((salesData || [])
        .map((t) => ({ ...t, buyer_profile: perfil(t.buyer_id) }) as Transaction)
        .filter(isCompletedOrResolved));
    } catch (error: any) {
      console.error("Error loading transactions:", error);
      toast.error("Error al cargar el historial de transacciones");
    } finally {
      setLoading(false);
    }
  };

  const sortTransactions = (transactions: Transaction[], sortOption: SortOption, isSale: boolean): Transaction[] => {
    return [...transactions].sort((a, b) => {
      switch (sortOption) {
        case 'date_desc':
          return new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime();
        case 'date_asc':
          return new Date(a.completed_at || a.created_at).getTime() - new Date(b.completed_at || b.created_at).getTime();
        case 'amount_desc':
          return montoNeto(b, isSale) - montoNeto(a, isSale);
        case 'amount_asc':
          return montoNeto(a, isSale) - montoNeto(b, isSale);
        case 'pending_rating':
          // Pending ratings first
          const aPending = !userRatings.has(a.id);
          const bPending = !userRatings.has(b.id);
          if (aPending && !bPending) return -1;
          if (!aPending && bPending) return 1;
          // Then by date desc
          return new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime();
        default:
          return 0;
      }
    });
  };

  const sortedPurchases = useMemo(() => 
    sortTransactions(purchases, purchasesSort, false), 
    [purchases, purchasesSort, userRatings]
  );

  const sortedSales = useMemo(() => 
    sortTransactions(sales, salesSort, true), 
    [sales, salesSort, userRatings]
  );

  const SortSelector = ({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[220px] bg-card">
        <ArrowUpDown className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Ordenar por..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="date_desc">Más recientes</SelectItem>
        <SelectItem value="date_asc">Más antiguas</SelectItem>
        <SelectItem value="amount_desc">Monto mayor</SelectItem>
        <SelectItem value="amount_asc">Monto menor</SelectItem>
        <SelectItem value="pending_rating">Por calificar primero</SelectItem>
      </SelectContent>
    </Select>
  );

  const TransactionCard = ({ transaction, isSale }: { transaction: Transaction; isSale: boolean }) => {
    const otherParty = isSale ? transaction.buyer_profile : transaction.seller_profile;
    const porReclamo = transaction.state !== "completed";
    const neto = montoNeto(transaction, isSale);
    const comision = Number(transaction.commission) || 0;
    const creaComprador = transaction.initiator_role === "buyer";
    // Quién pagó la comisión: el comprador si creó la sala, si no el vendedor
    const comisionMia = isSale ? !creaComprador : creaComprador;
    const hasRated = userRatings.has(transaction.id);
    const tipo = TIPO[transaction.sale_type || ""] ?? TIPO_OTRO;
    const TipoIcon = tipo.icon;
    const fecha = transaction.completed_at || transaction.created_at;

    return (
      <Card
        className="relative overflow-hidden border-0 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer bg-card/90 backdrop-blur"
        onClick={() => navigate(`/transaction/${transaction.id}`)}
      >
        <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${tipo.franja}`} aria-hidden />
        <CardContent className="p-4 sm:p-5 pl-5 sm:pl-6">
          <div className="flex items-start gap-3">
            <span className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${tipo.icono}`}>
              <TipoIcon className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-base sm:text-lg leading-tight truncate">{transaction.product_name}</h3>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{tipo.nombre}</span>
                <span>·</span>
                <Calendar className="h-3 w-3" />
                <span>{fecha ? format(new Date(fecha), "d MMM yyyy", { locale: es }) : "—"}</span>
                {porReclamo && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-warning px-2 py-0.5 font-semibold">
                    <Scale className="h-3 w-3" /> Resuelta por reclamo
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                {porReclamo ? "Monto de la sala" : isSale ? "Recibiste" : "Pagaste"}
              </p>
              <p className={`text-2xl font-extrabold tracking-tight ${isSale && !porReclamo ? "text-success" : ""}`}>
                ${formatCLP(porReclamo ? Number(transaction.amount) : neto)}
              </p>
              {!porReclamo && comisionMia && (
                <p className="text-[11px] text-muted-foreground">
                  {comision === 0 ? "Sin comisión" : isSale ? `Comisión −$${formatCLP(comision)}` : `Incluye comisión $${formatCLP(comision)}`}
                </p>
              )}
            </div>
            <div className="text-right min-w-0">
              <p className="text-[11px] text-muted-foreground">{isSale ? "Comprador" : "Vendedor"}</p>
              <p className="text-sm font-semibold truncate max-w-[150px] flex items-center justify-end gap-1">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {otherParty?.full_name || "Usuario"}
              </p>
              {otherParty && Number(otherParty.reputation_score) > 0 && (
                <p className="text-xs inline-flex items-center gap-0.5 text-warning">
                  <Star className="h-3 w-3 fill-warning" /> {Number(otherParty.reputation_score).toFixed(1)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t">
            {hasRated ? (
              <span className="text-xs text-success flex items-center gap-1 font-medium">
                <Check className="h-3.5 w-3.5" /> Ya calificaste
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 text-warning px-3 py-1 text-xs font-semibold">
                <Star className="h-3.5 w-3.5" /> Calificar a {isSale ? "quien compró" : "quien vendió"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Resumen: solo salas completadas normalmente (las resueltas por reclamo pueden haberse repartido)
  const totalRecibido = sales.filter((t) => t.state === "completed").reduce((a, t) => a + montoNeto(t, true), 0);
  const totalPagado = purchases.filter((t) => t.state === "completed").reduce((a, t) => a + montoNeto(t, false), 0);
  const porCalificar = [...purchases, ...sales].filter((t) => !userRatings.has(t.id)).length;
  const total = purchases.length + sales.length;

  const Vacio = ({ venta }: { venta: boolean }) => (
    <div className="rounded-3xl bg-card/90 backdrop-blur shadow-md p-8 sm:p-10 text-center">
      <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${venta ? "bg-gradient-to-br from-success to-emerald-600" : "bg-gradient-to-br from-info to-violet-600"}`}>
        {venta ? <Store className="h-8 w-8" /> : <ShoppingBag className="h-8 w-8" />}
      </div>
      <h3 className="text-lg sm:text-xl font-bold mb-1">{venta ? "Todavía no completas una venta" : "Todavía no completas una compra"}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
        {venta
          ? "Cuando el comprador confirme y se libere el pago, la venta queda aquí con lo que recibiste."
          : "Cuando confirmes que recibiste lo acordado, la compra queda aquí con lo que pagaste."}
      </p>
      <Button
        onClick={() => navigate(venta ? "/create-transaction" : "/join-transaction")}
        className={`rounded-xl font-bold text-white ${venta ? "bg-success hover:bg-success/90" : "bg-info hover:bg-info/90"}`}
      >
        {venta ? <><Plus className="h-4 w-4 mr-1" /> Crear una sala</> : "Unirme a una sala"}
      </Button>
    </div>
  );

  const Lista = ({ lista, venta, orden, setOrden }: { lista: Transaction[]; venta: boolean; orden: SortOption; setOrden: (v: SortOption) => void }) =>
    lista.length === 0 ? (
      <Vacio venta={venta} />
    ) : (
      <>
        <div className="flex justify-end">
          <SortSelector value={orden} onChange={setOrden} />
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {lista.map((t) => (
            <TransactionCard key={t.id} transaction={t} isSale={venta} />
          ))}
        </div>
      </>
    );

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-primary/[0.07] via-background to-info/[0.09]">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-info/15 blur-3xl" />
      </div>
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-1 sm:gap-3 max-w-5xl">
          <Button variant="ghost" size="sm" className="px-2 sm:px-3" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Mi panel</span>
          </Button>
          <Logo height={26} />
        </div>
      </header>

      <main className="relative container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-5xl space-y-5 sm:space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-info text-white p-5 sm:p-7 shadow-2xl">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" aria-hidden />
          <div className="relative">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <History className="h-6 w-6 sm:h-7 sm:w-7" /> Historial de salas
            </h1>
            <p className="text-white/80 text-sm mt-1">
              {total > 0 ? `${total} ${total === 1 ? "sala terminada" : "salas terminadas"}` : "Aquí quedan tus salas cuando terminan"}
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20 px-3 py-2">
                <p className="text-xs text-white/75">Recibiste en ventas</p>
                <p className="text-lg sm:text-2xl font-bold">${formatCLP(totalRecibido)}</p>
              </div>
              <div className="rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20 px-3 py-2">
                <p className="text-xs text-white/75">Pagaste en compras</p>
                <p className="text-lg sm:text-2xl font-bold">${formatCLP(totalPagado)}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20 px-3 py-2 flex items-center gap-2">
                <Star className="h-5 w-5 shrink-0 fill-white/40" />
                <div>
                  <p className="text-xs text-white/75">Por calificar</p>
                  <p className="text-lg sm:text-2xl font-bold">{porCalificar}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue={sales.length > purchases.length ? "sales" : "purchases"} className="space-y-4 sm:space-y-5">
          <TabsList className="grid w-full sm:max-w-md grid-cols-2 h-12 rounded-xl bg-card/90 shadow-sm p-1">
            <TabsTrigger value="purchases" className="rounded-lg h-full flex items-center gap-2 data-[state=active]:bg-info data-[state=active]:text-white">
              <ShoppingBag className="h-4 w-4" />
              Compras ({purchases.length})
            </TabsTrigger>
            <TabsTrigger value="sales" className="rounded-lg h-full flex items-center gap-2 data-[state=active]:bg-success data-[state=active]:text-white">
              <Store className="h-4 w-4" />
              Ventas ({sales.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-4">
            <Lista lista={sortedPurchases} venta={false} orden={purchasesSort} setOrden={setPurchasesSort} />
          </TabsContent>
          <TabsContent value="sales" className="space-y-4">
            <Lista lista={sortedSales} venta={true} orden={salesSort} setOrden={setSalesSort} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
