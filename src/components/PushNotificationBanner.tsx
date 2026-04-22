import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

const DISMISS_KEY = "trado_push_banner_dismissed";

export function PushNotificationBanner() {
  const { permission, isSubscribed, loading, subscribe, isAvailable } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const handleEnable = async () => {
    try {
      await subscribe();
      toast.success("¡Notificaciones activadas!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      toast.error(msg);
    }
  };

  // Don't show banner if: not available, already subscribed, dismissed, or denied
  if (!isAvailable || isSubscribed || dismissed || permission === "denied") {
    return null;
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/10 to-primary/5 animate-fade-in">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-full bg-primary/20 flex-shrink-0">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Activa las notificaciones</p>
          <p className="text-xs text-muted-foreground">
            Entérate al instante de actualizaciones de tus transacciones
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" onClick={handleEnable} disabled={loading}>
            {loading ? "..." : "Activar"}
          </Button>
          <Button size="icon" variant="ghost" onClick={handleDismiss} aria-label="Descartar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
