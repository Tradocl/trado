import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { 
  Handshake, 
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Bell,
  AlertTriangle
} from "lucide-react";
import { MutualResolutionPanel } from "./MutualResolutionPanel";
import { EscalationPanel } from "./EscalationPanel";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AppealResolutionFlowProps {
  appealId: string;
  transactionId: string;
  currentUserId: string;
  buyerId: string;
  sellerId: string;
  buyerName: string;
  sellerName: string;
  buyerEmail: string;
  sellerEmail: string;
  productName: string;
  totalAmount: number;
  appealStatus: string;
  onRefresh: () => void;
}

type FlowStep = "choose" | "mutual" | "escalate";

export function AppealResolutionFlow({
  appealId,
  transactionId,
  currentUserId,
  buyerId,
  sellerId,
  buyerName,
  sellerName,
  buyerEmail,
  sellerEmail,
  productName,
  totalAmount,
  appealStatus,
  onRefresh
}: AppealResolutionFlowProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>("choose");
  const [hasPendingProposalForMe, setHasPendingProposalForMe] = useState(false);
  const [hasAnyPendingProposal, setHasAnyPendingProposal] = useState(false);
  const [requestingIntervention, setRequestingIntervention] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Check if there's a pending proposal
  useEffect(() => {
    const checkPendingProposals = async () => {
      try {
        const { data, error } = await supabase
          .from("appeal_mutual_proposals")
          .select("*")
          .eq("appeal_id", appealId)
          .eq("status", "pending")
          .limit(1);

        if (!error && data && data.length > 0) {
          setHasAnyPendingProposal(true);
          const isForMe = data[0].proposer_id !== currentUserId;
          setHasPendingProposalForMe(isForMe);
          // Auto-switch to mutual if there's any pending proposal
          if (currentStep === "choose") {
            setCurrentStep("mutual");
          }
        } else {
          setHasPendingProposalForMe(false);
          setHasAnyPendingProposal(false);
        }
      } catch (err) {
        console.error("Error checking pending proposals:", err);
      }
    };

    checkPendingProposals();

    // Subscribe to changes in proposals
    const channel = supabase
      .channel(`flow-proposals-${appealId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appeal_mutual_proposals",
          filter: `appeal_id=eq.${appealId}`,
        },
        () => checkPendingProposals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appealId, currentUserId, currentStep]);

  const handleRequestAdminIntervention = async () => {
    setRequestingIntervention(true);
    setShowConfirmDialog(false);
    try {
      // Update appeal status
      const { error } = await supabase
        .from("appeals")
        .update({
          status: "pendiente_intervencion_plataforma",
          escalated_at: new Date().toISOString(),
        })
        .eq("id", appealId);

      if (error) throw error;

      // Determine who requested the intervention
      const requestedByName = currentUserId === buyerId ? buyerName : sellerName;

      // Send system message to transaction chat
      const systemMessage = `🛡️ **NOTIFICACIÓN DE TRADO**

Se ha solicitado la intervención de un administrador para resolver este caso.

📋 **¿Qué sucederá ahora?**
• Un administrador revisará toda la evidencia presentada por ambas partes
• También leerá el historial de este chat para verificar cualquier acuerdo previo
• La decisión será tomada de forma imparcial basándose en las pruebas disponibles

📎 **Importante:**
Por favor, suban toda la evidencia posible (fotos, capturas de pantalla, videos, documentos) en la sección de evidencia para que el administrador pueda tomar una decisión informada.

⏱️ El proceso de revisión puede tomar hasta 48 horas.`;

      await supabase
        .from("chat_messages")
        .insert({
          transaction_id: transactionId,
          user_id: currentUserId,
          message: systemMessage,
        });

      // Send email notifications to both parties
      try {
        await supabase.functions.invoke("notify-appeal-escalation", {
          body: {
            buyerEmail,
            buyerName,
            sellerEmail,
            sellerName,
            productName,
            amount: totalAmount,
            appealId,
            requestedByName,
          },
        });
        console.log("Escalation emails sent successfully");
      } catch (emailError) {
        console.error("Error sending escalation emails:", emailError);
        // Don't fail the whole operation if emails fail
      }
      
      toast.success("Intervención de administrador solicitada. Ahora puedes subir tu evidencia.");
      setCurrentStep("escalate");
      onRefresh();
    } catch (error) {
      console.error("Error requesting intervention:", error);
      toast.error("Error al solicitar la intervención");
    } finally {
      setRequestingIntervention(false);
    }
  };

  const renderConfirmDialog = () => (
    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Solicitar Intervención de Administrador
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p className="text-foreground font-medium">
                Estás a punto de solicitar que un administrador intervenga en este caso.
              </p>
              
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Ten en cuenta:
                </p>
                <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-2 list-disc list-inside">
                  <li>
                    <strong>Un administrador tomará la decisión final</strong> basándose en la evidencia que ambas partes presenten.
                  </li>
                  <li>
                    <strong>La comisión se cobrará igualmente</strong>, incluso si el dinero es reembolsado.
                  </li>
                  <li>
                    El proceso puede tomar <strong>hasta 48 horas</strong>.
                  </li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                ¿Estás seguro de que deseas continuar?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={requestingIntervention}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleRequestAdminIntervention}
            disabled={requestingIntervention}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {requestingIntervention ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Solicitando...
              </>
            ) : (
              "Sí, solicitar intervención"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const renderChooseStep = () => (
    <Card className="border-2 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
        <CardTitle className="text-xl">¿Cómo deseas resolver este conflicto?</CardTitle>
        <CardDescription>
          Selecciona una de las opciones para continuar
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Pending Proposal Alert */}
        {hasPendingProposalForMe && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
                <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  ¡Tienes una propuesta pendiente!
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  La otra parte te ha enviado una propuesta de acuerdo. Revísala ahora.
                </p>
              </div>
              <Button 
                size="sm"
                onClick={() => setCurrentStep("mutual")}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Ver propuesta
              </Button>
            </div>
          </div>
        )}

        {/* Option 1: Mutual Agreement */}
        <button
          onClick={() => setCurrentStep("mutual")}
          className={`w-full text-left border-2 rounded-xl p-5 hover:border-primary hover:bg-primary/5 transition-all group ${hasPendingProposalForMe ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20' : ''}`}
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center shrink-0 group-hover:from-green-500/30 group-hover:to-emerald-500/30 transition-colors relative">
              <Handshake className="h-6 w-6 text-green-600 dark:text-green-400" />
              {hasPendingProposalForMe && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                  1
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Llegar a un Acuerdo</h3>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Propón una distribución de fondos a la otra parte. Si ambos están de acuerdo, 
                los fondos se distribuyen automáticamente sin intervención de administradores.
              </p>
              <div className="flex gap-2 mt-3">
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                  Más rápido
                </span>
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                  Sin esperas
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* Option 2: Escalate to Admins */}
        <button
          onClick={() => setShowConfirmDialog(true)}
          disabled={requestingIntervention}
          className="w-full text-left border-2 rounded-xl p-5 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center shrink-0 group-hover:from-amber-500/30 group-hover:to-orange-500/30 transition-colors">
              {requestingIntervention ? (
                <div className="h-6 w-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                  {requestingIntervention ? "Solicitando..." : "Solicitar Intervención de Administrador"}
                </h3>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                No llegamos a un acuerdo. Solicita que un administrador revise la situación 
                y tome una decisión imparcial. Podrás subir evidencia de tu caso.
              </p>
              <div className="flex gap-2 mt-3">
                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
                  Revisión imparcial
                </span>
                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
                  Decisión final
                </span>
              </div>
            </div>
          </div>
        </button>
      </CardContent>
    </Card>
  );

  const renderMutualStep = () => (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => setCurrentStep("choose")}
        className="mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a opciones
      </Button>
      
      <MutualResolutionPanel
        appealId={appealId}
        transactionId={transactionId}
        currentUserId={currentUserId}
        buyerId={buyerId}
        sellerId={sellerId}
        buyerName={buyerName}
        sellerName={sellerName}
        totalAmount={totalAmount}
        appealStatus={appealStatus}
        onSwitchToEscalate={() => setCurrentStep("escalate")}
      />
    </div>
  );

  const renderEscalateStep = () => (
    <div className="space-y-4">
      <EscalationPanel
        appealId={appealId}
        currentUserId={currentUserId}
        appealStatus={appealStatus}
        onRefresh={onRefresh}
      />
    </div>
  );

  return (
    <>
      {renderConfirmDialog()}
      {currentStep === "choose" && renderChooseStep()}
      {currentStep === "mutual" && renderMutualStep()}
      {currentStep === "escalate" && renderEscalateStep()}
    </>
  );
}
