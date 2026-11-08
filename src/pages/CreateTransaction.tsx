import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Truck, ShoppingBag, Store, Handshake, Copy, Check, Share2, ShieldAlert, Shield, Mail, Gift, Ticket, Briefcase, MessageCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { calculateOrderDetails, formatCLP, formatAmountInput, parseFormattedAmount, MAX_TRANSACTION_AMOUNT, ESTADOS_FINANCIADOS, PRIMERA_SALA_GRATIS_HASTA, primeraSalaGratis } from "@/lib/utils";
import { FeeOptions, feeOptions } from "@/components/FeeOptions";
import { UNVERIFIED_LIMITS, checkTransactionLimits, getUserVerificationStatus } from "@/lib/transaction-limits";
import { nativeShare } from "@/lib/native/share";
import { useRequireCompleteProfile } from "@/hooks/useRequireCompleteProfile";
import { CompleteProfileModal } from "@/components/CompleteProfileModal";

type SaleType = "servicio" | "producto_persona" | "producto_envio" | "producto_digital";
type MainType = "servicio" | "producto";
type InitiatorRole = "seller" | "buyer";

// Paso 1 del asistente: cómo es el trato, con su color (mismos colores que los casos del panel).
// Las clases van completas para que Tailwind las incluya.
const CASOS_CREAR: {
  tipo: SaleType; icon: typeof Truck; vendo: string; compro: string; ejemplo: string;
  nombre: string; detalle: string; entrega: string; caja: string; sel: string; icono: string;
}[] = [
  {
    tipo: "producto_envio", icon: Truck, vendo: "Vendo y lo envío", compro: "Compro y me lo envían",
    ejemplo: "Por courier, a cualquier parte de Chile", nombre: "Ej: Zapatillas Nike talla 42",
    detalle: "Estado, talla o modelo, qué incluye y cómo se envía. Ej: Nuevas, en caja, envío por Starken.",
    entrega: "lo envía por courier con seguimiento",
    caja: "from-emerald-500/15 border-emerald-500/20", sel: "border-emerald-500", icono: "bg-emerald-500 text-white",
  },
  {
    tipo: "producto_persona", icon: Handshake, vendo: "Vendo en persona", compro: "Compro en persona",
    ejemplo: "Se juntan y se revisa ahí mismo", nombre: "Ej: iPhone 13 128GB",
    detalle: "Estado, accesorios y dónde se juntan. Ej: Batería al 89 %, con cargador, nos juntamos en Metro Baquedano.",
    entrega: "se juntan y lo revisa ahí mismo",
    caja: "from-amber-500/15 border-amber-500/20", sel: "border-amber-500", icono: "bg-amber-500 text-white",
  },
  {
    tipo: "producto_digital", icon: Ticket, vendo: "Vendo una entrada o algo digital", compro: "Compro una entrada o algo digital",
    ejemplo: "Entradas, links, archivos, cuentas", nombre: "Ej: 2 entradas cancha concierto",
    detalle: "Qué es exactamente y cómo se entrega. Ej: 2 entradas cancha general, transferencia por la ticketera.",
    entrega: "manda la entrada, el link o el archivo",
    caja: "from-rose-500/15 border-rose-500/20", sel: "border-rose-500", icono: "bg-rose-500 text-white",
  },
  {
    tipo: "servicio", icon: Briefcase, vendo: "Cobro un trabajo", compro: "Contrato un trabajo",
    ejemplo: "Diseño, fotos, clases, arreglos…", nombre: "Ej: Diseño de logo para emprendimiento",
    detalle: "Qué incluye, cuántas revisiones y para cuándo. Ej: Logo en 3 propuestas, 2 rondas de cambios, en 7 días.",
    entrega: "hace el trabajo y lo marca como realizado",
    caja: "from-violet-500/15 border-violet-500/20", sel: "border-violet-500", icono: "bg-violet-500 text-white",
  },
];

