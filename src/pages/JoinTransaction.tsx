import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Briefcase, ClipboardPaste, Handshake, Lock, Package, Search, ShieldAlert, Ticket, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatCLP } from "@/lib/utils";
import { UNVERIFIED_LIMITS, getUserVerificationStatus } from "@/lib/transaction-limits";
import { useRequireCompleteProfile } from "@/hooks/useRequireCompleteProfile";
import { CompleteProfileModal } from "@/components/CompleteProfileModal";
import { Logo } from "@/components/Logo";

// Unirse con el código que mandó la otra persona: un campo grande, "Pegar" (sirve también si
// pegan el link entero) y una vista previa de la sala antes de entrar, para que sepa a qué se une.
const TIPOS: Record<string, { icon: typeof Package; nombre: string; color: string }> = {
  producto_envio: { icon: Truck, nombre: "Envío", color: "bg-emerald-500" },
  producto_persona: { icon: Handshake, nombre: "En persona", color: "bg-amber-500" },
  producto_digital: { icon: Ticket, nombre: "Digital", color: "bg-rose-500" },
  servicio: { icon: Briefcase, nombre: "Servicio", color: "bg-violet-500" },
};

type Vista = {
  id: string;
  product_name: string;
  product_description: string | null;
  amount: number;
  sale_type: string | null;
  seller_name: string | null;
};

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const limpiarCodigo = (t: string) => t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

const JoinTransaction = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [vista, setVista] = useState<Vista | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const { showCompleteProfileModal, requireCompleteProfile, onProfileCompleted, closeModal } = useRequireCompleteProfile();

  // Prefill the invite code from the URL (?code=XXXX) so a shared fallback link works
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) setInviteCode(limpiarCodigo(code));
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

  // Si pegan el link de invitación entero, se va directo a esa sala
  const recibirTexto = (texto: string) => {
    const id = texto.match(UUID)?.[0];
    if (id && texto.includes("/invite/")) {
      navigate(`/invite/${id}`);
      return;
    }
    setVista(null);
    setInviteCode(limpiarCodigo(texto));
  };

  const pegar = async () => {
    try {
      recibirTexto(await navigator.clipboard.readText());
    } catch {
      toast.info("Mantén presionado el campo y elige Pegar");
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || inviteCode.length < 4) return;
    await requireCompleteProfile(async () => {
      await performSearch();
    });
  };

  const performSearch = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Look up by invite code via secure RPC (no broad table SELECT)
      const { data: matches, error } = await supabase
        .rpc("find_transaction_by_invite_code", { _invite_code: inviteCode });

      if (error?.message?.includes("rate_limit_exceeded")) {
        toast.error("Demasiados intentos. Espera un minuto e intenta de nuevo.");
        return;
      }

      const transaction = Array.isArray(matches) ? matches[0] : null;
      if (error || !transaction) {
        toast.error("No encontramos una sala con ese código. Revísalo con la otra persona.");
        return;
      }

      if (transaction.seller_id === user.id || transaction.buyer_id === user.id) {
        toast.info("Ya eres parte de esta sala");
        navigate(`/transaction/${transaction.id}`);
        return;
      }

      if (transaction.buyer_id && transaction.seller_id) {
        toast.error("Esta sala ya tiene a las dos personas");
        return;
      }

      // Vista previa antes de entrar
      const { data: prev } = await supabase.rpc("get_transaction_preview", { transaction_id: transaction.id }).maybeSingle();
      if (prev) {
        setVista(prev as Vista);
      } else {
        navigate(`/transaction/${transaction.id}`);
      }
    } catch (error: any) {
      toast.error("Error al buscar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const tipo = TIPOS[vista?.sale_type || ""] ?? { icon: Package, nombre: "Sala", color: "bg-primary" };
  const TipoIcon = tipo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-info/5">
      <Helmet>
        <title>Unirme a una sala — Trado</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <header className="border-b bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-1 sm:gap-3 max-w-xl">
          <Button variant="ghost" size="sm" className="px-2 sm:px-3" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Mi panel</span>
          </Button>
          <Logo height={26} />
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 max-w-xl">
        <div className="text-center mb-7">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-info text-white flex items-center justify-center shadow-lg">
            <Handshake className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Unirme a una sala</h1>
          <p className="text-muted-foreground mt-1">Pon el código que te mandó la otra persona</p>
        </div>

        {!vista ? (
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="rounded-3xl bg-card border shadow-xl p-5 sm:p-6">
              <input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => recibirTexto(e.target.value)}
                onPaste={(e) => { e.preventDefault(); recibirTexto(e.clipboardData.getData("text")); }}
                placeholder="CÓDIGO"
                aria-label="Código de la sala"
                autoComplete="off"
                autoCapitalize="characters"
                autoFocus
                className="w-full text-center text-4xl sm:text-5xl font-extrabold font-mono tracking-[0.25em] uppercase bg-transparent outline-none placeholder:text-muted-foreground/30 placeholder:tracking-[0.15em]"
              />
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={pegar}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                >
                  <ClipboardPaste className="h-4 w-4" /> Pegar código o link
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-14 rounded-xl text-base font-bold bg-gradient-to-r from-primary to-info text-white shadow-lg"
              disabled={loading || inviteCode.length < 4}
            >
              <Search className="mr-2 h-5 w-5" />
              {loading ? "Buscando…" : "Buscar sala"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 animate-scale-in">
            <div className="rounded-3xl overflow-hidden border shadow-xl bg-card">
              <div className="bg-gradient-to-r from-primary to-info text-white p-5 sm:p-6">
                <span className={`inline-flex items-center gap-1.5 rounded-full ${tipo.color} px-2.5 py-1 text-xs font-semibold`}>
                  <TipoIcon className="h-3.5 w-3.5" /> {tipo.nombre}
                </span>
                <p className="text-xl sm:text-2xl font-bold mt-2 break-words">{vista.product_name}</p>
                <p className="text-3xl sm:text-4xl font-extrabold mt-1">${formatCLP(Number(vista.amount))}</p>
              </div>
              <div className="p-5 sm:p-6 space-y-3">
                {vista.product_description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{vista.product_description}</p>
                )}
                {vista.seller_name && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Creada por </span>
                    <span className="font-semibold">{vista.seller_name}</span>
                  </p>
                )}
                <p className="flex items-start gap-2 rounded-xl bg-success/10 border border-success/20 p-3 text-sm">
                  <Lock className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  La plata queda retenida en Trado hasta que se confirme la entrega. Si algo sale mal, se reclama y no se mueve.
                </p>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full h-14 rounded-xl text-base font-bold bg-gradient-to-r from-success to-emerald-600 text-white shadow-lg"
              onClick={() => navigate(`/transaction/${vista.id}`)}
            >
              Unirme a esta sala <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <button type="button" onClick={() => { setVista(null); setInviteCode(""); }} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
              No es esta, buscar otro código
            </button>
          </div>
        )}

        {isVerified === false && (
          <p className="mt-6 text-xs text-muted-foreground flex items-start gap-1.5 justify-center text-center">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-warning" />
            Sin verificar puedes usar salas de hasta ${formatCLP(UNVERIFIED_LIMITS.PER_TRANSACTION)} (${formatCLP(UNVERIFIED_LIMITS.TOTAL_ACCUMULATED)} en total).
          </p>
        )}

        <CompleteProfileModal
          open={showCompleteProfileModal}
          onClose={closeModal}
          onComplete={onProfileCompleted}
        />
      </main>
    </div>
  );
};

export default JoinTransaction;
