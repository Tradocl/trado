import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { formatCLP, PRIMERA_SALA_GRATIS_HASTA } from "@/lib/utils";

// En el celular el botón del hero se pierde al bajar. Esta barra aparece pasado el hero y
// se esconde cuando ya está a la vista el llamado final (que dice lo mismo).
export const BarraMovil = ({ onCrear, finalId }: { onCrear: () => void; finalId: string }) => {
  const [ver, setVer] = useState(false);

  useEffect(() => {
    const revisar = () => {
      const fin = document.getElementById(finalId);
      const llegoAlFinal = fin ? fin.getBoundingClientRect().top < window.innerHeight : false;
      setVer(window.scrollY > 650 && !llegoAlFinal);
    };
    revisar();
    window.addEventListener("scroll", revisar, { passive: true });
    window.addEventListener("resize", revisar);
    return () => {
      window.removeEventListener("scroll", revisar);
      window.removeEventListener("resize", revisar);
    };
  }, [finalId]);

  return (
    <div
      className={`lg:hidden fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 transition-transform duration-300 ${
        ver ? "translate-y-0" : "translate-y-[120%]"
      }`}
      aria-hidden={!ver}
    >
      <button
        onClick={onCrear}
        tabIndex={ver ? 0 : -1}
        className="w-full flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#1F25C1] to-[#7C3AED] text-white pl-5 pr-3 py-3 shadow-[0_12px_40px_-8px_rgba(31,37,193,0.7)]"
      >
        <span className="text-left leading-tight">
          <span className="block font-bold">Crear mi sala gratis</span>
          <span className="block text-xs text-white/75">Primera sala sin comisión, hasta ${formatCLP(PRIMERA_SALA_GRATIS_HASTA)}</span>
        </span>
        <span className="w-10 h-10 rounded-xl bg-white text-[#1F25C1] flex items-center justify-center shrink-0">
          <ArrowRight className="h-5 w-5" />
        </span>
      </button>
    </div>
  );
};
