import { useLocation } from "react-router-dom";
import { LifeBuoy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const HIDE_ON = ["/auth", "/terms", "/privacy", "/reset-password", "/verificar-email", "/invite"];

export const SupportFab = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;
  if (location.pathname === "/" || HIDE_ON.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <a
      href="mailto:contacto@trado.cl"
      aria-label="Contactar soporte"
      className={cn(
        "fixed z-40 bottom-24 right-4 md:bottom-6 md:right-6",
        "h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground",
        "shadow-lg hover:shadow-xl active:scale-95 transition-all",
        "flex items-center justify-center"
      )}
    >
      <LifeBuoy className="h-5 w-5" />
    </a>
  );
};
