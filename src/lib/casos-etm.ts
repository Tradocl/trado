// Casos de estafa del stand del EtMday 2026: cada tarjeta NFC del panel abre /etm/<slug>.
// Para sumar un caso basta agregarlo acá; la página arma el chat, la pregunta y la revelación.

export type Mensaje =
  | { de: "ellos" | "yo"; texto: string }
  | { de: "ellos"; comprobante: { monto: number; banco: string; hora: string; operacion: string } };

export type Caso = {
  slug: string;
  numero: number;
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

export const TOTAL_CASOS = 6;

export const CASOS: Caso[] = [
  {
    slug: "comprobante-falso",
    numero: 1,
    titulo: "El comprobante falso",
    escena: "Vendes tu bicicleta en $180.000 y te escribe alguien interesado.",
    contacto: { nombre: "Comprador", inicial: "C", rol: "quiere tu bicicleta" },
    chat: [
      { de: "ellos", texto: "Hola! ¿Sigue disponible la bici? 🚲" },
      { de: "yo", texto: "Sí, todavía la tengo" },
      { de: "ellos", texto: "Buenísimo, te la compro. Te transfiero altiro" },
      { de: "ellos", comprobante: { monto: 180_000, banco: "Cuenta corriente ****4821", hora: "15:42", operacion: "0004588127" } },
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
];

export const casoPorSlug = (slug: string | undefined) => CASOS.find((c) => c.slug === slug);
