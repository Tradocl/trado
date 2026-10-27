import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isPublicPath } from "@/components/MobileBottomNav";
import { COOKIE_KEY, CONSENT_EVENT } from "@/lib/meta-pixel";

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  // Sólo se sube sobre la barra inferior cuando esa barra existe (sesión iniciada, fuera de páginas públicas)
  const hayBarra = !loading && !!user && !isPublicPath(pathname);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_KEY)) setVisible(true);
  }, []);

  const acceptEssential = () => {
    localStorage.setItem(COOKIE_KEY, "essential");
    setVisible(false);
  };

  const acceptAll = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  };

  if (!visible) return null;

  // En el celular va compacto: antes tapaba media pantalla en la portada, justo donde está el botón
  // para crear la cuenta.
  return (
    <div className={`fixed ${hayBarra ? "bottom-16" : "bottom-0"} sm:bottom-0 left-0 right-0 z-50 px-4 py-3 sm:p-4 bg-card border-t border-border shadow-xl`}>
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <Cookie className="hidden sm:block h-5 w-5 text-primary shrink-0" />
        <p className="text-xs sm:text-sm text-muted-foreground flex-1 leading-snug">
          <span className="sm:hidden">
            Usamos cookies esenciales y, si aceptas todo, de medición de publicidad (Meta).{" "}
          </span>
          <span className="hidden sm:inline">
            Usamos cookies esenciales para el funcionamiento de la plataforma y, si aceptas todo, cookies analíticas
            y de medición de publicidad (Meta) para mejorar tu experiencia.{" "}
          </span>
          <Link to="/privacy" className="text-primary underline hover:text-primary/80">
            Política de Privacidad
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={acceptEssential}>
            Solo esenciales
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none" onClick={acceptAll}>
            Aceptar todo
          </Button>
        </div>
      </div>
    </div>
  );
};
