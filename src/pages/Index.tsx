import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Shield, Users, TrendingUp, ArrowRight, Star, Quote } from "lucide-react";
import tradoLogo from "@/assets/trado-logo.png";

const Index = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary via-primary-light to-info">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center text-white space-y-8 max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <img src={tradoLogo} alt="Trado" className="h-24 w-24 drop-shadow-2xl border-primary shadow" />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Trado
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
              Compra y vende con total seguridad. Tu dinero protegido hasta que confirmes la entrega.
            </p>

            <div className="flex justify-center pt-4">
              <Button size="lg" onClick={() => navigate("/auth")} className="bg-white text-primary hover:bg-white/90 shadow-2xl text-lg px-8 py-6 h-auto">
                Comenzar Ahora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gradient-to-b from-primary/5 to-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              ¿Por qué elegir Trado?
            </h2>
            <p className="text-xl text-muted-foreground">
              La forma más segura de comprar y vender en Chile
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-2xl p-8 border border-success/20 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="p-4 bg-success/20 rounded-xl w-fit mb-4">
                <Shield className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">100% Seguro</h3>
              <p className="text-muted-foreground">
                Tu dinero queda retenido hasta que confirmes que recibiste lo que compraste. Sin riesgos.
              </p>
            </div>

            <div className="bg-gradient-to-br from-info/10 to-info/5 rounded-2xl p-8 border border-info/20 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="p-4 bg-info/20 rounded-xl w-fit mb-4">
                <Users className="h-8 w-8 text-info" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">Reputación</h3>
              <p className="text-muted-foreground">
                Sistema de calificaciones para comprar y vender con confianza. Verifica a quién le compras.
              </p>
            </div>

            <div className="bg-gradient-to-br from-warning/10 to-warning/5 rounded-2xl p-8 border border-warning/20 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="p-4 bg-warning/20 rounded-xl w-fit mb-4">
                <TrendingUp className="h-8 w-8 text-warning" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">Simple y Rápido</h3>
              <p className="text-muted-foreground">
                Crea una sala, comparte el código y listo. Vende sin complicaciones en minutos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-gradient-to-b from-background to-primary/5 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Lo que dicen nuestros usuarios
            </h2>
            <p className="text-xl text-muted-foreground">
              Miles de transacciones seguras cada día
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card rounded-2xl p-8 border border-primary/10 shadow-lg hover:shadow-xl transition-all">
              <Quote className="h-8 w-8 text-primary/30 mb-4" />
              <p className="text-muted-foreground mb-6 italic">
                "Compré un notebook usado y el vendedor me lo envió sin problemas. El dinero estuvo seguro hasta que confirmé que todo estaba perfecto."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-success to-info flex items-center justify-center font-bold text-white">
                  MC
                </div>
                <div>
                  <p className="font-semibold text-foreground">María Contreras</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => <Star key={star} className="h-4 w-4 fill-warning text-warning" />)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-8 border border-primary/10 shadow-lg hover:shadow-xl transition-all">
              <Quote className="h-8 w-8 text-primary/30 mb-4" />
              <p className="text-muted-foreground mb-6 italic">
                "Como vendedor me da mucha confianza. El comprador deposita primero y yo puedo enviar tranquilo sabiendo que el pago está asegurado."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-info to-primary flex items-center justify-center font-bold text-white">
                  JR
                </div>
                <div>
                  <p className="font-semibold text-foreground">Juan Rodríguez</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => <Star key={star} className="h-4 w-4 fill-warning text-warning" />)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-8 border border-primary/10 shadow-lg hover:shadow-xl transition-all">
              <Quote className="h-8 w-8 text-primary/30 mb-4" />
              <p className="text-muted-foreground mb-6 italic">
                "Excelente plataforma. Vendí mi consola y todo fue super rápido. El sistema de calificaciones me ayudó a elegir un comprador confiable."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-warning to-success flex items-center justify-center font-bold text-white">
                  AP
                </div>
                <div>
                  <p className="font-semibold text-foreground">Andrea Pizarro</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => <Star key={star} className="h-4 w-4 fill-warning text-warning" />)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gradient-to-b from-primary/5 to-background py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Preguntas Frecuentes
              </h2>
              <p className="text-xl text-muted-foreground">
                Todo lo que necesitas saber sobre Trado
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 border border-primary/10 shadow-lg">
              <Accordion type="single" collapsible className="space-y-4">
                <AccordionItem value="item-1" className="border-b border-border/50">
                  <AccordionTrigger className="text-foreground hover:text-primary text-left">
                    ¿Cómo funciona el sistema de seguridad?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    El comprador deposita el dinero en la plataforma, donde queda retenido de forma segura. 
                    El vendedor envía el producto y cuando el comprador confirma que lo recibió correctamente, 
                    liberamos el pago al vendedor. Si hay algún problema, mediamos la disputa.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border-b border-border/50">
                  <AccordionTrigger className="text-foreground hover:text-primary text-left">
                    ¿Cuánto cobran por usar la plataforma?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Cobramos una pequeña comisión del 3% sobre el valor de la transacción. 
                    Esta comisión se descuenta automáticamente cuando se libera el pago al vendedor. 
                    No hay costos ocultos ni sorpresas.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border-b border-border/50">
                  <AccordionTrigger className="text-foreground hover:text-primary text-left">
                    ¿Qué pasa si el producto llega dañado?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Si el producto llega dañado o no corresponde a lo acordado, el comprador puede abrir 
                    una disputa antes de confirmar la recepción. Nuestro equipo revisará el caso y mediará 
                    para encontrar una solución justa. El dinero permanece retenido hasta resolver la disputa.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="border-b border-border/50">
                  <AccordionTrigger className="text-foreground hover:text-primary text-left">
                    ¿Cuánto tiempo tarda en liberarse el pago?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Una vez que el comprador confirma que recibió el producto en buen estado, 
                    el pago se libera inmediatamente al vendedor. El vendedor puede entonces retirar 
                    su dinero a su cuenta bancaria, proceso que toma entre 1-2 días hábiles.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5" className="border-b-0">
                  <AccordionTrigger className="text-foreground hover:text-primary text-left">
                    ¿Necesito verificar mi identidad?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Para transacciones pequeñas no es necesario, pero recomendamos verificar tu identidad 
                    para aumentar tu reputación y generar más confianza con otros usuarios. Los usuarios 
                    verificados tienen acceso a transacciones de mayor valor y más beneficios.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-primary via-primary-light to-info py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              ¿Listo para transaccionar seguro?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Únete a miles de usuarios que ya confían en Trado
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="bg-white text-primary hover:bg-white/90 shadow-2xl text-lg px-12 py-6 h-auto">
              Crear Cuenta Gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={tradoLogo} alt="Trado" className="h-6 w-6" />
              <span className="font-semibold text-foreground">Trado</span>
              <span className="text-muted-foreground text-sm">© 2024</span>
            </div>
            <div className="flex items-center gap-6">
              <button onClick={() => navigate("/terms")} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Términos y Condiciones
              </button>
              <button onClick={() => navigate("/privacy")} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Política de Privacidad
              </button>
              <span className="text-muted-foreground text-sm">soporte@trado.cl</span>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;