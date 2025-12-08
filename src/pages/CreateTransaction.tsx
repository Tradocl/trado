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
import { ArrowLeft, Info, AlertCircle, CheckCircle2, Wrench, Package, Users, Truck, ShoppingBag, Store, Handshake } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { calculateOrderDetails, formatCLP, formatAmountInput, parseFormattedAmount } from "@/lib/utils";

type SaleType = "servicio" | "producto_persona" | "producto_envio";
type MainType = "servicio" | "producto";
type InitiatorRole = "seller" | "buyer";

const CreateTransaction = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [amountDisplay, setAmountDisplay] = useState("");
  const [orderDetails, setOrderDetails] = useState<ReturnType<typeof calculateOrderDetails> | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [saleType, setSaleType] = useState<SaleType>("producto_envio");
  const [mainType, setMainType] = useState<MainType>("producto");
  const [initiatorRole, setInitiatorRole] = useState<InitiatorRole>("seller");
  const [formData, setFormData] = useState<{
    productName: string;
    productDescription: string;
    amount: number;
    saleType: SaleType;
    initiatorRole: InitiatorRole;
  } | null>(null);

  // Dynamic labels based on type and role
  const isService = mainType === "servicio";
  const isBuyerInitiator = initiatorRole === "buyer";
  
  const sellerLabel = isService ? "Proveedor" : "Vendedor";
  const buyerLabel = isService ? "Cliente" : "Comprador";
  const itemLabel = isService ? "Servicio" : "Producto";

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatAmountInput(rawValue);
    setAmountDisplay(formatted);
    
    const value = parseFormattedAmount(rawValue);
    if (value > 0) {
      setAmount(value);
      const details = calculateOrderDetails(value);
      setOrderDetails(details);
      setTermsAccepted(false);
    } else {
      setAmount(0);
      setOrderDetails(null);
      setTermsAccepted(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const form = new FormData(e.currentTarget);
    const productName = form.get("productName") as string;
    const productDescription = form.get("productDescription") as string;
    const parsedAmount = parseFormattedAmount(form.get("amount") as string);

    if (!productName || !parsedAmount || parsedAmount <= 0) {
      toast.error("Por favor completa todos los campos correctamente");
      return;
    }

    if (!termsAccepted) {
      toast.error("Debes aceptar los términos para continuar");
      return;
    }

    setFormData({
      productName,
      productDescription,
      amount: parsedAmount,
      saleType,
      initiatorRole,
    });
    setShowConfirmModal(true);
  };

  const confirmCreateTransaction = async () => {
    if (!user || !formData || !orderDetails) return;

    setLoading(true);

    try {
      const { data: codeData } = await supabase.rpc("generate_invite_code");
      const inviteCode = codeData;

      // Always set current user as seller_id (required by DB constraint and RLS)
      // The initiator_role field tracks the actual role of the creator
      // When someone joins, they fill the opposite role based on initiator_role
      const transactionData = {
        product_name: formData.productName,
        product_description: formData.productDescription,
        amount: formData.amount,
        commission: orderDetails.appFee,
        state: "created" as const,
        invite_code: inviteCode,
        sale_type: formData.saleType,
        initiator_role: formData.initiatorRole,
        seller_id: user.id, // Creator always goes here due to DB/RLS constraints
        buyer_id: null,
      };

      const { data: transaction, error } = await supabase
        .from("transactions")
        .insert(transactionData)
        .select()
        .single();

      if (error) throw error;

      // Get profile for notification
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
            sellerReceives: formData.initiatorRole === "seller" 
              ? orderDetails.sellerReceives 
              : formData.amount, // If buyer initiated, seller receives full amount
            inviteCode: inviteCode,
            initiatorRole: formData.initiatorRole,
          },
        });
      } catch (emailError) {
        console.error("Error sending notification email:", emailError);
      }

      toast.success("¡Sala de transacción creada exitosamente!");
      setShowConfirmModal(false);
      navigate(`/transaction/${transaction.id}`);
    } catch (error: any) {
      toast.error("Error al crear transacción: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate what the user will pay/receive
  const getBuyerPaysAmount = () => {
    if (!orderDetails) return 0;
    return isBuyerInitiator 
      ? orderDetails.buyerPays + orderDetails.appFee // Buyer pays price + commission
      : orderDetails.buyerPays; // Buyer pays just the price
  };

  const getSellerReceivesAmount = () => {
    if (!orderDetails) return 0;
    return isBuyerInitiator
      ? orderDetails.buyerPays // Seller receives full price
      : orderDetails.sellerReceives; // Seller receives price - commission
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-muted">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <Button variant="ghost" size="sm" className="px-2 sm:px-4" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Volver</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <Card className="max-w-2xl mx-auto shadow-xl">
          <CardHeader className="pb-3 sm:pb-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="p-2 sm:p-3 bg-primary/10 rounded-lg sm:rounded-xl">
                <Handshake className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg sm:text-2xl">Crear Sala</CardTitle>
                <CardDescription className="text-xs sm:text-sm truncate">
                  Transacción protegida con escrow
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTransaction} className="space-y-4 sm:space-y-6">
              {/* Step 1: Transaction Type */}
              <div className="space-y-3 sm:space-y-4">
                <Label className="text-sm sm:text-base font-semibold">1. ¿Qué tipo de transacción es?</Label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMainType("producto");
                      setSaleType("producto_envio");
                    }}
                    className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all text-left ${
                      mainType === "producto"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Package className={`h-6 w-6 sm:h-8 sm:w-8 mb-1 sm:mb-2 ${mainType === "producto" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-semibold text-sm sm:text-base">Producto</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">Artículo físico</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMainType("servicio");
                      setSaleType("servicio");
                    }}
                    className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all text-left ${
                      mainType === "servicio"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Wrench className={`h-6 w-6 sm:h-8 sm:w-8 mb-1 sm:mb-2 ${mainType === "servicio" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-semibold text-sm sm:text-base">Servicio</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">Reparación, diseño, etc.</p>
                  </button>
                </div>
              </div>

              {/* Step 2: Role Selection */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">2. ¿Cuál es tu rol en esta transacción?</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInitiatorRole("seller")}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      initiatorRole === "seller"
                        ? "border-success bg-success/10"
                        : "border-border hover:border-success/50"
                    }`}
                  >
                    <Store className={`h-8 w-8 mb-2 ${initiatorRole === "seller" ? "text-success" : "text-muted-foreground"}`} />
                    <p className="font-semibold">{isService ? "Proveo el servicio" : "Vendo el producto"}</p>
                    <p className="text-xs text-muted-foreground">Recibiré el dinero</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitiatorRole("buyer")}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      initiatorRole === "buyer"
                        ? "border-info bg-info/10"
                        : "border-border hover:border-info/50"
                    }`}
                  >
                    <ShoppingBag className={`h-8 w-8 mb-2 ${initiatorRole === "buyer" ? "text-info" : "text-muted-foreground"}`} />
                    <p className="font-semibold">{isService ? "Contrato el servicio" : "Compro el producto"}</p>
                    <p className="text-xs text-muted-foreground">Pagaré por esto</p>
                  </button>
                </div>
              </div>

              {/* Step 3: Product/Service Name */}
              <div className="space-y-2">
                <Label htmlFor="productName">3. Nombre del {itemLabel.toLowerCase()}</Label>
                <Input
                  id="productName"
                  name="productName"
                  placeholder={isService ? "Ej: Diseño de logo" : "Ej: iPhone 13 Pro"}
                  required
                />
              </div>

              {/* Step 4: Description */}
              <div className="space-y-2">
                <Label htmlFor="productDescription">4. Descripción</Label>
                <Textarea
                  id="productDescription"
                  name="productDescription"
                  placeholder={`Describe el ${itemLabel.toLowerCase()}...`}
                  rows={4}
                />
              </div>

              {/* Step 5: Delivery method for products */}
              {mainType === "producto" && (
                <div className="space-y-2 animate-fade-in">
                  <Label className="text-base font-semibold">5. ¿Cómo se entregará el producto?</Label>
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
                      <p className="text-xs text-muted-foreground">Encuentro físico</p>
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
                      <p className="text-xs text-muted-foreground">Courier o despacho</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 6: Price */}
              <div className="space-y-2">
                <Label htmlFor="amount">{mainType === "producto" ? "6" : "5"}. Precio (CLP)</Label>
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
                  Comisión Trado: 5% (mín $1.000, máx $20.000)
                </p>
              </div>

              {/* Commission Breakdown */}
              {orderDetails && (
                <>
                  <div className="p-5 bg-gradient-to-br from-warning/10 to-warning/5 rounded-lg border-2 border-warning/30 space-y-3">
                    <h4 className="font-semibold text-warning mb-3 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Desglose de la Transacción
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground">Precio del {itemLabel.toLowerCase()}:</span>
                        <span className="font-bold text-foreground text-lg">
                          ${formatCLP(orderDetails.buyerPays)}
                        </span>
                      </div>
                      
                      {isBuyerInitiator ? (
                        <>
                          <div className="flex justify-between items-center py-2 bg-info/10 rounded px-2">
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">Comisión Trado (la pagas tú):</span>
                              <span className="text-xs text-muted-foreground/70">
                                Como {buyerLabel.toLowerCase()}, asumes la comisión
                              </span>
                            </div>
                            <span className="font-bold text-info text-lg">
                              +${formatCLP(orderDetails.appFee)}
                            </span>
                          </div>
                          <div className="pt-3 border-t-2 border-info/30 flex justify-between items-center">
                            <span className="font-bold text-foreground">Total que pagarás:</span>
                            <span className="font-bold text-info text-2xl">
                              ${formatCLP(getBuyerPaysAmount())}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 bg-success/10 rounded px-2">
                            <span className="text-muted-foreground">{sellerLabel} recibirá:</span>
                            <span className="font-bold text-success text-lg">
                              ${formatCLP(getSellerReceivesAmount())}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center py-2 bg-warning/5 rounded px-2">
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">Comisión Trado:</span>
                              <span className="text-xs text-muted-foreground/70">
                                Se descuenta de tu pago
                              </span>
                            </div>
                            <span className="font-bold text-warning text-lg">
                              -${formatCLP(orderDetails.appFee)}
                            </span>
                          </div>
                          <div className="pt-3 border-t-2 border-success/30 flex justify-between items-center">
                            <span className="font-bold text-foreground">Total que recibirás:</span>
                            <span className="font-bold text-success text-2xl">
                              ${formatCLP(getSellerReceivesAmount())}
                            </span>
                          </div>
                        </>
                      )}
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
                        {isBuyerInitiator ? (
                          <>
                            Acepto que pagaré un total de{" "}
                            <span className="font-bold text-info">
                              ${formatCLP(getBuyerPaysAmount())}
                            </span>{" "}
                            (precio + comisión) y que el {sellerLabel.toLowerCase()} recibirá{" "}
                            <span className="font-bold text-success">
                              ${formatCLP(getSellerReceivesAmount())}
                            </span>.
                          </>
                        ) : (
                          <>
                            Acepto que Trado cobrará una comisión de{" "}
                            <span className="font-bold text-warning">
                              ${formatCLP(orderDetails.appFee)}
                            </span>{" "}
                            y que recibiré{" "}
                            <span className="font-bold text-success">
                              ${formatCLP(getSellerReceivesAmount())}
                            </span>{" "}
                            al completarse la transacción.
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* How it works info */}
              <div className="p-4 bg-info/10 rounded-lg border border-info/20">
                <h4 className="font-semibold text-info mb-2">¿Cómo funciona?</h4>
                <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
                  {isBuyerInitiator ? (
                    <>
                      <li>Creas la sala y compartes el código con el {sellerLabel.toLowerCase()}</li>
                      <li>El {sellerLabel.toLowerCase()} se une a la sala</li>
                      <li>Tú depositas el dinero en Trado (escrow)</li>
                      <li>Se coordina la entrega del {itemLabel.toLowerCase()}</li>
                      <li>Confirmas que recibiste todo correctamente</li>
                      <li>Trado libera el pago al {sellerLabel.toLowerCase()}</li>
                    </>
                  ) : (
                    <>
                      <li>Creas la sala y compartes el código con el {buyerLabel.toLowerCase()}</li>
                      <li>El {buyerLabel.toLowerCase()} deposita el dinero en Trado (escrow)</li>
                      <li>Coordinas la entrega del {itemLabel.toLowerCase()}</li>
                      <li>El {buyerLabel.toLowerCase()} confirma que recibió todo correctamente</li>
                      <li>Trado libera el pago a tu billetera</li>
                    </>
                  )}
                </ol>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !termsAccepted || !orderDetails}
              >
                <Handshake className="mr-2 h-4 w-4" />
                {loading ? "Creando..." : "Crear Sala de Transacción"}
              </Button>
              {!termsAccepted && orderDetails && (
                <p className="text-sm text-muted-foreground text-center">
                  Debes aceptar los términos para continuar
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
                <DialogTitle className="text-xl">Confirmar Creación</DialogTitle>
                <DialogDescription>
                  Revisa los detalles antes de continuar
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {formData && orderDetails && (
            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">{itemLabel}</h4>
                <p className="font-bold text-lg">{formData.productName}</p>
                {formData.productDescription && (
                  <p className="text-sm text-muted-foreground">{formData.productDescription}</p>
                )}
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">Tu rol</h4>
                <p className="font-bold">
                  {isBuyerInitiator ? buyerLabel : sellerLabel}
                </p>
              </div>

              <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20 space-y-3">
                <h4 className="font-semibold text-primary mb-3">Resumen Financiero</h4>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Precio:</span>
                  <span className="font-bold">${formatCLP(formData.amount)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Comisión Trado:</span>
                  <span className="font-bold text-warning">${formatCLP(orderDetails.appFee)}</span>
                </div>

                {isBuyerInitiator ? (
                  <>
                    <div className="pt-2 border-t flex justify-between items-center">
                      <span className="font-semibold">Tú pagarás:</span>
                      <span className="font-bold text-info text-xl">${formatCLP(getBuyerPaysAmount())}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{sellerLabel} recibirá:</span>
                      <span className="font-bold text-success">${formatCLP(getSellerReceivesAmount())}</span>
                    </div>
                  </>
                ) : (
                  <div className="pt-2 border-t flex justify-between items-center">
                    <span className="font-semibold">Recibirás:</span>
                    <span className="font-bold text-success text-xl">${formatCLP(getSellerReceivesAmount())}</span>
                  </div>
                )}
              </div>

              {isBuyerInitiator && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <strong>Nota:</strong> No podrás depositar el dinero hasta que el {sellerLabel.toLowerCase()} se una a la sala.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-shrink-0 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmModal(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmCreateTransaction}
              disabled={loading}
            >
              {loading ? "Creando..." : "Confirmar y Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateTransaction;