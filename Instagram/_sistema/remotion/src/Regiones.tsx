import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, FUENTE, rebote, s, suave } from "./marca";
import { MATERIAL } from "./material";
import { Cabecera, Clip, Fondo, Pildora, Sfx, Subtitulo, Titulo } from "./piezas/base";
import { Chat } from "./piezas/Chat";
import { Mapa, NOMBRES } from "./piezas/Mapa";
import { Postal, Region } from "./piezas/Postal";
import { Sala } from "./piezas/Sala";
import { Ciudad } from "./chile";

// Reel "Desde donde quieras": comprar y vender desde región, con envío.
// Borrador v1: los clips tuyos son recuadros hasta que se graben (ver material.ts).
//
//  0.0– 3.0  Hook: tú a cámara
//  3.0– 8.0  El problema: lejos, alguien tiene que confiar primero
//  8.0–14.0  Montaje: 4 lugares de Chile, 1,5 s cada uno
// 14.0–17.0  No somos un marketplace: te sumas a lo que ya usas
// 17.0–22.5  Trado se pone al medio: la sala paso a paso
// 22.5–26.0  Remate tuyo + cierre
export const DURACION = s(26);

export const Regiones: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FUENTE, background: C.tinta }}>
    <Sequence durationInFrames={s(3)}><Hook /></Sequence>
    <Sequence from={s(3)} durationInFrames={s(5)}><Problema /></Sequence>
    <Sequence from={s(8)} durationInFrames={s(6)}><Montaje /></Sequence>
    <Sequence from={s(14)} durationInFrames={s(3)}><NoMarketplace /></Sequence>
    <Sequence from={s(17)} durationInFrames={s(5.5)}><AlMedio /></Sequence>
    <Sequence from={s(22.5)} durationInFrames={s(3.5)}><Cierre /></Sequence>
    {MATERIAL.voz && (
      <Sequence from={s(3)}><Audio src={staticFile(MATERIAL.voz)} /></Sequence>
    )}
    <Efectos />
  </AbsoluteFill>
);

const Hook: React.FC = () => (
  <AbsoluteFill>
    <Fondo tipo="oscuro" />
    <Clip src={MATERIAL.hook} etiqueta={"Tú a cámara:\n«Si vives en región, comprar por Marketplace es una apuesta.»"} />
    <Subtitulo texto="Si vives en región, comprar por Marketplace es una apuesta." desde={4} hasta={s(2.9)} />
  </AbsoluteFill>
);

const Problema: React.FC = () => {
  const f = useCurrentFrame();
  // Primero el mapa solo (la distancia); cuando entra el chat queda de fondo
  const fondo = 1 - 0.8 * suave(f, 34, 10);
  return (
  <AbsoluteFill>
    <Fondo tipo="oscuro" />
    <Cabecera />
    <Titulo texto="Si no es en persona, alguien tiene que confiar primero." marca="confiar" colorMarca={C.naranjo} y={250} size={76} />
    <Mapa x={420} y={540} escala={0.62} desde={2} ciudades={["calama", "puertoMontt"]} rutas={[{ de: "calama", a: "puertoMontt", desde: 16, dur: 16, color: C.naranjo, dudosa: true }]} opacidad={fondo} />
    <Chat y={720} mensajes={[
      { de: "otro", texto: "¿Me lo mandas por courier? Te transfiero altiro", en: 40 },
      { de: "yo", texto: "¿Y si te lo mando y no me pagas?", en: 75 },
      { de: "otro", texto: "¿Y si me llega un ladrillo?", en: 105 },
    ]} />
  </AbsoluteFill>
  );
};

const LUGARES: { region: Region; ciudad: Ciudad; texto: string; marca: string; clip: string | null }[] = [
  { region: "desierto", ciudad: "calama", texto: "Vendo desde Calama.", marca: "Calama", clip: MATERIAL.calama },
  { region: "playa", ciudad: "laSerena", texto: "Compro desde la playa.", marca: "playa", clip: MATERIAL.laSerena },
  { region: "cordillera", ciudad: "coyhaique", texto: "Desde la cordillera.", marca: "cordillera", clip: MATERIAL.cordillera },
  { region: "sur", ciudad: "castro", texto: "Desde Chiloé.", marca: "Chiloé", clip: MATERIAL.chiloe },
];

const REGION_DE: Partial<Record<Ciudad, string>> = {
  calama: "Antofagasta",
  laSerena: "Coquimbo",
  coyhaique: "Aysén",
  castro: "Los Lagos",
};

