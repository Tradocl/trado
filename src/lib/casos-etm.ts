// Casos de estafa del stand del EtMday 2026: cada tarjeta NFC del panel abre /etm/<slug>.
// Para sumar un caso basta agregarlo acá; la página arma el chat, la pregunta y la revelación.
// Lo que se promete de Trado sale de las reglas reales (plazos: REVIEW_HOURS).
import { REVIEW_HOURS } from "@/lib/escrow";

export type Comprobante = { titulo: string; monto: number; filas: [string, string][]; enProceso?: boolean };

export type Mensaje =
  | { de: "ellos" | "yo"; texto: string }
  | { de: "ellos"; comprobante: Comprobante }
  | { de: "ellos"; foto: { emoji: string; titulo: string; detalle: string } }
  /** Un link con vista previa, como los que se ven en WhatsApp */
  | { de: "ellos"; link: { dominio: string; titulo: string; detalle: string } }
  /** Lo que pasa fuera del chat, contado en una línea */
  | { de: "narra"; texto: string };

export type Caso = {
  slug: string;
  titulo: string;
  /** Lo que se ve en la carta al darse vuelta */
  emoji: string;
  /** La escena en una frase, en segunda persona */
  escena: string;
  contacto: { nombre: string; inicial: string; rol: string };
  /**
   * decidir: el chat termina y eliges qué harías.
   * adivinar: el chat se corta justo antes del mensaje clave, adivinas cuál es y después
   * llega de verdad (`revelado`).
   */
  formato?: "decidir" | "adivinar";
  chat: Mensaje[];
  revelado?: Mensaje[];
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
    emoji: "🧾",
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
    emoji: "👟",
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
    emoji: "🎮",
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
    emoji: "📦",
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
    emoji: "🎨",
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
    emoji: "🚇",
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
  {
    slug: "devolucion-de-mas",
    emoji: "🛋️",
    formato: "adivinar",
    titulo: "La devolución de más",
    escena: "Vendes tu sillón en $200.000 y un comprador quiere cerrar el trato hoy mismo.",
    contacto: { nombre: "Comprador", inicial: "C", rol: "quiere tu sillón" },
    chat: [
      { de: "ellos", texto: "Hola! Me interesa el sillón, ¿lo puedo pasar a buscar hoy?" },
      { de: "yo", texto: "Sí, está disponible" },
      { de: "ellos", texto: "Perfecto, te transfiero ahora para asegurarlo 🙌" },
      {
        de: "ellos",
        comprobante: {
          titulo: "¡Transferencia exitosa!",
          monto: 300_000,
          filas: [["Para", "Tu cuenta"], ["Hora", "18:21"], ["N° operación", "0007712093"]],
        },
      },
      { de: "ellos", texto: "Uy, espera 😳" },
    ],
    revelado: [
      { de: "ellos", texto: "Me equivoqué y te transferí $300.000 😩 ¿Me devuelves los $100.000 de diferencia? Es la plata del arriendo 🙏" },
    ],
    pregunta: "¿Qué mensaje te van a mandar?",
    opciones: [
      { texto: "¿Me lo puedes guardar hasta mañana?", correcta: false },
      { texto: "Me equivoqué y te transferí de más, ¿me devuelves la diferencia?", correcta: true },
      { texto: "¿Me das la dirección para pasar a buscarlo?", correcta: false },
    ],
    bien: {
      titulo: "¡Lo viste venir!",
      texto: "La transferencia de $300.000 nunca existió. Si le devolvías los $100.000, los perdías de tu bolsillo.",
    },
    mal: {
      titulo: "Te pilló",
      texto: "Te pidió devolver la \"diferencia\". La transferencia de $300.000 nunca existió: quien devuelve, pierde de su bolsillo.",
    },
    senales: [
      { titulo: "Paga de más \"por error\"", texto: "Nadie se equivoca justo a favor tuyo. Es la señal más clara de un comprobante falso." },
      { titulo: "Te pide que le devuelvas plata", texto: "La estafa no es el sillón: son los $100.000 que le transfieres de vuelta." },
      { titulo: "Apuro con drama", texto: "\"Es la plata del arriendo\": para que devuelvas antes de revisar tu cuenta." },
    ],
    conTrado:
      "En Trado el comprador paga el monto exacto de la sala y la plata queda retenida. No hay transferencias entre ustedes, así que no hay nada que \"devolver\".",
  },
  {
    slug: "te-pago-despues",
    emoji: "🎂",
    formato: "adivinar",
    titulo: "\"Te pago después\"",
    escena: "Haces tortas por encargo y te piden una para un cumpleaños de 30 personas, en $45.000.",
    contacto: { nombre: "Cliente nueva", inicial: "C", rol: "pide una torta" },
    chat: [
      { de: "ellos", texto: "Hola! Vi tus tortas en Instagram, son preciosas 😍" },
      { de: "ellos", texto: "Necesito una para el sábado, para 30 personas" },
      { de: "yo", texto: "¡Gracias! Alcanzo. Son $45.000 y pido el pago antes, para comprar los ingredientes" },
      { de: "ellos", texto: "Dale, súper" },
      { de: "ellos", texto: "Oye, una cosa 😅" },
    ],
    revelado: [
      { de: "ellos", texto: "¿Te puedo pagar cuando la retire? Este mes ando corta 🙏 Te juro que soy de confianza" },
    ],
    pregunta: "¿Qué mensaje te van a mandar?",
    opciones: [
      { texto: "¿Te pago cuando la retire? Ando corta, pero soy de confianza", correcta: true },
      { texto: "¿Puede ser de chocolate con frambuesa?", correcta: false },
      { texto: "¿Me mandas fotos de otras tortas que hayas hecho?", correcta: false },
    ],
    bien: {
      titulo: "¡Lo viste venir!",
      texto: "Si aceptabas, ponías los ingredientes y tu trabajo, y el sábado nadie llegaba a retirarla.",
    },
    mal: {
      titulo: "Te pilló",
      texto: "Pidió pagar al retirar. Si aceptabas, ponías los ingredientes y tu trabajo, y el sábado nadie llegaba.",
    },
    senales: [
      { titulo: "\"Te pago después\"", texto: "Cuando el pago queda para el final, todo el riesgo es tuyo." },
      { titulo: "Cambia las reglas después del sí", texto: "Primero acepta el precio y las condiciones, y recién ahí pide otra cosa." },
      { titulo: "\"Soy de confianza\"", texto: "Lo dice alguien que conociste hace cinco minutos." },
    ],
    conTrado:
      "La clienta deposita en Trado al encargar: tú ves «Pago retenido» antes de comprar los ingredientes, y la plata se libera cuando entregas la torta.",
  },
  {
    slug: "link-de-pago-falso",
    emoji: "🔗",
    formato: "adivinar",
    titulo: "El link de pago falso",
    escena: "Vendes tu guitarra en $150.000 y el comprador dice que quiere pagar \"de forma segura\".",
    contacto: { nombre: "Comprador", inicial: "C", rol: "quiere tu guitarra" },
    chat: [
      { de: "ellos", texto: "Hola! Me interesa la guitarra 🎸" },
      { de: "ellos", texto: "Yo siempre compro con pago protegido, así los dos quedamos tranquilos" },
      { de: "yo", texto: "¡Buenísimo! ¿Cómo lo hacemos?" },
      { de: "ellos", texto: "Ya pagué. Te mando el link para que recibas la plata 👇" },
    ],
    revelado: [
      { de: "ellos", link: { dominio: "trado-pagos-cl.com", titulo: "Recibe tu pago de $150.000", detalle: "Ingresa tu banco, RUT y clave para recibir la transferencia" } },
      { de: "ellos", texto: "Es rapidito, solo pones tus datos y te llega altiro 😊" },
    ],
    pregunta: "¿Qué mensaje te van a mandar?",
    opciones: [
      { texto: "¿La guitarra viene con estuche?", correcta: false },
      { texto: "¿Me mandas tu dirección para coordinar el retiro?", correcta: false },
      { texto: "Un link para \"recibir tu pago\" que te pide la clave de tu banco", correcta: true },
    ],
    bien: {
      titulo: "¡Lo viste venir!",
      texto: "Era un link falso que imita a una plataforma de pagos: con tu clave del banco te vaciaban la cuenta.",
    },
    mal: {
      titulo: "Te pilló",
      texto: "Te mandó un link falso que imita a una plataforma de pagos. Con tu clave del banco te vaciaban la cuenta.",
    },
    senales: [
      { titulo: "Mira la dirección", texto: "Los links de Trado son siempre trado.cl. Nada de \"trado-pagos\" ni otras variantes." },
      { titulo: "Para recibir plata nunca das tu clave", texto: "Ninguna plataforma de pagos te pide la clave del banco ni códigos para pagarte." },
      { titulo: "\"Ya pagué\" antes de que haya venta", texto: "El pago tiene que aparecer en la sala que se creó en trado.cl, no en un link que te mandan." },
    ],
    conTrado:
      "En Trado la sala se crea en trado.cl y el pago aparece ahí. Trado nunca te va a pedir la clave de tu banco ni códigos por mensaje.",
  },
];

