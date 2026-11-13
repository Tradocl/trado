import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, Landmark, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LIMITE_PRIMERA_TRANSFERENCIA_EJEMPLO, TRADO_BANK, tradoBankText } from "@/lib/trado-bank";

/**
 * "Agrega a Trado en tu banco", en un toque.
 *
 * Los bancos chilenos limitan la primera transferencia a un destinatario nuevo
 * (BancoEstado $200.000, Santander y BCI $250.000, Itaú $300.000, Banco de Chile
 * $350.000, durante 12 a 24 horas). Si el comprador agrega a Trado recién al
 * pagar, una compra grande se traba a mitad de camino. Esta tarjeta invita a
 * hacerlo antes y deja los datos listos para copiar o guardar.
 */
export function TradoBankContact({
  defaultOpen = false,
  urgente = false,
}: {
  defaultOpen?: boolean;
  /** Cuando hay un pago por transferencia cerca: se destaca más. */
  urgente?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [copiado, setCopiado] = useState<string | null>(null);

  const copiar = async (valor: string, etiqueta: string) => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(etiqueta);
      setTimeout(() => setCopiado(null), 1500);
      toast.success(etiqueta === "todo" ? "Datos copiados" : `${etiqueta} copiado`);
    } catch {
      toast.error("No se pudo copiar. Mantén presionado el dato para copiarlo.");
    }
  };

  const compartir = async () => {
    // En el celular abre el menú de compartir: sirve para mandárselo a uno mismo
    // por WhatsApp o guardarlo en notas y tenerlo a mano en la app del banco.
    if (navigator.share) {
      try {
        await navigator.share({ title: "Datos de Trado para transferir", text: tradoBankText() });
        return;
      } catch {
        return; // el usuario cerró el menú
      }
    }
    copiar(tradoBankText(), "todo");
  };

  const filas: { label: string; value: string; mono?: boolean }[] = [
    { label: "Titular", value: TRADO_BANK.name },
    { label: "RUT", value: TRADO_BANK.rut },
    { label: "Banco", value: TRADO_BANK.bank },
    { label: "Tipo", value: TRADO_BANK.accountType },
    { label: "N° cuenta", value: TRADO_BANK.accountNumber, mono: true },
    { label: "Email", value: TRADO_BANK.email },
  ];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={urgente ? "border border-info/40 bg-info/5 shadow-sm" : "border shadow-sm"}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left p-4 flex items-center justify-between gap-3 rounded-lg hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Landmark className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-sm">Agrega a Trado como destinatario en tu banco</p>
                <p className="text-xs text-muted-foreground">
                  Hazlo antes de pagar: tu primera transferencia a alguien nuevo tiene límite
                </p>
              </div>
            </div>
            {open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            <p className="text-xs text-muted-foreground">
              Por seguridad, los bancos limitan la primera transferencia a un destinatario nuevo
              ({LIMITE_PRIMERA_TRANSFERENCIA_EJEMPLO} durante las primeras 12 a 24 horas, según el banco).
              Si nos agregas hoy, mañana puedes pagar el monto completo sin trabas.
            </p>
            <div className="rounded-lg border divide-y text-sm">
              {filas.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => copiar(f.value, f.label)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/40"
                  aria-label={`Copiar ${f.label}`}
                >
                  <span className="text-muted-foreground shrink-0">{f.label}</span>
                  <span className={`flex items-center gap-2 min-w-0 text-right ${f.mono ? "font-mono" : "font-medium"}`}>
                    <span className="truncate">{f.value}</span>
                    {copiado === f.label ? (
                      <Check className="h-3.5 w-3.5 text-success shrink-0" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => copiar(tradoBankText(), "todo")}>
                <Copy className="mr-1.5 h-4 w-4" />
                Copiar todo
              </Button>
              <Button variant="outline" size="sm" onClick={compartir}>
                <Share2 className="mr-1.5 h-4 w-4" />
                Guardar / enviar
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
