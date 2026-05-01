// Temporary logo preview page — delete after choosing

const ids = {
  A1: "pv-a1", A2: "pv-a2", B1: "pv-b1", B2: "pv-b2",
  C1: "pv-c1", C2: "pv-c2", D1: "pv-d1", D2: "pv-d2",
  E1: "pv-e1", E2: "pv-e2", F1: "pv-f1", F2: "pv-f2",
};

/* ── Option A: current — T bar + emerald stem ─────────────────────────────── */
const LogoA = ({ size = 80, id = "a" }: { size?: number; id?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#3340d8" />
        <stop offset="100%" stopColor="#7147d4" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="10" fill={`url(#bg-${id})`} />
    <rect x="17" y="14" width="6" height="18" rx="3" fill="#0fba7c" />
    <rect x="7.5" y="10" width="25" height="7" rx="3.5" fill="white" />
    <circle cx="20" cy="13.5" r="2.5" fill="#0fba7c" opacity="0.55" />
  </svg>
);

/* ── Option B: shield checkmark ──────────────────────────────────────────── */
const LogoB = ({ size = 80, id = "b" }: { size?: number; id?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#3340d8" />
        <stop offset="100%" stopColor="#7147d4" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="10" fill={`url(#bg-${id})`} />
    {/* Shield */}
    <path d="M20 7 L32 12 V22 C32 29.5 20 35 20 35 C20 35 8 29.5 8 22 V12 Z"
          fill="white" fillOpacity="0.18" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
    {/* Checkmark emerald */}
    <path d="M14 21 L19 26 L27 15"
          stroke="#0fba7c" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Option C: two nodes + lock (escrow concept) ─────────────────────────── */
const LogoC = ({ size = 80, id = "c" }: { size?: number; id?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#0b7a52" />
        <stop offset="100%" stopColor="#3340d8" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="10" fill={`url(#bg-${id})`} />
    {/* Left circle node */}
    <circle cx="10" cy="20" r="5" fill="white" fillOpacity="0.9" />
    {/* Right circle node */}
    <circle cx="30" cy="20" r="5" fill="white" fillOpacity="0.9" />
    {/* Connecting line */}
    <line x1="15" y1="20" x2="25" y2="20" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="2 2" />
    {/* Center lock */}
    <rect x="16.5" y="18" width="7" height="6" rx="1.5" fill="white" />
    <path d="M18 18 V16 C18 14.34 22 14.34 22 16 V18" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <circle cx="20" cy="21" r="1" fill="#0fba7c" />
  </svg>
);

/* ── Option D: bold T, no background, gradient letterform ─────────────────── */
const LogoD = ({ size = 80, id = "d" }: { size?: number; id?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id={`t-${id}`} x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#3340d8" />
        <stop offset="60%"  stopColor="#7147d4" />
        <stop offset="100%" stopColor="#0fba7c" />
      </linearGradient>
    </defs>
    {/* T horizontal bar */}
    <rect x="4" y="8" width="32" height="9" rx="4.5" fill={`url(#t-${id})`} />
    {/* T vertical stem */}
    <rect x="15.5" y="8" width="9" height="26" rx="4.5" fill={`url(#t-${id})`} />
    {/* Diamond at bottom of stem */}
    <path d="M20 36 L17 32 L20 28 L23 32 Z" fill="#0fba7c" />
  </svg>
);

/* ── Option E: overlapping circles Venn + T ──────────────────────────────── */
const LogoE = ({ size = 80, id = "e" }: { size?: number; id?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#0f172a" />
        <stop offset="100%" stopColor="#1e1b4b" />
      </linearGradient>
      <clipPath id={`clip-${id}`}>
        <rect width="40" height="40" rx="10" />
      </clipPath>
    </defs>
    <rect width="40" height="40" rx="10" fill={`url(#bg-${id})`} />
    {/* Left circle: indigo */}
    <circle cx="16" cy="20" r="12" fill="#3340d8" fillOpacity="0.8" clipPath={`url(#clip-${id})`} />
    {/* Right circle: emerald */}
    <circle cx="24" cy="20" r="12" fill="#0fba7c" fillOpacity="0.7" clipPath={`url(#clip-${id})`} />
    {/* T in center overlap */}
    <rect x="17.5" y="13" width="5" height="3.5" rx="1.5" fill="white" />
    <rect x="19" y="13" width="2" height="13" rx="1" fill="white" />
  </svg>
);

/* ── Option F: circle with gradient + bold T ─────────────────────────────── */
const LogoF = ({ size = 80, id = "f" }: { size?: number; id?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#3340d8" />
        <stop offset="50%"  stopColor="#5b21b6" />
        <stop offset="100%" stopColor="#0fba7c" />
      </linearGradient>
    </defs>
    {/* Circle background */}
    <circle cx="20" cy="20" r="20" fill={`url(#bg-${id})`} />
    {/* Bold T white */}
    <rect x="9" y="12" width="22" height="6" rx="3" fill="white" />
    <rect x="17" y="12" width="6" height="18" rx="3" fill="white" fillOpacity="0.9" />
    {/* Emerald dot accent */}
    <circle cx="20" cy="30" r="2.5" fill="#0fba7c" />
  </svg>
);

/* ── Preview page ──────────────────────────────────────────────────────────── */

const logos = [
  {
    id: "A",
    name: "T Bicolor",
    desc: "El actual. Cuadrado índigo→violeta, barra blanca y tallo esmeralda.",
    component: (s: number) => <LogoA size={s} id={ids.A1} />,
    small: <LogoA size={32} id={ids.A2} />,
  },
  {
    id: "B",
    name: "Escudo + Check",
    desc: "Escudo translúcido con checkmark esmeralda. Comunica seguridad directamente.",
    component: (s: number) => <LogoB size={s} id={ids.B1} />,
    small: <LogoB size={32} id={ids.B2} />,
  },
  {
    id: "C",
    name: "Dos Nodos",
    desc: "Dos partes conectadas por un candado central. Visualiza el escrow literalmente.",
    component: (s: number) => <LogoC size={s} id={ids.C1} />,
    small: <LogoC size={32} id={ids.C2} />,
  },
  {
    id: "D",
    name: "T Gradiente",
    desc: "Sin fondo, solo la letra T con gradiente índigo→violeta→esmeralda. Minimalista.",
    component: (s: number) => <LogoD size={s} id={ids.D1} />,
    small: <LogoD size={32} id={ids.D2} />,
  },
  {
    id: "E",
    name: "Venn Escrow",
    desc: "Dos círculos superpuestos, índigo y esmeralda. La T aparece en la intersección.",
    component: (s: number) => <LogoE size={s} id={ids.E1} />,
    small: <LogoE size={32} id={ids.E2} />,
  },
  {
    id: "F",
    name: "Círculo T",
    desc: "Círculo con gradiente índigo→esmeralda y T blanca centrada. Redondo y amigable.",
    component: (s: number) => <LogoF size={s} id={ids.F1} />,
    small: <LogoF size={32} id={ids.F2} />,
  },
];

export default function LogoPreview() {
  return (
    <div className="min-h-screen bg-gray-950 py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-2">Opciones de Logo</h1>
        <p className="text-white/50 text-center mb-12">Dile a Claude cuál te gusta (A–F) y lo implementa.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-16">
          {logos.map(({ id, name, desc, component }) => (
            <div key={id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4 hover:bg-white/10 transition-colors">
              <span className="text-white/30 text-xs font-bold uppercase tracking-widest">Opción {id}</span>
              <div className="flex items-center justify-center gap-4">
                {component(72)}
                {component(48)}
                {component(28)}
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-sm mb-1">{name}</p>
                <p className="text-white/50 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Context preview */}
        <h2 className="text-2xl font-bold text-white text-center mb-6">Cómo se vería en contexto</h2>
        <div className="space-y-3">
          {logos.map(({ id, name, small }) => (
            <div key={id} className="bg-white rounded-xl px-4 h-14 flex items-center gap-2">
              {small}
              <span className="font-bold text-lg text-[#3340d8]">Trado</span>
              <span className="text-gray-400 text-sm ml-auto">Opción {id} — {name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
