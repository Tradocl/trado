import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Store, Info, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { calculateOrderDetails } from "@/lib/utils";

const CreateSale = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [orderDetails, setOrderDetails] = useState<ReturnType<typeof calculateOrderDetails> | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (value > 0) {
      setAmount(value);
      const details = calculateOrderDetails(value);
      setOrderDetails(details);
      setTermsAccepted(false); // Reset terms when amount changes
    } else {
      setAmount(0);
      setOrderDetails(null);
      setTermsAccepted(false);
    }
  };

  const handleCreateSale = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const productName = formData.get("productName") as string;
    const productDescription = formData.get("productDescription") as string;
    const amount = parseFloat(formData.get("amount") as string);

    if (!productName || !amount || amount <= 0) {
      toast.error("Por favor completa todos los campos correctamente");
      setLoading(false);
      return;
    }

    if (!termsAccepted) {
      toast.error("Debes aceptar los términos de comisión para continuar");
      setLoading(false);
      return;
    }

    try {
      // Generate invite code
      const { data: codeData } = await supabase.rpc("generate_invite_code");
      const inviteCode = codeData;

      // Calculate commission with new logic
      const details = calculateOrderDetails(amount);

      // Create transaction
      const { data: transaction, error } = await supabase
        .from("transactions")
        .insert({
          seller_id: user.id,
          product_name: productName,
          product_description: productDescription,
          amount: amount,
          commission: details.appFee,
          state: "created",
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("¡Sala de venta creada exitosamente!");
      navigate(`/transaction/${transaction.id}`);
    } catch (error: any) {
      toast.error("Error al crear venta: " + error.message);
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
              <div className="p-3 bg-success/10 rounded-xl">
                <Store className="h-8 w-8 text-success" />
              </div>
              <div>
                <CardTitle className="text-2xl">Crear Venta Segura</CardTitle>
                <CardDescription>
                  Genera una sala de transacción protegida con escrow
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSale} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="productName">Producto o Servicio</Label>
                <Input
                  id="productName"
                  name="productName"
                  placeholder="Ej: iPhone 13 Pro"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productDescription">Descripción</Label>
                <Textarea
                  id="productDescription"
                  name="productDescription"
                  placeholder="Describe tu producto o servicio..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Precio (CLP)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  placeholder="150000"
                  min="1"
                  step="1"
                  required
                  onChange={handleAmountChange}
                />
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Comisión dinámica: 5% (mín $1.000, máx $20.000)
                </p>
              </div>

              {orderDetails && (
                <>
                  <div className="p-5 bg-gradient-to-br from-warning/10 to-warning/5 rounded-lg border-2 border-warning/30 space-y-3">
                    <h4 className="font-semibold text-warning mb-3 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Desglose de Comisión
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground">Precio del producto:</span>
                        <span className="font-bold text-foreground text-lg">
                          ${orderDetails.buyerPays.toLocaleString("es-CL")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 bg-warning/5 rounded px-2">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Comisión Trado (5%):</span>
                          <span className="text-xs text-muted-foreground/70">
                            {((orderDetails.appFee / orderDetails.buyerPays) * 100).toFixed(2)}% del total
                          </span>
                        </div>
                        <span className="font-bold text-warning text-lg">
                          -${orderDetails.appFee.toLocaleString("es-CL")}
                        </span>
                      </div>
                      <div className="pt-3 border-t-2 border-success/30 flex justify-between items-center">
                        <span className="font-bold text-foreground">Total que recibirás:</span>
                        <span className="font-bold text-success text-2xl">
                          ${orderDetails.sellerReceives.toLocaleString("es-CL")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                    <Checkbox
                      id="termsAccepted"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="termsAccepted"
                        className="text-sm font-medium leading-relaxed cursor-pointer"
                      >
                        Acepto que Trado cobrará una comisión de{" "}
                        <span className="font-bold text-warning">
                          ${orderDetails.appFee.toLocaleString("es-CL")} CLP
                        </span>{" "}
                        ({((orderDetails.appFee / orderDetails.buyerPays) * 100).toFixed(2)}%) sobre esta
                        transacción, y que recibiré{" "}
                        <span className="font-bold text-success">
                          ${orderDetails.sellerReceives.toLocaleString("es-CL")} CLP
                        </span>{" "}
                        al completarse la venta.
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="p-4 bg-info/10 rounded-lg border border-info/20">
                <h4 className="font-semibold text-info mb-2">¿Cómo funciona?</h4>
                <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
                  <li>Creas la sala y compartes el código con el comprador</li>
                  <li>El comprador deposita el dinero en Trado (escrow)</li>
                  <li>Coordinas la entrega del producto</li>
                  <li>El comprador confirma que recibió todo correctamente</li>
                  <li>Trado libera el pago a tu billetera</li>
                </ol>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !termsAccepted || !orderDetails}
              >
                <Store className="mr-2 h-4 w-4" />
                {loading ? "Creando..." : "Crear Sala de Venta"}
              </Button>
              {!termsAccepted && orderDetails && (
                <p className="text-sm text-muted-foreground text-center">
                  Debes aceptar los términos de comisión para continuar
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateSale;
