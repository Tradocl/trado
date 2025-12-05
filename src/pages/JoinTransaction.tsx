import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Handshake, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const JoinTransaction = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode) return;

    setLoading(true);

    try {
      // Find transaction by invite code
      const { data: transaction, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("invite_code", inviteCode.toUpperCase())
        .single();

      if (error || !transaction) {
        toast.error("Código inválido o transacción no encontrada");
        setLoading(false);
        return;
      }

      // Check if user is already part of this transaction
      if (transaction.seller_id === user.id || transaction.buyer_id === user.id) {
        toast.error("Ya eres parte de esta transacción");
        setLoading(false);
        return;
      }

      // Determine the initiator role to know which field to update
      const initiatorRole = (transaction as any).initiator_role || "seller";
      
      // If initiator was seller, the joining user becomes buyer
      // If initiator was buyer, the joining user becomes seller
      let updateData: any = { state: "invited" };
      
      if (initiatorRole === "seller") {
        // Seller created, so joining user is buyer
        if (transaction.buyer_id) {
          toast.error("Esta transacción ya tiene un comprador");
          setLoading(false);
          return;
        }
        updateData.buyer_id = user.id;
      } else {
        // Buyer created, so joining user is seller
        if (transaction.seller_id) {
          toast.error("Esta transacción ya tiene un vendedor");
          setLoading(false);
          return;
        }
        updateData.seller_id = user.id;
      }

      // Update transaction
      const { error: updateError } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", transaction.id);

      if (updateError) throw updateError;

      // Get profiles for email
      const { data: joinerProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      // Determine other party ID based on who initiated
      const otherPartyId = initiatorRole === "seller" ? transaction.seller_id : transaction.buyer_id;
      
      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", otherPartyId)
        .single();

      // Only send payment instructions if the joiner is the buyer
      // (buyer deposits, seller doesn't need to pay)
      if (initiatorRole === "seller") {
        // Joiner is buyer, send payment instructions
        try {
          await supabase.functions.invoke("send-payment-instructions", {
            body: {
              buyerEmail: joinerProfile?.email || user.email || "",
              buyerName: joinerProfile?.full_name || "Comprador",
              referenceCode: transaction.invite_code,
              totalAmount: transaction.amount,
              productName: transaction.product_name,
              sellerName: otherProfile?.full_name || "Vendedor",
            },
          });
        } catch (emailError) {
          console.error("Error sending payment instructions:", emailError);
        }
      }

      const roleLabel = initiatorRole === "seller" 
        ? (transaction.sale_type === "servicio" ? "cliente" : "comprador")
        : (transaction.sale_type === "servicio" ? "proveedor" : "vendedor");
      
      toast.success(`¡Te uniste como ${roleLabel}!`);
      navigate(`/transaction/${transaction.id}`);
    } catch (error: any) {
      toast.error("Error al unirse: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-muted">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-info/10 rounded-xl">
                <Handshake className="h-8 w-8 text-info" />
              </div>
              <div>
                <CardTitle className="text-2xl">Unirse a Sala de Transacción</CardTitle>
                <CardDescription>
                  Ingresa el código de invitación compartido
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-6">
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
                {loading ? "Buscando..." : "Unirme a la Transacción"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default JoinTransaction;