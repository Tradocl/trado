import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, Check, Gift, Handshake, ShoppingBag, Ticket, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatCLP, PRIMERA_SALA_GRATIS_HASTA } from "@/lib/utils";

// Bienvenida de quien todavía no usa Trado de verdad (ninguna sala con plata), en un popup: lo
// único que tiene que hacer es crear su primera sala. Lista de pasos con avance y, si aún no creó
// ninguna, accesos por caso que abren "crear sala" con el tipo y el rol ya elegidos.
// Cada caso con su color, para que se distingan de un vistazo (las clases van completas para Tailwind)
const CASOS_SALA = [
  {
    id: "compras", titulo: "Compro por redes", icon: ShoppingBag, tipo: "producto_envio", rol: "buyer",
    caja: "from-sky-500/15 border-sky-500/25 hover:border-sky-500", icono: "bg-sky-500 text-white",
  },
  {
    id: "vendes", titulo: "Vendo y envío", icon: Truck, tipo: "producto_envio", rol: "seller",
    caja: "from-primary/15 border-primary/25 hover:border-primary", icono: "bg-primary text-white",
  },
  {
    id: "persona", titulo: "En persona", icon: Handshake, tipo: "producto_persona", rol: "seller",
    caja: "from-amber-500/15 border-amber-500/25 hover:border-amber-500", icono: "bg-amber-500 text-white",
  },
  {
    id: "servicio", titulo: "Freelance", icon: Briefcase, tipo: "servicio", rol: "seller",
    caja: "from-violet-500/15 border-violet-500/25 hover:border-violet-500", icono: "bg-violet-500 text-white",
  },
  {
    id: "digital", titulo: "Entradas", icon: Ticket, tipo: "producto_digital", rol: "seller",
    caja: "from-info/15 border-info/25 hover:border-info", icono: "bg-info text-white",
  },
] as const;

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  perfilCompleto: boolean;
  /** La sala que ya creó y todavía espera a la otra persona, si hay una. */
  salaPendienteId: string | null;
  onCompletarPerfil: () => void;
};

export const PrimerosPasos = ({ abierto, onCerrar, perfilCompleto, salaPendienteId, onCompletarPerfil }: Props) => {
  const navigate = useNavigate();
  const salaCreada = !!salaPendienteId;

  const pasos = [
    { texto: "Crea tu cuenta", hecho: true },
    {
      texto: "Completa tu perfil",
      hecho: perfilCompleto,
      accion: perfilCompleto ? undefined : () => { onCerrar(); onCompletarPerfil(); },
    },
    { texto: "Crea tu primera sala", hecho: salaCreada },
    { texto: "La otra persona se une y paga", hecho: false },
  ];
  const hechos = pasos.filter((p) => p.hecho).length;

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
    <DialogContent className="max-w-2xl sm:max-w-2xl w-[calc(100%-1.5rem)] p-0 gap-0 overflow-hidden rounded-3xl max-h-[92vh] overflow-y-auto">
      <div className="h-1.5 bg-gradient-to-r from-primary via-info to-success" />
      <div className="p-5 sm:p-7 space-y-5 bg-gradient-to-br from-primary/10 via-info/5 to-background">
        <div className="flex items-start justify-between gap-3 pr-6">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-success uppercase tracking-wider">
              <Gift className="h-3.5 w-3.5" /> Tu primera sala va sin comisión
            </p>
            <DialogTitle className="text-xl sm:text-2xl font-bold mt-1">
              {salaCreada ? "Tu sala está lista: compártela" : "Bienvenido a Trado: crea tu primera sala"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {salaCreada
                ? "Mándale el link a la otra persona. Cuando se una y pague, la plata queda retenida en Trado."
                : `Elige qué vas a hacer. Sin comisión hasta $${formatCLP(PRIMERA_SALA_GRATIS_HASTA)}.`}
            </DialogDescription>
          </div>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground bg-background/80 rounded-full px-2.5 py-1">
            {hechos} de {pasos.length}
          </span>
        </div>

        {/* Avance */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500"
            style={{ width: `${(hechos / pasos.length) * 100}%` }}
          />
        </div>
        <ol className="grid sm:grid-cols-2 gap-2">
          {pasos.map((p, i) => (
            <li key={p.texto}>
              <button
                type="button"
                disabled={!p.accion}
                onClick={p.accion}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  p.accion ? "bg-background hover:bg-primary/5 border border-primary/30" : "bg-background/60"
                }`}
              >
                <span
                  className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    p.hecho ? "bg-success text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.hecho ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={p.hecho ? "text-muted-foreground line-through" : "font-medium"}>{p.texto}</span>
                {p.accion && <ArrowRight className="h-4 w-4 ml-auto text-primary" />}
              </button>
            </li>
          ))}
        </ol>

        {salaCreada ? (
          <Button onClick={() => navigate(`/transaction/${salaPendienteId}`)} className="w-full sm:w-auto bg-gradient-to-r from-primary via-medio via-55% to-info text-white font-bold">
            Ir a mi sala y compartir el link
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">¿Qué vas a hacer?</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CASOS_SALA.map(({ id, titulo, icon: Icon, tipo, rol, caja, icono }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigate(`/create-transaction?tipo=${tipo}&rol=${rol}`)}
                  className={`group flex flex-col items-center gap-2 rounded-2xl border bg-gradient-to-b ${caja} to-background p-3 sm:p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all last:col-span-2 sm:last:col-span-1`}
                >
                  <span className={`w-11 h-11 rounded-2xl ${icono} shadow-md flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs sm:text-sm font-semibold leading-tight">{titulo}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate("/join-transaction")}
              className="mt-3 text-sm text-primary font-medium hover:underline"
            >
              ¿Te mandaron un código? Únete a su sala →
            </button>
          </div>
        )}
        <button type="button" onClick={onCerrar} className="block w-full text-center text-xs text-muted-foreground hover:text-foreground pt-1">
          Ahora no, ver mi panel
        </button>
      </div>
    </DialogContent>
    </Dialog>
  );
};
