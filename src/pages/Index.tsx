import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Shield, Lock, Users, TrendingUp, ArrowRight, Star, Quote } from "lucide-react";
import tradoShield from "@/assets/trado-shield.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-light to-info">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center text-white space-y-8 max-w-4xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl">
              <img src={tradoShield} alt="Trado" className="h-20 w-20" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Trado
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            Compra y vende con total seguridad. Tu dinero protegido hasta que confirmes la entrega.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-white text-primary hover:bg-white/90 shadow-2xl text-lg px-8 py-6 h-auto"
            >
              Comenzar Ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-primary-foreground/20 backdrop-blur-md border-2 border-white text-white hover:bg-primary-foreground/30 shadow-xl text-lg px-8 py-6 h-auto"
            >
              Iniciar Sesión
              <Lock className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-white">
            <div className="p-4 bg-success/20 rounded-xl w-fit mb-4">
              <Shield className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold mb-3">100% Seguro</h3>
            <p className="text-white/80">
              Tu dinero queda retenido hasta que confirmes que recibiste lo que compraste. Sin riesgos.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-white">
            <div className="p-4 bg-info/20 rounded-xl w-fit mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Reputación</h3>
            <p className="text-white/80">
              Sistema de calificaciones para comprar y vender con confianza. Verifica a quién le compras.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-white">
            <div className="p-4 bg-warning/20 rounded-xl w-fit mb-4">
              <TrendingUp className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Simple y Rápido</h3>
            <p className="text-white/80">
              Crea una sala, comparte el código y listo. Vende sin complicaciones en minutos.
            </p>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Lo que dicen nuestros usuarios
          </h2>
          <p className="text-xl text-white/80">
            Miles de transacciones seguras cada día
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-white">
            <Quote className="h-8 w-8 text-white/40 mb-4" />
            <p className="text-white/90 mb-6 italic">
              "Compré un notebook usado y el vendedor me lo envió sin problemas. El dinero estuvo seguro hasta que confirmé que todo estaba perfecto."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-success to-info flex items-center justify-center font-bold">
                MC
              </div>
              <div>
                <p className="font-semibold">María Contreras</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-white">
            <Quote className="h-8 w-8 text-white/40 mb-4" />
            <p className="text-white/90 mb-6 italic">
              "Como vendedor me da mucha confianza. El comprador deposita primero y yo puedo enviar tranquilo sabiendo que el pago está asegurado."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-info to-primary flex items-center justify-center font-bold">
                JR
              </div>
              <div>
                <p className="font-semibold">Juan Rodríguez</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-white">
            <Quote className="h-8 w-8 text-white/40 mb-4" />
            <p className="text-white/90 mb-6 italic">
              "Excelente plataforma. Vendí mi consola y todo fue super rápido. El sistema de calificaciones me ayudó a elegir un comprador confiable."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-warning to-success flex items-center justify-center font-bold">
                AP
              </div>
              <div>
                <p className="font-semibold">Andrea Pizarro</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Preguntas Frecuentes
            </h2>
            <p className="text-xl text-white/80">
              Todo lo que necesitas saber sobre Trado
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="border-b border-white/20">
                <AccordionTrigger className="text-white hover:text-white/80 text-left">
                  ¿Cómo funciona el sistema de seguridad?
                </AccordionTrigger>
                <AccordionContent className="text-white/80">
                  El comprador deposita el dinero en la plataforma, donde queda retenido de forma segura. 
                  El vendedor envía el producto y cuando el comprador confirma que lo recibió correctamente, 
                  liberamos el pago al vendedor. Si hay algún problema, mediamos la disputa.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b border-white/20">
                <AccordionTrigger className="text-white hover:text-white/80 text-left">
                  ¿Cuánto cobran por usar la plataforma?
                </AccordionTrigger>
                <AccordionContent className="text-white/80">
                  Cobramos una pequeña comisión del 3% sobre el valor de la transacción. 
                  Esta comisión se descuenta automáticamente cuando se libera el pago al vendedor. 
                  No hay costos ocultos ni sorpresas.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-b border-white/20">
                <AccordionTrigger className="text-white hover:text-white/80 text-left">
                  ¿Qué pasa si el producto llega dañado?
                </AccordionTrigger>
                <AccordionContent className="text-white/80">
                  Si el producto llega dañado o no corresponde a lo acordado, el comprador puede abrir 
                  una disputa antes de confirmar la recepción. Nuestro equipo revisará el caso y mediará 
                  para encontrar una solución justa. El dinero permanece retenido hasta resolver la disputa.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border-b border-white/20">
                <AccordionTrigger className="text-white hover:text-white/80 text-left">
                  ¿Cuánto tiempo tarda en liberarse el pago?
                </AccordionTrigger>
                <AccordionContent className="text-white/80">
                  Una vez que el comprador confirma que recibió el producto en buen estado, 
                  el pago se libera inmediatamente al vendedor. El vendedor puede entonces retirar 
                  su dinero a su cuenta bancaria, proceso que toma entre 1-2 días hábiles.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border-b-0">
                <AccordionTrigger className="text-white hover:text-white/80 text-left">
                  ¿Necesito verificar mi identidad?
                </AccordionTrigger>
                <AccordionContent className="text-white/80">
                  Para transacciones pequeñas no es necesario, pero recomendamos verificar tu identidad 
                  para aumentar tu reputación y generar más confianza con otros usuarios. Los usuarios 
                  verificados tienen acceso a transacciones de mayor valor y más beneficios.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-12 border border-white/20 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Listo para transaccionar seguro?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Únete a miles de usuarios que ya confían en Trado
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white text-primary hover:bg-white/90 shadow-2xl text-lg px-12 py-6 h-auto"
          >
            Crear Cuenta Gratis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
