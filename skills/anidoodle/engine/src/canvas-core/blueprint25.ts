import type { Film } from "./film";
import { drawBlueprint15 } from "./blueprint15";
import { drawNewsHalftone } from "./newsHalftone";

const TOTAL_FRAMES = 750; // 25.0 seconds @ 30 fps

export const blueprint25: Film = {
  meta: {
    title: "Going Train & Breaking News · 25-Second Blueprint to Newsprint Halftone",
    W: 1080,
    H: 1080,
    fps: 30,
    bpm: 120,
    durationFrames: TOTAL_FRAMES,
    kind: "drawing",
    holds: [
      [420, 450, "Act 1 complete blueprint plate hold"],
      [720, 750, "Act 2 complete newsprint halftone broadsheet hold"],
    ],
  },
  assets: {
    images: {
      news: "assets/news.png",
    },
  },
  shots: [
    {
      id: "blueprint",
      start: 0,
      end: 450,
      draw: (ctx, local, env) => drawBlueprint15(ctx, local, env),
    },
    {
      id: "newsHalftone",
      start: 450,
      end: 750,
      draw: (ctx, local, env) => drawNewsHalftone(ctx, local, env),
    },
  ],
};

export default blueprint25;
