import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  Info,
  Briefcase,
  Package,
  Truck,
  Users
} from "lucide-react";
import { toast } from "sonner";

import { AppealEvidence } from "@/components/appeal/AppealEvidence";
import { AppealTimeline } from "@/components/appeal/AppealTimeline";
import { AppealRatingDialog } from "@/components/appeal/AppealRatingDialog";
import { AppealResolutionFlow } from "@/components/appeal/AppealResolutionFlow";
import { formatCLP } from "@/lib/utils";

export default function Appeal() {
  const { appealId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appeal, setAppeal] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [decision, setDecision] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

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

      // Fetch decision if appeal is resolved
      const resolvedStatuses = ["resuelta_a_favor_comprador", "resuelta_a_favor_vendedor", "resuelta_parcial", "cerrada"];
      if (resolvedStatuses.includes(appealData.status)) {
        const { data: decisionData } = await supabase
          .from("appeal_decisions")
          .select("*")
          .eq("appeal_id", appealId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        setDecision(decisionData);
      }

      setAppeal(appealData);
      setTransaction(transactionData);
    } catch (error: any) {
      console.error("Error fetching appeal:", error);
      toast.error("Error al cargar la apelación");
    } finally {
      setLoading(false);
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

  const getSaleTypeConfig = (saleType: string) => {
    const configs: Record<string, { label: string; icon: any; color: string }> = {
      servicio: { 
        label: "Servicio", 
        icon: Briefcase,
        color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
      },
      producto_persona: { 
        label: "Producto - Entrega en persona", 
        icon: Users,
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      },
      producto_envio: { 
        label: "Producto - Envío", 
        icon: Truck,
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      },
    };
    return configs[saleType] || { 
      label: "Producto", 
      icon: Package,
      color: "bg-muted text-muted-foreground"
    };
  };

  const getReasonLabel = (reason: string) => {
    const isService = transaction?.sale_type === "servicio";
    
    const productReasons: Record<string, string> = {
      producto_no_llego: "Producto nunca llegó",
      producto_diferente: "Producto distinto al acordado",
      danos_o_fallas: "Daños o fallas",
      incumplimiento_acuerdo: "Incumplimiento del acuerdo",
      otro: "Otro",
    };
    
    const serviceReasons: Record<string, string> = {
      producto_no_llego: "Servicio no realizado",
      producto_diferente: "Servicio distinto al acordado",
      danos_o_fallas: "Trabajo deficiente",
      incumplimiento_acuerdo: "Incumplimiento del acuerdo",
      otro: "Otro",
    };
    
    const reasons = isService ? serviceReasons : productReasons;
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
                {/* Sale Type Badge */}
                {transaction.sale_type && (() => {
                  const saleTypeConfig = getSaleTypeConfig(transaction.sale_type);
                  const SaleTypeIcon = saleTypeConfig.icon;
                  return (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${saleTypeConfig.color}`}>
                      <SaleTypeIcon className="h-4 w-4" />
                      {saleTypeConfig.label}
                    </div>
                  );
                })()}
                
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
              </CardContent>
            </Card>

            {/* Appeal Resolution Flow */}
            {canNegotiate && transaction.buyer_id && (
              <AppealResolutionFlow
                appealId={appeal.id}
                transactionId={transaction.id}
                currentUserId={user?.id || ""}
                buyerId={transaction.buyer_id}
                sellerId={transaction.seller_id}
                totalAmount={Number(transaction.amount)}
                appealStatus={appeal.status}
                onRefresh={fetchAppealData}
              />
            )}

            {/* Platform Review Alert */}
            {appeal.status === "pendiente_intervencion_plataforma" && (
              <Card className="border-2 shadow-lg border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
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
                </CardContent>
              </Card>
            )}

            {/* Resolution Decision */}
            {isResolved && decision && (
              <Card className="border-2 shadow-lg border-green-200 dark:border-green-800">
                <CardContent className="pt-6 space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                          {decision.is_mutual_agreement ? "Acuerdo Mutuo Alcanzado" : "Caso Resuelto"}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                          {decision.is_mutual_agreement && "Las partes llegaron a un acuerdo sin intervención"}
                          {!decision.is_mutual_agreement && appeal.status === "resuelta_a_favor_comprador" && "Decisión a favor del comprador"}
                          {!decision.is_mutual_agreement && appeal.status === "resuelta_a_favor_vendedor" && "Decisión a favor del vendedor"}
                          {!decision.is_mutual_agreement && appeal.status === "resuelta_parcial" && "Resolución parcial acordada"}
                          {!decision.is_mutual_agreement && appeal.status === "cerrada" && "Caso cerrado"}
                        </p>
                        
                        {(decision.buyer_refund_amount || decision.seller_payment_amount) && (
                          <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                            {decision.buyer_refund_amount > 0 && (
                              <div className="bg-white/50 dark:bg-black/20 rounded-md p-2">
                                <p className="text-green-600 dark:text-green-400 font-medium">Reembolso Comprador</p>
                                <p className="font-bold">{formatCLP(decision.buyer_refund_amount)}</p>
                              </div>
                            )}
                            {decision.seller_payment_amount > 0 && (
                              <div className="bg-white/50 dark:bg-black/20 rounded-md p-2">
                                <p className="text-green-600 dark:text-green-400 font-medium">Pago Vendedor</p>
                                <p className="font-bold">{formatCLP(decision.seller_payment_amount)}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="bg-white/50 dark:bg-black/20 rounded-md p-3">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                            {decision.is_mutual_agreement ? "Detalle del Acuerdo:" : "Notas del Administrador:"}
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            {decision.resolution_notes}
                          </p>
                        </div>
                        
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          Resuelto el {new Date(decision.created_at).toLocaleDateString("es-CL", { 
                            day: "numeric", 
                            month: "long", 
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rating Dialog */}
                  <AppealRatingDialog
                    appealId={appeal.id}
                    userId={user?.id || ""}
                    isResolved={isResolved}
                  />
                </CardContent>
              </Card>
            )}

            {/* Evidences Section - Only show when not in negotiation (evidence is in the resolution flow) */}
            {!canNegotiate && (
              <Card className={`border-2 shadow-lg ${isResolved ? 'opacity-75' : ''}`}>
                <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Evidencia de la Apelación
                      </CardTitle>
                      <CardDescription>
                        {isResolved 
                          ? "Este caso ha sido cerrado. La evidencia es solo de consulta."
                          : "Archivos relacionados con este caso."
                        }
                      </CardDescription>
                    </div>
                    {isResolved && (
                      <Badge variant="secondary" className="bg-muted">
                        <XCircle className="h-3 w-3 mr-1" />
                        Cerrado
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <AppealEvidence
                    appealId={appeal.id}
                    currentUserId={user?.id || ""}
                    appealStatus={appeal.status}
                  />
                </CardContent>
              </Card>
            )}
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
