import { Bell, BellOff, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

export function PushNotificationCard() {
  const { permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  const handleToggle = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe();
        toast.success("Notificaciones desactivadas");
      } else {
        await subscribe();
        toast.success("¡Notificaciones activadas!");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error(msg);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {isSubscribed ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">Notificaciones push</CardTitle>
              <CardDescription className="text-xs">
                Recibe avisos en tiempo real sobre tus transacciones
              </CardDescription>
            </div>
          </div>
          {isSubscribed && (
            <Badge variant="secondary" className="text-xs">Activas</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {permission === "preview-blocked" && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/20">
            <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Las notificaciones solo funcionan en el sitio publicado (trado.cl), no en la vista previa del editor.
            </p>
          </div>
        )}
        {permission === "unsupported" && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-muted">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Tu navegador no soporta notificaciones push. Prueba con Chrome, Edge o Firefox.
            </p>
          </div>
        )}
        {permission === "denied" && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Las notificaciones están bloqueadas. Habilítalas desde los ajustes de tu navegador.
            </p>
          </div>
        )}
        {(permission === "default" || permission === "granted") && (
          <Button
            onClick={handleToggle}
            disabled={loading}
            variant={isSubscribed ? "outline" : "default"}
            className="w-full"
          >
            {loading
              ? "Procesando..."
              : isSubscribed
              ? "Desactivar notificaciones"
              : "Activar notificaciones"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
