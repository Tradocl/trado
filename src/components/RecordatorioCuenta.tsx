import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCLP, MAX_TRANSACTION_AMOUNT } from "@/lib/utils";
import { COOKIE_KEY } from "@/lib/meta-pixel";

// Registrarse pide sólo nombre, correo y clave (poca fricción). El RUT y la verificación se
// recuerdan de a poco: una tarjeta que aparece sola en el panel, cada vez más espaciada
// (3, 7, 14 y luego cada 30 días después de cada "Más tarde"). Por dispositivo: si no hay
// almacenamiento, sale en cada visita, que para un recordatorio que se cierra es aceptable.
const CLAVE = "trado_recordatorio_cuenta";
const ESPERAS_DIAS = [0, 3, 7, 14, 30];
const DIA = 24 * 60 * 60 * 1000;

type Registro = { veces: number; ultimo: number };

const leer = (userId: string): Registro => {
  try {
    const r = JSON.parse(localStorage.getItem(`${CLAVE}:${userId}`) || "null");
    if (r && Number.isFinite(r.veces) && Number.isFinite(r.ultimo)) return r;
  } catch { /* sin almacenamiento */ }
  return { veces: 0, ultimo: 0 };
};

const guardar = (userId: string, r: Registro) => {
  try { localStorage.setItem(`${CLAVE}:${userId}`, JSON.stringify(r)); } catch { /* sin almacenamiento */ }
};

type Props = {
  userId: string;
  perfilCompleto: boolean;
  /** approved, in_review, pending… */
  estadoVerificacion: string | null | undefined;
  /** No competir con otro popup que ya esté abierto (la bienvenida). */
  bloqueado?: boolean;
  onCompletarPerfil: () => void;
};

export const RecordatorioCuenta = ({ userId, perfilCompleto, estadoVerificacion, bloqueado, onCompletarPerfil }: Props) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  const verificado = estadoVerificacion === "approved";
  const enRevision = estadoVerificacion === "in_review";
  const falta = !perfilCompleto ? "perfil" : !verificado && !enRevision ? "verificar" : null;

  useEffect(() => {
    if (!falta || bloqueado) { setVisible(false); return; }
    const r = leer(userId);
    const espera = ESPERAS_DIAS[Math.min(r.veces, ESPERAS_DIAS.length - 1)] * DIA;
    if (Date.now() - r.ultimo < espera) return;
    // Espera a que el panel cargue y a que la persona responda el aviso de cookies, que
    // ocupa el mismo lugar abajo en el celular
    const respondioCookies = () => { try { return !!localStorage.getItem(COOKIE_KEY); } catch { return true; } };
    let t: ReturnType<typeof setTimeout>;
    const intentar = () => { t = setTimeout(() => (respondioCookies() ? setVisible(true) : intentar()), 1800); };
    intentar();
    return () => clearTimeout(t);
  }, [userId, falta, bloqueado]);

  if (!visible || !falta) return null;

  const posponer = () => {
    const r = leer(userId);
    guardar(userId, { veces: r.veces + 1, ultimo: Date.now() });
    setVisible(false);
  };
  const actuar = () => {
    posponer();
    if (falta === "perfil") onCompletarPerfil();
    else navigate("/verification");
  };

  const contenido =
    falta === "perfil"
      ? {
          icon: UserCheck,
          titulo: "Deja tu cuenta lista",
          texto: "Agrega tu RUT y teléfono ahora, y cuando tengas un trato creas la sala en un paso.",
          boton: "Completar (1 min)",
          paso: 1,
        }
      : {
          icon: ShieldCheck,
          titulo: "Verifica tu identidad",
          texto: `La otra persona verá «Verificado» junto a tu nombre, y tus salas pueden ser de hasta $${formatCLP(MAX_TRANSACTION_AMOUNT)}.`,
          boton: "Verificarme (2 min)",
          paso: 2,
        };
  const Icono = contenido.icon;

  return (
    <div
      role="dialog"
      aria-label={contenido.titulo}
      className="fixed z-50 inset-x-3 bottom-20 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[380px] animate-in slide-in-from-bottom-6 fade-in duration-500"
    >
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2230C2] via-[#4B35D6] via-55% to-[#7C3AED] text-white shadow-[0_20px_60px_-15px_rgba(31,37,193,0.7)] p-5">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <button onClick={posponer} aria-label="Cerrar" className="absolute top-3 right-3 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Icono className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Tu cuenta · paso {contenido.paso} de 2</p>
            <p className="font-extrabold text-lg leading-tight mt-0.5">{contenido.titulo}</p>
          </div>
        </div>
        <p className="text-sm text-white/85 mt-3 leading-relaxed">{contenido.texto}</p>
        <div className="flex gap-1.5 mt-4">
          {[1, 2].map((n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${n < contenido.paso ? "bg-emerald-300" : n === contenido.paso ? "bg-white" : "bg-white/25"}`} />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Button onClick={actuar} className="flex-1 bg-white text-[#2230C2] hover:bg-white/90 font-bold">
            {contenido.boton}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <Button onClick={posponer} variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
            Más tarde
          </Button>
        </div>
      </div>
    </div>
  );
};
