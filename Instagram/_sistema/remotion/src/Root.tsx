import React from "react";
import { Composition, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import { FPS, FUENTE, H, W } from "./marca";
import * as DesdeDondeQuieras from "./reels/DesdeDondeQuieras";

loadFont({ family: FUENTE, url: staticFile("fuentes/PlusJakartaSans.ttf"), weight: "200 800" });

// Un reel por composición; el id es el que se le pasa a scripts/final.py.
export const Root: React.FC = () => (
  <>
    <Composition id="DesdeDondeQuieras" component={DesdeDondeQuieras.DesdeDondeQuieras} defaultProps={{ musica: true }}
      durationInFrames={DesdeDondeQuieras.DURACION} fps={FPS} width={W} height={H} />
  </>
);
