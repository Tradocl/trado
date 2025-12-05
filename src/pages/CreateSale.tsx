import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Store, Info, AlertCircle, CheckCircle2, Wrench, Package, Users, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { calculateOrderDetails, formatCLP, formatAmountInput, parseFormattedAmount } from "@/lib/utils";

type SaleType = "servicio" | "producto_persona" | "producto_envio";

const CreateSale = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [amountDisplay, setAmountDisplay] = useState("");
  const [orderDetails, setOrderDetails] = useState<ReturnType<typeof calculateOrderDetails> | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [saleType, setSaleType] = useState<SaleType>("producto_envio");
  const [mainType, setMainType] = useState<"servicio" | "producto">("producto");
  const [formData, setFormData] = useState<{
    productName: string;
    productDescription: string;
    amount: number;
    saleType: SaleType;
  } | null>(null);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatAmountInput(rawValue);
    setAmountDisplay(formatted);
    
    const value = parseFormattedAmount(rawValue);
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

    const form = new FormData(e.currentTarget);
    const productName = form.get("productName") as string;
    const productDescription = form.get("productDescription") as string;
    const amount = parseFormattedAmount(form.get("amount") as string);

    if (!productName || !amount || amount <= 0) {
      toast.error("Por favor completa todos los campos correctamente");
      return;
    }

    if (!termsAccepted) {
      toast.error("Debes aceptar los términos de comisión para continuar");
      return;
    }

    // Store form data and show confirmation modal
    setFormData({
      productName,
      productDescription,
      amount,
      saleType,
    });
    setShowConfirmModal(true);
  };

  const confirmCreateSale = async () => {
    if (!user || !formData || !orderDetails) return;

    setLoading(true);

    try {
      // Generate invite code
      const { data: codeData } = await supabase.rpc("generate_invite_code");
      const inviteCode = codeData;

      // Create transaction
      const { data: transaction, error } = await supabase
        .from("transactions")
        .insert({
          seller_id: user.id,
          product_name: formData.productName,
          product_description: formData.productDescription,
          amount: formData.amount,
          commission: orderDetails.appFee,
          state: "created",
          invite_code: inviteCode,
          sale_type: formData.saleType,
        })
        .select()
        .single();

      if (error) throw error;

      // Get seller profile for email
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      // Send notification email
      try {
        await supabase.functions.invoke("notify-transaction-created", {
          body: {
            transactionId: transaction.id,
            sellerEmail: profile?.email || user.email || "",
            sellerName: profile?.full_name || "Usuario",
            productName: formData.productName,
            productDescription: formData.productDescription,
            amount: formData.amount,
            commission: orderDetails.appFee,
            sellerReceives: orderDetails.sellerReceives,
            inviteCode: inviteCode,
          },
        });
      } catch (emailError) {
        console.error("Error sending notification email:", emailError);
        // Don't fail the transaction creation if email fails
      }

      toast.success("¡Sala de venta creada exitosamente!");
      setShowConfirmModal(false);
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
              {/* Sale Type Selector */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">¿Qué tipo de venta es?</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMainType("producto");
                      setSaleType("producto_envio");
                    }}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      mainType === "producto"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Package className={`h-8 w-8 mb-2 ${mainType === "producto" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-semibold">Producto</p>
                    <p className="text-xs text-muted-foreground">Artículo físico que entregas</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMainType("servicio");
                      setSaleType("servicio");
                    }}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      mainType === "servicio"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Wrench className={`h-8 w-8 mb-2 ${mainType === "servicio" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-semibold">Servicio</p>
                    <p className="text-xs text-muted-foreground">Reparación, diseño, consultoría, etc.</p>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">{mainType === "servicio" ? "Servicio" : "Producto"}</Label>
                <Input
                  id="productName"
                  name="productName"
                  placeholder={mainType === "servicio" ? "Ej: Diseño de logo" : "Ej: iPhone 13 Pro"}
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

              {/* Delivery method for products */}
              {mainType === "producto" && (
                <div className="space-y-2 animate-fade-in">
                  <Label className="text-base font-semibold">¿Cómo entregarás el producto?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSaleType("producto_persona")}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        saleType === "producto_persona"
                          ? "border-info bg-info/10"
                          : "border-border hover:border-info/50"
                      }`}
                    >
                      <Users className={`h-6 w-6 mb-1 ${saleType === "producto_persona" ? "text-info" : "text-muted-foreground"}`} />
                      <p className="font-medium text-sm">En Persona</p>
                      <p className="text-xs text-muted-foreground">Encuentro con el comprador</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaleType("producto_envio")}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        saleType === "producto_envio"
                          ? "border-info bg-info/10"
                          : "border-border hover:border-info/50"
                      }`}
                    >
                      <Truck className={`h-6 w-6 mb-1 ${saleType === "producto_envio" ? "text-info" : "text-muted-foreground"}`} />
                      <p className="font-medium text-sm">Por Envío</p>
                      <p className="text-xs text-muted-foreground">Lo envías por courier</p>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Precio (CLP)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="text"
                  inputMode="numeric"
                  placeholder="150.000"
                  required
                  value={amountDisplay}
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
                          ${formatCLP(orderDetails.buyerPays)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 bg-warning/5 rounded px-2">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Comisión Trado (5%):</span>
                          <span className="text-xs text-muted-foreground/70">
                            {Math.round((orderDetails.appFee / orderDetails.buyerPays) * 100)}% del total
                          </span>
                        </div>
                        <span className="font-bold text-warning text-lg">
                          -${formatCLP(orderDetails.appFee)}
                        </span>
                      </div>
                      <div className="pt-3 border-t-2 border-success/30 flex justify-between items-center">
                        <span className="font-bold text-foreground">Total que recibirás:</span>
                        <span className="font-bold text-success text-2xl">
                          ${formatCLP(orderDetails.sellerReceives)}
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
                          ${formatCLP(orderDetails.appFee)}
                        </span>{" "}
                        ({Math.round((orderDetails.appFee / orderDetails.buyerPays) * 100)}%) sobre esta
                        transacción, y que recibiré{" "}
                        <span className="font-bold text-success">
                          ${formatCLP(orderDetails.sellerReceives)}
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

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-success/10 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <DialogTitle className="text-xl">Confirmar Creación de Venta</DialogTitle>
                <DialogDescription>
                  Revisa los detalles antes de continuar
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {formData && orderDetails && (
            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              {/* Product Info */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Producto</h4>
                <p className="font-bold text-lg">{formData.productName}</p>
                {formData.productDescription && (
                  <p className="text-sm text-muted-foreground">{formData.productDescription}</p>
                )}
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20 space-y-3">
                <h4 className="font-semibold text-primary mb-3">Resumen Financiero</h4>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Precio del producto:</span>
                  <span className="font-bold text-lg">
                    ${formatCLP(orderDetails.buyerPays)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 bg-warning/10 rounded px-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-warning">Comisión Trado:</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round((orderDetails.appFee / orderDetails.buyerPays) * 100)}% del total
                    </span>
                  </div>
                  <span className="font-bold text-warning">
                    -${formatCLP(orderDetails.appFee)}
                  </span>
                </div>

                <div className="pt-3 border-t-2 border-success/30 flex justify-between items-center">
                  <span className="font-bold">Recibirás:</span>
                  <span className="font-bold text-success text-2xl">
                    ${formatCLP(orderDetails.sellerReceives)}
                  </span>
                </div>
              </div>

              {/* Terms Summary */}
              <div className="p-4 bg-info/10 rounded-lg border border-info/20">
                <h4 className="font-semibold text-info mb-2 text-sm">Términos del Escrow</h4>
                <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                  <li>Compartirás el código de invitación con el comprador</li>
                  <li>El comprador depositará ${formatCLP(orderDetails.buyerPays)}</li>
                  <li>Coordinarás la entrega del producto</li>
                  <li>Al confirmar entrega, recibirás ${formatCLP(orderDetails.sellerReceives)}</li>
                  <li>Comisión de Trado: ${formatCLP(orderDetails.appFee)}</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0 gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmCreateSale}
              disabled={loading}
              className="gap-2"
            >
              <Store className="h-4 w-4" />
              {loading ? "Creando..." : "Confirmar y Crear Venta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateSale;
