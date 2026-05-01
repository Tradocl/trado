import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Info, AlertCircle, CheckCircle2, Wrench, Package, Users, Truck, ShoppingBag, Store, Handshake, Copy, Check, Share2, Link, ShieldAlert, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { calculateOrderDetails, formatCLP, formatAmountInput, parseFormattedAmount } from "@/lib/utils";
import { UNVERIFIED_LIMITS, checkTransactionLimits, getUserVerificationStatus } from "@/lib/transaction-limits";
import { nativeShare } from "@/lib/native/share";
import { useRequireCompleteProfile } from "@/hooks/useRequireCompleteProfile";
import { CompleteProfileModal } from "@/components/CompleteProfileModal";

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdTransactionId, setCreatedTransactionId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [saleType, setSaleType] = useState<SaleType>("producto_envio");
  const [mainType, setMainType] = useState<MainType>("producto");
  const [initiatorRole, setInitiatorRole] = useState<InitiatorRole>("seller");
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const { showCompleteProfileModal, requireCompleteProfile, onProfileCompleted, closeModal } = useRequireCompleteProfile();
  const [formData, setFormData] = useState<{
    productName: string;
    productDescription: string;
    amount: number;
    saleType: SaleType;
    initiatorRole: InitiatorRole;
  } | null>(null);
  const [pendingFormEvent, setPendingFormEvent] = useState<React.FormEvent<HTMLFormElement> | null>(null);

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

    // Store form data before checking profile
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

    // Check transaction limits for unverified users
    if (isVerified === false) {
      const limitCheck = await checkTransactionLimits(user.id, parsedAmount, false);
      if (!limitCheck.allowed) {
        toast.error(limitCheck.message);
        return;
      }
    }

    // Check profile completion before proceeding
    await requireCompleteProfile(() => {
      setFormData({
        productName,
        productDescription,
        amount: parsedAmount,
        saleType,
        initiatorRole,
      });
      setShowConfirmModal(true);
    });
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

      // Send notification email
      try {
        await supabase.functions.invoke("notify-transaction-created", {
          body: {
            transactionId: transaction.id,
          },
        });
      } catch (emailError) {
        console.error("Error sending notification email:", emailError);
      }

      setShowConfirmModal(false);
      setCreatedTransactionId(transaction.id);
      setShowSuccessModal(true);
    } catch (error: any) {
      toast.error("Error al crear transacción: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get the correct app URL (production or staging, not preview)
  const getAppUrl = () => {
    const origin = window.location.origin;
    // If we're in the Lovable preview, use the staging URL
    if (origin.includes('id-preview--') || origin.includes('localhost')) {
      // Extract project ID from preview URL or use known staging domain
      const match = origin.match(/id-preview--([^.]+)/);
      if (match) {
        return `https://${match[1]}.lovable.app`;
      }
      // Fallback for localhost - use a known staging URL
      return 'https://wpczgwxsriezaubncuom.lovable.app';
    }
    return origin;
  };

  const copyInviteLink = () => {
    if (createdTransactionId) {
      const appUrl = getAppUrl();
      const link = `${appUrl}/invite/${createdTransactionId}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success("Enlace copiado al portapapeles");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const shareInviteLink = async () => {
    if (createdTransactionId && formData) {
      const appUrl = getAppUrl();
      const link = `${appUrl}/invite/${createdTransactionId}`;
      const text = `Te invito a unirte a mi transacción segura en Trado para: ${formData.productName}`;

      await nativeShare(
        { title: 'Invitación a Trado', text, url: link, dialogTitle: 'Compartir invitación' },
        copyInviteLink
      );
    }
  };

  const shareViaWhatsApp = () => {
    if (createdTransactionId && formData) {
      const appUrl = getAppUrl();
      const link = `${appUrl}/invite/${createdTransactionId}`;
      const text = `¡Hola! Te invito a unirte a mi transacción segura en Trado para: *${formData.productName}*\n\nÚnete aquí: ${link}`;
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
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
            <span className="hidden sm:inline">Volver al inicio</span>
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
                          <div className="pt-3 border-t-2 border-info/30 flex justify-between items-center gap-2">
                            <span className="font-bold text-foreground min-w-0">Total que pagarás:</span>
                            <span className="font-bold text-info text-xl sm:text-2xl shrink-0">
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
                          <div className="pt-3 border-t-2 border-success/30 flex justify-between items-center gap-2">
                            <span className="font-bold text-foreground min-w-0">Total que recibirás:</span>
                            <span className="font-bold text-success text-xl sm:text-2xl shrink-0">
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

      {/* Success Modal with Invite Link */}
      <Dialog open={showSuccessModal} onOpenChange={(open) => {
        if (!open) {
          navigate(`/transaction/${createdTransactionId}`);
        }
        setShowSuccessModal(open);
      }}>
        <DialogContent className="max-w-sm overflow-hidden p-0">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-transparent to-primary/5 pointer-events-none" />
          
          {/* Confetti-like decorative elements */}
          <div className="absolute top-0 left-0 w-full h-32 overflow-hidden pointer-events-none">
            <div 
              className="absolute top-4 left-8 w-2 h-2 bg-success/40 rounded-full animate-bounce"
              style={{ animationDelay: '0.1s', animationDuration: '2s' }}
            />
            <div 
              className="absolute top-8 left-16 w-3 h-3 bg-primary/30 rounded-full animate-bounce"
              style={{ animationDelay: '0.3s', animationDuration: '2.5s' }}
            />
            <div 
              className="absolute top-6 right-12 w-2 h-2 bg-warning/40 rounded-full animate-bounce"
              style={{ animationDelay: '0.5s', animationDuration: '2.2s' }}
            />
            <div 
              className="absolute top-12 right-20 w-2.5 h-2.5 bg-success/30 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s', animationDuration: '2.8s' }}
            />
            <div 
              className="absolute top-3 left-1/2 w-1.5 h-1.5 bg-info/40 rounded-full animate-bounce"
              style={{ animationDelay: '0.4s', animationDuration: '2.3s' }}
            />
          </div>

          <div className="relative p-6">
            <div 
              className="flex flex-col items-center text-center animate-scale-in"
              style={{ animationDuration: '0.4s' }}
            >
              {/* Animated success icon with pulse ring */}
              <div className="relative mb-6">
                <div 
                  className="absolute inset-0 bg-success/20 rounded-full animate-ping"
                  style={{ animationDuration: '1.5s' }}
                />
                <div 
                  className="relative p-5 bg-gradient-to-br from-success/20 to-success/10 rounded-full border-2 border-success/30 shadow-lg shadow-success/20 animate-scale-in"
                  style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}
                >
                  <CheckCircle2 className="h-14 w-14 text-success drop-shadow-sm" />
                </div>
              </div>
              
              <DialogTitle 
                className="text-2xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text animate-fade-in"
                style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}
              >
                ¡Sala Creada!
              </DialogTitle>
              <DialogDescription 
                className="text-muted-foreground animate-fade-in"
                style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}
              >
                Comparte el enlace para invitar a la otra persona
              </DialogDescription>
            </div>

            <div 
              className="space-y-3 py-6 animate-fade-in"
              style={{ animationDelay: '0.5s', animationFillMode: 'backwards' }}
            >
              <Button
                variant="default"
                className={`w-full h-14 text-base font-semibold transition-all duration-300 ${
                  copiedLink 
                    ? 'bg-success hover:bg-success/90 shadow-lg shadow-success/25' 
                    : 'shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]'
                }`}
                onClick={copyInviteLink}
              >
                {copiedLink ? (
                  <span className="flex items-center gap-2 animate-scale-in">
                    <Check className="h-5 w-5" />
                    ¡Enlace copiado!
                  </span>
                ) : (
                  <>
                    <Copy className="mr-2 h-5 w-5" />
                    Copiar enlace de invitación
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full h-12 hover:bg-muted/50 transition-all duration-200 hover:scale-[1.01]"
                onClick={shareInviteLink}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartir enlace
              </Button>
            </div>

            <div 
              className="border-t border-border/50 pt-4 animate-fade-in"
              style={{ animationDelay: '0.6s', animationFillMode: 'backwards' }}
            >
              <Button 
                variant="ghost"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate(`/transaction/${createdTransactionId}`);
                }}
                className="w-full text-muted-foreground hover:text-foreground transition-colors"
              >
                Ir a la Sala de Transacción
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CompleteProfileModal
        open={showCompleteProfileModal}
        onClose={closeModal}
        onComplete={onProfileCompleted}
      />
    </div>
  );
};

export default CreateTransaction;