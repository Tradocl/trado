import React from "react";
import { Composition, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import { FPS, FUENTE, H, W } from "./marca";
import { DURACION, Regiones } from "./Regiones";

loadFont({ family: FUENTE, url: staticFile("fuentes/PlusJakartaSans.ttf"), weight: "200 800" });

export const Root: React.FC = () => (
  <>
    <Composition id="Regiones" component={Regiones} durationInFrames={DURACION} fps={FPS} width={W} height={H} />
  </>
);
