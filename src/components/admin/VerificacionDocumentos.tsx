import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { FileText } from "lucide-react";

// Miniaturas del carnet y la selfie de una verificación, para revisarlas en la misma fila
// sin abrir pestañas. El bucket es privado: se firma cada URL por una hora.
const BUCKET = "verification-documents";

const rutaEnBucket = (guardado: string) =>
  guardado.includes(`/${BUCKET}/`) ? guardado.split(`/${BUCKET}/`)[1] : guardado;

const Miniatura = ({ guardado, etiqueta }: { guardado: string | null; etiqueta: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [falla, setFalla] = useState(false);

  useEffect(() => {
    if (!guardado) return;
    let vivo = true;
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(rutaEnBucket(guardado), 3600)
      .then(({ data, error }) => {
        if (!vivo) return;
        if (data?.signedUrl) setUrl(data.signedUrl);
        else {
          console.error(`Error ${etiqueta}:`, error);
          setFalla(true);
        }
      });
    return () => {
      vivo = false;
    };
  }, [guardado, etiqueta]);

  if (!guardado) {
    return <span className="text-xs text-muted-foreground">Sin {etiqueta.toLowerCase()}</span>;
  }
  if (falla) {
    return <span className="text-xs text-destructive">No se pudo abrir {etiqueta.toLowerCase()}</span>;
  }
  return (
    <button
      type="button"
      title={`Abrir ${etiqueta.toLowerCase()} en grande`}
      onClick={() => (url ? window.open(url, "_blank") : toast.info("Cargando…"))}
      className="group flex flex-col items-center gap-1"
    >
      <div className="h-24 w-36 overflow-hidden rounded-md border border-border bg-muted">
        {guardado.toLowerCase().endsWith(".pdf") ? (
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground group-hover:text-foreground" />
          </div>
        ) : url && (
          <img src={url} alt={etiqueta} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        )}
      </div>
      <span className="text-xs text-muted-foreground group-hover:text-foreground">{etiqueta}</span>
    </button>
  );
};

// `empresa` sólo llega en cuentas de empresa: el e-RUT o la carpeta tributaria del SII.
export const VerificacionDocumentos = ({
  carnet,
  selfie,
  empresa,
}: {
  carnet: string | null;
  selfie: string | null;
  empresa?: string | null;
}) => (
  <div className="flex flex-wrap gap-3">
    <Miniatura guardado={carnet} etiqueta="Carnet" />
    <Miniatura guardado={selfie} etiqueta="Selfie" />
    {empresa !== undefined && <Miniatura guardado={empresa} etiqueta="Documento SII" />}
  </div>
);
