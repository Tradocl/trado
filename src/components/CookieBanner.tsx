import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { Link } from "react-router-dom";

const COOKIE_KEY = "trado_cookie_consent";

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

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
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-50 p-4 bg-card border-t border-border shadow-xl">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground flex-1">
          Usamos cookies esenciales para el funcionamiento de la plataforma y cookies analíticas
          para mejorar tu experiencia.{" "}
          <Link to="/privacy" className="text-primary underline hover:text-primary/80">
            Política de Privacidad
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={acceptEssential}>
            Solo esenciales
          </Button>
          <Button size="sm" onClick={acceptAll}>
            Aceptar todo
          </Button>
        </div>
      </div>
    </div>
  );
};
