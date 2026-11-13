import { useEffect, useState } from "react";

// Cuenta regresiva del período de revisión como un anillo que se va vaciando.
// Se calcula desde received_at + las horas de revisión del tipo de venta.
export function AnilloRevision({ desde, horas, color = "warning" }: { desde: string; horas: number; color?: "warning" | "info" }) {
  const fin = new Date(desde).getTime() + horas * 3600000;
  const [ahora, setAhora] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const restante = Math.max(0, fin - ahora);
  const fraccion = Math.min(1, restante / (horas * 3600000));
  const h = Math.floor(restante / 3600000);
  const m = Math.floor((restante % 3600000) / 60000);
  const texto = restante <= 0 ? "0m" : h > 0 ? `${h}h` : `${m}m`;
  const sub = restante <= 0 ? "por terminar" : h > 0 ? `${m}m` : "quedan";

  const r = 26;
  const c = 2 * Math.PI * r;
  // Una sola línea de color en la app: el anillo va siempre en el azul de marca
  const trazo = "hsl(var(--primary))";
  void color;

  return (
    <div className="relative w-[68px] h-[68px] shrink-0" role="img" aria-label={`Quedan ${h} horas y ${m} minutos de revisión`}>
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/60" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={trazo}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraccion)}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-base font-extrabold">{texto}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5">{sub}</span>
      </div>
    </div>
  );
}
