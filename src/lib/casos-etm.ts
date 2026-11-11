// Casos de estafa del stand del EtMday 2026: cada tarjeta NFC del panel abre /etm/<slug>.
// Para sumar un caso basta agregarlo acá; la página arma el chat, la pregunta y la revelación.
// Lo que se promete de Trado sale de las reglas reales (plazos: REVIEW_HOURS).
import { REVIEW_HOURS } from "@/lib/escrow";

export type Comprobante = { titulo: string; monto: number; filas: [string, string][]; enProceso?: boolean };

export type Mensaje =
  | { de: "ellos" | "yo"; texto: string }
  | { de: "ellos"; comprobante: Comprobante }
  | { de: "ellos"; foto: { emoji: string; titulo: string; detalle: string } }
  /** Lo que pasa fuera del chat, contado en una línea */
  | { de: "narra"; texto: string };

export type Caso = {
  slug: string;
  titulo: string;
  /** La escena en una frase, en segunda persona */
  escena: string;
  contacto: { nombre: string; inicial: string; rol: string };
  chat: Mensaje[];
  pregunta: string;
  opciones: { texto: string; correcta: boolean }[];
  /** Qué pasa si eligió bien / mal */
  bien: { titulo: string; texto: string };
  mal: { titulo: string; texto: string };
  senales: { titulo: string; texto: string }[];
  conTrado: string;
};

