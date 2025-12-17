import { useGuest } from "@/contexts/GuestContext";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const GuestBanner = () => {
  const { isGuestMode, exitGuestMode } = useGuest();
  const navigate = useNavigate();
  const location = useLocation();

  // No mostrar en landing, auth, terms, privacy
  const hiddenPaths = ["/", "/auth", "/terms", "/privacy"];
  const shouldHide = hiddenPaths.includes(location.pathname);

  if (!isGuestMode || shouldHide) return null;

  const handleRegister = () => {
    exitGuestMode();
    navigate("/auth");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-3 shadow-lg">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <UserPlus className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline">
            Estás explorando en modo invitado. Crea tu cuenta para acceder a todas las funciones.
          </span>
          <span className="sm:hidden">
            Modo invitado - Regístrate gratis
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRegister}
            className="whitespace-nowrap"
          >
            Crear Cuenta Gratis
          </Button>
        </div>
      </div>
    </div>
  );
};