const Montaje: React.FC = () => (
  <AbsoluteFill>
    {LUGARES.map((l, i) => (
      <Sequence key={l.region} from={i * 45} durationInFrames={45}>
        <Lugar {...l} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

const Lugar: React.FC<(typeof LUGARES)[number]> = ({ region, ciudad, texto, marca, clip }) => {
  const f = useCurrentFrame();
  const k = rebote(f, 0);
  return (
    <AbsoluteFill>
      <Postal region={region} />
      <Titulo texto={texto} marca={marca} y={250} size={72} />
      {/* Tú en el lugar: por ahora en un marco de postal; con el recorte de fondo vas parado en el paisaje */}
      <div style={{ position: "absolute", left: 170, top: 420, width: 740, height: 960, borderRadius: 40, overflow: "hidden", border: "14px solid #fff",
        boxShadow: "0 30px 70px rgba(0,0,0,0.35)", transform: `rotate(${(1 - k) * -8 + (region === "playa" || region === "sur" ? 2 : -2)}deg) scale(${0.8 + 0.2 * k})` }}>
        <Clip src={clip} etiqueta={`Tú con look de ${region === "desierto" ? "desierto" : region === "playa" ? "playa" : region === "cordillera" ? "cordillera" : "lluvia del sur"}`} />
      </div>
      <Pildora texto={`${NOMBRES[ciudad]}, ${REGION_DE[ciudad]}`} style={{ top: 1410, left: "50%", transform: `translateX(-50%) scale(${rebote(f, 6)})`, whiteSpace: "nowrap" }} />
    </AbsoluteFill>
  );
};

const NoMarketplace: React.FC = () => {
  const f = useCurrentFrame();
  const chips = ["Tu publicación", "Tu chat", "Tu courier"];
  return (
    <AbsoluteFill>
      <Fondo tipo="marca" />
      <Cabecera />
      <Titulo texto="No somos un marketplace." marca="marketplace" y={330} size={96} />
      <div style={{ position: "absolute", top: 620, left: 80, right: 80, textAlign: "center", color: C.blanco, fontSize: 54, fontWeight: 700, opacity: suave(f, 18) }}>
        Sigue vendiendo donde ya vendes.
      </div>
      {chips.map((c, i) => (
        <Pildora key={c} texto={c} style={{ top: 800 + i * 150, left: "50%", transform: `translateX(-50%) scale(${rebote(f, 30 + i * 8)})`, fontSize: 48 }} />
      ))}
      <div style={{ position: "absolute", top: 1290, left: 80, right: 80, textAlign: "center", color: C.blanco, fontSize: 54, fontWeight: 800, opacity: suave(f, 66) }}>
        + Trado para el pago.
      </div>
    </AbsoluteFill>
  );
};

const AlMedio: React.FC = () => (
  <AbsoluteFill>
    <Fondo tipo="marca" />
    <Cabecera />
    <Titulo texto="Trado se pone al medio." marca="medio" y={250} size={88} />
    <Sala y={520} desde={8} producto="Bicicleta" monto="$180.000"
      estado={[
        { texto: "Esperando pago", color: "#B26B00", fondo: "#FFF1D6", en: 0 },
        { texto: "Pago retenido en escrow", color: "#047857", fondo: "#D1FAE5", en: 24 },
        { texto: "72 h para revisar", color: "#C2410C", fondo: "#FFEDD5", en: 84 },
        { texto: "Pago liberado", color: "#047857", fondo: "#D1FAE5", en: 120 },
      ]}
      pasos={[
        { texto: "El comprador paga en Trado", en: 24 },
        { texto: "Envías con tu courier", en: 54 },
        { texto: "Llega y tiene 72 h para revisar", en: 84 },
        { texto: "Se libera la plata", en: 120 },
      ]} />
    <Remate />
  </AbsoluteFill>
);

// Cierra la idea del problema: ya nadie tiene que confiar primero
const Remate: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 1360, left: 80, right: 80, textAlign: "center", color: C.blanco, fontSize: 60, fontWeight: 800, letterSpacing: "-0.02em",
      opacity: suave(f, 130), transform: `translateY(${(1 - suave(f, 130)) * 30}px)` }}>
      Nadie tiene que confiar primero.
    </div>
  );
};

const Cierre: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={s(1.5)}>
        <Fondo tipo="marca" />
        <Clip src={MATERIAL.remate} etiqueta="Tú a cámara: el remate" />
      </Sequence>
      <Sequence from={s(1.5)}>
        <Fondo tipo="marca" />
        <div style={{ position: "absolute", top: 560, width: "100%", textAlign: "center", color: C.blanco, fontWeight: 800, fontSize: 190, letterSpacing: "-0.04em", transform: `scale(${rebote(f, s(1.5))})` }}>trado</div>
        {/* Dentro de esta Sequence el reloj parte de 0 */}
        <Titulo texto="Compra y vende desde donde quieras, con la confianza de hacerlo en persona." marca="persona" y={830} size={58} desde={6} />
        <Pildora texto="trado.cl" style={{ top: 1130, left: "50%", transform: `translateX(-50%) scale(${rebote(f, s(1.5) + 20)})`, fontSize: 60, color: C.azul, padding: "22px 70px" }} />
      </Sequence>
    </AbsoluteFill>
  );
};

// Sonido: mismos efectos que los reels de Pillow (npm run sfx los regenera).
const Efectos: React.FC = () => (
  <>
    <Sfx nombre="pop" en={s(3) + 40} />
    <Sfx nombre="pop_grave" en={s(3) + 75} />
    <Sfx nombre="fracaso" en={s(3) + 105} vol={0.8} />
    {[0, 1, 2, 3].map((i) => <Sfx key={i} nombre="whoosh_sube" en={s(8) + i * 45 - 4} />)}
    <Sfx nombre="golpe" en={s(14)} />
    {[0, 1, 2].map((i) => <Sfx key={i} nombre="pop_agudo" en={s(14) + 30 + i * 8} />)}
    <Sfx nombre="whoosh_baja" en={s(17)} />
    {[24, 54, 84].map((k) => <Sfx key={k} nombre="tic" en={s(17) + k} />)}
    <Sfx nombre="campanas" en={s(17) + 120} />
    <Sfx nombre="golpe" en={s(24)} />
  </>
);