export const TOTAL_CASOS = CASOS.length;

export const casoPorSlug = (slug: string | undefined) => CASOS.find((c) => c.slug === slug);
export const numeroDe = (caso: Caso) => CASOS.indexOf(caso) + 1;

// Días del evento (hora de Chile): ahí se muestra lo del premio en el stand
const INICIO_EVENTO = Date.parse("2026-11-19T00:00:00-03:00");
const FIN_EVENTO = Date.parse("2026-11-21T23:59:59-03:00");
export const esDiaDelEvento = () => { const t = Date.now(); return t >= INICIO_EVENTO && t <= FIN_EVENTO; };

// Un identificador al azar por celular, para contar personas en la pantalla del stand
export const sesionEtm = (): string => {
  try {
    let s = localStorage.getItem("trado_etm_sesion");
    if (!s) { s = crypto.randomUUID(); localStorage.setItem("trado_etm_sesion", s); }
    return s;
  } catch {
    return crypto.randomUUID();
  }
};

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
/** Un caso al azar entre los que todavía no jugó (si ya jugó todos, cualquiera) */
export const casoAlAzar = (avance: Avance, excepto?: string): Caso => {
  const pendientes = CASOS.filter((c) => !(c.slug in avance) && c.slug !== excepto);
  const lista = pendientes.length ? pendientes : CASOS.filter((c) => c.slug !== excepto);
  return lista[Math.floor(Math.random() * lista.length)];
};

// La introducción ("Pasa todos los días…") se ve una sola vez por celular
const CLAVE_INTRO = "trado_etm_intro";
export const introVista = () => { try { return !!localStorage.getItem(CLAVE_INTRO); } catch { return false; } };
export const marcarIntroVista = () => { try { localStorage.setItem(CLAVE_INTRO, "1"); } catch { /* sin almacenamiento */ } };

/** El siguiente caso que le falta, partiendo después del actual */
export const siguientePendiente = (actual: Caso, avance: Avance): Caso | null => {
  const i = CASOS.indexOf(actual);
  for (let k = 1; k < CASOS.length; k++) {
    const c = CASOS[(i + k) % CASOS.length];
    if (!(c.slug in avance)) return c;
  }
  return null;
};
