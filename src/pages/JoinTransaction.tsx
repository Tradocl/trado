import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Handshake, Search, ShieldAlert, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatCLP } from "@/lib/utils";
import { UNVERIFIED_LIMITS, getUserVerificationStatus } from "@/lib/transaction-limits";
import { useRequireCompleteProfile } from "@/hooks/useRequireCompleteProfile";
import { CompleteProfileModal } from "@/components/CompleteProfileModal";

const JoinTransaction = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const { showCompleteProfileModal, requireCompleteProfile, onProfileCompleted, closeModal } = useRequireCompleteProfile();

  // Load user verification status

  // Load user verification status
  useEffect(() => {
    const loadVerificationStatus = async () => {
      if (user) {
        const verified = await getUserVerificationStatus(user.id);
        setIsVerified(verified);
      }
    };
    loadVerificationStatus();
  }, [user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode) return;

    // Check profile completion before proceeding
    const proceed = await requireCompleteProfile(async () => {
      await performSearch();
    });
  };

  const performSearch = async () => {
    setLoading(true);

    try {
      // Find transaction by invite code
      const { data: transaction, error } = await supabase
        .from("transactions")
        .select("id, seller_id, buyer_id, sale_type")
        .eq("invite_code", inviteCode.toUpperCase())
        .single();

      if (error || !transaction) {
        toast.error("Código inválido o transacción no encontrada");
        setLoading(false);
        return;
      }

      // Check if user is already part of this transaction
      if (transaction.seller_id === user.id || transaction.buyer_id === user.id) {
        toast.info("Ya eres parte de esta transacción");
        navigate(`/transaction/${transaction.id}`);
        return;
      }

      // Check if transaction already has both parties
      if (transaction.buyer_id && transaction.seller_id) {
        toast.error("Esta transacción ya tiene ambas partes");
        setLoading(false);
        return;
      }

      // Redirect to transaction page where user will see the confirmation dialog
      navigate(`/transaction/${transaction.id}`);
    } catch (error: any) {
      toast.error("Error al buscar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-muted">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <Button variant="ghost" size="sm" className="px-2 sm:px-4" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Volver al inicio</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <Card className="max-w-2xl mx-auto shadow-xl">
          <CardHeader className="pb-3 sm:pb-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="p-2 sm:p-3 bg-info/10 rounded-lg sm:rounded-xl">
                <Handshake className="h-6 w-6 sm:h-8 sm:w-8 text-info" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg sm:text-2xl">Unirse a Sala</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Ingresa el código de invitación
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Unverified user warning banner */}
            {isVerified === false && (
              <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-warning mb-1">Usuario no verificado</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Máximo <strong>${formatCLP(UNVERIFIED_LIMITS.PER_TRANSACTION)}</strong> por transacción</li>
                      <li>• Máximo <strong>${formatCLP(UNVERIFIED_LIMITS.TOTAL_ACCUMULATED)}</strong> acumulado total</li>
                    </ul>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-warning hover:text-warning/80 mt-2"
                      onClick={() => navigate("/verification")}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Verificarme ahora
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSearch} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Código de Invitación</Label>
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Ej: A1B2C3D4"
                  maxLength={8}
                  className="text-center text-2xl font-mono tracking-widest uppercase"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  El código de 8 caracteres que te compartieron
                </p>
              </div>

              <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                <h4 className="font-semibold text-success mb-2">Transacción Protegida</h4>
                <p className="text-sm text-muted-foreground">
                  El dinero quedará retenido en Trado hasta que ambas partes confirmen. 
                  Si hay algún problema, puedes abrir una apelación.
                </p>
              </div>

              <Button type="submit" className="w-full bg-info hover:bg-info/90" disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Buscando..." : "Buscar Transacción"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <CompleteProfileModal
          open={showCompleteProfileModal}
          onClose={closeModal}
          onComplete={onProfileCompleted}
        />
      </main>
    </div>
  );
};

export default JoinTransaction;