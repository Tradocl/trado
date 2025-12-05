import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Handshake, 
  ShieldAlert,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { MutualResolutionPanel } from "./MutualResolutionPanel";
import { EscalationPanel } from "./EscalationPanel";

interface AppealResolutionFlowProps {
  appealId: string;
  transactionId: string;
  currentUserId: string;
  buyerId: string;
  sellerId: string;
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
  totalAmount,
  appealStatus,
  onRefresh
}: AppealResolutionFlowProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>("choose");

  const renderChooseStep = () => (
    <Card className="border-2 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
        <CardTitle className="text-xl">¿Cómo deseas resolver este conflicto?</CardTitle>
        <CardDescription>
          Selecciona una de las opciones para continuar
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Option 1: Mutual Agreement */}
        <button
          onClick={() => setCurrentStep("mutual")}
          className="w-full text-left border-2 rounded-xl p-5 hover:border-primary hover:bg-primary/5 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center shrink-0 group-hover:from-green-500/30 group-hover:to-emerald-500/30 transition-colors">
              <Handshake className="h-6 w-6 text-green-600 dark:text-green-400" />
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
          onClick={() => setCurrentStep("escalate")}
          className="w-full text-left border-2 rounded-xl p-5 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center shrink-0 group-hover:from-amber-500/30 group-hover:to-orange-500/30 transition-colors">
              <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Enviar Pruebas a Administradores</h3>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Sube evidencia de tu caso y solicita que un administrador revise la situación 
                y tome una decisión imparcial basada en las pruebas.
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
        totalAmount={totalAmount}
        appealStatus={appealStatus}
        onSwitchToEscalate={() => setCurrentStep("escalate")}
      />
    </div>
  );

  const renderEscalateStep = () => (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => setCurrentStep("choose")}
        className="mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a opciones
      </Button>
      
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
      {currentStep === "choose" && renderChooseStep()}
      {currentStep === "mutual" && renderMutualStep()}
      {currentStep === "escalate" && renderEscalateStep()}
    </>
  );
}
