import { useNavigate } from "react-router-dom";
import { ChevronRight, Sparkles, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InsigniaVerificacion, CheckEnFoto } from "@/components/InsigniaVerificacion";

type Perfil = {
  id: string;
  full_name: string;
  reputation_score: number;
  avatar_url: string | null;
  is_verified: boolean;
  total_transactions: number;
};

// Arriba de la sala: con quién estás tratando, de un vistazo. Antes había que bajar
// hasta "Participantes" para saber si la otra persona estaba verificada.
export function ConQuienTratas({ perfil, rol }: { perfil: Perfil; rol: string }) {
  const navigate = useNavigate();
  const iniciales = perfil.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const reputacion = Number(perfil.reputation_score) || 0;
  const salas = Number(perfil.total_transactions) || 0;

  return (
    <button
      type="button"
      onClick={() => navigate(`/u/${perfil.id}`)}
      className="w-full flex items-center gap-3 sm:gap-4 rounded-2xl border bg-card p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left"
    >
      <div className="relative shrink-0">
        <Avatar className={`h-12 w-12 sm:h-14 sm:w-14 ring-2 ${perfil.is_verified ? "ring-emerald-400" : "ring-primary/20"}`}>
          <AvatarImage src={perfil.avatar_url || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-info text-white font-bold">{iniciales}</AvatarFallback>
        </Avatar>
        <CheckEnFoto verificado={perfil.is_verified} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground">Con quién tratas · {rol}</p>
        <p className="font-bold text-base sm:text-lg truncate">{perfil.full_name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <InsigniaVerificacion verificado={perfil.is_verified} />
          {reputacion > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-warning px-2 py-0.5 font-semibold">
              <Star className="h-3.5 w-3.5 fill-warning" /> {reputacion.toFixed(1)}
            </span>
          )}
          {salas > 0 ? (
            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-semibold">
              {salas} {salas === 1 ? "sala" : "salas"} en Trado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-info/15 text-info px-2 py-0.5 font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Nuevo en Trado
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
}
