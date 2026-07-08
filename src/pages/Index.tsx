import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Shield, Users, ArrowRight, Star, Quote, CheckCircle, Clock, Lock, Package, Handshake, ChevronDown } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Capacitor } from "@capacitor/core";
import { AnimatedFlowDemo } from "@/components/AnimatedFlowDemo";

const FAQ_ITEMS = [
  { q: "¿Cómo funciona el sistema de seguridad?", a: "Quien paga deposita el dinero en Trado, donde queda retenido. Quien entrega cumple lo acordado —enviar el producto, completar el servicio o entregar el trabajo— y cuando el pagador confirma que todo está correcto, liberamos el pago. Si hay algún problema, nuestro equipo media la disputa." },
  { q: "¿Cuánto cobra Trado por cada transacción?", a: "Cobramos un 5% sobre el valor de la transacción, descontado del monto recibido. Quien paga no tiene comisión adicional. Sin costos ocultos ni suscripciones." },
  { q: "¿Qué pasa si el producto o servicio no corresponde a lo acordado?", a: "Quien pagó puede abrir una disputa antes de confirmar la recepción. Nuestro equipo revisará el caso con evidencias y mediará para encontrar una solución justa. El dinero permanece retenido hasta resolver." },
  { q: "¿Cuánto tarda en llegar el dinero a quien entregó?", a: "Una vez confirmado que todo salió bien, el dinero queda disponible en tu billetera Trado inmediatamente. El retiro a cuenta bancaria toma entre 1-2 días hábiles." },
  { q: "¿Necesito verificar mi identidad para usar Trado?", a: "Para transacciones básicas no es necesario, pero verificar tu identidad aumenta tu reputación y genera más confianza. Los usuarios verificados acceden a montos más altos y beneficios exclusivos." },
  { q: "¿Trado está disponible como app?", a: "Sí, Trado está disponible para Android y próximamente para iOS. Puedes descargar el APK desde nuestra web o buscarla en la Play Store." },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

// If the landing receives a Supabase auth hash (email verification redirect),
// forward it to the proper page so the session/token is processed there.
const useAuthHashRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    if (hash.includes("type=recovery")) {
      navigate("/reset-password" + window.location.search + hash, { replace: true });
    } else if (
      hash.includes("access_token=") ||
      hash.includes("type=signup") ||
      hash.includes("type=email") ||
      hash.includes("error=") // expired/invalid links
    ) {
      navigate("/verificar-email" + window.location.search + hash, { replace: true });
    }
  }, [navigate]);
};

// ── Scroll progress bar ───────────────────────────────────────────────────────

const ScrollProgress = () => {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const d = document.documentElement;
      setP((window.scrollY / (d.scrollHeight - d.clientHeight)) * 100);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[3px]">
      <div
        className="h-full bg-gradient-to-r from-primary via-info to-success"
        style={{ width: `${p}%`, transition: "width 80ms linear" }}
      />
    </div>
  );
};

// ── Intersection-observer reveal ──────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible] as const;
}

// ── Floating transaction mockup card ─────────────────────────────────────────