export const CASOS: Caso[] = [
  {
    slug: "comprobante-falso",
    titulo: "El comprobante falso",
    escena: "Vendes tu bicicleta en $180.000 y te escribe alguien interesado.",
    contacto: { nombre: "Comprador", inicial: "C", rol: "quiere tu bicicleta" },
    chat: [
      { de: "ellos", texto: "Hola! ¿Sigue disponible la bici? 🚲" },
      { de: "yo", texto: "Sí, todavía la tengo" },
      { de: "ellos", texto: "Buenísimo, te la compro. Te transfiero altiro" },
      {
        de: "ellos",
        comprobante: {
          titulo: "¡Transferencia exitosa!",
          monto: 180_000,
          filas: [["Desde", "Cuenta corriente ****4821"], ["Hora", "15:42"], ["N° operación", "0004588127"]],
        },
      },
      { de: "ellos", texto: "Listo, ya te transferí 🙌 ¿Me la puedes mandar hoy por Starken?" },
      { de: "yo", texto: "Mmm, todavía no me aparece en la cuenta" },
      { de: "ellos", texto: "Es que es de otro banco, a veces se demora. Pero ahí tienes el comprobante 🙏" },
      { de: "ellos", texto: "Porfa mándala hoy, es el regalo de cumpleaños de mi hijo 🎂" },
    ],
    pregunta: "¿Qué haces?",
    opciones: [
      { texto: "La envío, ya tengo el comprobante", correcta: false },
      { texto: "Espero a ver la plata en mi cuenta", correcta: true },
    ],
    bien: {
      titulo: "¡Bien detectado!",
      texto: "Esperaste y la plata nunca llegó: el comprobante era una imagen editada. Te salvaste de perder la bici.",
    },
    mal: {
      titulo: "Te estafaron",
      texto: "Enviaste la bici y la plata nunca llegó: el comprobante era una imagen editada. Ya no responde.",
    },
    senales: [
      { titulo: "Una captura no es plata", texto: "Un comprobante se edita en un minuto. Lo único que vale es lo que ves en tu cuenta." },
      { titulo: "La excusa del otro banco", texto: "Las transferencias entre bancos en Chile llegan en minutos, no al día siguiente." },
      { titulo: "El apuro con historia", texto: "\"Es para mi hijo, mándala hoy\": la urgencia está para que no alcances a revisar." },
    ],
    conTrado:
      "El comprador paga en Trado y tú ves «Pago retenido» en la sala antes de enviar. Ninguna captura reemplaza eso.",
  },
  {
    slug: "transfiere-primero",
    titulo: "\"Transfiéreme primero\"",
    escena: "Viste en Instagram unas zapatillas que buscabas hace rato, a $65.000.",
    contacto: { nombre: "Tienda de zapatillas", inicial: "Z", rol: "cuenta de Instagram" },
    chat: [
      { de: "yo", texto: "Hola! ¿Tienes talla 42?" },
      { de: "ellos", texto: "Sí! Me quedan las últimas 2 😍 originales y nuevas en caja" },
      { de: "ellos", foto: { emoji: "👟", titulo: "Zapatillas talla 42", detalle: "Nuevas, en caja · $65.000" } },
      { de: "yo", texto: "¿Y cómo lo hacemos?" },
      { de: "ellos", texto: "Me transfieres y te las mando altiro por Starken, llegan mañana 📦" },
      { de: "yo", texto: "¿Y si nos juntamos y te pago ahí?" },
      { de: "ellos", texto: "No puedo, estoy en Concepción 😕 Pero tengo muchas ventas, mira mis historias destacadas ⭐" },
    ],
    pregunta: "¿Qué haces?",
    opciones: [
      { texto: "Le propongo pagar con la plata retenida hasta que me lleguen", correcta: true },
      { texto: "Le transfiero, tiene muchas ventas", correcta: false },
    ],
    bien: {
      titulo: "¡Bien detectado!",
      texto: "Le propusiste que la plata quedara retenida hasta recibirlas y dejó de responder. La cuenta era falsa.",
    },
    mal: {
      titulo: "Te estafaron",
      texto: "Transferiste $65.000 y te bloqueó. Las \"ventas\" de sus historias eran capturas de otras cuentas.",
    },
    senales: [
      { titulo: "La plata sale antes que el producto", texto: "Si pagas primero, te quedas sin nada con qué reclamar." },
      { titulo: "Nunca se puede juntar", texto: "Lejos a propósito: así no puedes ver que el producto exista." },
      { titulo: "Pruebas que no puedes comprobar", texto: "Historias destacadas, comentarios y capturas de ventas se copian de otras cuentas." },
    ],
    conTrado:
      "Pagas en Trado y la plata queda retenida hasta que te llegan las zapatillas. Si no llegan, lo reportas y la plata no se mueve.",
  },
  {
    slug: "pagar-por-fuera",
    titulo: "\"Te hago precio por fuera\"",
    escena: "Vas a comprar una consola usada en $320.000 y quedaron en pagar con Trado.",
    contacto: { nombre: "Vendedor", inicial: "V", rol: "vende una consola" },
    chat: [
      { de: "ellos", texto: "Hola! Ya tengo la consola lista para enviarte 🎮" },
      { de: "ellos", texto: "Oye, ¿y si mejor me transfieres directo? Te la dejo en $300.000" },
      { de: "ellos", texto: "Así nos ahorramos la comisión los dos 😉" },
      { de: "yo", texto: "¿Y por qué no por Trado, como quedamos?" },
      { de: "ellos", texto: "Es que es más lento, y yo soy de confianza. Llevo años vendiendo 🤝" },
    ],
    pregunta: "¿Qué haces?",
    opciones: [
      { texto: "Acepto, me ahorro $20.000", correcta: false },
      { texto: "Sigo con Trado, como quedamos", correcta: true },
    ],
    bien: {
      titulo: "¡Bien detectado!",
      texto: "Le dijiste que seguías con Trado y no volvió a escribir: no tenía ninguna consola.",
    },
    mal: {
      titulo: "Te estafaron",
      texto: "Transferiste $300.000 y te bloqueó. Te \"ahorraste\" $20.000 y perdiste $300.000.",
    },
    senales: [
      { titulo: "El descuento por salirse", texto: "Salirse del método seguro siempre le conviene a uno solo." },
      { titulo: "Te lleva a donde no hay protección", texto: "Una transferencia directa no se puede reclamar si el producto nunca llega." },
      { titulo: "\"Soy de confianza\"", texto: "Quien es de confianza no tiene problema en que la plata quede retenida." },
    ],
    conTrado:
      "Si la venta es real, al vendedor le da lo mismo cobrar por Trado: su plata le llega igual. El que insiste en salirse es el que no quiere que quede retenida.",
  },
  {
    slug: "llego-otra-cosa",
    titulo: "Llegó otra cosa",
    escena: "Compras un iPhone 13 en $280.000 a alguien de otra región, que te lo manda por courier.",
    contacto: { nombre: "Vendedor", inicial: "V", rol: "vende un iPhone 13" },
    chat: [
      { de: "yo", texto: "Hola! ¿El iPhone 13 sigue disponible?" },
      { de: "ellos", texto: "Sí! 128 GB, batería al 89 %, impecable 👌" },
      { de: "ellos", foto: { emoji: "📱", titulo: "iPhone 13 · 128 GB", detalle: "Sin rayas, con caja" } },
      { de: "yo", texto: "Yo estoy en Santiago" },
      { de: "ellos", texto: "Yo en Antofagasta, te lo mando por courier y llega en 2 días 🚚" },
      { de: "ellos", texto: "¿Cómo me pagas?" },
    ],
    pregunta: "¿Cómo le pagas?",
    opciones: [
      { texto: "Con la plata retenida hasta revisarlo", correcta: true },
      { texto: "Le transfiero, las fotos se ven bien", correcta: false },
    ],
    bien: {
      titulo: "¡Bien pensado!",
      texto: "Llegó un iPhone 11 con la pantalla trizada. Lo reportaste antes de confirmar y la plata no se movió.",
    },
    mal: {
      titulo: "Te estafaron",
      texto: "Llegó un iPhone 11 con la pantalla trizada. Te dijo que \"se cambió en el courier\" y te bloqueó.",
    },
    senales: [
      { titulo: "Las fotos pueden ser de otro equipo", texto: "Una foto bonita no te dice qué viene dentro de la caja." },
      { titulo: "Lejos para no poder revisarlo", texto: "Si no puedes verlo antes de pagar, necesitas poder revisarlo antes de que la plata se libere." },
      { titulo: "Si ya pagaste, no le importa", texto: "Con la plata en su cuenta, el vendedor ya no tiene por qué responderte." },
    ],
    conTrado: `Tienes ${REVIEW_HOURS.producto_envio} horas desde que lo marcas como recibido para revisarlo. Si no es lo acordado, lo reportas y la plata queda retenida hasta resolverlo.`,
  },
  {
    slug: "trabajo-sin-pago",
    titulo: "El trabajo que no te pagan",
    escena: "Eres diseñador y un cliente nuevo te pide un logo por $80.000.",
    contacto: { nombre: "Cliente nuevo", inicial: "C", rol: "necesita un logo" },
    chat: [
      { de: "ellos", texto: "Hola! Me encantó tu trabajo, necesito un logo para mi tienda ✨" },
      { de: "yo", texto: "¡Gracias! Son $80.000 y normalmente pido la mitad por adelantado" },
      { de: "ellos", texto: "Uy, es que justo ahora no tengo. Pero te pago todo apenas me lo entregues, palabra 🤝" },
      { de: "ellos", texto: "Lo necesito para el viernes sí o sí, ¿alcanzas? 🙏" },
    ],
    pregunta: "¿Qué haces?",
    opciones: [
      { texto: "Empiezo igual, parece buena persona", correcta: false },
      { texto: "Le pido que deposite antes de empezar", correcta: true },
    ],
    bien: {
      titulo: "¡Bien detectado!",
      texto: "Le pediste depositar antes de empezar y no respondió más: buscaba un logo gratis.",
    },
    mal: {
      titulo: "Te dejaron en visto",
      texto: "Le mandaste el logo y nunca pagó. Una semana después lo viste en su Instagram.",
    },
    senales: [
      { titulo: "\"Te pago al final\"", texto: "Si el pago queda para después de entregar, el riesgo es todo tuyo." },
      { titulo: "Sin plata, pero con apuro", texto: "No tiene para el anticipo, pero lo necesita para el viernes." },
      { titulo: "Una promesa no es un pago", texto: "\"Palabra\" no te sirve de nada cuando deja de contestar." },
    ],
    conTrado: `El cliente deposita en Trado antes de que empieces: ves «Pago retenido» y trabajas tranquilo. Al entregar, tiene ${REVIEW_HOURS.servicio} horas para revisar; si no responde, se libera solo.`,
  },
  {
    slug: "venta-en-persona",
    titulo: "La venta en persona",
    escena: "Vendes tu celular en $250.000 y quedan de juntarse en una estación de metro.",
    contacto: { nombre: "Comprador", inicial: "C", rol: "quiere tu celular" },
    chat: [
      { de: "ellos", texto: "Llegué, estoy en el andén 🚇" },
      { de: "narra", texto: "Se juntan. Revisa el celular y saca su teléfono." },
      { de: "ellos", texto: "No ando con efectivo, te transfiero altiro" },
      {
        de: "ellos",
        comprobante: { titulo: "Transferencia en proceso", monto: 250_000, filas: [["Estado", "Procesando…"], ["Hora", "13:08"]], enProceso: true },
      },
      { de: "ellos", texto: "Listo, ya está. A veces se demora unos minutos en llegar" },
      { de: "ellos", texto: "Me tengo que ir, viene mi metro 🏃" },
    ],
    pregunta: "¿Qué haces?",
    opciones: [
      { texto: "Espero a que llegue a mi cuenta antes de entregarlo", correcta: true },
      { texto: "Le paso el celular, ya me mostró la transferencia", correcta: false },
    ],
    bien: {
      titulo: "¡Bien detectado!",
      texto: "Esperaste y nunca llegó nada: la pantalla era de una app que simula transferencias. Se fue sin tu celular.",
    },
    mal: {
      titulo: "Te estafaron",
      texto: "Se subió al metro con tu celular. La pantalla era de una app que simula transferencias.",
    },
    senales: [
      { titulo: "Una pantalla se puede fabricar", texto: "Hay apps que muestran transferencias falsas. Solo vale lo que llega a tu cuenta." },
      { titulo: "El apuro por irse", texto: "\"Viene mi metro\": para que entregues antes de poder revisar." },
      { titulo: "Plata en la mano, discusión en la calle", texto: "Andar con efectivo o discutir un pago en persona también es un riesgo." },
    ],
    conTrado:
      "El comprador deja la plata en Trado antes de juntarse. Revisa el celular ahí mismo, confirma desde su teléfono y se libera: nadie anda con efectivo ni depende de una pantalla.",
  },
];

export const TOTAL_CASOS = CASOS.length;

export const casoPorSlug = (slug: string | undefined) => CASOS.find((c) => c.slug === slug);
export const numeroDe = (caso: Caso) => CASOS.indexOf(caso) + 1;

// Avance de cada persona, guardado en su celular: qué casos jugó y si acertó.
const CLAVE = "trado_etm_avance";
export type Avance = Record<string, boolean>;

export const leerAvance = (): Avance => {
  try { return JSON.parse(localStorage.getItem(CLAVE) || "{}") || {}; } catch { return {}; }
};
export const guardarRespuesta = (slug: string, acerto: boolean): Avance => {
  const a = { ...leerAvance(), [slug]: acerto };
  try { localStorage.setItem(CLAVE, JSON.stringify(a)); } catch { /* sin almacenamiento: no se recuerda */ }
  return a;
};
/** El siguiente caso que le falta, partiendo después del actual */
export const siguientePendiente = (actual: Caso, avance: Avance): Caso | null => {
  const i = CASOS.indexOf(actual);
  for (let k = 1; k < CASOS.length; k++) {
    const c = CASOS[(i + k) % CASOS.length];
    if (!(c.slug in avance)) return c;
  }
  return null;
};