const CreateTransaction = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [amountDisplay, setAmountDisplay] = useState("");
  const [orderDetails, setOrderDetails] = useState<ReturnType<typeof calculateOrderDetails> | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdTransactionId, setCreatedTransactionId] = useState<string | null>(null);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [saleType, setSaleType] = useState<SaleType>("producto_persona");
  const [mainType, setMainType] = useState<MainType>("producto");
  const [initiatorRole, setInitiatorRole] = useState<InitiatorRole>("seller");
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [amountTooHigh, setAmountTooHigh] = useState(false);
  const { showCompleteProfileModal, requireCompleteProfile, onProfileCompleted, closeModal } = useRequireCompleteProfile();
  const [formData, setFormData] = useState<{
    productName: string;
    productDescription: string;
    amount: number;
    saleType: SaleType;
    initiatorRole: InitiatorRole;
    buyerEmail: string;
  } | null>(null);
  const formDataTipo = formData;
  const [buyerEmail, setBuyerEmail] = useState("");
  const [pendingTransactionsCount, setPendingTransactionsCount] = useState(0);
  // Salas de esta cuenta que ya tuvieron plata: con 0, la primera va sin comisión. Lo que se
  // cobra lo decide process-escrow-deposit; esto es sólo para mostrarlo. null = cargando.
  const [salasFinanciadas, setSalasFinanciadas] = useState<number | null>(null);
  // Asistente: el paso en que va y los datos (controlados: los pasos se desmontan)
  const [paso, setPaso] = useState(1);
  const [eligioTipo, setEligioTipo] = useState(false);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");

  // Los accesos del panel ("Compro por redes", "Freelance"…) llegan con ?tipo=&rol= ya elegidos
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const tipo = searchParams.get("tipo") as SaleType | null;
    if (tipo && ["servicio", "producto_persona", "producto_envio", "producto_digital"].includes(tipo)) {
      setMainType(tipo === "servicio" ? "servicio" : "producto");
      setSaleType(tipo);
      setEligioTipo(true);
    }
    const rol = searchParams.get("rol");
    if (rol === "buyer" || rol === "seller") setInitiatorRole(rol);
  }, [searchParams]);

  // Load user verification status
  useEffect(() => {
    const loadVerificationStatus = async () => {
      if (user) {
        const verified = await getUserVerificationStatus(user.id);
        setIsVerified(verified);
      }
    };
    loadVerificationStatus();
  }, [user]);

  // Load pending transactions count for warning
  useEffect(() => {
    if (!user) return;
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("state", "created")
      .then(({ count }) => setPendingTransactionsCount(count ?? 0));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .in("state", [...ESTADOS_FINANCIADOS])
      .then(({ count, error }) => setSalasFinanciadas(error ? 1 : (count ?? 0)));
  }, [user]);

  const sinComision = salasFinanciadas !== null && primeraSalaGratis(amount, salasFinanciadas);
  const tienePrimeraGratis = salasFinanciadas === 0;

  // Dynamic labels based on type and role
  const isService = mainType === "servicio";
  const isBuyerInitiator = initiatorRole === "buyer";
  
  const sellerLabel = isService ? "Proveedor" : "Vendedor";
  const buyerLabel = isService ? "Cliente" : "Comprador";
  const itemLabel = isService ? "Servicio" : "Producto";

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatAmountInput(rawValue);
    setAmountDisplay(formatted);

    const value = parseFormattedAmount(rawValue);
    setTermsAccepted(false);

    if (value <= 0) {
      setAmount(0);
      setOrderDetails(null);
      setAmountTooHigh(false);
      return;
    }

    setAmount(value);
    // Above the cap we don't show a commission breakdown — it would display a
    // meaningless huge fee. Show the "contact support" notice instead.
    if (value > MAX_TRANSACTION_AMOUNT) {
      setOrderDetails(null);
      setAmountTooHigh(true);
      return;
    }

    setAmountTooHigh(false);
    setOrderDetails(calculateOrderDetails(value));
  };

  const handleCreateTransaction = async () => {
    if (!user) return;
    const parsedAmount = amount;

    if (!productName.trim() || !parsedAmount || parsedAmount <= 0) {
      toast.error("Por favor completa todos los campos correctamente");
      return;
    }

    if (parsedAmount > MAX_TRANSACTION_AMOUNT) {
      toast.error(
        "Para transacciones sobre $2.000.000 CLP, contáctanos en soporte para coordinar condiciones especiales.",
        { duration: 8000 }
      );
      return;
    }

    if (buyerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail.trim())) {
      toast.error("El correo del comprador no es válido");
      return;
    }

    if (!termsAccepted) {
      toast.error("Debes aceptar los términos para continuar");
      return;
    }

    // Check transaction limits for unverified users (wait until verification status is loaded)
    if (isVerified === null) {
      toast.error("Espera un momento mientras verificamos tu estado de cuenta");
      return;
    }
    if (isVerified === false) {
      const limitCheck = await checkTransactionLimits(user.id, parsedAmount, false);
      if (!limitCheck.allowed) {
        toast.error(limitCheck.message);
        return;
      }
    }

    // Perfil completo antes de crear; el paso 4 ya fue la revisión, así que se crea directo
    await requireCompleteProfile(() => {
      const datos = {
        productName: productName.trim(),
        productDescription: productDescription.trim(),
        amount: parsedAmount,
        saleType,
        initiatorRole,
        buyerEmail,
      };
      setFormData(datos);
      void confirmCreateTransaction(datos);
    });
  };

  const confirmCreateTransaction = async (formData: NonNullable<typeof formDataTipo>) => {
    if (!user || !orderDetails) return;

    setLoading(true);

    try {
      const { data: codeData } = await supabase.rpc("generate_invite_code");
      const inviteCode = codeData;

      // Always set current user as seller_id (required by DB constraint and RLS)
      // The initiator_role field tracks the actual role of the creator
      // When someone joins, they fill the opposite role based on initiator_role
      const transactionData = {
        product_name: formData.productName,
        product_description: formData.productDescription,
        amount: formData.amount,
        commission: sinComision ? 0 : orderDetails.appFee,
        state: "created" as const,
        invite_code: inviteCode,
        sale_type: formData.saleType,
        initiator_role: formData.initiatorRole,
        seller_id: user.id, // Creator always goes here due to DB/RLS constraints
        buyer_id: null,
      };

      const { data: transaction, error } = await supabase
        .from("transactions")
        .insert(transactionData)
        .select()
        .single();

      if (error) throw error;

      // Send notification email to seller
      try {
        await supabase.functions.invoke("notify-transaction-created", {
          body: { transactionId: transaction.id },
        });
      } catch (emailError) {
        console.error("Error sending notification email:", emailError);
      }

      // Send direct invite to buyer if email was provided
      if (formData.buyerEmail.trim()) {
        try {
          await supabase.functions.invoke("invite-buyer", {
            body: { transactionId: transaction.id, email: formData.buyerEmail.trim() },
          });
        } catch (inviteError) {
          console.error("Error sending buyer invite:", inviteError);
        }
      }

      setCreatedTransactionId(transaction.id);
      setCreatedInviteCode(inviteCode);
      setShowSuccessModal(true);
    } catch (error: any) {
      toast.error("Error al crear transacción: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get the correct app URL (production or staging, not preview)
  const getAppUrl = () => {
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('id-preview--')) {
      return 'https://trado.cl';
    }
    return origin;
  };

  const copyInviteLink = () => {
    if (createdTransactionId) {
      const appUrl = getAppUrl();
      const link = `${appUrl}/invite/${createdTransactionId}`;
      navigator.clipboard.writeText(`${link}${codeFallbackLine()}`);
      setCopiedLink(true);
      toast.success("Enlace y código copiados al portapapeles");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const codeFallbackLine = () => {
    if (!createdInviteCode) return "";
    const appUrl = getAppUrl();
    return `\n\nSi el enlace no funciona, entra a ${appUrl}/join-transaction y usa el código: ${createdInviteCode}`;
  };

  const shareInviteLink = async () => {
    if (createdTransactionId && formData) {
      const appUrl = getAppUrl();
      const link = `${appUrl}/invite/${createdTransactionId}`;
      const text = `Te invito a unirte a mi transacción segura en Trado para: ${formData.productName}${codeFallbackLine()}`;

      await nativeShare(
        { title: 'Invitación a Trado', text, url: link, dialogTitle: 'Compartir invitación' },
        copyInviteLink
      );
    }
  };

  const shareViaWhatsApp = () => {
    if (createdTransactionId && formData) {
      const appUrl = getAppUrl();
      const link = `${appUrl}/invite/${createdTransactionId}`;
      const text = `¡Hola! Te invito a unirte a mi transacción segura en Trado para: *${formData.productName}*\n\nÚnete aquí: ${link}${codeFallbackLine()}`;
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  // Calculate what the user will pay/receive
  const getSellerReceivesAmount = () => {
    if (!orderDetails) return 0;
    return isBuyerInitiator || sinComision
      ? orderDetails.buyerPays // Seller receives full price
      : orderDetails.sellerReceives; // Seller receives price - commission
  };

  // ── Asistente por pasos ──────────────────────────────────────────────────────
  const PASOS = ["¿Qué vas a hacer?", "¿Qué es?", "¿Cuánto?", "Revisar y crear"];
  const puedeSeguir =
    paso === 1 ? eligioTipo :
    paso === 2 ? productName.trim().length >= 3 :
    paso === 3 ? amount > 0 && !amountTooHigh :
    termsAccepted;
  const siguiente = () => {
    if (!puedeSeguir) {
      if (paso === 1) toast.error("Elige qué vas a hacer");
      if (paso === 2) toast.error("Ponle un nombre de al menos 3 letras");
      if (paso === 3) toast.error(amountTooHigh ? "Ese monto supera el máximo" : "Escribe el monto");
      return;
    }
    setPaso((p) => Math.min(4, p + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const atras = () => {
    if (paso === 1) navigate("/dashboard");
    else setPaso((p) => p - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const caso = CASOS_CREAR.find((c) => c.tipo === saleType) ?? CASOS_CREAR[0];
  const CasoIcon = caso.icon;
  const vendo = !isBuyerInitiator;
  const montoRapido = (v: number) => {
    handleAmountChange({ target: { value: String(v) } } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-info/5">
      <Helmet>
        <title>Crear sala — Trado</title>
        <meta name="description" content="Crea una sala de Trado: la plata queda retenida hasta que se entrega lo acordado." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="sr-only">Crear una sala en Trado</h1>

      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3 max-w-3xl">
          <div className="flex items-center gap-1 sm:gap-3">
            <Button variant="ghost" size="sm" className="px-2 sm:px-3" onClick={atras}>
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{paso === 1 ? "Mi panel" : "Atrás"}</span>
            </Button>
            <Logo height={26} />
          </div>
          <span className="text-xs sm:text-sm text-muted-foreground font-medium">Nueva sala</span>
        </div>
        {/* Avance */}
        <div className="h-1 bg-muted">
          <div className="h-full bg-gradient-to-r from-primary via-info to-success transition-all duration-500" style={{ width: `${(paso / 4) * 100}%` }} />
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Paso {paso} de 4</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 mb-6">{PASOS[paso - 1]}</h2>

        {/* ── Paso 1: qué vas a hacer ── */}
        {paso === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-muted">
              {([
                { rol: "seller", titulo: isService ? "Cobro" : "Vendo", sub: "Recibo la plata", icon: Store },
                { rol: "buyer", titulo: isService ? "Contrato" : "Compro", sub: "Pago yo", icon: ShoppingBag },
              ] as const).map(({ rol, titulo, sub, icon: Icon }) => (
                <button
                  key={rol}
                  type="button"
                  onClick={() => setInitiatorRole(rol)}
                  className={`flex items-center justify-center gap-2.5 rounded-xl py-3 transition-all ${
                    initiatorRole === rol ? "bg-card shadow-md" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${initiatorRole === rol ? "text-primary" : ""}`} />
                  <span className="text-left leading-tight">
                    <span className="block font-bold">{titulo}</span>
                    <span className="block text-xs text-muted-foreground">{sub}</span>
                  </span>
                </button>
              ))}
            </div>

            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-3">¿Cómo es el trato?</p>
              <div className="grid grid-cols-2 gap-3">
                {CASOS_CREAR.map((c) => {
                  const Icon = c.icon;
                  const sel = eligioTipo && saleType === c.tipo;
                  return (
                    <button
                      key={c.tipo}
                      type="button"
                      onClick={() => {
                        setSaleType(c.tipo);
                        setMainType(c.tipo === "servicio" ? "servicio" : "producto");
                        setEligioTipo(true);
                      }}
                      className={`relative text-left rounded-2xl border-2 p-4 bg-gradient-to-b to-card transition-all hover:-translate-y-0.5 hover:shadow-lg ${c.caja} ${
                        sel ? `${c.sel} shadow-lg` : "border-transparent"
                      }`}
                    >
                      {sel && (
                        <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <span className={`w-11 h-11 rounded-2xl ${c.icono} shadow-md flex items-center justify-center mb-3`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="block font-bold">{vendo ? c.vendo : c.compro}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{c.ejemplo}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {pendingTransactionsCount > 0 && (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Tienes {pendingTransactionsCount} sala{pendingTransactionsCount > 1 ? "s" : ""} esperando a la otra persona.
                Quizás te conviene compartir ese link antes de crear otra.
              </p>
            )}
          </div>
        )}

        {/* ── Paso 2: qué es ── */}
        {paso === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium bg-gradient-to-r ${caso.caja} to-card`}>
              <CasoIcon className="h-4 w-4" /> {vendo ? caso.vendo : caso.compro}
            </div>
            <div className="space-y-2">
              <Label htmlFor="productName" className="text-base font-semibold">Nombre</Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={caso.nombre}
                className="h-14 text-lg rounded-xl"
                maxLength={120}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productDescription" className="text-base font-semibold">
                Detalle <span className="text-muted-foreground font-normal text-sm">(recomendado)</span>
              </Label>
              <Textarea
                id="productDescription"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder={caso.detalle}
                rows={4}
                className="rounded-xl text-base"
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                Esto es lo acordado: si hay un reclamo, el equipo lo compara con lo que se entregó.
              </p>
            </div>
          </div>
        )}

        {/* ── Paso 3: cuánto ── */}
        {paso === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="rounded-3xl bg-card border shadow-xl p-5 sm:p-7">
              <Label htmlFor="amount" className="text-sm font-semibold text-muted-foreground">Precio acordado</Label>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-4xl sm:text-5xl font-extrabold text-muted-foreground">$</span>
                <input
                  id="amount"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amountDisplay}
                  onChange={handleAmountChange}
                  autoFocus
                  className="w-full bg-transparent text-4xl sm:text-5xl font-extrabold tracking-tight outline-none placeholder:text-muted-foreground/40"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {[10_000, 30_000, 50_000, 100_000, 250_000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => montoRapido(v)}
                    className="rounded-full border px-3 py-1.5 text-sm hover:border-primary hover:text-primary transition-colors"
                  >
                    ${formatCLP(v)}
                  </button>
                ))}
              </div>

              {amountTooHigh && (
                <div className="mt-5 p-4 bg-info/10 rounded-xl border border-info/30 text-sm">
                  <p className="font-semibold text-info">Monto sobre el máximo</p>
                  <p className="text-muted-foreground mt-1">
                    Sobre ${formatCLP(MAX_TRANSACTION_AMOUNT)} coordinamos las condiciones contigo: escríbenos a{" "}
                    <a href="mailto:contacto@trado.cl" className="text-primary underline">contacto@trado.cl</a>.
                  </p>
                </div>
              )}

              {orderDetails && (
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary to-info text-white px-5 py-4 shadow-lg">
                    <span className="text-sm font-medium text-white/85">
                      {vendo ? "Recibirás" : sinComision ? "Pagarás" : "Pagarás con tarjeta"}
                    </span>
                    <span className="text-3xl font-extrabold">
                      ${formatCLP(vendo ? getSellerReceivesAmount() : sinComision ? orderDetails.buyerPays : feeOptions(orderDetails.buyerPays, "buyer").conTarjeta)}
                    </span>
                  </div>
                  {sinComision ? (
                    <div className="flex items-center gap-3 rounded-2xl bg-success/10 border border-success/30 px-4 py-3">
                      <Gift className="h-5 w-5 text-success shrink-0" />
                      <p className="text-sm"><b>Tu primera sala va sin comisión.</b> No se descuenta nada.</p>
                    </div>
                  ) : (
                    <FeeOptions amount={orderDetails.buyerPays} payer={vendo ? "seller" : "buyer"} />
                  )}
                </div>
              )}
              {!orderDetails && !amountTooHigh && tienePrimeraGratis && (
                <p className="mt-4 text-sm text-success font-medium flex items-center gap-1.5">
                  <Gift className="h-4 w-4" /> Tu primera sala va sin comisión, hasta ${formatCLP(PRIMERA_SALA_GRATIS_HASTA)}.
                </p>
              )}
            </div>

            {isVerified === false && (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-warning" />
                Sin verificar puedes usar salas de hasta ${formatCLP(UNVERIFIED_LIMITS.PER_TRANSACTION)} (${formatCLP(UNVERIFIED_LIMITS.TOTAL_ACCUMULATED)} en
                total).{" "}
                <button type="button" onClick={() => navigate("/verification")} className="text-primary underline">Verificarme</button>
              </p>
            )}
          </div>
        )}

        {/* ── Paso 4: revisar y crear ── */}
        {paso === 4 && orderDetails && (
          <div className="space-y-5 animate-fade-in">
            <div className="rounded-3xl overflow-hidden border shadow-xl bg-card">
              <div className="bg-gradient-to-r from-primary to-info text-white p-5 sm:p-6">
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <CasoIcon className="h-4 w-4" /> {vendo ? caso.vendo : caso.compro}
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-1 break-words">{productName}</p>
                <p className="text-3xl sm:text-4xl font-extrabold mt-2">${formatCLP(amount)}</p>
              </div>
              <div className="p-5 sm:p-6 space-y-4">
                {productDescription.trim() && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{productDescription}</p>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{vendo ? "Tú recibes" : "Tú pagas"}</p>
                    <p className="font-bold text-lg">
                      ${formatCLP(vendo ? getSellerReceivesAmount() : sinComision ? orderDetails.buyerPays : feeOptions(orderDetails.buyerPays, "buyer").conTarjeta)}
                    </p>
                    {!vendo && !sinComision && <p className="text-[11px] text-muted-foreground">con tarjeta</p>}
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Comisión Trado</p>
                    <p className="font-bold text-lg">{sinComision ? <span className="text-success">$0</span> : `$${formatCLP(orderDetails.appFee)}`}</p>
                    <p className="text-[11px] text-muted-foreground">{sinComision ? "tu primera sala" : "con tarjeta · menos por transferencia"}</p>
                  </div>
                </div>

                <ol className="space-y-2">
                  {(vendo
                    ? ["Compartes el link con quien compra", "Paga en Trado y la plata queda retenida", `Entregas: ${caso.entrega}`, "Confirma y se libera tu pago"]
                    : ["Compartes el link con quien vende", "Pagas en Trado y la plata queda retenida", `Te entrega: ${caso.entrega}`, "Revisas, confirmas y se libera el pago"]
                  ).map((t, i) => (
                    <li key={t} className="flex items-center gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      {t}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyerEmail" className="text-sm font-semibold">
                ¿Le mandamos la invitación por correo? <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="buyerEmail"
                  type="email"
                  placeholder="correo de la otra persona"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  className="pl-9 h-12 rounded-xl"
                />
              </div>
              <p className="text-xs text-muted-foreground">Igual vas a poder compartir el link por WhatsApp al crearla.</p>
            </div>

            <label htmlFor="termsAccepted" className="flex items-start gap-3 p-4 rounded-2xl border bg-card cursor-pointer">
              <Checkbox
                id="termsAccepted"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5"
              />
              <span className="text-sm leading-relaxed">
                {sinComision
                  ? "Entiendo que va sin comisión por ser mi primera sala, y que la plata queda retenida en Trado hasta que se confirme la entrega."
                  : vendo
                    ? "Acepto la comisión de Trado, que se descuenta de lo que recibo cuando se complete la sala."
                    : "Acepto pagar el precio más la comisión de Trado, y que la plata quede retenida hasta que confirme la entrega."}
              </span>
            </label>
          </div>
        )}

        {/* Navegación */}
        <div className="mt-8 flex items-center gap-3">
          {paso > 1 && (
            <Button variant="outline" size="lg" className="rounded-xl" onClick={atras}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
            </Button>
          )}
          {paso < 4 ? (
            <Button
              size="lg"
              className={`flex-1 rounded-xl h-14 text-base font-bold bg-gradient-to-r from-primary to-info text-white shadow-lg ${puedeSeguir ? "" : "opacity-60"}`}
              onClick={siguiente}
            >
              Seguir <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="flex-1 rounded-xl h-14 text-base font-bold bg-gradient-to-r from-success to-emerald-600 text-white shadow-lg shadow-success/25"
              disabled={loading || !termsAccepted || !orderDetails}
              onClick={handleCreateTransaction}
            >
              <Handshake className="h-5 w-5 mr-2" />
              {loading ? "Creando…" : "Crear sala"}
            </Button>
          )}
        </div>
      </main>

      {/* Success Modal with Invite Link */}
      <Dialog open={showSuccessModal} onOpenChange={(open) => {
        if (!open) {
          navigate(`/transaction/${createdTransactionId}`);
        }
        setShowSuccessModal(open);
      }}>
        <DialogContent className="max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden overscroll-contain p-0">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-transparent to-primary/5 pointer-events-none" />
          
          {/* Confetti-like decorative elements */}
          <div className="absolute top-0 left-0 w-full h-32 overflow-hidden pointer-events-none">
            <div 
              className="absolute top-4 left-8 w-2 h-2 bg-success/40 rounded-full animate-bounce"
              style={{ animationDelay: '0.1s', animationDuration: '2s' }}
            />
            <div 
              className="absolute top-8 left-16 w-3 h-3 bg-primary/30 rounded-full animate-bounce"
              style={{ animationDelay: '0.3s', animationDuration: '2.5s' }}
            />
            <div 
              className="absolute top-6 right-12 w-2 h-2 bg-warning/40 rounded-full animate-bounce"
              style={{ animationDelay: '0.5s', animationDuration: '2.2s' }}
            />
            <div 
              className="absolute top-12 right-20 w-2.5 h-2.5 bg-success/30 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s', animationDuration: '2.8s' }}
            />
            <div 
              className="absolute top-3 left-1/2 w-1.5 h-1.5 bg-info/40 rounded-full animate-bounce"
              style={{ animationDelay: '0.4s', animationDuration: '2.3s' }}
            />
          </div>

          <div className="relative p-6">
            <div 
              className="flex flex-col items-center text-center animate-scale-in"
              style={{ animationDuration: '0.4s' }}
            >
              {/* Animated success icon with pulse ring */}
              <div className="relative mb-6">
                <div 
                  className="absolute inset-0 bg-success/20 rounded-full animate-ping"
                  style={{ animationDuration: '1.5s' }}
                />
                <div 
                  className="relative p-5 bg-gradient-to-br from-success/20 to-success/10 rounded-full border-2 border-success/30 shadow-lg shadow-success/20 animate-scale-in"
                  style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}
                >
                  <CheckCircle2 className="h-14 w-14 text-success drop-shadow-sm" />
                </div>
              </div>
              
              <DialogTitle 
                className="text-2xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text animate-fade-in"
                style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}
              >
                ¡Sala Creada!
              </DialogTitle>
              <DialogDescription 
                className="text-muted-foreground animate-fade-in"
                style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}
              >
                Comparte el enlace para invitar a la otra persona
              </DialogDescription>
            </div>

            {createdInviteCode && (
              <div
                className="mt-4 p-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 text-center animate-fade-in"
                style={{ animationDelay: '0.45s', animationFillMode: 'backwards' }}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  ¿No le funciona el enlace? Puede unirse con este código
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold tracking-widest font-mono">{createdInviteCode}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdInviteCode);
                      toast.success("Código copiado");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Copiar código"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ingresándolo en trado.cl → Unirse a transacción
                </p>
              </div>
            )}

            <div
              className="space-y-3 py-6 animate-fade-in"
              style={{ animationDelay: '0.5s', animationFillMode: 'backwards' }}
            >
              <Button
                className="w-full h-14 text-base font-semibold bg-[#25D366] hover:bg-[#1ebe5b] text-white shadow-lg shadow-[#25D366]/25"
                onClick={shareViaWhatsApp}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Mandar por WhatsApp
              </Button>
              <Button
                variant="outline"
                className={`w-full h-12 font-semibold transition-all duration-300 ${copiedLink ? "border-success text-success" : ""}`}
                onClick={copyInviteLink}
              >
                {copiedLink ? (
                  <span className="flex items-center gap-2 animate-scale-in">
                    <Check className="h-5 w-5" />
                    ¡Enlace copiado!
                  </span>
                ) : (
                  <>
                    <Copy className="mr-2 h-5 w-5" />
                    Copiar enlace de invitación
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full h-12 hover:bg-muted/50 transition-all duration-200 hover:scale-[1.01]"
                onClick={shareInviteLink}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartir enlace
              </Button>
            </div>

            <div 
              className="border-t border-border/50 pt-4 animate-fade-in"
              style={{ animationDelay: '0.6s', animationFillMode: 'backwards' }}
            >
              <Button 
                variant="ghost"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate(`/transaction/${createdTransactionId}`);
                }}
                className="w-full text-muted-foreground hover:text-foreground transition-colors"
              >
                Ir a mi sala
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CompleteProfileModal
        open={showCompleteProfileModal}
        onClose={closeModal}
        onComplete={onProfileCompleted}
      />
    </div>
  );
};

export default CreateTransaction;