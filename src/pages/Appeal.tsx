import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  AlertCircle, 
  Clock, 
  ShieldAlert,
  MessageSquare,
  FileText,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { AppealChat } from "@/components/appeal/AppealChat";
import { AppealEvidence } from "@/components/appeal/AppealEvidence";
import { AppealTimeline } from "@/components/appeal/AppealTimeline";
import { AppealRatingDialog } from "@/components/appeal/AppealRatingDialog";
import { formatCLP } from "@/lib/utils";

export default function Appeal() {
  const { appealId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appeal, setAppeal] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [escalating, setEscalating] = useState(false);

  useEffect(() => {
    if (!appealId) return;
    fetchAppealData();
    
    const channel = supabase
      .channel(`appeal-${appealId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appeals",
          filter: `id=eq.${appealId}`,
        },
        () => fetchAppealData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appealId]);

  useEffect(() => {
    if (!appeal?.negotiation_deadline) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const deadline = new Date(appeal.negotiation_deadline);
      const diff = deadline.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining("Tiempo agotado");
        clearInterval(interval);
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m`);
    }, 1000);

    return () => clearInterval(interval);
  }, [appeal?.negotiation_deadline]);

  const fetchAppealData = async () => {
    try {
      const { data: appealData, error: appealError } = await supabase
        .from("appeals")
        .select("*")
        .eq("id", appealId)
        .single();

      if (appealError) throw appealError;

      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select(`
          *,
          seller:profiles!transactions_seller_id_fkey(full_name, email),
          buyer:profiles!transactions_buyer_id_fkey(full_name, email)
        `)
        .eq("id", appealData.transaction_id)
        .single();

      if (transactionError) throw transactionError;

      setAppeal(appealData);
      setTransaction(transactionData);
    } catch (error: any) {
      console.error("Error fetching appeal:", error);
      toast.error("Error al cargar la apelación");
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async () => {
    setEscalating(true);
    try {
      const { error } = await supabase
        .from("appeals")
        .update({
          status: "pendiente_intervencion_plataforma",
          escalated_at: new Date().toISOString(),
        })
        .eq("id", appealId);

      if (error) throw error;
      toast.success("Apelación escalada correctamente");
    } catch (error: any) {
      console.error("Error escalating appeal:", error);
      toast.error("Error al escalar la apelación");
    } finally {
      setEscalating(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { 
      label: string; 
      variant: "default" | "secondary" | "destructive" | "outline";
      icon: any;
      color: string;
    }> = {
      apelacion_abierta: { 
        label: "Apelación Abierta", 
        variant: "destructive",
        icon: AlertTriangle,
        color: "text-red-500"
      },
      en_negociacion: { 
        label: "En Negociación", 
        variant: "secondary",
        icon: MessageSquare,
        color: "text-amber-500"
      },
      pendiente_intervencion_plataforma: { 
        label: "Pendiente Revisión", 
        variant: "outline",
        icon: Clock,
        color: "text-blue-500"
      },
      en_revision_plataforma: { 
        label: "En Revisión", 
        variant: "outline",
        icon: ShieldAlert,
        color: "text-purple-500"
      },
      resuelta_a_favor_comprador: { 
        label: "Resuelta - Comprador", 
        variant: "default",
        icon: CheckCircle2,
        color: "text-green-500"
      },
      resuelta_a_favor_vendedor: { 
        label: "Resuelta - Vendedor", 
        variant: "default",
        icon: CheckCircle2,
        color: "text-green-500"
      },
      resuelta_parcial: { 
        label: "Resuelta Parcial", 
        variant: "default",
        icon: CheckCircle2,
        color: "text-green-500"
      },
      cerrada: { 
        label: "Cerrada", 
        variant: "secondary",
        icon: XCircle,
        color: "text-muted-foreground"
      },
    };
    
    return configs[status] || { 
      label: status, 
      variant: "outline",
      icon: Info,
      color: "text-muted-foreground"
    };
  };

  const getReasonLabel = (reason: string) => {
    const reasons: Record<string, string> = {
      producto_no_llego: "Producto nunca llegó",
      producto_diferente: "Producto distinto al acordado",
      danos_o_fallas: "Daños o fallas",
      incumplimiento_acuerdo: "Incumplimiento del acuerdo",
      otro: "Otro",
    };
    return reasons[reason] || reason;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
            <p className="text-lg font-medium">Cargando apelación...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!appeal || !transaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Apelación no encontrada</h2>
              <p className="text-muted-foreground">
                La apelación que buscas no existe o no tienes acceso a ella.
              </p>
            </div>
            <Button onClick={() => navigate("/dashboard")} className="w-full mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const statusConfig = getStatusConfig(appeal.status);
  const StatusIcon = statusConfig.icon;
  const canNegotiate = ["apelacion_abierta", "en_negociacion"].includes(appeal.status);
  const isResolved = ["resuelta_a_favor_comprador", "resuelta_a_favor_vendedor", "resuelta_parcial", "cerrada"].includes(appeal.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/transaction/${transaction.id}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a la transacción
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ${statusConfig.color}`}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Apelación</h1>
              <p className="text-muted-foreground">Caso #{appeal.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <StatusIcon className="h-5 w-5" />
                    Estado de la Apelación
                  </CardTitle>
                  <Badge variant={statusConfig.variant} className="text-sm">
                    {statusConfig.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Transacción</p>
                    <p className="font-semibold">{transaction.product_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Monto en Disputa</p>
                    <p className="text-lg font-bold text-primary">{formatCLP(transaction.amount)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Motivo</p>
                    <p className="font-semibold">{getReasonLabel(appeal.reason)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Iniciada</p>
                    <p className="font-semibold">
                      {new Date(appeal.created_at).toLocaleDateString("es-CL")}
                    </p>
                  </div>
                </div>

                {appeal.reason_description && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Descripción del Problema</p>
                      <p className="text-sm leading-relaxed bg-muted/50 p-3 rounded-lg">
                        {appeal.reason_description}
                      </p>
                    </div>
                  </>
                )}

                {/* Negotiation Timer */}
                {canNegotiate && appeal.negotiation_deadline && (
                  <>
                    <Separator className="my-4" />
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-amber-900 dark:text-amber-100">
                              Tiempo de Negociación
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              {timeRemaining} para resolver entre las partes
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={handleEscalate}
                          disabled={escalating}
                          className="border-amber-300 dark:border-amber-700"
                        >
                          {escalating ? (
                            <>
                              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                              Escalando...
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="h-4 w-4 mr-2" />
                              Solicitar Intervención
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Platform Review Alert */}
                {appeal.status === "pendiente_intervencion_plataforma" && (
                  <>
                    <Separator className="my-4" />
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                          <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                            Esperando Revisión de la Plataforma
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Un árbitro revisará toda la evidencia y conversaciones para tomar una decisión justa. 
                            Recibirás una notificación cuando el caso sea resuelto.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Rating Dialog */}
                {isResolved && (
                  <>
                    <Separator className="my-4" />
                    <AppealRatingDialog
                      appealId={appeal.id}
                      userId={user?.id || ""}
                      isResolved={isResolved}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tabs Section */}
            <Card className="border-2 shadow-lg">
              <Tabs defaultValue="chat" className="w-full">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 pb-0">
                  <TabsList className="grid w-full grid-cols-2 h-12">
                    <TabsTrigger value="chat" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger value="evidence" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Evidencia
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="pt-6">
                  <TabsContent value="chat" className="mt-0">
                    <AppealChat
                      appealId={appeal.id}
                      currentUserId={user?.id || ""}
                    />
                  </TabsContent>
                  <TabsContent value="evidence" className="mt-0">
                    <AppealEvidence
                      appealId={appeal.id}
                      currentUserId={user?.id || ""}
                    />
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-2 shadow-lg sticky top-6">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historial
                </CardTitle>
                <CardDescription>
                  Seguimiento de la apelación
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <AppealTimeline
                  appeal={appeal}
                  transaction={transaction}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
