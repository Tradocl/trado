import React from "react";
import { Composition, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import { FPS, FUENTE, H, W } from "./marca";
import { DURACION, Regiones } from "./Regiones";
import { DURACION_HOOK, Hook } from "./Hook";

loadFont({ family: FUENTE, url: staticFile("fuentes/PlusJakartaSans.ttf"), weight: "200 800" });

export const Root: React.FC = () => (
  <>
    <Composition id="Hook" component={Hook} durationInFrames={DURACION_HOOK} fps={FPS} width={W} height={H} />
    <Composition id="Regiones" component={Regiones} durationInFrames={DURACION} fps={FPS} width={W} height={H} />
  </>
);
