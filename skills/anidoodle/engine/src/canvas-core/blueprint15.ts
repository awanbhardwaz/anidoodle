import { type Ctx, type Env, Gfx } from "./core";
import type { Film } from "./film";
import { DRAFT, blit, kit, sheet, slot, tooth } from "./blueprintKit";
import { PART } from "./blueprint";

const N = 450, HOLD = 30;
// ---------------------------------------------------------------- THE CUE TABLE (450 frames = 15.0 seconds @ 30 fps)
// Every frame number in the film is here and nowhere else. Parts run one after another, as one
// hand does them; a part is 0 before its start and exactly 1 from its end.
export const CUES15: [string, number, number][] = [
  ["border", 0, 40],        /* the sheet is ruled stroke by stroke, then zone-marked */
  ["titleBox", 40, 65],     /* the title block is ruled early; it is lettered last */
  ["construct", 65, 125],   /* centre lines, pitch circles swung, projection lines dropped */
  ["plate", 125, 145],      /* the pillar plate's edge and its four pillars */
  ["w0", 145, 170],         /* centre wheel, the top of the stack */
  ["p1", 170, 180], ["w1", 180, 200],   /* third pinion, then the third wheel under it */
  ["p2", 200, 210], ["w2", 210, 225],   /* fourth pinion, fourth wheel */
  ["p3", 225, 235], ["w3", 235, 250],   /* escape pinion, escape wheel */
  ["section", 250, 285],    /* section A-A outlines */
  ["lining", 285, 310],     /* section lining */
  ["detail", 310, 325],     /* detail C, the club tooth */
  ["detailD", 325, 340],    /* detail D, the depthing of the first mesh */
  ["dims", 340, 365],       /* dimensions and the cutting plane */
  ["table", 365, 385],      /* the train table */
  ["notes", 385, 405],      /* balloons, callouts, notes */
  ["title", 405, 420],      /* the title block lettering; the title itself is the last word */
];

{
  let t = 0;
  for (const [id, a, b] of CUES15) {
    if (a % 5 || b % 5) throw new Error(`blueprint15: cue ${id} off the 5-frame grid`);
    if (a < t) throw new Error(`blueprint15: cue ${id} overlaps the one before`);
    t = b;
  }
  if (t > N - HOLD) throw new Error("blueprint15: the hold is shorter than 30 frames");
  if (N % 15) throw new Error("blueprint15: duration off the beat");
}

const progressAt = (f: number, a: number, b: number) => (f >= b ? 1 : f <= a ? 0 : (f - a) / (b - a));

const stack = (env: Env, n: number) => {
  const s = slot(env, "stack15"), have = s.key === null ? -1 : Number(s.key);
  if (have === n) return s.L;
  const g = new Gfx(s.L.ctx, env, 0, DRAFT), k = kit(g);
  let from = have;
  if (have < 0 || have > n) {
    s.L.ctx.setTransform(1, 0, 0, 1, 0, 0);
    s.L.ctx.clearRect(0, 0, s.L.canvas.width, s.L.canvas.height);
    g.cur = s.L.ctx;
    sheet(k);
    from = 0;
  }
  for (let i = from; i < n; i++) PART[CUES15[i][0]](k, 1);
  s.key = String(n);
  return s.L;
};

export const drawBlueprint15 = (ctx: Ctx, frame: number, env: Env) => {
  const f = Math.max(0, Math.min(N - 1, frame)), n = CUES15.filter(([, , b]) => f >= b).length;
  blit(ctx, stack(env, n));
  const g = new Gfx(ctx, env, 0, DRAFT), k = kit(g);
  CUES15.forEach(([id, a, b], i) => {
    if (i < n) return;
    const q = progressAt(f, a, b);
    if (q > 0) PART[id](k, q);
  });
  tooth(g);
};

export const blueprint15: Film = {
  meta: {
    title: "Going train · 15-second cyanotype blueprint drafting sheet",
    W: 1080,
    H: 1080,
    fps: 30,
    bpm: 120,
    durationFrames: N,
    kind: "drawing",
    holds: [[420, 450, "final complete drafting sheet held"]],
  },
  assets: { images: {} },
  shots: [{ id: "blueprint15", start: 0, end: N, draw: (ctx, f, env) => drawBlueprint15(ctx, f, env) }],
};

export default blueprint15;
