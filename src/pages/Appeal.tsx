import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
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
      setTimeRemaining(`${hours}h ${minutes}m restantes`);
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
    try {
      const { error } = await supabase
        .from("appeals")
        .update({
          status: "pendiente_intervencion_plataforma",
          escalated_at: new Date().toISOString(),
        })
        .eq("id", appealId);

      if (error) throw error;
      toast.success("Apelación escalada a revisión de la plataforma");
    } catch (error: any) {
      console.error("Error escalating appeal:", error);
      toast.error("Error al escalar la apelación");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      apelacion_abierta: { label: "Abierta", variant: "default" },
      en_negociacion: { label: "En Negociación", variant: "secondary" },
      pendiente_intervencion_plataforma: { label: "Pendiente Intervención", variant: "outline" },
      en_revision_plataforma: { label: "En Revisión", variant: "outline" },
      resuelta_a_favor_comprador: { label: "Resuelta - Favor Comprador", variant: "default" },
      resuelta_a_favor_vendedor: { label: "Resuelta - Favor Vendedor", variant: "default" },
      resuelta_parcial: { label: "Resuelta Parcialmente", variant: "default" },
      cerrada: { label: "Cerrada", variant: "secondary" },
    };
    
    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando apelación...</p>
        </div>
      </div>
    );
  }

  if (!appeal || !transaction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center mb-2">Apelación no encontrada</h2>
          <p className="text-muted-foreground text-center mb-4">
            La apelación que buscas no existe o no tienes acceso a ella.
          </p>
          <Button onClick={() => navigate("/dashboard")} className="w-full">
            Volver al Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const isBuyer = user?.id === transaction.buyer_id;
  const isSeller = user?.id === transaction.seller_id;
  const canChat = ["apelacion_abierta", "en_negociacion"].includes(appeal.status);
  const isResolved = ["resuelta_a_favor_comprador", "resuelta_a_favor_vendedor", "resuelta_parcial", "cerrada"].includes(appeal.status);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/transaction/${transaction.id}`)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a la transacción
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Apelación #{appeal.id.slice(0, 8)}</h1>
                  <p className="text-muted-foreground">
                    Transacción: {transaction.product_name}
                  </p>
                </div>
                {getStatusBadge(appeal.status)}
              </div>

              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Motivo</p>
                  <p className="font-medium">{getReasonLabel(appeal.reason)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto en disputa</p>
                  <p className="font-medium">{formatCLP(transaction.amount)}</p>
                </div>
                {appeal.reason_description && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Descripción</p>
                    <p className="text-sm">{appeal.reason_description}</p>
                  </div>
                )}
              </div>

              {canChat && appeal.negotiation_deadline && (
                <div className="bg-muted p-4 rounded-lg flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="font-medium">{timeRemaining}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEscalate}
                  >
                    Solicitar Intervención
                  </Button>
                </div>
              )}

              {appeal.status === "pendiente_intervencion_plataforma" && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 rounded-lg mb-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900 dark:text-amber-100">
                        Esperando revisión de la plataforma
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Un árbitro revisará el caso y tomará una decisión pronto.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isResolved && (
                <AppealRatingDialog
                  appealId={appeal.id}
                  userId={user?.id || ""}
                  isResolved={isResolved}
                />
              )}
            </Card>

            <Card className="p-6">
              <Tabs defaultValue="chat" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="evidence">Evidencia</TabsTrigger>
                </TabsList>
                <TabsContent value="chat" className="mt-6">
                  <AppealChat
                    appealId={appeal.id}
                    currentUserId={user?.id || ""}
                  />
                </TabsContent>
                <TabsContent value="evidence" className="mt-6">
                  <AppealEvidence
                    appealId={appeal.id}
                    currentUserId={user?.id || ""}
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <AppealTimeline
              appeal={appeal}
              transaction={transaction}
            />
          </div>
        </div>
      </div>
    </div>
  );
}