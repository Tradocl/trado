import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, Lock, Users, ArrowRight, Handshake, DollarSign, AlertCircle, Package, Wrench } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCLP } from "@/lib/utils";
import tradoLogo from "@/assets/trado-logo.png";
import tradoShield from "@/assets/trado-shield.png";

interface TransactionPreview {
  id: string;
  product_name: string;
  product_description: string | null;
  amount: number;
  sale_type: string | null;
  seller_name: string | null;
}

const InviteWelcome = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transaction, setTransaction] = useState<TransactionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If user is already logged in, redirect to transaction
    if (user) {
      navigate(`/transaction/${id}`);
      return;
    }

    loadTransactionPreview();
  }, [user, id, navigate]);

  const loadTransactionPreview = async () => {
    if (!id) return;

    try {
      // Fetch basic transaction info (public fields only)
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("id, product_name, product_description, amount, sale_type, seller_id")
        .eq("id", id)
        .single();

      if (txError) {
        setError("Transacción no encontrada");
        setLoading(false);
        return;
      }

      // Get seller name using safe function
      let sellerName = null;
      if (txData.seller_id) {
        const { data: sellerData } = await supabase
          .rpc("get_safe_profile", { profile_id: txData.seller_id })
          .single();
        sellerName = sellerData?.full_name || sellerData?.nickname || null;
      }

      setTransaction({
        id: txData.id,
        product_name: txData.product_name,
        product_description: txData.product_description,
        amount: txData.amount,
        sale_type: txData.sale_type,
        seller_name: sellerName,
      });
    } catch (err: any) {
      setError("Error al cargar la invitación");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // Save redirect URL
    sessionStorage.setItem('redirectAfterLogin', `/transaction/${id}`);
    navigate("/auth");
  };

  const isService = transaction?.sale_type === "servicio";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-muted flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando invitación...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Enlace no válido</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              Ir al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-muted">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={tradoLogo} alt="Trado" className="h-8" />
          </Link>
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            Ya tengo cuenta
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Invitation Card */}
        <Card className="mb-8 border-2 border-primary/20 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Handshake className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Te han invitado a una transacción segura</p>
                <h1 className="text-2xl font-bold">{transaction?.product_name}</h1>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="p-2 bg-background rounded-lg">
                  {isService ? <Wrench className="h-5 w-5 text-info" /> : <Package className="h-5 w-5 text-info" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-medium">{isService ? "Servicio" : "Producto"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="p-2 bg-background rounded-lg">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monto total</p>
                  <p className="font-bold text-lg">{formatCLP(transaction?.amount || 0)}</p>
                </div>
              </div>
            </div>
            {transaction?.product_description && (
              <p className="mt-4 text-muted-foreground text-sm">
                {transaction.product_description}
              </p>
            )}
            {transaction?.seller_name && (
              <p className="mt-3 text-sm">
                Creada por: <span className="font-medium">{transaction.seller_name}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* What is Trado Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <Badge variant="secondary" className="mb-3">¿Qué es Trado?</Badge>
            <h2 className="text-2xl font-bold mb-2">La forma más segura de comprar y vender entre personas</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Trado protege tu dinero hasta que recibas lo que compraste. Si algo sale mal, 
              te ayudamos a resolverlo.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="bg-card/50">
              <CardContent className="pt-6 text-center">
                <div className="p-3 bg-success/10 rounded-full w-fit mx-auto mb-3">
                  <Lock className="h-6 w-6 text-success" />
                </div>
                <h3 className="font-semibold mb-1">Dinero Protegido</h3>
                <p className="text-sm text-muted-foreground">
                  Tu pago queda retenido hasta que confirmes que todo está bien
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-6 text-center">
                <div className="p-3 bg-info/10 rounded-full w-fit mx-auto mb-3">
                  <Shield className="h-6 w-6 text-info" />
                </div>
                <h3 className="font-semibold mb-1">Mediación Gratuita</h3>
                <p className="text-sm text-muted-foreground">
                  Si hay problemas, nuestro equipo interviene para ayudarte
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-6 text-center">
                <div className="p-3 bg-warning/10 rounded-full w-fit mx-auto mb-3">
                  <Users className="h-6 w-6 text-warning" />
                </div>
                <h3 className="font-semibold mb-1">Chat Integrado</h3>
                <p className="text-sm text-muted-foreground">
                  Comunícate directamente con la otra persona en la plataforma
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How it works */}
        <Card className="mb-8 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg">¿Cómo funciona?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Crea tu cuenta gratis</p>
                  <p className="text-sm text-muted-foreground">Solo necesitas email y contraseña</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">Únete a la transacción</p>
                  <p className="text-sm text-muted-foreground">Revisa los detalles y confirma tu participación</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">{isService ? "Recibe el servicio" : "Recibe tu producto"}</p>
                  <p className="text-sm text-muted-foreground">Tu dinero está protegido hasta que confirmes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Button size="lg" className="px-8" onClick={handleContinue}>
            Continuar
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Al continuar, aceptas nuestros términos de servicio
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 mt-12">
        <div className="container mx-auto px-4 py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={tradoShield} alt="" className="h-5 w-5" />
            <span className="font-semibold">Trado</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Transacciones seguras entre personas
          </p>
        </div>
      </footer>
    </div>
  );
};

export default InviteWelcome;
