// Casos de estafa del stand del EtMday 2026: cada tarjeta NFC del panel abre /etm/<slug>.
// Para sumar un caso basta agregarlo acá; la página arma el chat, la pregunta y la revelación.
// Lo que se promete de Trado sale de las reglas reales (plazos: REVIEW_HOURS).
import { REVIEW_HOURS } from "@/lib/escrow";

export type Comprobante = { titulo: string; monto: number; filas: [string, string][]; enProceso?: boolean };

export type Mensaje =
  | { de: "ellos" | "yo"; texto: string }
  | { de: "ellos"; comprobante: Comprobante }
  | { de: "ellos"; foto: { emoji: string; titulo: string; detalle: string } }
  /** Captura de "reseñas de clientes" */
  | { de: "ellos"; resenas: { autor: string; texto: string }[] }
  /** Datos bancarios para transferir */
  | { de: "ellos"; datos: { titulo: string; filas: [string, string][] } }
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
  /** Cómo funciona esta estafa y por qué pasa tanto (sin cifras inventadas) */
  comun: string;
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
    comun: "Es una de las estafas más repetidas al vender por redes en Chile: te mandan un pantallazo de transferencia editado y te apuran para que despaches antes de revisar tu cuenta.",
    conTrado:
      "El comprador paga en Trado y tú ves «Pago retenido» en la sala antes de enviar. Ninguna captura reemplaza eso.",
  },
  {
    slug: "zapatillas-baratas",
    emoji: "👟",
    titulo: "Las zapatillas a mitad de precio",
    escena: "Buscas unas zapatillas edición limitada que en tienda cuestan $180.000. Una cuenta de Instagram las tiene a $90.000.",
    contacto: { nombre: "Sneakers Outlet CL", inicial: "S", rol: "cuenta de Instagram" },
    chat: [
      { de: "yo", texto: "Hola! ¿Siguen las zapatillas a $90.000? 😮" },
      { de: "ellos", texto: "Sí! Son originales, de un lote que trajimos de EE.UU. Quedan 2 pares 🔥" },
      { de: "ellos", foto: { emoji: "👟", titulo: "Edición limitada · talla 42", detalle: "Nuevas, con caja · $90.000" } },
      { de: "yo", texto: "¿Por qué tan baratas?" },
      { de: "ellos", texto: "Estamos liquidando stock. Mira lo que dicen los clientes 👇" },
      {
        de: "ellos",
        resenas: [
          { autor: "@cami.rz", texto: "Llegaron al otro día, originales 💯" },
          { autor: "@nico_92", texto: "Segunda vez que les compro, 10/10" },
          { autor: "@vale.store", texto: "Súper confiables 🙌" },
        ],
      },
      { de: "ellos", texto: "Me transfieres y te las mando hoy por Starken 📦" },
      { de: "ellos", datos: { titulo: "Datos para transferir", filas: [["Nombre", "Jorge Muñoz P."], ["Cuenta", "Cuenta RUT"], ["Monto", "$90.000"]] } },
      { de: "yo", texto: "¿Jorge? ¿No era una tienda?" },
      { de: "ellos", texto: "Es la cuenta de mi primo, la de la tienda está con un problema 😅 Apúrate que hay otra persona preguntando" },
    ],
    pregunta: "¿Qué haces?",
    opciones: [
      { texto: "Le propongo pagar con la plata retenida hasta recibirlas", correcta: true },
      { texto: "Transfiero rápido, tiene buenas reseñas", correcta: false },
    ],
    bien: {
      titulo: "¡Bien detectado!",
      texto: "Le propusiste pagar con la plata retenida y te bloqueó. La cuenta tenía 3 días y las reseñas eran inventadas.",
    },
    mal: {
      titulo: "Te estafaron",
      texto: "Transferiste $90.000 a la cuenta del \"primo\" y te bloqueó. La cuenta tenía 3 días y las reseñas eran inventadas.",
    },
    senales: [
      { titulo: "La mitad de precio", texto: "Si es demasiado barato para ser cierto, es la carnada." },
      { titulo: "La cuenta está a nombre de otro", texto: "Si el nombre no calza con quien te vende, no transfieras. \"Es de mi primo\" es la excusa más vieja." },
      { titulo: "Reseñas que no puedes comprobar", texto: "Una captura de comentarios se inventa en un minuto, igual que las cuentas que los escriben." },
    ],
    comun: "Cuentas nuevas con precios demasiado buenos, reseñas inventadas y pago solo por transferencia. Cuando pagas, te bloquean y la cuenta desaparece.",
    conTrado:
      "Pagas en Trado y la plata queda retenida hasta que te llegan las zapatillas. Si no llegan o no son lo acordado, lo reportas y la plata no se mueve.",
  },
  {
    slug: "reserva-del-auto",
    emoji: "🚗",
    titulo: "La reserva del auto",
    escena: "Buscas auto y en Marketplace aparece un sedán 2018 a $6.500.000, muy por debajo de lo que cuesta.",
    contacto: { nombre: "Vendedor", inicial: "V", rol: "vende un auto" },
    chat: [
      { de: "yo", texto: "Hola! ¿Sigue disponible el auto? 🚗" },
      { de: "ellos", texto: "Sí! Lo vendo barato porque me voy del país la otra semana ✈️" },
      { de: "ellos", foto: { emoji: "🚗", titulo: "Sedán 2018 · 60.000 km", detalle: "Único dueño · $6.500.000" } },
      { de: "yo", texto: "¿Lo puedo ir a ver mañana?" },
      { de: "ellos", texto: "Claro, pero tengo 5 personas interesadas 😬" },
      { de: "ellos", texto: "Si quieres que te lo guarde, transfiéreme $300.000 de abono. Si no te gusta, te lo devuelvo" },
      { de: "ellos", datos: { titulo: "Datos para el abono", filas: [["Nombre", "Juan Pérez"], ["Banco", "Cuenta RUT"], ["Monto", "$300.000"]] } },
      { de: "ellos", texto: "Pero tiene que ser hoy, mañana ya no te lo puedo asegurar" },
    ],
    pregunta: "¿Qué haces?",
    opciones: [
      { texto: "Transfiero el abono para asegurarlo", correcta: false },
      { texto: "No transfiero nada hasta ver el auto y sus papeles", correcta: true },
    ],
    bien: {
      titulo: "¡Bien detectado!",
      texto: "Le dijiste que pagabas al verlo y dejó de responder. El auto no existía: las fotos eran de otro aviso.",
    },
    mal: {
      titulo: "Te estafaron",
      texto: "Transferiste los $300.000 y te bloqueó. El auto no existía: las fotos eran de otro aviso.",
    },
    senales: [
      { titulo: "Barato con historia", texto: "\"Me voy del país\" es la excusa típica para un precio que no cuadra." },
      { titulo: "Abono antes de verlo", texto: "Nadie serio te pide plata por algo que no has visto." },
      { titulo: "Muchos interesados y apuro", texto: "La presión está para que transfieras hoy, sin pensarlo." },
    ],
    comun: "Se repite mucho en Marketplace en Chile: autos a precio de ganga con fotos sacadas de otros avisos, y un \"abono para reservar\" que se pierde apenas lo transfieres.",
    conTrado: "Con Trado el abono queda retenido y no le llega al vendedor. Si al ir a verlo el auto no existe o no es lo acordado, lo reportas y la plata no se mueve.",
  },
  {
    slug: "llego-otra-cosa",
    emoji: "📦",
    formato: "adivinar",
    titulo: "¿Qué hay en la caja?",
    escena: "Compras un iPhone 13 en $280.000 a alguien de Antofagasta, que te lo manda por courier.",
    contacto: { nombre: "Vendedor", inicial: "V", rol: "vende un iPhone 13" },
    chat: [
      { de: "yo", texto: "Hola! ¿El iPhone 13 sigue disponible?" },
      { de: "ellos", texto: "Sí! 128 GB, batería al 89 %, impecable 👌" },
      { de: "ellos", foto: { emoji: "📱", titulo: "iPhone 13 · 128 GB", detalle: "Sin rayas, con caja" } },
      { de: "yo", texto: "Me interesa! Yo estoy en Santiago" },
      { de: "ellos", texto: "Te lo mando por courier y llega en 2 días 🚚 Me transfieres y te paso el seguimiento" },
      { de: "yo", texto: "Listo, ya te transferí 🙌" },
      { de: "ellos", foto: { emoji: "🚚", titulo: "Envío en camino", detalle: "N° de seguimiento 7741 2290 8815" } },
      { de: "narra", texto: "2 días después llega el paquete. Pesa lo mismo que un celular con caja…" },
      { de: "narra", texto: "Lo abres y adentro hay…" },
    ],
    revelado: [
      { de: "narra", texto: "🧱 Un ladrillo envuelto en diario, para que la caja pesara lo mismo." },
      { de: "yo", texto: "¿¡Un ladrillo!? 😡 ¿Qué es esto?" },
      { de: "narra", texto: "Lo leyó y te bloqueó. El número de seguimiento era de otro envío." },
    ],
    pregunta: "¿Qué crees que hay en la caja?",
    opciones: [
      { texto: "El iPhone 13, tal como en las fotos", correcta: false },
      { texto: "Un iPhone más viejo con la pantalla trizada", correcta: false },
      { texto: "Un ladrillo envuelto en diario", correcta: true },
    ],
    bien: {
      titulo: "¡Lo viste venir!",
      texto: "Un ladrillo envuelto en diario, para que la caja pesara lo mismo. Cuando reclamaste, te bloqueó.",
    },
    mal: {
      titulo: "Te pilló",
      texto: "Era un ladrillo envuelto en diario, para que la caja pesara lo mismo. Cuando reclamaste, te bloqueó.",
    },
    senales: [
      { titulo: "Las fotos pueden ser de otro equipo", texto: "Una foto bonita no te dice qué viene dentro de la caja." },
      { titulo: "Lejos para no poder revisarlo", texto: "Si no puedes verlo antes de pagar, necesitas poder revisarlo antes de que la plata se libere." },
      { titulo: "Si ya pagaste, no le importa", texto: "Con la plata en su cuenta, el vendedor ya no tiene por qué responderte." },
    ],
    comun: "Pasa seguido al comprarle a alguien de otra región: pagas por adelantado y el paquete llega con algo que pesa lo mismo, hasta un ladrillo. Si ya transferiste, no hay a quién reclamar.",
    conTrado: `Tienes ${REVIEW_HOURS.producto_envio} horas desde que lo marcas como recibido para revisarlo. Si no es lo acordado, lo reportas y la plata queda retenida hasta resolverlo.`,
  },
  {
    slug: "maestro-adelanto",
    emoji: "🔨",
    titulo: "El maestro que pide adelanto",
    escena: "Necesitas pintar tu departamento y por Facebook encuentras un maestro con buenos comentarios.",
    contacto: { nombre: "Maestro Pinturas", inicial: "M", rol: "maestro pintor" },
    chat: [
      { de: "yo", texto: "Hola! Necesito pintar un depto de 2 dormitorios, ¿cuánto me cobra?" },
      { de: "ellos", texto: "Hola! Le sale $350.000 con materiales incluidos 👷" },
      { de: "yo", texto: "Perfecto, ¿cuándo podría empezar?" },
      { de: "ellos", texto: "El lunes a primera hora 💪" },
      { de: "ellos", texto: "Pero necesito la mitad por adelantado para comprar la pintura: $175.000" },
      { de: "ellos", datos: { titulo: "Datos para el adelanto", filas: [["Nombre", "Pedro González"], ["Banco", "Cuenta RUT"], ["Monto", "$175.000"]] } },
      { de: "ellos", texto: "Si me transfiere hoy le aseguro el lunes. Si no, esa semana tengo otro trabajo" },
    ],
    pregunta: "¿Qué haces?",
    opciones: [
      { texto: "Le transfiero la mitad para asegurar el lunes", correcta: false },
      { texto: "No le transfiero: compro yo la pintura y le pago al terminar", correcta: true },
    ],
    bien: {
      titulo: "¡Bien detectado!",
      texto: "Le dijiste que comprabas tú la pintura y pagabas al terminar, y dejó de contestar. No era maestro: juntaba adelantos.",
    },
    mal: {
      titulo: "Te estafaron",
      texto: "Transferiste los $175.000. El lunes no llegó nadie y el número dejó de contestar.",
    },
    senales: [
      { titulo: "La mitad antes de empezar", texto: "Un adelanto alto antes de ver un solo trabajo deja todo el riesgo en ti." },
      { titulo: "El apuro por la fecha", texto: "\"Si no, tengo otro trabajo\" está para que transfieras hoy." },
      { titulo: "Comentarios que no puedes comprobar", texto: "En una publicación de Facebook los comentarios se inventan fácil." },
    ],
    comun: "Le pasa a mucha gente al contratar maestros o servicios por redes: piden la mitad por adelantado \"para los materiales\" y el día acordado no llega nadie.",
    conTrado: "Con Trado el adelanto queda retenido: el maestro ve «Pago retenido» y sabe que la plata está, pero no le llega hasta que hace el trabajo. Si no aparece, lo reportas y la plata no se mueve.",
  },
  {
    slug: "venta-en-persona",
    emoji: "🚇",
    titulo: "La venta en persona",
    escena: "Vendes tu celular en $250.000 y quedan de juntarse en una estación de metro.",
    contacto: { nombre: "Comprador", inicial: "C", rol: "quiere tu celular" },
    chat: [
      { de: "ellos", texto: "Hola! ¿Sigue disponible el celular? Lo puedo ir a buscar hoy" },
      { de: "yo", texto: "Sí! ¿Nos juntamos en el metro Baquedano a las 13:00?" },
      { de: "ellos", texto: "Perfecto, ahí nos vemos 👍" },
      { de: "ellos", texto: "Llegué, estoy en el andén 🚇" },
      { de: "narra", texto: "Se juntan. Revisa el celular, le gusta y saca su teléfono." },
      { de: "ellos", texto: "No ando con efectivo, te transfiero altiro" },
      { de: "yo", texto: "Ya, dale" },
      {
        de: "ellos",
        comprobante: { titulo: "Transferencia en proceso", monto: 250_000, filas: [["Estado", "Procesando…"], ["Hora", "13:08"]], enProceso: true },
      },
      { de: "ellos", texto: "Listo, ya está. Mira la pantalla 👆" },
      { de: "yo", texto: "Mmm, a mí todavía no me llega nada" },
      { de: "ellos", texto: "A veces se demora unos minutos. Me tengo que ir, viene mi metro 🏃" },
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
    comun: "En los encuentros en persona circulan apps que simulan una transferencia en la pantalla. Te muestran el “comprobante”, se llevan el producto y la plata nunca llega.",
    conTrado:
      "El comprador deja la plata en Trado antes de juntarse. Revisa el celular ahí mismo, confirma desde su teléfono y se libera: nadie anda con efectivo ni depende de una pantalla.",
  },
  {
    slug: "cabana-de-verano",
    emoji: "🏖️",
    formato: "adivinar",
    titulo: "La cabaña de verano",
    escena: "Buscas una cabaña en la playa para febrero. Por Instagram encuentras una frente al mar a $60.000 la noche.",
    contacto: { nombre: "Cabañas Vista Mar", inicial: "C", rol: "arrienda cabañas" },
    chat: [
      { de: "yo", texto: "Hola! ¿Tienen disponible del 10 al 14 de febrero? 🏖️" },
      { de: "ellos", texto: "Sí! Nos queda solo esa semana, está muy pedida 🔥" },
      { de: "ellos", foto: { emoji: "🏡", titulo: "Cabaña Vista Mar · 4 personas", detalle: "Frente a la playa · $60.000 la noche" } },
      { de: "ellos", texto: "Para reservar transfieres el 50 %: $120.000. El resto lo pagas al llegar" },
      { de: "yo", texto: "Listo, ya te transferí la reserva 🙌" },
      { de: "ellos", texto: "Perfecto! Quedó reservada a tu nombre 😊 Cualquier cosa me escribes" },
      { de: "narra", texto: "10 de febrero. Llegas con tu familia a la dirección que te dieron…" },
      { de: "yo", texto: "Hola! Estamos en la dirección y aquí no hay ninguna cabaña 😰" },
    ],
    revelado: [
      { de: "narra", texto: "Lo leyó y nunca contestó. Al día siguiente la cuenta de Instagram ya no existía." },
      { de: "narra", texto: "Las fotos eran de una cabaña real de otra persona, sacadas de otro aviso." },
    ],
    pregunta: "¿Qué crees que va a pasar?",
    opciones: [
      { texto: "Te da la dirección correcta: era otra calle", correcta: false },
      { texto: "No contesta más y la cuenta desaparece", correcta: true },
      { texto: "Te devuelve la reserva porque hubo un error", correcta: false },
    ],
    bien: {
      titulo: "¡Lo viste venir!",
      texto: "Nunca contestó: las fotos eran de la cabaña de otra persona. La reserva ya estaba en su cuenta y te quedaste sin vacaciones.",
    },
    mal: {
      titulo: "Te pilló",
      texto: "Nunca contestó: las fotos eran de la cabaña de otra persona. La reserva ya estaba en su cuenta y te quedaste sin vacaciones.",
    },
    senales: [
      { titulo: "Barato y \"muy pedida\"", texto: "Buen precio y apuro: la combinación para que reserves sin revisar." },
      { titulo: "La reserva por transferencia", texto: "Una vez transferida, no hay cómo recuperarla si la cabaña no existe." },
      { titulo: "Fotos sacadas de otro aviso", texto: "Búscalas en Google Imágenes: muchas veces son de otra cabaña que sí existe." },
    ],
    comun: "Pasa cada verano en Chile: cuentas con fotos de cabañas reales, sacadas de otros avisos, piden transferir la reserva. Cuando llegas, no hay nada.",
    conTrado: "La reserva se paga en Trado y queda retenida: no le llega al dueño mientras tú no llegas. Si la cabaña no existe o no es la de las fotos, lo reportas y la plata no se mueve.",
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
      { de: "narra", texto: "🚩 Es una estafa: te pide no pagar por adelantado. Si aceptas, pones los ingredientes y tu trabajo, y el sábado nadie llega a retirarla." },
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
    comun: "Le pasa a muchos emprendedores que trabajan por encargo: compras los materiales, haces el trabajo y el cliente que iba a pagar al retirar nunca aparece.",
    conTrado:
      "La clienta deposita en Trado al encargar: tú ves «Pago retenido» antes de comprar los ingredientes, y la plata se libera cuando entregas la torta.",
  },
  {
    slug: "entradas-falsas",
    emoji: "🎟️",
    formato: "adivinar",
    titulo: "Las entradas agotadas",
    escena: "El concierto que querías está agotado. Alguien vende 2 entradas en $120.000 por Instagram.",
    contacto: { nombre: "Vendo entradas", inicial: "V", rol: "vende 2 entradas" },
    chat: [
      { de: "yo", texto: "Hola! ¿Todavía tienes las 2 entradas para el concierto? 🎤" },
      { de: "ellos", texto: "Sí! Cancha general, a $120.000 las dos. No puedo ir por la pega 😩" },
      { de: "ellos", foto: { emoji: "🎟️", titulo: "2 entradas · Cancha general", detalle: "Sábado 21:00 · $120.000" } },
      { de: "yo", texto: "Me sirven! ¿Cómo me las pasas?" },
      { de: "ellos", texto: "Me transfieres y altiro te mando el PDF con los QR 👇" },
      { de: "yo", texto: "Listo, ya te transferí 🙌" },
      { de: "ellos", foto: { emoji: "📄", titulo: "Entradas.pdf", detalle: "2 códigos QR · listo para imprimir" } },
      { de: "ellos", texto: "Ahí están! Todo bien, cualquier problema me avisas 😊" },
      { de: "narra", texto: "Sábado, 21:00. En la puerta del concierto…" },
      { de: "yo", texto: "Oye, en la entrada me dicen que los QR ya se usaron 😰 ¿Qué pasó?" },
    ],
    revelado: [
      { de: "narra", texto: "Lo leyó y nunca contestó: te bloqueó en WhatsApp y en Instagram." },
      { de: "narra", texto: "Le había vendido el mismo PDF a 4 personas más." },
    ],
    pregunta: "¿Qué crees que va a pasar?",
    opciones: [
      { texto: "Te devuelve la plata y te pide disculpas", correcta: false },
      { texto: "Te bloquea y no vuelve a contestar", correcta: true },
      { texto: "Te manda otras entradas que sí funcionan", correcta: false },
    ],
    bien: {
      titulo: "¡Lo viste venir!",
      texto: "Te bloqueó apenas reclamaste. Vendió el mismo PDF a varias personas y, con la plata ya transferida, no había a quién reclamarle.",
    },
    mal: {
      titulo: "Te pilló",
      texto: "Te bloqueó apenas reclamaste. Ese QR se lo vendió a otras 4 personas y tu plata ya estaba en su cuenta.",
    },
    senales: [
      { titulo: "Un PDF se copia infinitas veces", texto: "El mismo QR se lo pueden vender a varios. Entra solo el primero que llega." },
      { titulo: "No quiere usar la ticketera", texto: "Las ticketeras oficiales dejan transferir la entrada a tu nombre. Si no quiere, desconfía." },
      { titulo: "\"Cualquier problema me avisas\"", texto: "Suena amable, pero cuando hay problema ya no contesta. Con la plata transferida no hay a quién reclamar." },
    ],
    comun: "Pasa en cada concierto agotado en Chile: venden entradas en PDF o en pantallazo, y el mismo QR se lo venden a varias personas. Solo entra el primero que llega.",
    conTrado: `Pagas en Trado y la plata queda retenida: no le llega al vendedor. Cuando recibes la entrada tienes ${REVIEW_HOURS.producto_digital} horas para revisarla; si no es válida, lo reportas y la plata no se mueve.`,
  },
];

export const TOTAL_CASOS = CASOS.length;

/** Qué caso abre cada carta del panel. La carta N tiene grabado trado.cl/etm/N */
export const CARTAS = [
  "comprobante-falso",
  "entradas-falsas",
  "zapatillas-baratas",
  "cabana-de-verano",
  "venta-en-persona",
  "te-pago-despues",
  "reserva-del-auto",
  "maestro-adelanto",
  "llego-otra-cosa",
];

export const casoPorSlug = (slug: string | undefined) => {
  if (slug && /^[1-9]$/.test(slug)) return CASOS.find((c) => c.slug === CARTAS[Number(slug) - 1]);
  return CASOS.find((c) => c.slug === slug);
};
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
