import { useEffect, useState } from "react";
import { Wallet, Shield, Package, CheckCircle, Lock, ArrowRight, DollarSign } from "lucide-react";

interface Step {
  title: string;
  subtitle: string;
}

const STEPS: Step[] = [
  {
    title: "El comprador deposita $50.000",
    subtitle: "El dinero entra a la custodia de Trado",
  },
  {
    title: "Trado retiene el pago",
    subtitle: "Los fondos quedan asegurados en escrow",
  },
  {
    title: "El vendedor entrega el producto",
    subtitle: "Envío, encuentro o servicio realizado",
  },
  {
    title: "Comprador confirma · Vendedor cobra",
    subtitle: "Trado libera el pago al vendedor",
  },
];

export const AnimatedFlowDemo = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2400);
    return () => clearInterval(id);
  }, []);

  const current = STEPS[step];

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-3xl shadow-2xl overflow-hidden bg-gradient-to-br from-[#3340d8] via-[#5040d8] to-[#7147d4] p-8 md:p-12">
      {/* Step counter */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <span className="inline-flex items-center gap-2 text-white/80 text-xs md:text-sm font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Paso {step + 1} de {STEPS.length} · Trado en acción
        </span>
      </div>

      {/* Animation stage */}
      <div className="relative h-56 md:h-72 flex items-center justify-center mb-6 md:mb-8">
        {/* Buyer (left) */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
          <div
            className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center transition-all duration-500 ${
              step === 0 ? "scale-110 bg-white/25" : "scale-100"
            }`}
          >
            <Wallet className="h-7 w-7 md:h-8 md:w-8 text-white" />
          </div>
          <span className="text-white/70 text-[10px] md:text-xs font-medium">Comprador</span>
        </div>

        {/* Center: Trado shield */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
          <div
            className={`relative w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center transition-all duration-500 ${
              step === 1
                ? "bg-emerald-500/30 ring-4 ring-emerald-400/50 animate-pulse"
                : "bg-white/20 ring-2 ring-white/30"
            }`}
          >
            <Shield className="h-10 w-10 md:h-12 md:w-12 text-white" />
            {step === 1 && (
              <Lock className="absolute -bottom-1 -right-1 h-5 w-5 md:h-6 md:w-6 text-emerald-300 bg-[#3340d8] rounded-full p-1" />
            )}
          </div>
          <span className="text-white/70 text-[10px] md:text-xs font-medium">Trado</span>
        </div>

        {/* Seller (right) */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
          <div
            className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center transition-all duration-500 ${
              step === 3 ? "scale-110 bg-emerald-500/25 ring-2 ring-emerald-400/50" : "scale-100"
            }`}
          >
            <Package className="h-7 w-7 md:h-8 md:w-8 text-white" />
          </div>
          <span className="text-white/70 text-[10px] md:text-xs font-medium">Vendedor</span>
        </div>

        {/* Step 0: money flying buyer → Trado */}
        {step === 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 left-[15%] flex items-center gap-1"
            style={{ animation: "flyRight 2s ease-in-out infinite" }}
          >
            <DollarSign className="h-6 w-6 md:h-7 md:w-7 text-emerald-300" />
            <ArrowRight className="h-5 w-5 text-emerald-300/70" />
          </div>
        )}

        {/* Step 2: package flying seller → buyer (right → left) */}
        {step === 2 && (
          <div
            className="absolute top-[68%] right-[15%] flex items-center gap-1"
            style={{ animation: "flyLeft 2s ease-in-out infinite" }}
          >
            <ArrowRight className="h-5 w-5 text-white/70 rotate-180" />
            <Package className="h-6 w-6 md:h-7 md:w-7 text-white" />
          </div>
        )}

        {/* Step 3: money flying Trado → Seller */}
        {step === 3 && (
          <>
            <div
              className="absolute top-1/2 -translate-y-1/2 right-[15%] flex items-center gap-1"
              style={{ animation: "flyRight 1.8s ease-in-out infinite" }}
            >
              <DollarSign className="h-6 w-6 md:h-7 md:w-7 text-emerald-300" />
              <ArrowRight className="h-5 w-5 text-emerald-300/70" />
            </div>
            <CheckCircle className="absolute top-[20%] left-1/2 -translate-x-1/2 h-8 w-8 text-emerald-400 animate-bounce" />
          </>
        )}
      </div>

      {/* Label */}
      <div className="text-center min-h-[64px]">
        <h3 className="text-white text-lg md:text-2xl font-bold mb-1 transition-all duration-300">
          {current.title}
        </h3>
        <p className="text-white/70 text-sm md:text-base">{current.subtitle}</p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {STEPS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-white" : "w-2 bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Paso ${i + 1}`}
          />
        ))}
      </div>

      {/* Inline keyframes — Tailwind doesn't ship these */}
      <style>{`
        @keyframes flyRight {
          0% { transform: translateX(0) translateY(-50%); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(60px) translateY(-50%); opacity: 0; }
        }
        @keyframes flyLeft {
          0% { transform: translateX(0); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(-60px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
