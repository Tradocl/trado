import { useState } from "react";
import { Check, Copy, ExternalLink, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TrackingPanelProps {
  trackingNumber: string;
  carrier: string;
  /** Título del recuadro: "Seguimiento del envío" o, en devoluciones, "Seguimiento de la devolución". */
  titulo?: string;
}

export const CARRIER_LABELS: Record<string, string> = {
  chilexpress: "Chilexpress",
  starken: "Starken",
  correos_chile: "Correos de Chile",
  blue_express: "Blue Express",
};

// Página oficial de seguimiento de cada courier. `conNumero` dice si el link ya deja el número
// escrito; si no, al abrirla se copia para que la persona sólo lo pegue. Revisado en un navegador
// el 2026-11-07: el link viejo de Chilexpress y el de blueexpress.cl daban 404, y Chilexpress manda
// al inicio cualquier link con número. Correos pide captcha, así que no se pudo comprobar más que
// la página (la que indica ChileAtiende).
function enlaceSeguimiento(carrier: string, numero: string): { url: string; conNumero: boolean } | null {
  const n = encodeURIComponent(numero);
  switch (carrier.toLowerCase()) {
    case "starken":
      return { url: `https://www.starken.cl/seguimiento?codigo=${n}`, conNumero: true };
    case "blue_express":
      return { url: `https://www.blue.cl/enviar/seguimiento?n_seguimiento=${n}`, conNumero: true };
    case "chilexpress":
      return { url: "https://centrodeayuda.chilexpress.cl/seguimiento", conNumero: false };
    case "correos_chile":
      return { url: "https://www.correos.cl/seguimiento-en-linea", conNumero: false };
    default:
      return null;
  }
}

export function TrackingPanel({ trackingNumber, carrier, titulo = "Seguimiento del envío" }: TrackingPanelProps) {
  const carrierLabel = CARRIER_LABELS[carrier.toLowerCase()] ?? carrier;
  const enlace = enlaceSeguimiento(carrier, trackingNumber);
  const [copiado, setCopiado] = useState(false);

  const copiar = async (aviso: string) => {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      toast.success(aviso);
    } catch {
      toast.info(`El número es ${trackingNumber}`);
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-info/10 border border-info/20 rounded-lg">
      <Package className="h-4 w-4 text-info mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-info mb-1">{titulo}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium">{carrierLabel}</span>
          <span>·</span>
          <span className="font-mono break-all">{trackingNumber}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); copiar("Número de seguimiento copiado"); }}
            className="inline-flex items-center gap-1 text-info hover:underline"
          >
            {copiado ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>
        {enlace ? (
          <>
            <Button variant="link" size="sm" className="h-auto p-0 mt-1.5 text-xs text-info" asChild>
              <a
                href={enlace.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!enlace.conNumero) copiar("Número copiado: pégalo en el buscador de " + carrierLabel);
                }}
              >
                Rastrear en {carrierLabel}
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
            {!enlace.conNumero && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Se abre su página de seguimiento: pega el número en el buscador.
              </p>
            )}
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-1">
            Búscalo con este número en la página de {carrierLabel}.
          </p>
        )}
      </div>
    </div>
  );
}
