import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Shield, ArrowRight, Star, CheckCircle, Lock, ChevronDown, Gift, MessageSquareWarning, Scale, BadgeCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Capacitor } from "@capacitor/core";
import { SalaEnVivo } from "@/components/landing/SalaEnVivo";
import { Casos } from "@/components/landing/Casos";
import { CuantoVale } from "@/components/landing/CuantoVale";
import { formatCLP, PRIMERA_SALA_GRATIS_HASTA } from "@/lib/utils";
import { OFFER_TRANSFER_AT } from "@/lib/trado-bank";
import { APPEAL_NEGOTIATION_HOURS, REVIEW_HOURS, UNVERIFIED_LIMITS } from "@/lib/escrow";

// Lo que se afirma acá sale del código (comisión: calculateFee; plazos: REVIEW_HOURS;
// límites: UNVERIFIED_LIMITS). Si cambia allá, cambia acá. También alimenta el JSON-LD de Google.
const FAQ_ITEMS = [
  { q: "¿Cómo funciona Trado?", a: "Creas una sala con lo que se vende y el precio, y compartes el link con la otra persona. Quien paga deposita en Trado y la plata queda retenida. Quien entrega cumple lo acordado, y cuando el que pagó confirma que todo está bien, se libera el pago. Si algo no calza, se reporta y la plata no se mueve hasta resolverlo." },
  { q: "¿Trado es un marketplace?", a: "No. Sigues comprando y vendiendo donde ya lo haces: Instagram, WhatsApp, Facebook o en persona. Trado sólo se pone al medio del pago para que ninguno tenga que confiar en el otro." },
  { q: "¿Cuánto cobra Trado?", a: `Con tarjeta, un 5% del monto. Con transferencia (desde $${formatCLP(OFFER_TRANSFER_AT)}) baja por tramos: 3,5% hasta $400.000, 3% hasta $1.150.000 y 2,5% sobre eso. El mínimo es $1.000. La paga quien crea la sala, sólo si el trato se concreta, y tu primera sala va sin comisión hasta $${formatCLP(PRIMERA_SALA_GRATIS_HASTA)}. Crear la cuenta es gratis.` },
  { q: "¿Por qué la transferencia sale más barata que la tarjeta?", a: "Porque al pagar con tarjeta el procesador de pagos se lleva una parte, y esa la asumimos nosotros. Por transferencia ese costo no existe y te lo traspasamos. En una operación de $2.000.000, la diferencia son más de $40.000 a tu favor." },
  { q: "¿Cuánto tiempo tengo para revisar lo que recibí?", a: `Depende del tipo de venta: ${REVIEW_HOURS.producto_envio} horas en productos con envío (desde que lo marcas como recibido) y ${REVIEW_HOURS.servicio} horas en servicios y productos digitales (desde que el otro marca la entrega). En persona, revisas ahí mismo y confirmas desde el celular.` },
  { q: "¿Qué pasa si el producto o servicio no corresponde a lo acordado?", a: `Lo reportas antes de confirmar y la plata sigue retenida. Las dos partes tienen ${APPEAL_NEGOTIATION_HOURS} horas para ponerse de acuerdo, y si no, el equipo de Trado revisa las pruebas de ambos y decide.` },
  { q: "¿Cuándo me llega la plata si soy el que vende?", a: "Cuando el comprador confirma, el pago queda en tu billetera Trado. Desde ahí pides el retiro y nuestro equipo lo transfiere a tu cuenta bancaria en horario hábil. La cuenta tiene que estar a tu nombre (mismo RUT)." },
  { q: "¿Necesito verificar mi identidad?", a: `No para empezar: sin verificar puedes mover hasta $${formatCLP(UNVERIFIED_LIMITS.PER_TRANSACTION)} por sala y $${formatCLP(UNVERIFIED_LIMITS.TOTAL_ACCUMULATED)} en total. Para montos mayores verificas con tu carnet y una selfie.` },
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
            <span className="text-[#818cf8]">seguro</span>
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
              { icon: Shield, label: "Escrow", sub: "Plata retenida" },
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

const Seccion = ({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) => {
  const [ref, visible] = useReveal();
  return (
    <section id={id} className={`py-16 md:py-24 scroll-mt-16 ${className}`}>
      <div ref={ref} className={`reveal ${visible ? "is-visible" : ""} container mx-auto px-4`}>
        {children}
      </div>
    </section>
  );
};

const Titulo = ({ eyebrow, titulo, bajada }: { eyebrow: string; titulo: string; bajada?: string }) => (
  <div className="text-center mb-10 md:mb-14 max-w-2xl mx-auto">
    <span className="text-primary font-semibold text-sm uppercase tracking-wider">{eyebrow}</span>
    <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mt-2 tracking-tight">{titulo}</h2>
    {bajada && <p className="text-lg text-muted-foreground mt-3">{bajada}</p>}
  </div>
);

const WebLanding = () => {
  const navigate = useNavigate();
  const empezar = () => navigate("/auth?tab=register");
  const verComo = () => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Trado — Compra y vende sin confiar en un desconocido | Chile</title>
        <meta name="description" content="Trado retiene la plata hasta que recibes lo acordado. Compra, vende y cobra trabajos por Instagram, WhatsApp o en persona sin tener que confiar en el otro. Cuenta gratis y tu primera sala sin comisión." />
        <link rel="canonical" href="https://trado.cl/" />
        <meta property="og:title" content="Trado — Compra y vende sin confiar en un desconocido" />
        <meta property="og:description" content="La plata queda retenida en Trado hasta que recibes lo acordado. Cuenta gratis y tu primera sala sin comisión." />
        <meta property="og:url" content="https://trado.cl/" />
        <script type="application/ld+json">{JSON.stringify(FAQ_JSON_LD)}</script>
      </Helmet>
      <ScrollProgress />

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo height={32} />
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#como-funciona" className="hover:text-primary transition-colors">¿Cómo funciona?</a>
            <a href="#si-algo-sale-mal" className="hover:text-primary transition-colors">Si algo sale mal</a>
            <a href="#precios" className="hover:text-primary transition-colors">Comisión</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")} className="hidden sm:flex text-primary font-semibold">
              Iniciar Sesión
            </Button>
            <Button onClick={empezar} className="bg-gradient-to-r from-primary to-info text-white shadow-md hover:opacity-95 transition-opacity">
              <span className="hidden sm:inline">Crear cuenta gratis</span>
              <span className="sm:hidden">Comenzar</span>
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero: la promesa y la sala andando ── */}
      <section className="bg-gradient-to-br from-[hsl(238,72%,30%)] via-primary to-info pt-14 pb-16 md:py-28 relative overflow-hidden">
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-success/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center max-w-6xl mx-auto">
            <div className="text-white space-y-6">
              <div className="hero-badge inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-2 text-sm font-medium backdrop-blur">
                <Lock className="h-4 w-4 text-emerald-300" />
                Pago protegido entre personas, en Chile
              </div>
              <h1 className="hero-h1 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
                Compra y vende sin tener que{" "}
                <span className="text-emerald-300">confiar en un desconocido.</span>
              </h1>
              <p className="hero-sub text-lg md:text-xl text-white/85 max-w-lg leading-relaxed">
                Pagas en Trado, la plata queda retenida y recién se libera cuando recibes lo acordado. Sigues comprando
                y vendiendo donde ya lo haces.
              </p>
              <div className="hero-cta space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button size="lg" onClick={empezar} className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 shadow-2xl text-lg px-10 py-6 h-auto font-bold">
                    Crear mi sala gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  {/* Para quien llega porque la otra persona ya creó la sala y le pasó el código */}
                  <Button size="lg" variant="outline" onClick={() => navigate("/join-transaction")} className="w-full sm:w-auto bg-transparent border-white/50 text-white hover:bg-white/10 hover:text-white text-lg px-8 py-6 h-auto font-semibold">
                    Ya tengo un código
                  </Button>
                </div>
                <p className="flex items-center gap-2 text-sm text-white/80">
                  <Gift className="h-4 w-4 text-emerald-300" />
                  Cuenta gratis · tu primera sala sin comisión
                </p>
              </div>
              <button className="hero-hint flex items-center gap-2 text-white/60 text-sm hover:text-white transition-colors" onClick={verComo}>
                <ChevronDown className="h-4 w-4 animate-bounce" />
                Elige tu caso y mira cómo funciona
              </button>
            </div>
            <div className="hero-card">
              <SalaEnVivo />
            </div>
          </div>
        </div>
      </section>

      {/* ── No es un marketplace ── */}
      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 text-center">
          <p className="text-sm font-semibold text-muted-foreground">Trado no es un marketplace. Lo usas donde ya estás:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Instagram", "WhatsApp", "Facebook", "En persona"].map((x) => (
              <span key={x} className="text-sm font-semibold px-3 py-1 rounded-full bg-muted text-foreground">{x}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Casos ── */}
      <Seccion id="como-funciona" className="bg-gradient-to-b from-muted/50 to-background">
        <Titulo
          eyebrow="¿Qué vas a hacer?"
          titulo="Elige tu caso y mira cómo te protege"
          bajada="Cada tipo de trato tiene sus pasos. Estos son los mismos que vas a ver en la app."
        />
        <Casos onEmpezar={empezar} />
      </Seccion>

      {/* ── Si algo sale mal ── */}
      <Seccion id="si-algo-sale-mal" className="bg-white">
        <Titulo
          eyebrow="Si algo sale mal"
          titulo="La plata no se mueve hasta que se resuelva"
          bajada="Si no te llegó o no es lo acordado, lo reportas antes de confirmar. Así sigue:"
        />
        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {[
            { icon: MessageSquareWarning, titulo: "Lo reportas", texto: "«No llegó», «distinto a lo acordado», «con fallas» o «servicio no realizado». La plata sigue retenida." },
            { icon: Scale, titulo: `${APPEAL_NEGOTIATION_HOURS} horas para acordar`, texto: "Las dos partes conversan en la sala y pueden llegar a un acuerdo: devolución total, parcial o seguir adelante." },
            { icon: BadgeCheck, titulo: "Si no, decide el equipo", texto: "El equipo de Trado revisa las pruebas de ambos (fotos, chat, seguimiento) y resuelve a quién va la plata." },
          ].map(({ icon: Icon, titulo, texto }, i) => (
            <div key={titulo} className="relative rounded-3xl border border-border bg-gradient-to-br from-white to-muted/40 p-6 shadow-lg">
              <span className="absolute top-5 right-5 text-5xl font-black text-primary/10">{i + 1}</span>
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg mb-1.5">{titulo}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{texto}</p>
            </div>
          ))}
        </div>
      </Seccion>

      {/* ── Comisión ── */}
      <Seccion id="precios" className="bg-gradient-to-b from-muted/40 to-white">
        <Titulo
          eyebrow="Haz la cuenta"
          titulo="¿Cuánto te cuesta que salga mal?"
          bajada="Una estafa te cuesta el 100 %. Protegerte cuesta mucho menos, y tu primera sala no cuesta nada."
        />
        <CuantoVale />
        <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-3xl mx-auto">
          {[
            "Crear la cuenta es gratis",
            "Sin mensualidad",
            "Tarjeta o transferencia",
            `Sin verificar: hasta $${formatCLP(UNVERIFIED_LIMITS.PER_TRANSACTION)} por sala`,
            "Retiro a tu cuenta bancaria",
          ].map((x) => (
            <span key={x} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-white border border-border">
              <CheckCircle className="h-4 w-4 text-success" /> {x}
            </span>
          ))}
        </div>
      </Seccion>

      {/* ── FAQ ── */}
      <Seccion id="faq" className="bg-white">
        <div className="max-w-3xl mx-auto">
          <Titulo eyebrow="Dudas frecuentes" titulo="Preguntas frecuentes" />
          <Accordion type="single" collapsible className="space-y-3">
            {FAQ_ITEMS.map(({ q, a }) => (
              <AccordionItem key={q} value={q} className="bg-white rounded-xl border border-border/60 px-6">
                <AccordionTrigger className="text-foreground hover:text-primary text-left font-medium">{q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Seccion>

      {/* ── CTA Final ── */}
      <section className="relative overflow-hidden py-20 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(238,72%,30%)] via-primary to-info" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-success/25 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 text-center relative">
          <div className="max-w-2xl mx-auto">
            <Shield className="h-10 w-10 text-white/80 mx-auto mb-5" />
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">¿Tienes un trato pendiente?</h2>
            <p className="text-white/85 text-lg mb-8">
              Crea la sala, mándale el link a la otra persona y que la plata espere en Trado hasta que todo esté bien.
            </p>
            <Button size="lg" onClick={empezar} className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 shadow-2xl text-lg px-12 py-6 h-auto font-bold">
              Crear mi sala gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-white/70 text-sm mt-4">Tu primera sala va sin comisión, hasta ${formatCLP(PRIMERA_SALA_GRATIS_HASTA)}.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[hsl(235,25%,10%)] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Logo variant="white" height={28} />
              <p className="text-white/60 text-sm max-w-xs leading-relaxed mt-3">
                Pago protegido para compras, ventas y trabajos entre personas en Chile.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-3 text-white/80 text-sm uppercase tracking-wider">Plataforma</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="#como-funciona" className="hover:text-white transition-colors">¿Cómo funciona?</a></li>
                <li><a href="#precios" className="hover:text-white transition-colors">Comisión</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3 text-white/80 text-sm uppercase tracking-wider">Legal</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="/terms" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Política de Privacidad</a></li>
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
