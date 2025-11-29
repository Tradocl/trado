import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShoppingBag, Search } from "lucide-react";
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

      if (transaction.seller_id === user.id) {
        toast.error("No puedes unirte a tu propia venta");
        setLoading(false);
        return;
      }

      if (transaction.buyer_id && transaction.buyer_id !== user.id) {
        toast.error("Esta transacción ya tiene un comprador");
        setLoading(false);
        return;
      }

      // Update transaction with buyer
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          buyer_id: user.id,
          state: "invited",
        })
        .eq("id", transaction.id);

      if (updateError) throw updateError;

      // Get buyer and seller profiles
      const { data: buyerProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", transaction.seller_id)
        .single();

      // Send payment instructions to buyer
      try {
        await supabase.functions.invoke("send-payment-instructions", {
          body: {
            buyerEmail: buyerProfile?.email || user.email || "",
            buyerName: buyerProfile?.full_name || "Comprador",
            referenceCode: transaction.invite_code,
            totalAmount: transaction.amount + (transaction.commission || 0),
            productName: transaction.product_name,
            sellerName: sellerProfile?.full_name || "Vendedor",
          },
        });
      } catch (emailError) {
        console.error("Error sending payment instructions:", emailError);
        // Don't fail the join if email fails
      }

      toast.success("¡Te uniste a la transacción!");
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
                <ShoppingBag className="h-8 w-8 text-info" />
              </div>
              <div>
                <CardTitle className="text-2xl">Unirse a una Compra</CardTitle>
                <CardDescription>
                  Ingresa el código de invitación del vendedor
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
                  El vendedor te proporcionará este código de 8 caracteres
                </p>
              </div>

              <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                <h4 className="font-semibold text-success mb-2">Compra Protegida</h4>
                <p className="text-sm text-muted-foreground">
                  Tu dinero quedará retenido en Trado hasta que confirmes haber recibido el producto. 
                  Si hay algún problema, puedes abrir una disputa y recuperar tu dinero.
                </p>
              </div>

              <Button type="submit" className="w-full bg-info hover:bg-info/90" disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Buscando..." : "Buscar Transacción"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default JoinTransaction;