const TransactionCard = () => (
  <div className="hero-card animate-float w-full max-w-sm mx-auto">
    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Lock className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-white text-xs font-semibold">Transacción #4821</p>
            <p className="text-white/50 text-[11px]">Trado Escrow</p>
          </div>
        </div>
        <span className="text-xs bg-green-400/20 text-green-300 px-2.5 py-1 rounded-full font-medium">Activa</span>
      </div>

      <div className="bg-white/10 rounded-2xl p-4 mb-4">
        <p className="text-white/60 text-xs mb-1">Monto protegido</p>
        <p className="text-white text-3xl font-bold">$420.000</p>
        <p className="text-white/50 text-xs mt-1">MacBook Air M2 · Como nuevo</p>
      </div>

      <div className="space-y-2.5 mb-4">
        {[
          { label: "Pago depositado en Trado", done: true },
          { label: "Producto enviado al comprador", done: true },
          { label: "Confirmando recepción…", done: false },
        ].map(({ label, done }) => (
          <div key={label} className="flex items-center gap-2.5">
            <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${done ? "bg-emerald-400" : "bg-white/20"}`}>
              {done
                ? <CheckCircle className="h-3 w-3 text-white" />
                : <div className="w-2 h-2 rounded-full bg-white/50 animate-pulse" />}
            </div>
            <span className={`text-xs ${done ? "text-white/80" : "text-white/40"}`}>{label}</span>
          </div>
        ))}
      </div>

      <button className="w-full bg-white text-primary text-sm font-bold py-2.5 rounded-xl hover:bg-white/90 transition-colors shadow-lg">
        Confirmar recepción →
      </button>
    </div>
  </div>
);

// ── App native landing ────────────────────────────────────────────────────────

const AppLanding = () => {
  const navigate = useNavigate();
  const [mockStep, setMockStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMockStep((s) => (s + 1) % 3), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1035] overflow-hidden relative">
      {/* Background glow blobs */}
      <div className="absolute top-[-80px] left-[-60px] w-72 h-72 bg-[#1F25C1]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[30%] right-[-80px] w-64 h-64 bg-[#6366f1]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-40px] w-56 h-56 bg-[#16A34A]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top section — logo + tagline */}
      <div className="flex flex-col items-center pt-20 px-8 gap-4">
        <Logo height={52} />
        <div className="text-center space-y-2 mt-2">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Compra y vende<br />
            <span className="text-[#818cf8]">sin riesgo</span>
          </h1>
          <p className="text-white/60 text-base">Tu dinero protegido hasta confirmar la entrega</p>
        </div>
      </div>

      {/* Phone mockup — floating card preview */}
      <div className="flex-1 flex items-center justify-center px-10 py-6">
        <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur-sm shadow-2xl space-y-3">
          {/* Mock transaction card */}
          <div className="bg-[#1F25C1]/80 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-xs font-medium">MacBook Air M1</span>
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock size={9} /> Protegido
              </span>
            </div>
            <p className="text-white font-black text-2xl">$620.000</p>
            <div className="flex gap-1.5 pt-1">
              {["Pago", "Envío", "Confirmar"].map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-500 ${
                    i < mockStep ? "bg-white text-[#1F25C1]" :
                    i === mockStep ? "bg-white text-[#1F25C1] ring-2 ring-white/50 scale-110" :
                    "bg-white/10 text-white/40"
                  }`}>
                    {i < mockStep ? "✓" : i + 1}
                  </div>
                  <span className={`text-[9px] font-medium transition-all duration-500 ${i <= mockStep ? "text-white" : "text-white/40"}`}>{s}</span>
                  {i < 2 && <div className={`h-px w-4 transition-all duration-500 ${i < mockStep ? "bg-white/70" : "bg-white/15"}`} />}
                </div>
              ))}
            </div>
          </div>

          {/* Trust pills */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Shield, label: "Escrow", sub: "100% seguro" },
              { icon: Star, label: "Reputación", sub: "Verificada" },
              { icon: CheckCircle, label: "Disputas", sub: "Mediadas" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-2 text-center">
                <Icon size={16} className="text-[#818cf8] mx-auto mb-1" />
                <p className="text-white text-[10px] font-semibold">{label}</p>
                <p className="text-white/40 text-[9px]">{sub}</p>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-1.5 py-1">
            <div className="flex -space-x-1.5">
              {["#6366f1","#16A34A","#f59e0b","#ec4899"].map((c, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0f1035]" style={{ background: c }} />
              ))}
            </div>
            <p className="text-white/50 text-[11px]">+1.200 usuarios activos en Chile</p>
          </div>
        </div>
      </div>

      {/* CTA buttons */}
      <div className="px-6 pb-10 flex flex-col gap-3">
        <Button
          size="lg"
          onClick={() => navigate("/auth")}
          className="bg-white text-[#1F25C1] hover:bg-white/90 shadow-2xl text-base font-bold h-14 w-full rounded-2xl"
        >
          Iniciar Sesión
        </Button>
        <Button
          size="lg"
          onClick={() => navigate("/auth?tab=register")}
          className="bg-[#1F25C1] text-white hover:bg-[#1F25C1]/80 border border-white/20 h-14 w-full rounded-2xl text-base font-bold"
        >
          Crear Cuenta Gratis
        </Button>
        <button
          onClick={() => navigate("/guest")}
          className="text-white/40 text-sm font-medium py-2 text-center hover:text-white/70 transition-colors"
        >
          Explorar sin cuenta →
        </button>
        <p className="text-white/25 text-xs text-center -mt-1">Al continuar aceptas nuestros Términos y Condiciones</p>
      </div>
    </div>
  );
};

