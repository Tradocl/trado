import { useNavigate } from "react-router-dom";
import { useGuest } from "@/contexts/GuestContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Star, Lock, CheckCircle2, UserPlus, LogIn } from "lucide-react";

const actionMessages: Record<string, string> = {
  "crear transacción": "Para crear una transacción segura",
  "depositar": "Para depositar fondos",
  "retirar": "Para retirar fondos",
  "unirse": "Para unirte a esta transacción",
  "enviar mensaje": "Para chatear con la otra parte",
  "editar perfil": "Para personalizar tu perfil",
  "ver historial": "Para ver tu historial de movimientos",
  "verificar identidad": "Para verificar tu identidad",
  "continuar": "Para continuar",
};

export const GuestRegistrationModal = () => {
  const navigate = useNavigate();
  const { registrationPromptOpen, setRegistrationPromptOpen, currentAction, exitGuestMode } = useGuest();

  const getMessage = () => {
    return actionMessages[currentAction] || actionMessages["continuar"];
  };

  const handleCreateAccount = () => {
    exitGuestMode();
    setRegistrationPromptOpen(false);
    navigate("/auth?mode=signup");
  };

  const handleLogin = () => {
    exitGuestMode();
    setRegistrationPromptOpen(false);
    navigate("/auth?mode=login");
  };

  return (
    <Dialog open={registrationPromptOpen} onOpenChange={setRegistrationPromptOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            {getMessage()}, necesitas una cuenta
          </DialogTitle>
          <DialogDescription className="text-center">
            Crea tu cuenta gratis en segundos y disfruta de todas las funciones de Trado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Shield className="h-5 w-5 text-success flex-shrink-0" />
            <span className="text-sm">Transacciones 100% protegidas con escrow</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Star className="h-5 w-5 text-warning flex-shrink-0" />
            <span className="text-sm">Sistema de reputación para mayor confianza</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Lock className="h-5 w-5 text-info flex-shrink-0" />
            <span className="text-sm">Tu dinero seguro hasta confirmar la entrega</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="text-sm">Mediación de disputas incluida</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button onClick={handleCreateAccount} className="w-full" size="lg">
            <UserPlus className="h-4 w-4 mr-2" />
            Crear Cuenta Gratis
          </Button>
          <Button onClick={handleLogin} variant="outline" className="w-full" size="lg">
            <LogIn className="h-4 w-4 mr-2" />
            Ya tengo cuenta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
