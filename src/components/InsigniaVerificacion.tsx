import { useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

// Una sola insignia para todo Trado, con sus dos caras:
// - Verificado: llamativa (degradado, brillo que cruza) para que se note y den ganas de tenerla.
// - Sin verificar: visible pero sin acusar (borde punteado gris). Si es la cuenta de quien
//   mira, es un botón que lleva a verificarse.
type Props = {
  verificado: boolean;
  tamano?: "xs" | "sm" | "md";
  /** Sobre fondos de color (degradados del panel, portada del perfil) */
  sobreColor?: boolean;
  /** Es mi propia cuenta: "Sin verificar" se vuelve un acceso a verificarme */
  propia?: boolean;
  /** Sólo el ícono, para filas apretadas */
  soloIcono?: boolean;
  className?: string;
};

const TAMANOS = {
  xs: { caja: "text-[10px] px-1.5 py-0.5 gap-0.5", icono: "h-3 w-3" },
  sm: { caja: "text-xs px-2 py-0.5 gap-1", icono: "h-3.5 w-3.5" },
  md: { caja: "text-sm px-3 py-1 gap-1.5", icono: "h-4 w-4" },
};

export const InsigniaVerificacion = ({ verificado, tamano = "sm", sobreColor, propia, soloIcono, className }: Props) => {
  const navigate = useNavigate();
  const t = TAMANOS[tamano];

  if (verificado) {
    return (
      <span
        title="Identidad verificada por Trado con carnet y selfie"
        className={cn(
          "relative inline-flex items-center rounded-full font-bold overflow-hidden whitespace-nowrap",
          sobreColor
            ? "bg-white text-primary shadow-md"
            : "bg-primary text-white",
          t.caja,
          soloIcono && "px-1",
          className,
        )}
      >
        <BadgeCheck className={cn(t.icono, "shrink-0")} />
        {!soloIcono && "Verificado"}
      </span>
    );
  }

  const clases = cn(
    "inline-flex items-center rounded-full font-semibold border border-dashed whitespace-nowrap",
    sobreColor ? "bg-white/10 border-white/60 text-white" : "bg-muted border-muted-foreground/40 text-muted-foreground",
    t.caja,
    soloIcono && "px-1",
    className,
  );

  if (propia) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); navigate("/verification"); }}
        title="Verifica tu identidad para que la otra persona confíe más en ti"
        className={cn(clases, "hover:brightness-110 hover:border-solid transition")}
      >
        <ShieldQuestion className={cn(t.icono, "shrink-0")} />
        {!soloIcono && (
          <>
            Sin verificar · Verifícate <ArrowRight className={cn(t.icono, "shrink-0")} />
          </>
        )}
      </button>
    );
  }

  return (
    <span title="Todavía no verifica su identidad con carnet" className={clases}>
      <ShieldQuestion className={cn(t.icono, "shrink-0")} />
      {!soloIcono && "Sin verificar"}
    </span>
  );
};

/** Check verde en la esquina de una foto de perfil. El contenedor debe ser `relative`. */
export const CheckEnFoto = ({ verificado, grande }: { verificado: boolean; grande?: boolean }) =>
  verificado ? (
    <span
      title="Verificado"
      className={cn(
        "absolute -bottom-0.5 -right-0.5 rounded-full bg-primary text-white ring-2 ring-background flex items-center justify-center shadow",
        grande ? "h-8 w-8" : "h-5 w-5",
      )}
    >
      <BadgeCheck className={grande ? "h-5 w-5" : "h-3.5 w-3.5"} />
    </span>
  ) : null;
