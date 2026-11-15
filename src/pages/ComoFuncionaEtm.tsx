import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { CheckCheck, CheckCircle2, Heart, Link2, Lock, MessageCircle, Package, ShieldCheck, Store, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { formatCLP } from "@/lib/utils";

// Explicación animada para la laptop del stand del EtMday (y para grabar como video): cómo una
// venta que ya está en Instagram, Marketplace o WhatsApp pasa a Trado. Lo que más cuesta
// entender es que en Trado no se publica nada: se acuerda donde siempre y, al momento de
// pagar, uno crea la sala y le manda el link por el mismo chat. Se repite sola y va sin sonido
// (el contrato prohíbe música y micrófono en el stand).

const DEGRADADO = "bg-gradient-to-br from-[#2230C2] via-[#4B35D6] via-55% to-[#7C3AED]";
const PRODUCTO = "Bicicleta de ruta";
const MONTO = 180_000;

type Paso = { titulo: string; texto: string; ms: number };
const PASOS: Paso[] = [
  { titulo: "Lo encuentras donde siempre", texto: "Instagram, Marketplace, WhatsApp o un amigo. Trado no es un marketplace: no publicas nada en Trado.", ms: 4200 },
  { titulo: "Acuerdan el precio en el chat", texto: "Conversan como siempre. Cuando toca pagar, le propones hacerlo por Trado.", ms: 5200 },
  { titulo: "Uno crea la sala y manda el link", texto: "Qué se vende y en cuánto: un minuto. El link se manda por el mismo chat.", ms: 7600 },
  { titulo: "El que compra paga en Trado", texto: "La plata no le llega al vendedor: queda retenida. Los dos ven «Pago retenido».", ms: 4800 },
  { titulo: "Se entrega lo acordado", texto: "En persona, por envío o digital. El que compra revisa.", ms: 4200 },
  { titulo: "Se confirma y se libera", texto: "Recién ahí le llega la plata al vendedor. Si algo no calza, se reporta y la plata no se mueve.", ms: 5000 },
];

const reducido = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ── Lo que se ve en el celular en cada paso ──
const Publicacion = () => (
  <div className="flex-1 bg-white flex flex-col">
    <div className="px-4 py-3 flex items-center gap-2 border-b border-black/5">
      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-amber-300" />
      <span className="text-sm font-semibold text-[#0F1424]">vendo_cosas_stgo</span>
      <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-black/40">Publicación</span>
    </div>
    <div className="h-52 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-7xl chat-pop">🚲</div>
    <div className="px-4 py-3 text-[#0F1424]">
      <div className="flex gap-3 text-black/60"><Heart className="h-5 w-5" /><MessageCircle className="h-5 w-5" /></div>
      <p className="font-bold mt-2">{PRODUCTO} · ${formatCLP(MONTO)}</p>
      <p className="text-sm text-black/60">Talla M, muy poco uso. Escríbeme por interno 🙌</p>
    </div>
    <div className="mt-auto m-3 rounded-xl bg-[#2230C2]/10 text-[#2230C2] text-xs font-semibold px-3 py-2 text-center">
      Esto está en Instagram, no en Trado
    </div>
  </div>
);

const Burbuja = ({ mio, children, delay }: { mio?: boolean; children: React.ReactNode; delay: number }) => (
  <div
    className={`chat-pop max-w-[85%] text-[13px] leading-snug px-3 py-2 shadow-sm text-[#0F1424] ${mio ? "self-end bg-[#dcf8c6] rounded-2xl rounded-br-md" : "self-start bg-white rounded-2xl rounded-bl-md"}`}
    style={{ animationDelay: `${delay}s` }}
  >
    {children}
    {mio && <CheckCheck className="inline h-3.5 w-3.5 ml-1 -mt-0.5 text-sky-500" />}
  </div>
);

const Chat = ({ conLink }: { conLink: boolean }) => (
  <div className="flex-1 bg-[#ece5dd] flex flex-col">
    <div className={`${DEGRADADO} text-white px-4 py-3 flex items-center gap-2.5`}>
      <span className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center font-bold text-sm">V</span>
      <div className="leading-tight"><p className="text-sm font-semibold">Vendedor</p><p className="text-[10px] text-white/70">en línea</p></div>
    </div>
    <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
      {!conLink ? (
        <>
          <Burbuja mio delay={0.2}>Hola! ¿Sigue disponible la bici?</Burbuja>
          <Burbuja delay={1.1}>Sí! Está impecable 👌</Burbuja>
          <Burbuja mio delay={2.1}>¿Te parece si lo hacemos por Trado? La plata queda retenida hasta que me la entregues</Burbuja>
          <Burbuja delay={3.4}>Dale, mándame el link 👍</Burbuja>
        </>
      ) : (
        <>
          <Burbuja mio delay={0}>¿Te parece si lo hacemos por Trado?</Burbuja>
          <Burbuja delay={0}>Dale, mándame el link 👍</Burbuja>
          <div className="chat-pop self-end max-w-[88%] bg-[#dcf8c6] rounded-2xl rounded-br-md p-1.5 shadow-sm" style={{ animationDelay: "0.5s" }}>
            <div className="rounded-xl bg-white overflow-hidden">
              <div className={`${DEGRADADO} text-white px-3 py-2.5`}>
                <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Sala protegida</p>
                <p className="font-bold text-sm">{PRODUCTO} · ${formatCLP(MONTO)}</p>
              </div>
              <p className="px-3 py-2 text-[12px] text-[#2230C2] font-semibold flex items-center gap-1"><Link2 className="h-3.5 w-3.5" /> trado.cl · únete a la sala</p>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
);

const CrearSala = () => (
  <div className="flex-1 bg-white flex flex-col p-4 text-[#0F1424] relative">
    <Logo height={22} />
    <p className="text-[11px] font-bold uppercase tracking-wider text-[#2230C2] mt-4">Nueva sala</p>
    <div className="mt-3 space-y-2.5">
      <div className="rounded-xl border border-black/10 px-3 py-2.5">
        <p className="text-[10px] text-black/50">¿Qué se vende?</p>
        <p className="font-semibold escribe" style={{ animationDelay: "0.3s" }}>{PRODUCTO}</p>
      </div>
      <div className="rounded-xl border border-black/10 px-3 py-2.5">
        <p className="text-[10px] text-black/50">¿En cuánto?</p>
        <p className="font-semibold escribe" style={{ animationDelay: "1.2s" }}>${formatCLP(MONTO)}</p>
      </div>
    </div>
    <div className="chat-pop mt-4 rounded-xl bg-[#2230C2] text-white font-bold text-center py-3 text-sm" style={{ animationDelay: "2s" }}>Crear sala</div>
    <div className="chat-pop mt-3 rounded-xl border-2 border-dashed border-[#2230C2]/40 bg-[#2230C2]/5 p-3 text-center" style={{ animationDelay: "2.6s" }}>
      <p className="text-xs font-bold text-[#2230C2] flex items-center justify-center gap-1"><Link2 className="h-3.5 w-3.5" /> Link listo para compartir</p>
      <p className="text-[11px] text-black/55 mt-0.5">Mándalo por el mismo chat 👆</p>
    </div>
  </div>
);

const Sala = ({ estado }: { estado: "retenido" | "entrega" | "liberado" }) => {
  const plata = estado === "liberado" ? 2 : 1;
  const pos = ["10%", "50%", "90%"];
  return (
    <div className={`flex-1 ${DEGRADADO} text-white flex flex-col p-4`}>
      <div className="flex items-center justify-between">
        <Logo variant="white" height={20} />
        <span className="text-[10px] font-bold bg-white/15 rounded-full px-2 py-0.5">Sala {PRODUCTO.split(" ")[0]}</span>
      </div>
      <p className="font-bold mt-3">{PRODUCTO} · ${formatCLP(MONTO)}</p>
      <div className="relative h-28 mt-4">
        <div className="absolute top-8 left-[10%] right-[10%] h-[2px] bg-white/25" />
        {[{ i: User, l: "Compra" }, { i: Lock, l: "Trado" }, { i: Store, l: "Vende" }].map(({ i: Icon, l }, k) => (
          <div key={l} className="absolute top-2 -translate-x-1/2 flex flex-col items-center" style={{ left: pos[k] }}>
            <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${l === "Trado" ? "bg-white text-[#2230C2]" : "bg-white/15 border border-white/25"}`}><Icon className="h-5 w-5" /></span>
            <span className="text-[10px] mt-1 text-white/80">{l}</span>
          </div>
        ))}
        <span className="absolute -top-1 -translate-x-1/2 transition-[left] duration-1000 ease-out text-[10px] font-bold bg-white text-[#2230C2] px-2 py-0.5 rounded-full shadow" style={{ left: pos[plata] }}>
          ${formatCLP(MONTO)}
        </span>
        {estado !== "retenido" && (
          <Package className="absolute top-[78px] -translate-x-1/2 h-5 w-5 text-amber-200 transition-[left] duration-1000" style={{ left: "10%" }} />
        )}
      </div>
      {/* En qué va la sala */}
      <div className="mt-3 space-y-2">
        {[
          { t: "Pago retenido en Trado", hecho: true },
          { t: "Entrega de lo acordado", hecho: estado !== "retenido" },
          { t: "Confirmación y pago liberado", hecho: estado === "liberado" },
        ].map(({ t, hecho }) => (
          <div key={t} className={`flex items-center gap-2 text-[13px] rounded-xl px-3 py-2 ${hecho ? "bg-white/15" : "bg-white/5 text-white/55"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${hecho ? "bg-white text-[#2230C2]" : "border border-white/40"}`}>{hecho ? "✓" : ""}</span>
            {t}
          </div>
        ))}
      </div>
      <div className="chat-pop mt-auto rounded-2xl bg-white/10 border border-white/20 p-3" key={estado}>
        <p className="font-bold flex items-center gap-2">
          {estado === "liberado" ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {estado === "retenido" ? "Pago retenido" : estado === "entrega" ? "Entregado: revisando" : "Pago liberado"}
        </p>
        <p className="text-xs text-white/75 mt-1">
          {estado === "retenido" ? "La plata espera en Trado, no en la cuenta del vendedor." : estado === "entrega" ? "Si algo no calza, se reporta y la plata no se mueve." : "El vendedor recibe su plata. Todo cumplido."}
        </p>
      </div>
    </div>
  );
};

const PantallaDelPaso = ({ i }: { i: number }) =>
  i === 0 ? <Publicacion /> : i === 1 ? <Chat conLink={false} /> : i === 2 ? (
    <div className="flex-1 flex flex-col"><CrearSalaYLink /></div>
  ) : i === 3 ? <Sala estado="retenido" /> : i === 4 ? <Sala estado="entrega" /> : <Sala estado="liberado" />;

// Paso 3: primero se arma la sala y después aparece el link en el chat
const CrearSalaYLink = () => {
  const [enChat, setEnChat] = useState(false);
  useEffect(() => { const t = setTimeout(() => setEnChat(true), 3600); return () => clearTimeout(t); }, []);
  return enChat ? <Chat conLink /> : <CrearSala />;
};

const ComoFuncionaEtm = () => {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reducido()) return;
    const t = setTimeout(() => setI((x) => (x + 1) % PASOS.length), PASOS[i].ms);
    return () => clearTimeout(t);
  }, [i]);

  return (
    <div className={`min-h-[100dvh] ${DEGRADADO} text-white overflow-hidden relative`}>
      <Helmet>
        <title>Cómo funciona · Trado</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="absolute -top-32 -right-32 w-[34rem] h-[34rem] bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-32 w-[34rem] h-[34rem] bg-[#7C3AED]/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative min-h-[100dvh] max-w-6xl mx-auto px-6 py-8 lg:px-12 flex flex-col">
        <div className="flex items-center justify-between">
          <Logo variant="white" height={34} />
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider border border-white/50 rounded-full px-3 py-1">No somos un marketplace</span>
        </div>

        <div className="flex-1 grid lg:grid-cols-[1fr_340px] gap-8 lg:gap-14 items-center mt-6">
          {/* Los pasos, con el actual destacado */}
          <div className="order-2 lg:order-1">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">
              ¿Cómo paso mi venta a Trado?
            </h1>
            <p className="text-white/80 text-lg mt-3 max-w-xl">Sigues comprando y vendiendo donde ya lo haces. Trado solo entra cuando toca pagar.</p>
            <ol className="mt-6 space-y-2.5">
              {PASOS.map((p, k) => (
                <li
                  key={p.titulo}
                  className={`rounded-2xl px-4 py-3 transition-all duration-500 ${k === i ? "bg-white text-[#0F1424] shadow-2xl scale-[1.02]" : "bg-white/0 text-white/60"}`}
                >
                  <p className="font-extrabold flex items-center gap-3">
                    <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm ${k === i ? "bg-[#2230C2] text-white" : k < i ? "bg-white/25 text-white" : "border border-white/40"}`}>
                      {k < i ? "✓" : k + 1}
                    </span>
                    {p.titulo}
                  </p>
                  {k === i && <p className="text-sm text-[#0F1424]/75 mt-1 ml-10 chat-pop">{p.texto}</p>}
                </li>
              ))}
            </ol>
          </div>

          {/* El celular */}
          <div className="order-1 lg:order-2 mx-auto w-full max-w-[300px]">
            <div className="rounded-[2.6rem] bg-[#0F1424] p-2.5 shadow-[0_30px_80px_-20px_rgba(15,20,36,0.7)] ring-1 ring-white/10">
              <div className="rounded-[2.1rem] overflow-hidden h-[520px] flex flex-col bg-white" key={i}>
                <PantallaDelPaso i={i} />
              </div>
            </div>
            {/* En el celular la lista queda abajo: el paso actual va bajo la animación */}
            <div key={`t-${i}`} className="lg:hidden chat-pop mt-4 rounded-2xl bg-white text-[#0F1424] px-4 py-3 shadow-xl">
              <p className="font-extrabold">{i + 1}. {PASOS[i].titulo}</p>
              <p className="text-sm text-[#0F1424]/75 mt-0.5">{PASOS[i].texto}</p>
            </div>
            <div className="flex gap-1.5 mt-4 justify-center">
              {PASOS.map((p, k) => (
                <button key={p.titulo} aria-label={p.titulo} onClick={() => setI(k)} className={`h-1.5 rounded-full transition-all ${k === i ? "w-8 bg-white" : "w-3 bg-white/35"}`} />
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-white/75 text-sm mt-6">Crea tu cuenta gratis en <b className="text-white">trado.cl</b> · tu primera sala va sin comisión</p>
      </div>
    </div>
  );
};

export default ComoFuncionaEtm;
