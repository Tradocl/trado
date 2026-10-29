import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { formatRUT, validateRUT } from "@/lib/validators";

// Dónde buscar a mano a quién pertenece un RUT. Las personas, en el buscador público con el RUT
// ya escrito; las empresas, en la situación tributaria del SII, que no acepta el RUT en el link
// (por eso el botón siempre lo copia).
const BUSCADORES = {
  persona: {
    texto: "Buscar nombre del RUT",
    url: (rut: string) => `https://www.nombrerutyfirma.com/rut?term=${encodeURIComponent(rut)}`,
  },
  empresa: {
    texto: "Ver en el SII (RUT copiado)",
    url: () => "https://zeus.sii.cl/cvc/stc/stc.html",
  },
};

export const RutConBusqueda = ({
  rut,
  buscador,
  etiqueta,
}: {
  rut: string;
  buscador: keyof typeof BUSCADORES;
  etiqueta?: string;
}) => {
  const formateado = formatRUT(rut);
  const { texto, url } = BUSCADORES[buscador];
  const copiar = () => {
    navigator.clipboard.writeText(formateado);
    toast.success("RUT copiado");
  };

  return (
    <div className="flex flex-col items-start gap-1">
      {etiqueta && <span className="text-xs text-muted-foreground">{etiqueta}</span>}
      <div className="flex items-center gap-2">
        <span className="font-mono text-lg font-semibold tracking-wide">{formateado}</span>
        <button onClick={copiar} className="text-muted-foreground hover:text-foreground" title="Copiar RUT">
          <Copy className="h-4 w-4" />
        </button>
      </div>
      {validateRUT(rut) ? (
        <Badge variant="secondary" className="text-success">RUT válido</Badge>
      ) : (
        <Badge variant="destructive">Dígito verificador no calza</Badge>
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => {
          navigator.clipboard.writeText(formateado);
          window.open(url(formateado), "_blank", "noopener,noreferrer");
        }}
      >
        <Search className="h-3 w-3 mr-1" />
        {texto}
      </Button>
    </div>
  );
};
