import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, Check, ChevronRight, Handshake, ShoppingBag, Ticket, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatCLP, PRIMERA_SALA_GRATIS_HASTA } from "@/lib/utils";

// Bienvenida de quien todavía no usa Trado de verdad (ninguna sala con plata), en un popup: lo
// único que tiene que hacer es crear su primera sala. Simple y en una sola línea de color: el
// avance en una barra y los casos como una lista que abre "crear sala" con el tipo y el rol ya elegidos.
const CASOS_SALA = [
  { id: "compras", titulo: "Compro por redes", icon: ShoppingBag, tipo: "producto_envio", rol: "buyer" },
  { id: "vendes", titulo: "Vendo y envío", icon: Truck, tipo: "producto_envio", rol: "seller" },
  { id: "persona", titulo: "Vendo en persona", icon: Handshake, tipo: "producto_persona", rol: "seller" },
  { id: "servicio", titulo: "Cobro un trabajo", icon: Briefcase, tipo: "servicio", rol: "seller" },
  { id: "digital", titulo: "Vendo una entrada o algo digital", icon: Ticket, tipo: "producto_digital", rol: "seller" },
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
    { texto: "Completa tu perfil", hecho: perfilCompleto },
    { texto: "Crea tu primera sala", hecho: salaCreada },
    { texto: "La otra persona se une y paga", hecho: false },
  ];
  const hechos = pasos.filter((p) => p.hecho).length;
  const siguiente = pasos.find((p) => !p.hecho);

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-md w-[calc(100%-1.5rem)] p-0 gap-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="pr-6">
            <DialogTitle className="text-lg sm:text-xl font-bold">
              {salaCreada ? "Tu sala está lista: compártela" : "Crea tu primera sala"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {salaCreada
                ? "Mándale el link a la otra persona. Cuando se una y pague, la plata queda retenida en Trado."
                : `Va sin comisión hasta $${formatCLP(PRIMERA_SALA_GRATIS_HASTA)}.`}
            </DialogDescription>
          </div>

          {/* Avance en una línea */}
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" />
                {siguiente ? `Siguiente: ${siguiente.texto.toLowerCase()}` : "Todo listo"}
              </span>
              <span>{hechos} de {pasos.length}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(hechos / pasos.length) * 100}%` }} />
            </div>
          </div>

          {!perfilCompleto && (
            <button
              type="button"
              onClick={() => { onCerrar(); onCompletarPerfil(); }}
              className="w-full flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5 text-sm font-medium hover:border-primary/40 transition-colors"
            >
              Completar mi perfil (RUT y teléfono)
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {salaCreada ? (
            <Button onClick={() => navigate(`/transaction/${salaPendienteId}`)} className="w-full">
              Ir a mi sala y compartir el link
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">¿Qué vas a hacer?</p>
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {CASOS_SALA.map(({ id, titulo, icon: Icon, tipo, rol }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navigate(`/create-transaction?tipo=${tipo}&rol=${rol}`)}
                    className="w-full flex items-center gap-3 px-3.5 py-3 text-left text-sm font-medium hover:bg-primary/5 transition-colors"
                  >
                    <Icon className="h-[18px] w-[18px] text-primary shrink-0" />
                    <span className="flex-1">{titulo}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
