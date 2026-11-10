import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Foto opcional del producto. La pone quien vende; la ven las dos partes.
// Vive en public.sala_fotos + el bucket privado sala-fotos (URL firmada, 1 hora).
const BUCKET = "sala-fotos";
const MAX_MB = 5;
// La tabla es nueva y aún no está en los tipos generados
const tabla = () => (supabase as any).from("sala_fotos");

export function FotoSala({ transactionId, puedeEditar, nombre }: { transactionId: string; puedeEditar: boolean; nombre: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  // Si la tabla aún no existe (migración sin aplicar) no se muestra nada
  const [disponible, setDisponible] = useState(true);
  const input = useRef<HTMLInputElement>(null);

  const cargar = async () => {
    const { data, error } = await tabla().select("path").eq("transaction_id", transactionId).maybeSingle();
    if (error) {
      setDisponible(false);
      setCargando(false);
      return;
    }
    if (data?.path) {
      const { data: firmada } = await supabase.storage.from(BUCKET).createSignedUrl(data.path, 3600);
      setPath(data.path);
      setUrl(firmada?.signedUrl ?? null);
    } else {
      setPath(null);
      setUrl(null);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  const subir = async (archivo: File) => {
    if (!archivo.type.startsWith("image/")) return toast.error("Tiene que ser una imagen");
    if (archivo.size > MAX_MB * 1024 * 1024) return toast.error(`La foto pesa más de ${MAX_MB} MB`);
    setSubiendo(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const ext = (archivo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const nuevo = `${transactionId}/${Date.now()}.${ext || "jpg"}`;
      const { error: errSubida } = await supabase.storage.from(BUCKET).upload(nuevo, archivo, { contentType: archivo.type });
      if (errSubida) throw errSubida;
      const { error: errFila } = await tabla().upsert(
        { transaction_id: transactionId, path: nuevo, uploaded_by: auth.user?.id },
        { onConflict: "transaction_id" },
      );
      if (errFila) {
        await supabase.storage.from(BUCKET).remove([nuevo]);
        throw errFila;
      }
      if (path) await supabase.storage.from(BUCKET).remove([path]);
      toast.success("Foto agregada a la sala");
      await cargar();
    } catch (e: any) {
      toast.error("No se pudo subir la foto: " + (e?.message || "intenta de nuevo"));
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = "";
    }
  };

  const quitar = async () => {
    if (!path) return;
    setSubiendo(true);
    const { error } = await tabla().delete().eq("transaction_id", transactionId);
    if (!error) await supabase.storage.from(BUCKET).remove([path]);
    setSubiendo(false);
    if (error) return toast.error("No se pudo quitar la foto");
    toast.success("Foto quitada");
    cargar();
  };

  if (cargando || !disponible) return null;
  if (!url && !puedeEditar) return null;

  const selector = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])}
    />
  );

  if (!url) {
    return (
      <>
        {selector}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={subiendo}
          className="w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-left hover:bg-primary/10 transition-colors"
        >
          <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary via-medio via-55% to-info text-white flex items-center justify-center shrink-0">
            {subiendo ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-sm sm:text-base">Agregar una foto del producto</span>
            <span className="block text-xs text-muted-foreground">Opcional: genera más confianza a la otra persona</span>
          </span>
        </button>
      </>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border shadow-lg bg-muted">
      {selector}
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt={`Foto de ${nombre}`} className="w-full max-h-[340px] sm:max-h-[420px] object-cover" />
      </a>
      {puedeEditar && (
        <div className="absolute bottom-2 right-2 flex gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={subiendo}
            className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs font-medium text-white hover:bg-black/75"
          >
            {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />} Cambiar
          </button>
          <button
            type="button"
            onClick={quitar}
            disabled={subiendo}
            aria-label="Quitar la foto"
            className="inline-flex items-center rounded-full bg-black/60 backdrop-blur p-1.5 text-white hover:bg-black/75"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