// ── Web landing ───────────────────────────────────────────────────────────────

const WebLanding = () => {
  const navigate = useNavigate();
  const [painRef,    painVisible]    = useReveal();
  const [howRef,     howVisible]     = useReveal();
  const [featRef,    featVisible]    = useReveal();
  const [demoRef,    demoVisible]    = useReveal();
  const [pricingRef, pricingVisible] = useReveal();
  const [testiRef,   testiVisible]   = useReveal();
  const [faqRef,     faqVisible]     = useReveal();
  const [ctaRef,     ctaVisible]     = useReveal();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Trado — Negocia Seguro con Escrow P2P | Chile</title>
        <meta name="description" content="Trado protege tu dinero en escrow hasta confirmar la entrega. Compra, vende y contrata servicios sin riesgos en Chile." />
        <link rel="canonical" href="https://trado.cl/" />
        <meta property="og:title" content="Trado — Negocia Seguro con Escrow P2P" />
        <meta property="og:description" content="Tu dinero protegido en escrow hasta confirmar la entrega. Sin estafas, sin riesgos." />
        <meta property="og:url" content="https://trado.cl/" />
        <script type="application/ld+json">{JSON.stringify(FAQ_JSON_LD)}</script>
      </Helmet>
      <ScrollProgress />

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo height={32} />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#como-funciona" className="hover:text-primary transition-colors">¿Cómo funciona?</a>
            <a href="#caracteristicas" className="hover:text-primary transition-colors">Características</a>
            <a href="#precios" className="hover:text-primary transition-colors">Comisión</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")} className="hidden sm:flex text-primary font-semibold">
              Iniciar Sesión
            </Button>
            <Button onClick={() => navigate("/auth")} className="bg-gradient-to-r from-primary to-info text-white shadow-md hover:opacity-95 transition-opacity">
              <span className="hidden sm:inline">Comenzar Gratis</span>
              <span className="sm:hidden">Comenzar</span>
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[hsl(238,72%,36%)] via-primary to-info py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fill-rule=evenodd%3E%3Cg fill=%23ffffff fill-opacity=0.04%3E%3Cpath d=M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />
        {/* Emerald glow blob */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-success/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">

            {/* Left: copy */}
            <div className="text-white space-y-8">
              <div className="hero-badge inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-2 text-sm font-medium backdrop-blur">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Transacciones seguras entre personas
              </div>

              <h1 className="hero-h1 text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
                Negocia seguro<br />
                <span className="text-white/70">sin miedo a las estafas</span>
              </h1>

              <p className="hero-sub text-xl text-white/80 max-w-lg leading-relaxed">
                Trado retiene tu dinero de forma segura hasta que confirmes que recibiste exactamente lo que acordaste. Productos, servicios y trabajos.
              </p>

              <div className="hero-cta flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={() => navigate("/auth")} className="bg-white text-primary hover:bg-white/90 shadow-2xl text-lg px-10 py-6 h-auto font-bold">
                  Empezar Ahora — Es Gratis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              <button className="hero-hint flex items-center gap-2 text-white/50 text-sm hover:text-white/80 transition-colors" onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}>
                <ChevronDown className="h-4 w-4 animate-bounce" />
                Seguir leyendo
              </button>
            </div>

            {/* Right: transaction card */}
            <div className="hidden lg:flex items-center justify-center">
              <TransactionCard />
            </div>
          </div>
        </div>
      </section>

      {/* ── Dolores ── */}
      <section className="py-20 bg-white">
        <div ref={painRef} className={`reveal ${painVisible ? "is-visible" : ""} container mx-auto px-4`}>
          <div className="text-center mb-14">
            <span className="text-red-500 font-semibold text-sm uppercase tracking-wider">¿Te ha pasado esto?</span>
            <h2 className="text-4xl font-bold text-foreground mt-2 mb-4">El problema que todos conocemos</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprar, vender o contratar servicios entre personas debería ser simple, pero la desconfianza lo complica todo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto mb-14">
            {[
              { emoji: "😰", title: "Pagué y nunca llegó el producto",            desc: "Transferiste el dinero, la otra persona desapareció y no hay forma de recuperar lo que pagaste." },
              { emoji: "📦", title: "Entregué primero y no me pagaron",           desc: "Enviaste el producto o completaste el encargo de buena fe y la otra parte dejó de responder. Perdiste tu trabajo y el dinero." },
              { emoji: "🔨", title: "Terminé el trabajo y no me pagaron lo acordado", desc: "Completaste el servicio al 100% y el cliente desapareció, te pagó menos o inventó excusas para no pagar." },
              { emoji: "🎭", title: "El producto no era lo que mostraban",        desc: "Llegó algo completamente distinto a las fotos, dañado o de menor calidad. Ya habías pagado y no hay vuelta atrás." },
            ].map(({ emoji, title, desc }, i) => (
              <div key={title} className="flex gap-4 p-6 bg-red-50 border border-red-100 rounded-2xl" style={{ transitionDelay: `${i * 100}ms` }}>
                <span className="text-3xl flex-shrink-0">{emoji}</span>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Emerald CTA box */}
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-success to-primary rounded-3xl p-8 text-center text-white shadow-xl">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-4">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <p className="text-2xl font-bold mb-3">Trado existe para que esto no vuelva a pasarte.</p>
            <p className="text-white/85">El dinero queda retenido hasta que ambas partes confirmen que todo salió bien. Sin riesgos, sin estafas.</p>
          </div>
        </div>
      </section>

      {/* ── Demo animada ── */}
      <section className="py-20 bg-gradient-to-b from-white to-muted/40">
        <div ref={demoRef} className={`reveal ${demoVisible ? "is-visible" : ""} container mx-auto px-4`}>
          <div className="text-center mb-12">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Trado en vivo</span>
            <h2 className="text-4xl font-bold text-foreground mt-2 mb-4">Mira Trado en acción</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Así protegemos cada transacción, paso a paso.
            </p>
          </div>
          <AnimatedFlowDemo />
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section id="como-funciona" className="py-20 bg-gradient-to-b from-muted/60 to-background">
        <div ref={howRef} className={`reveal ${howVisible ? "is-visible" : ""} container mx-auto px-4`}>
          <div className="text-center mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Simple y transparente</span>
            <h2 className="text-4xl font-bold text-foreground mt-2 mb-4">¿Cómo funciona Trado?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sirve para productos, envíos y servicios. Cualquiera puede crear la sala y acordar los términos antes de que el dinero se mueva.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 relative">
              {/* Connecting line */}
              <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-r from-primary/30 via-info/60 to-success/60" />

              {[
                { icon: Users,     step: "01", title: "Cualquiera crea la sala",  desc: "Cualquiera de las partes crea la sala, define lo acordado —producto, servicio o trabajo— y comparte el código de acceso.", color: "bg-primary/10 text-primary",  badge: "bg-primary" },
                { icon: Lock,      step: "02", title: "Se deposita el dinero",    desc: "El pagador ingresa a la sala y deposita el monto acordado. Trado lo retiene de forma segura hasta que todo esté listo.",   color: "bg-info/10 text-info",        badge: "bg-info" },
                { icon: Package,   step: "03", title: "Se cumple lo acordado",    desc: "Se entrega el producto, se hace el envío o se completa el servicio. El receptor revisa que todo corresponda.",             color: "bg-warning/10 text-warning",  badge: "bg-warning" },
                { icon: Handshake, step: "04", title: "Se libera el pago",        desc: "Una vez confirmado que todo está en orden, Trado libera el dinero a quien corresponde.",                                   color: "bg-success/10 text-success",  badge: "bg-success" },
              ].map(({ icon: Icon, step, title, desc, color, badge }, i) => (
                <div key={step} className="relative text-center group px-4" style={{ transitionDelay: `${i * 120}ms` }}>
                  <div className="flex justify-center mb-4">
                    <div className="relative z-10">
                      <div className={`w-16 h-16 ${color} bg-white border-2 border-border rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all group-hover:-translate-y-1`}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <span className={`absolute -top-2 -right-2 w-6 h-6 ${badge} text-white text-xs font-bold rounded-full flex items-center justify-center shadow`}>{step.slice(1)}</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-base text-foreground mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Características ── */}
      <section id="caracteristicas" className="py-20 bg-white">
        <div ref={featRef} className={`reveal ${featVisible ? "is-visible" : ""} container mx-auto px-4`}>
          <div className="text-center mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Por qué elegirnos</span>
            <h2 className="text-4xl font-bold text-foreground mt-2 mb-4">
              Todo lo que necesitas para{" "}
              <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">transaccionar seguro</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Shield, gradient: "from-success/10 to-emerald-50",
                border: "border-success/20", iconBg: "bg-success/10", iconColor: "text-success",
                title: "Escrow 100% Seguro",
                desc: "Tu dinero queda bloqueado en la plataforma. Quien recibe el pago no puede cobrarlo hasta que confirmes que se cumplió lo acordado.",
                items: ["Dinero protegido siempre", "Devolución si hay problemas", "Mediación por nuestro equipo"],
                check: "text-success",
              },
              {
                icon: Users, gradient: "from-primary/10 to-indigo-50",
                border: "border-primary/20", iconBg: "bg-primary/10", iconColor: "text-primary",
                title: "Reputación Verificada",
                desc: "Cada usuario tiene un historial de transacciones y calificaciones. Opera con confianza, sabiendo siempre con quién tratas.",
                items: ["Calificaciones reales", "Verificación de identidad", "Historial público"],
                check: "text-primary",
              },
              {
                icon: Clock, gradient: "from-info/10 to-violet-50",
                border: "border-info/20", iconBg: "bg-info/10", iconColor: "text-info",
                title: "Rápido y Sin Complicaciones",
                desc: "Crea una sala en segundos, comparte el código y empieza. Sin formularios interminables ni burocracia.",
                items: ["Sala lista en segundos", "Pago en 1-2 días hábiles", "App para iOS y Android"],
                check: "text-info",
              },
            ].map(({ icon: Icon, gradient, border, iconBg, iconColor, title, desc, items, check }, i) => (
              <div
                key={title}
                className={`bg-gradient-to-br ${gradient} rounded-2xl p-8 border ${border} shadow-lg hover:shadow-xl transition-all hover:-translate-y-1`}
                style={{ transitionDelay: `${i * 130}ms` }}
              >
                <div className={`p-3 ${iconBg} rounded-xl w-fit mb-5`}>
                  <Icon className={`h-7 w-7 ${iconColor}`} />
                </div>
                <h3 className="text-xl font-bold mb-3">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{desc}</p>
                <ul className="space-y-2">
                  {items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className={`h-4 w-4 ${check} flex-shrink-0`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Precios ── */}
      <section id="precios" className="py-20 bg-gradient-to-b from-muted/40 to-white">
        <div ref={pricingRef} className={`reveal ${pricingVisible ? "is-visible" : ""} container mx-auto px-4`}>
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Sin sorpresas</span>
            <h2 className="text-4xl font-bold text-foreground mt-2 mb-4">Precio simple y transparente</h2>
            <p className="text-muted-foreground text-lg mb-12">Sin suscripciones, sin costos fijos. Solo pagas al cerrar un trato.</p>

            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              {/* Gradient border effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-info to-success p-[2px] rounded-3xl" />
              <div className="relative bg-white rounded-3xl p-10">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-info text-white text-xs font-bold px-4 py-1.5 rounded-full mb-6">
                  ✦ Sin costos fijos
                </div>
                <div className="flex items-baseline justify-center gap-2 mb-3">
                  <span className="text-6xl font-extrabold bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">5%</span>
                  <span className="text-xl text-muted-foreground">por transacción</span>
                </div>
                <p className="text-muted-foreground mb-2">Solo pagas si cierras el trato</p>
                <p className="text-sm text-muted-foreground mb-8">Solo pagas cuando se cierra el trato. Sin suscripciones, sin costos ocultos.</p>
                <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                  {[
                    "Registro gratuito",
                    "Sin cuota mensual",
                    "Comisión solo al cerrar el trato",
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
                <Button size="lg" onClick={() => navigate("/auth")} className="w-full bg-gradient-to-r from-primary to-info text-white text-lg h-14 font-bold shadow-lg hover:opacity-95 transition-opacity">
                  Crear Cuenta Gratis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonios ── */}
      <section className="py-20 bg-white">
        <div ref={testiRef} className={`reveal ${testiVisible ? "is-visible" : ""} container mx-auto px-4`}>
          <div className="text-center mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Usuarios reales</span>
            <h2 className="text-4xl font-bold text-foreground mt-2 mb-4">Lo que dicen quienes ya usan Trado</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { initials: "MC", name: "María Contreras", gradient: "from-success to-primary",    text: "Compré un notebook usado y me lo enviaron sin problemas. El dinero estuvo seguro hasta que confirmé que todo estaba perfecto. Nunca más transacciono sin Trado." },
              { initials: "JR", name: "Juan Rodríguez",  gradient: "from-primary to-info",       text: "Como el que entrega primero, Trado me da mucha confianza. Quien paga deposita antes y yo puedo actuar tranquilo sabiendo que el pago está asegurado. Excelente plataforma." },
              { initials: "AP", name: "Andrea Pizarro",  gradient: "from-info to-success",       text: "Cerré un trato en un día. El sistema es super intuitivo y la otra parte quedó muy satisfecha. Ya hice 5 transacciones y todas perfectas." },
            ].map(({ initials, name, gradient, text }, i) => (
              <div
                key={name}
                className="bg-white rounded-2xl p-8 border border-border shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className="h-4 w-4 fill-warning text-warning" />)}
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

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 bg-gradient-to-b from-muted/40 to-white">
        <div ref={faqRef} className={`reveal ${faqVisible ? "is-visible" : ""} container mx-auto px-4`}>
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">Dudas frecuentes</span>
              <h2 className="text-4xl font-bold text-foreground mt-2 mb-4">Preguntas Frecuentes</h2>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {FAQ_ITEMS.map(({ q, a }) => (
                <AccordionItem key={q} value={q} className="bg-white rounded-xl border border-border/60 px-6">
                  <AccordionTrigger className="text-foreground hover:text-primary text-left font-medium">{q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(238,72%,36%)] via-primary to-info" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-success/25 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-info/30 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />
        <div ref={ctaRef} className={`reveal ${ctaVisible ? "is-visible" : ""} container mx-auto px-4 text-center relative`}>
          <div className="max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-2 text-sm font-medium text-white backdrop-blur mb-6">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Gratis para empezar
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">¿Listo para hacer tratos sin riesgos?</h2>
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

      {/* ── Footer ── */}
      <footer className="bg-[hsl(235,25%,10%)] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Logo variant="white" height={28} />
              </div>
              <p className="text-white/60 text-sm max-w-xs leading-relaxed">
                La plataforma escrow más segura de Chile. Productos, servicios y trabajos, siempre con total tranquilidad.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-3 text-white/80 text-sm uppercase tracking-wider">Plataforma</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li><button onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors">¿Cómo funciona?</button></li>
                <li><button onClick={() => document.getElementById("precios")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors">Precios</button></li>
                <li><button onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors">FAQ</button></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3 text-white/80 text-sm uppercase tracking-wider">Legal</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li><button onClick={() => window.location.href = "/terms"} className="hover:text-white transition-colors">Términos y Condiciones</button></li>
                <li><button onClick={() => window.location.href = "/privacy"} className="hover:text-white transition-colors">Política de Privacidad</button></li>
                <li><a href="mailto:contacto@trado.cl" className="hover:text-white transition-colors">contacto@trado.cl</a></li>
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

// ── Entry point ───────────────────────────────────────────────────────────────

const Index = () => {
  useAuthHashRedirect();
  return Capacitor.isNativePlatform() ? <AppLanding /> : <WebLanding />;
};

export default Index;
