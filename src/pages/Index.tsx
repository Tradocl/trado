import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Shield, Users, TrendingUp, ArrowRight, Star, Quote, CheckCircle, Clock, Banknote, Lock, ChevronRight, Package, Handshake } from "lucide-react";
import tradoLogo from "@/assets/trado-logo.png";
import { Capacitor } from "@capacitor/core";

// ─── App native landing ──────────────────────────────────────────────────────

const AppLanding = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary-light to-info px-8">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <div className="bg-white rounded-3xl p-5 shadow-2xl">
          <img src={tradoLogo} alt="Trado" className="h-20 w-20" />
        </div>

        <div className="text-center text-white space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Trado</h1>
          <p className="text-white/80 text-lg">Compra y vende con total seguridad</p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white text-primary hover:bg-white/90 shadow-xl text-base font-semibold h-14 w-full"
          >
            Iniciar Sesión
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/auth?tab=register")}
            className="border-white/50 text-white hover:bg-white/10 h-14 w-full bg-transparent text-base font-semibold"
          >
            Crear Cuenta Gratis
          </Button>
        </div>

        <p className="text-white/50 text-xs text-center">
          Al continuar aceptas nuestros Términos y Condiciones
        </p>
      </div>
    </div>
  );
};

// ─── Web landing ─────────────────────────────────────────────────────────────

const WebLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={tradoLogo} alt="Trado" className="h-8 w-8" />
            <span className="font-bold text-xl text-primary">Trado</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#como-funciona" className="hover:text-primary transition-colors">¿Cómo funciona?</a>
            <a href="#caracteristicas" className="hover:text-primary transition-colors">Características</a>
            <a href="#precios" className="hover:text-primary transition-colors">Precios</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")} className="text-primary font-semibold">
              Iniciar Sesión
            </Button>
            <Button onClick={() => navigate("/auth")} className="bg-primary text-white shadow-md">
              Comenzar Gratis
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary-light to-info py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fill-rule=evenodd%3E%3Cg fill=%23ffffff fill-opacity=0.05%3E%3Cpath d=M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center text-white space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-2 text-sm font-medium backdrop-blur">
              <CheckCircle className="h-4 w-4 text-green-300" />
              La plataforma escrow #1 de Chile
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
              Compra y vende<br />
              <span className="text-white/80">sin miedo a las estafas</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              Trado retiene tu dinero de forma segura hasta que confirmes que recibiste exactamente lo que acordaste. Sin riesgos, sin sorpresas.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Button size="lg" onClick={() => navigate("/auth")} className="bg-white text-primary hover:bg-white/90 shadow-2xl text-lg px-10 py-6 h-auto font-bold">
                Empezar Ahora — Es Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 bg-transparent text-lg px-10 py-6 h-auto" onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>
                Ver cómo funciona
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto pt-8 border-t border-white/20">
              <div className="text-center">
                <p className="text-3xl font-bold">+5.000</p>
                <p className="text-white/60 text-sm">transacciones</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">99%</p>
                <p className="text-white/60 text-sm">satisfacción</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">3%</p>
                <p className="text-white/60 text-sm">comisión total</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Simple y transparente</span>
            <h2 className="text-4xl font-bold text-foreground mt-2 mb-4">¿Cómo funciona Trado?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              En 4 pasos tienes una transacción 100% segura
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Users, step: "01", title: "El vendedor crea la sala", desc: "Crea una sala con el nombre del producto y el precio. Comparte el código con el comprador." },
              { icon: Lock, step: "02", title: "El comprador deposita", desc: "El comprador ingresa a la sala y deposita el dinero. Trado lo retiene de forma segura." },
              { icon: Package, step: "03", title: "Se realiza la entrega", desc: "El vendedor entrega el producto o lo envía. El comprador lo recibe e inspecciona." },
              { icon: Handshake, step: "04", title: "Se libera el pago", desc: "El comprador confirma que todo está bien y Trado libera el pago al vendedor." },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="relative text-center group">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">{step.slice(1)}</span>
                  </div>
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Características */}
      <section id="caracteristicas" className="py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Por qué elegirnos</span>
            <h2 className="text-4xl font-bold text-foreground mt-2 mb-4">Todo lo que necesitas para transaccionar seguro</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl p-8 border border-success/20 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="p-3 bg-success/10 rounded-xl w-fit mb-5">
                <Shield className="h-7 w-7 text-success" />
              </div>
              <h3 className="text-xl font-bold mb-3">Escrow 100% Seguro</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Tu dinero queda bloqueado en la plataforma. El vendedor no puede recibirlo hasta que confirmes que llegó lo que acordaste.
              </p>
              <ul className="space-y-2">
                {["Dinero protegido siempre", "Devolución si hay problemas", "Mediación por nuestro equipo"].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-info/20 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="p-3 bg-info/10 rounded-xl w-fit mb-5">
                <Users className="h-7 w-7 text-info" />
              </div>
              <h3 className="text-xl font-bold mb-3">Reputación Verificada</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Cada usuario tiene un historial de transacciones y calificaciones. Compra y vende sabiendo con quién tratas.
              </p>
              <ul className="space-y-2">
                {["Calificaciones reales", "Verificación de identidad", "Historial público"].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-info flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-warning/20 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="p-3 bg-warning/10 rounded-xl w-fit mb-5">
                <Clock className="h-7 w-7 text-warning" />
              </div>
              <h3 className="text-xl font-bold mb-3">Rápido y Sin Complicaciones</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Crea una sala en segundos, comparte el código y empieza. Sin formularios interminables ni burocracia.
              </p>
              <ul className="space-y-2">
                {["Sala lista en segundos", "Pago en 1-2 días hábiles", "App para iOS y Android"].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-warning flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Sin sorpresas</span>
            <h2 className="text-4xl font-bold text-foreground mt-2 mb-4">Precio simple y transparente</h2>
            <p className="text-muted-foreground text-lg mb-12">Sin suscripciones, sin costos fijos. Solo pagas cuando vendes.</p>

            <div className="bg-gradient-to-br from-primary/5 to-info/5 rounded-3xl p-10 border border-primary/10 shadow-lg">
              <div className="flex items-end justify-center gap-2 mb-4">
                <span className="text-7xl font-extrabold text-primary">3%</span>
                <span className="text-muted-foreground mb-3 text-lg">por transacción</span>
              </div>
              <p className="text-muted-foreground mb-8">Solo el vendedor paga. El comprador no tiene ningún costo adicional.</p>
              <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                {[
                  "Registro gratuito",
                  "Sin cuota mensual",
                  "Comisión solo al vender",
                  "Retiro a cuenta bancaria",
                  "Soporte incluido",
                  "Mediación de disputas",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Button size="lg" onClick={() => navigate("/auth")} className="w-full bg-primary text-white text-lg h-14 font-bold shadow-lg">
                Crear Cuenta Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="py-20 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Usuarios reales</span>
            <h2 className="text-4xl font-bold text-foreground mt-2 mb-4">Lo que dicen quienes ya usan Trado</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { initials: "MC", name: "María Contreras", gradient: "from-success to-info", text: "Compré un notebook usado y el vendedor me lo envió sin problemas. El dinero estuvo seguro hasta que confirmé que todo estaba perfecto. Nunca más compro sin Trado." },
              { initials: "JR", name: "Juan Rodríguez", gradient: "from-info to-primary", text: "Como vendedor me da mucha confianza. El comprador deposita primero y yo puedo enviar tranquilo sabiendo que el pago está asegurado. Excelente plataforma." },
              { initials: "AP", name: "Andrea Pizarro", gradient: "from-warning to-success", text: "Vendí mi consola en un día. El sistema es super intuitivo y el comprador quedó muy satisfecho. Ya hice 5 transacciones y todas perfectas." },
            ].map(({ initials, name, gradient, text }) => (
              <div key={name} className="bg-white rounded-2xl p-8 border border-primary/10 shadow-lg hover:shadow-xl transition-all">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(s => <Star key={s} className="h-4 w-4 fill-warning text-warning" />)}
                </div>
                <Quote className="h-6 w-6 text-primary/20 mb-3" />
                <p className="text-muted-foreground mb-6 italic leading-relaxed">"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white text-sm`}>
                    {initials}
                  </div>
                  <p className="font-semibold text-foreground">{name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">Dudas frecuentes</span>
              <h2 className="text-4xl font-bold text-foreground mt-2 mb-4">Preguntas Frecuentes</h2>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {[
                { q: "¿Cómo funciona el sistema de seguridad?", a: "El comprador deposita el dinero en Trado, donde queda retenido. El vendedor envía el producto y cuando el comprador confirma que lo recibió correctamente, liberamos el pago. Si hay algún problema, nuestro equipo media la disputa." },
                { q: "¿Cuánto cobra Trado por cada transacción?", a: "Cobramos un 3% sobre el valor de la transacción, descontado del pago al vendedor. El comprador no paga comisión. Sin costos ocultos ni suscripciones." },
                { q: "¿Qué pasa si el producto llega dañado o no corresponde?", a: "El comprador puede abrir una disputa antes de confirmar la recepción. Nuestro equipo revisará el caso con evidencias y mediará para encontrar una solución justa. El dinero permanece retenido hasta resolver." },
                { q: "¿Cuánto tarda en llegar el dinero al vendedor?", a: "Una vez que el comprador confirma la recepción, el dinero queda disponible en tu billetera Trado inmediatamente. El retiro a cuenta bancaria toma entre 1-2 días hábiles." },
                { q: "¿Necesito verificar mi identidad para usar Trado?", a: "Para transacciones básicas no es necesario, pero verificar tu identidad aumenta tu reputación y genera más confianza. Los usuarios verificados acceden a montos más altos y beneficios exclusivos." },
                { q: "¿Trado está disponible como app?", a: "Sí, Trado está disponible para Android y próximamente para iOS. Puedes descargar el APK desde nuestra web o buscarla en la Play Store." },
              ].map(({ q, a }) => (
                <AccordionItem key={q} value={q} className="bg-background rounded-xl border border-border/50 px-6">
                  <AccordionTrigger className="text-foreground hover:text-primary text-left font-medium">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-gradient-to-br from-primary via-primary-light to-info py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-4">
              ¿Listo para vender o comprar sin riesgos?
            </h2>
            <p className="text-white/80 text-lg mb-8">
              Crea tu cuenta gratis en menos de un minuto y haz tu primera transacción segura hoy.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="bg-white text-primary hover:bg-white/90 shadow-2xl text-lg px-12 py-6 h-auto font-bold">
              Crear Cuenta Gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-white rounded-lg p-1">
                  <img src={tradoLogo} alt="Trado" className="h-6 w-6" />
                </div>
                <span className="font-bold text-xl">Trado</span>
              </div>
              <p className="text-white/60 text-sm max-w-xs leading-relaxed">
                La plataforma escrow más segura de Chile. Compra y vende con total tranquilidad.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-3 text-white/80 text-sm uppercase tracking-wider">Plataforma</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li><button onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">¿Cómo funciona?</button></li>
                <li><button onClick={() => document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">Precios</button></li>
                <li><button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">FAQ</button></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3 text-white/80 text-sm uppercase tracking-wider">Legal</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li><button onClick={() => window.location.href = '/terms'} className="hover:text-white transition-colors">Términos y Condiciones</button></li>
                <li><button onClick={() => window.location.href = '/privacy'} className="hover:text-white transition-colors">Política de Privacidad</button></li>
                <li><a href="mailto:soporte@trado.cl" className="hover:text-white transition-colors">soporte@trado.cl</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-white/40">
            <span>© 2025 Trado. Todos los derechos reservados.</span>
            <span>Hecho en Chile 🇨🇱</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ─── Entry point ─────────────────────────────────────────────────────────────

const Index = () => {
  return Capacitor.isNativePlatform() ? <AppLanding /> : <WebLanding />;
};

export default Index;
