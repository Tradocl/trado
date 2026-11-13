import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { esNavegadorInterno, urlConAtribucion, urlNavegadorExterno } from "@/lib/attribution";

// Aviso para quien llega desde un anuncio y está dentro del navegador de Instagram o
// Facebook: ahí Google puede negarse a iniciar sesión. El botón abre la misma página en el
// navegador del teléfono, con el origen del anuncio en el link para no perderlo.
export const AbrirEnNavegador = () => {
  const [visible] = useState(() => esNavegadorInterno());
  if (!visible) return null;

  const abrir = () => {
    navigator.clipboard?.writeText(urlConAtribucion()).catch(() => {});
    window.location.href = urlNavegadorExterno();
    toast.info("Si no se abrió, pega el link en tu navegador: ya está copiado.");
  };

  return (
    <div className="mb-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-muted-foreground space-y-2">
      <p>
        Estás en el navegador de Instagram. Si Google no te deja entrar, abre Trado en tu navegador.
      </p>
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={abrir}>
        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
        Abrir en mi navegador
      </Button>
    </div>
  );
};
