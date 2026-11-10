import { useEffect, useState } from "react";
import { ArrowRight, Briefcase, Handshake, Ticket, Truck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REVIEW_HOURS } from "@/lib/escrow";

// "¿Qué vas a hacer?": cada caso con su miedo, dicho como lo diría esa persona, y sólo los
// pasos de su tipo de sala. Los plazos salen de REVIEW_HOURS, no se escriben a mano.
const CASOS = [
  {
    id: "compras",
    icon: ShoppingBag,
    titulo: "Compro por redes",
    miedo: "Transfiéreme y te lo mando al tiro 😉",
    quien: "Una tienda que no conoces",
    pasos: [
      "Pagas en Trado y la plata queda retenida, no en la cuenta de la tienda.",
      "La tienda envía por courier y deja el número de seguimiento en la sala.",
      `Lo recibes, lo marcas como recibido y tienes ${REVIEW_HOURS.producto_envio} horas para revisarlo.`,
      "¿Todo bien? Confirmas y se libera el pago. ¿No? Lo reportas y la plata no se mueve.",
    ],
  },
  {
    id: "vendes",
    icon: Truck,
    titulo: "Vendo y envío",
    miedo: "¿Y cómo sé que no eres estafa?",
    quien: "Un cliente nuevo",
    pasos: [
      "Tu cliente paga en Trado: ves «Pago retenido» antes de enviar nada.",
      "Envías por courier y dejas el número de seguimiento en la sala.",
      `Tu cliente lo recibe y tiene ${REVIEW_HOURS.producto_envio} horas para revisarlo.`,
      "Confirma y se libera tu pago. Si reclama, el seguimiento queda en la sala y el equipo revisa el caso.",
    ],
  },
  {
    id: "persona",
    icon: Handshake,
    titulo: "Me junto en persona",
    miedo: "Mira, ahí está la transferencia. Pásame el celu.",
    quien: "Alguien en el metro",
    pasos: [
      "El comprador paga en Trado antes de juntarse, y la plata queda retenida.",
      "El vendedor ve el pago antes de salir de su casa. En la sala acuerdan lugar y hora.",
      "Se juntan, el comprador revisa el producto ahí mismo y confirma desde su celular.",
      "Se libera el pago. Nadie anda con efectivo ni entrega mirando un comprobante.",
    ],
  },
  {
    id: "servicio",
    icon: Briefcase,
    titulo: "Trabajo freelance",
    miedo: "Te pago el viernes, sin falta.",
    quien: "Un cliente",
    pasos: [
      "El cliente paga en Trado antes de que empieces, y la plata queda retenida.",
      "Trabajas tranquilo: ves que el pago está ahí.",
      `Entregas, marcas el servicio como realizado y el cliente tiene ${REVIEW_HOURS.servicio} horas para revisar.`,
      "Confirma y se libera tu pago. Si en ese plazo no dice nada, se libera solo.",
    ],
  },
  {
    id: "digital",
    icon: Ticket,
    titulo: "Entradas y digital",
    miedo: "Mándamela y te transfiero altiro.",
    quien: "Alguien de un grupo",
    pasos: [
      "El comprador paga en Trado y la plata queda retenida.",
      "El vendedor manda la entrada, el link o el archivo y lo marca como entregado.",
      `El comprador tiene ${REVIEW_HOURS.producto_digital} horas para revisar que le llegó.`,
      "Confirma y se libera el pago. ¿No llegó? Lo reporta y la plata no se mueve.",
    ],
  },
] as const;

export const Casos = ({ onEmpezar }: { onEmpezar: () => void }) => {
  const [activo, setActivo] = useState(0);
  const [paso, setPaso] = useState(0);
  const caso = CASOS[activo];

  // Al cambiar de caso los pasos se van armando uno por uno
  useEffect(() => {
    setPaso(0);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setPaso(caso.pasos.length - 1);
      return;
    }
    const id = setInterval(() => {
      setPaso((p) => {
        if (p >= caso.pasos.length - 1) {
          clearInterval(id);
          return p;
        }
        return p + 1;
      });
    }, 900);
    return () => clearInterval(id);
  }, [activo, caso.pasos.length]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Selector: en el celular se desliza de lado */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x md:justify-center md:mx-0 md:px-0" role="tablist">
        {CASOS.map((c, i) => {
          const Icon = c.icon;
          const sel = i === activo;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={sel}
              onClick={() => setActivo(i)}
              className={`snap-start shrink-0 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold border transition-all ${
                sel
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                  : "bg-white text-foreground border-border hover:border-primary/40"
              }`}
            >
              <Icon className="h-4 w-4" />
              {c.titulo}
            </button>
          );
        })}
      </div>

      <div className="grid md:grid-cols-[1fr_1.3fr] gap-6 mt-6 items-start">
        {/* El miedo */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-[hsl(238,45%,22%)] p-6 text-white shadow-xl">
          <p className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-4">Sin Trado</p>
          <p className="text-xs text-white/60 mb-1.5">{caso.quien}</p>
          <div className="inline-block max-w-full bg-white text-slate-900 rounded-2xl rounded-bl-md px-4 py-3 font-semibold shadow">
            {caso.miedo}
          </div>
          <p className="mt-5 text-white/75 text-sm leading-relaxed">
            Si la plata sale antes que lo acordado, te quedas sin nada con qué reclamar. Con Trado, ninguno de los dos
            tiene que confiar en el otro.
          </p>
        </div>

        {/* Los pasos con Trado */}
        <div className="rounded-3xl bg-white border border-border p-6 shadow-xl">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-4">Con Trado</p>
          <ol className="space-y-3">
            {caso.pasos.map((t, i) => (
              <li
                key={t}
                className={`flex gap-3 transition-all duration-500 ${i <= paso ? "opacity-100 translate-x-0" : "opacity-25 translate-x-2"}`}
              >
                <span
                  className={`shrink-0 w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center transition-colors ${
                    i <= paso ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-sm sm:text-base leading-relaxed pt-0.5">{t}</span>
              </li>
            ))}
          </ol>
          <Button onClick={onEmpezar} className="mt-6 w-full sm:w-auto bg-gradient-to-r from-primary via-medio via-55% to-info text-white font-bold">
            Crear mi sala gratis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
