import { Check } from "lucide-react";

// En qué paso va la sala, arriba de todo, para que cada persona sepa dónde está. Los pasos dependen
// del tipo de venta: en un envío el comprador además marca "recibido" antes de revisar.
export const PASOS: Record<string, string[]> = {
  producto_envio: ["Unirse", "Pagar", "Enviar", "Recibir", "Revisar y liberar"],
  producto_persona: ["Unirse", "Pagar", "Coordinar el encuentro", "Entregar y confirmar"],
  producto_digital: ["Unirse", "Pagar", "Entregar", "Revisar y liberar"],
  servicio: ["Unirse", "Pagar", "Hacer el trabajo", "Revisar y liberar"],
};

export function pasoActual(saleType: string, state: string, conAmbos: boolean): number {
  const ultimo = (PASOS[saleType] ?? PASOS.producto_digital).length;
  if (state === "completed") return ultimo + 1; // todo hecho
  if (!conAmbos) return 1;
  if (["created", "invited", "awaiting_deposit"].includes(state)) return 2;
  if (state === "funds_secured") return 3;
  if (state === "in_delivery") return saleType === "producto_envio" ? 4 : ultimo;
  return ultimo; // en revisión, devolución o disputa: el último paso
}

export const PasosSala = ({ saleType, state, conAmbos }: { saleType: string; state: string; conAmbos: boolean }) => {
  if (state === "cancelled") return null;
  const pasos = PASOS[saleType] ?? PASOS.producto_digital;
  const actual = pasoActual(saleType, state, conAmbos);
  const terminado = actual > pasos.length;

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <p className="text-sm font-semibold">
          {terminado ? (
            <span className="text-success">Sala completada</span>
          ) : (
            <>
              <span className="text-muted-foreground font-medium">Paso {actual} de {pasos.length} · </span>
              {pasos[actual - 1]}
            </>
          )}
        </p>
      </div>
      <ol className="flex items-center gap-1.5" aria-label="Pasos de la sala">
        {pasos.map((nombre, i) => {
          const n = i + 1;
          const hecho = n < actual;
          const ahora = n === actual;
          return (
            <li key={nombre} className="flex-1 flex flex-col items-center gap-1 min-w-0" aria-current={ahora ? "step" : undefined}>
              <div className="w-full flex items-center gap-1.5">
                <span
                  className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                    hecho
                      ? "bg-success text-white"
                      : ahora
                        ? "bg-gradient-to-br from-primary to-info text-white ring-4 ring-primary/15"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {hecho ? <Check className="h-3.5 w-3.5" /> : n}
                </span>
                {n < pasos.length && (
                  <span className={`h-0.5 flex-1 rounded-full ${hecho ? "bg-success" : "bg-muted"}`} />
                )}
              </div>
              <span
                className={`hidden sm:block self-start text-[11px] leading-tight truncate max-w-full ${
                  ahora ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {nombre}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
