import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  AlertCircle, 
  Clock, 
  ShieldAlert,
  CheckCircle2,
  Package,
  Truck,
  Scale,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { AppealEvidence } from "@/components/appeal/AppealEvidence";
import { TransactionChat } from "@/components/TransactionChat";
import { formatCLP } from "@/lib/utils";

const reasonLabels: Record<string, string> = {
  producto_danado: "Producto dañado o defectuoso",
  no_corresponde: "No corresponde a la descripción",
  error_envio: "Error en el envío",
  incompleto: "Producto incompleto",
};

export default function ReturnRoom() {
  const { returnId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [returnRequest, setReturnRequest] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [appeal, setAppeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!returnId) return;
    fetchReturnData();
    
    // Subscribe to return request changes
    const channel = supabase
      .channel(`return-${returnId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "return_requests",
          filter: `id=eq.${returnId}`,
        },
        () => fetchReturnData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [returnId]);

  const fetchReturnData = async () => {
    try {
      const { data: returnData, error: returnError } = await supabase
        .from("return_requests")
        .select("*")
        .eq("id", returnId)
        .single();

      if (returnError) throw returnError;

      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select(`
          *,
          seller:profiles!transactions_seller_id_fkey(full_name, email),
          buyer:profiles!transactions_buyer_id_fkey(full_name, email)
        `)
        .eq("id", returnData.transaction_id)
        .single();

      if (transactionError) throw transactionError;

      // Fetch associated appeal if exists
      const { data: appealData } = await supabase
        .from("appeals")
        .select("*")
        .eq("transaction_id", returnData.transaction_id)
        .ilike("reason_description", "[MEDIACIÓN DEVOLUCIÓN]%")
        .maybeSingle();

      setReturnRequest(returnData);
      setTransaction(transactionData);
      setAppeal(appealData);
    } catch (error: any) {
      console.error("Error fetching return:", error);
      toast.error("Error al cargar la devolución");
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
      pending: { 
        label: "Pendiente", 
        variant: "secondary",
        icon: Clock,
        color: "text-amber-500"
      },
      disputed: { 
        label: "En Mediación", 
        variant: "outline",
        icon: Scale,
        color: "text-blue-500"
      },
      accepted: { 
        label: "Aceptada", 
        variant: "default",
        icon: CheckCircle2,
        color: "text-green-500"
      },
      shipped: { 
        label: "Producto Enviado", 
        variant: "default",
        icon: Truck,
        color: "text-purple-500"
      },
      completed: { 
        label: "Completada", 
        variant: "default",
        icon: CheckCircle2,
        color: "text-green-500"
      },
    };
    
    return configs[status] || { 
      label: status, 
      variant: "outline",
      icon: Package,
      color: "text-muted-foreground"
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
            <p className="text-lg font-medium">Cargando devolución...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!returnRequest || !transaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Devolución no encontrada</h2>
              <p className="text-muted-foreground">
                La devolución que buscas no existe o no tienes acceso a ella.
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

  const statusConfig = getStatusConfig(returnRequest.status);
  const StatusIcon = statusConfig.icon;
  const isInMediation = returnRequest.status === "disputed";
  const isResolved = ["accepted", "shipped", "completed"].includes(returnRequest.status);
  const isBuyer = user?.id === transaction.buyer_id;
  const isSeller = user?.id === transaction.seller_id;

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
            <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-warning/20 to-orange-500/20 flex items-center justify-center ${statusConfig.color}`}>
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Sala de Devolución</h1>
              <p className="text-muted-foreground">Caso #{returnRequest.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-warning/5 to-orange-500/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <StatusIcon className="h-5 w-5" />
                    Estado de la Devolución
                  </CardTitle>
                  <Badge variant={statusConfig.variant} className="text-sm">
                    {statusConfig.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Producto</p>
                    <p className="font-semibold">{transaction.product_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Monto</p>
                    <p className="text-lg font-bold text-primary">{formatCLP(transaction.amount)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Motivo</p>
                    <p className="font-semibold text-destructive">
                      {reasonLabels[returnRequest.reason] || returnRequest.reason}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Solicitada</p>
                    <p className="font-semibold">
                      {new Date(returnRequest.created_at).toLocaleDateString("es-CL")}
                    </p>
                  </div>
                </div>

                {returnRequest.reason_description && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Descripción del Problema</p>
                      <p className="text-sm leading-relaxed bg-muted/50 p-3 rounded-lg">
                        {returnRequest.reason_description}
                      </p>
                    </div>
                  </>
                )}

                {returnRequest.admin_notes && isResolved && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Notas de Resolución</p>
                      <p className="text-sm leading-relaxed bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        {returnRequest.admin_notes}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Mediation Status Alert */}
            {isInMediation && (
              <Card className="border-2 shadow-lg border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                        <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          En Mediación - Esperando Decisión del Administrador
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                          Un árbitro revisará la evidencia y decidirá quién debe pagar el costo del envío de retorno.
                          Puedes subir evidencia adicional y comunicarte por el chat.
                        </p>
                        <div className="bg-blue-100 dark:bg-blue-900/50 rounded-md p-3 text-sm">
                          <p className="font-medium mb-2">📋 ¿Qué pasará después de la mediación?</p>
                          <ol className="list-decimal ml-4 space-y-1 text-blue-800 dark:text-blue-200">
                            <li>El admin decidirá quién paga el envío de retorno</li>
                            <li>El comprador enviará el producto de vuelta</li>
                            <li>El vendedor confirmará la recepción</li>
                            <li>Se procesará el reembolso al comprador</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resolution Result */}
            {isResolved && returnRequest.shipping_paid_by && (
              <Card className="border-2 shadow-lg border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                          Mediación Resuelta
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                          {returnRequest.shipping_paid_by === "seller" 
                            ? "El vendedor pagará el costo del envío de retorno."
                            : "El comprador pagará el costo del envío de retorno."}
                        </p>
                        
                        {returnRequest.status === "accepted" && isBuyer && (
                          <div className="bg-green-100 dark:bg-green-900/50 rounded-md p-3 text-sm">
                            <p className="font-medium text-green-800 dark:text-green-200">
                              📦 Ahora puedes enviar el producto de vuelta desde la sala de transacción.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Evidence Section - Using Appeal Evidence if appeal exists */}
            {appeal && (
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Subir Evidencia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AppealEvidence 
                    appealId={appeal.id} 
                    currentUserId={user?.id || ""}
                    appealStatus={appeal.status}
                  />
                </CardContent>
              </Card>
            )}

            {/* Chat - Always visible for communication */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Chat de Mediación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionChat 
                  transactionId={transaction.id}
                  sellerId={transaction.seller_id}
                  sellerName={transaction.seller?.full_name || "Vendedor"}
                  buyerId={transaction.buyer_id}
                  buyerName={transaction.buyer?.full_name || "Comprador"}
                  hideHeader
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Info Card */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-medium text-foreground">ℹ️ Sobre esta sala</p>
                  <p>
                    Esta es una sala de mediación para resolver quién paga el envío de retorno.
                    Una vez resuelta, el flujo de devolución continuará normalmente.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
