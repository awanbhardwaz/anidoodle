import { Gfx, rng, type Ctx, type Env, type Medium, type P } from "./core";
import type { Film } from "./film";
import { letter } from "./drafting";
import { blob, fillShape, hatchRuns, inside, smooth } from "./gallery";
import { mutualFundsAudio, type ChalkFoley } from "./mutualFundsScore";

// HOW MUTUAL FUNDS WORK · 30s chalkboard explainer (1920x1080, 30fps, 90bpm, 900 frames).
const W = 1920, H = 1080, FPS = 30, BPM = 90, DURATION = 900;
const CHALK_M: Medium = { nib: 2.4, taper: 0.55, pressure: 0.95, retrace: true, wobble: 1.4, rough: 1.2 };
const CHALK = "#f4f0e6", YEL = "#f6e6a4", BLUE = "#a9d3e8", PINK = "#f3c1cf", GREEN = "#a8e6b8";
const B0 = 36, BX1 = W - 36, LEDGE = H - 84;

const prog = (f: number, a: number, b: number) => (f <= a ? 0 : f >= b ? 1 : (f - a) / (b - a));
const ease = (t: number) => t * t * (3 - 2 * t);

const chalk = (g: Gfx, draw: (dust: boolean) => void, dustAlpha = 0.2) => {
  g.group("plain", () => draw(true), { blur: 3.2, alpha: dustAlpha });
  g.group("plain", () => draw(false), { textures: ["pencilTooth", "risoSpeck"] });
};

const line = (g: Gfx, dust: boolean, pts: P[], w: number, color: string, seed: number, op = 0.92, wob = 1.0, progress = 1) => {
  if (progress <= 0) return;
  g.pen(pts, { w: dust ? w * 2.5 : w, color, seed, wobble: wob, boil: 0, opacity: op, retrace: !dust, taper: 1, progress });
};

const scumble = (
  g: Gfx,
  dust: boolean,
  region: P[],
  color: string,
  o: { angle: number; gap: number; w: number; alpha: number; seed: number; progress?: number },
) => {
  const { angle, gap, w, alpha, seed, progress = 1 } = o;
  if (progress <= 0) return;
  const r = rng(seed);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  region.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  const c = g.cur;
  g.touch(x0 - 12, y0 - 12, x1 + 12, y1 + 12);
  c.save(); c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = color; c.lineWidth = dust ? w * 2.2 : w;
  const runs = hatchRuns({ x0, y0, x1, y1 }, angle, gap, (x, y) => inside(region, x, y), 4, seed);
  const upto = progress * runs.length;
  runs.forEach((run, i) => {
    if (progress < 1 && i > upto) return;
    const pts = run.filter((_, k, a) => k % 2 === 0 || k === a.length - 1);
    const m = progress < 1 && i + 1 > upto ? Math.max(2, Math.ceil(pts.length * (upto - i))) : pts.length;
    c.globalAlpha = alpha * (0.86 + r() * 0.2);
    c.beginPath();
    pts.slice(0, m).forEach(([x, y], k) => (k ? c.lineTo(x + (r() - 0.5) * 1.6, y + (r() - 0.5) * 1.6) : c.moveTo(x, y)));
    c.stroke();
  });
  c.restore();
};

const arrow = (g: Gfx, dust: boolean, pts: P[], w: number, color: string, seed: number, progress: number) => {
  if (progress <= 0) return;
  const pLine = Math.min(1, progress / 0.85);
  line(g, dust, pts, w, color, seed, 0.9, 0.9, pLine);
  if (progress > 0.82) {
    const pHead = (progress - 0.82) / 0.18;
    const tip = pts[pts.length - 1], pre = pts[pts.length - 2];
    const a = Math.atan2(tip[1] - pre[1], tip[0] - pre[0]);
    const sz = 18;
    line(g, dust, [
      [tip[0] - Math.cos(a - 0.5) * sz, tip[1] - Math.sin(a - 0.5) * sz],
      tip,
      [tip[0] - Math.cos(a + 0.5) * sz, tip[1] - Math.sin(a + 0.5) * sz],
    ], w, color, seed + 1, 0.92, 0.4, pHead);
  }
};

const chalkBox = (g: Gfx, dust: boolean, x: number, y: number, w: number, h: number, color: string, seed: number, progress: number) => {
  if (progress <= 0) return;
  const pts: P[] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  line(g, dust, pts, 3.0, color, seed, 0.9, 1.1, progress);
};

// ---------------------------------------------------------------- slate board + wooden frame
const board = (g: Gfx, ctx: Ctx, wipeP = 1) => {
  const gr = ctx.createRadialGradient(W / 2, H * 0.44, 100, W / 2, H * 0.46, 1180);
  gr.addColorStop(0, "#35493f"); gr.addColorStop(0.62, "#27352f"); gr.addColorStop(1, "#1b2622");
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  g.paper("coldpress", 0.28);

  // erased lesson ghosts
  g.group("plain", () => {
    const r = rng(15);
    for (let i = 0; i < 12; i++) {
      const cx = 180 + r() * 1560, cy = 130 + r() * 780, rr = 140 + r() * 200, a0 = r() * 6;
      const pts: P[] = [];
      for (let k = 0; k <= 12; k++) { const a = a0 + (k / 12) * 2.2; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.5]); }
      g.pen(pts, { w: 46 + r() * 34, color: CHALK, seed: 20 + i, wobble: 3, boil: 0, opacity: 0.045, retrace: false, taper: 0.4, progress: Math.min(1, wipeP * 1.4) });
    }
  }, { blur: 9 });

  const wx = 80 + wipeP * (W - 160);
  const cut = (fn: () => void, left: boolean) => {
    const c = g.cur; c.save(); c.beginPath();
    if (left) c.rect(0, 0, wx, H); else c.rect(wx, 0, W - wx, H);
    c.clip(); fn(); c.restore();
  };
  g.group("plain", () => cut(() => {
    letter(g, "COMPOUND INTEREST", 260, 740, { cap: 34, color: CHALK, seed: 40, opacity: 0.1 });
    letter(g, "A = P(1 + R)^N", 1220, 760, { cap: 32, color: CHALK, seed: 41, opacity: 0.09 });
  }, true), { blur: 2.4 });
  if (wx < W - 90) {
    g.group("plain", () => cut(() => {
      letter(g, "COMPOUND INTEREST", 260, 740, { cap: 34, color: CHALK, seed: 40, opacity: 0.75 });
      letter(g, "A = P(1 + R)^N", 1220, 760, { cap: 32, color: CHALK, seed: 41, opacity: 0.72 });
    }, false), { textures: ["pencilTooth", "risoSpeck"] });
  }
};

const frame = (g: Gfx) => {
  g.group("plain", () => {
    const wood = "#7b5231", dark = "#553620", r = rng(70);
    fillShape(g, [[0, 0], [W, 0], [W, B0], [0, B0]], wood);
    fillShape(g, [[0, 0], [B0, 0], [B0, H], [0, H]], wood);
    fillShape(g, [[BX1, 0], [W, 0], [W, H], [BX1, H]], wood);
    fillShape(g, [[0, LEDGE], [W, LEDGE], [W, H], [0, H]], "#6a4526");
    fillShape(g, [[B0 - 8, LEDGE - 4], [BX1 + 8, LEDGE - 4], [BX1 + 20, LEDGE + 24], [B0 - 20, LEDGE + 24]], "#8c6139");
    for (let i = 0; i < 30; i++) { const y = r() * H, x = r() < 0.5 ? r() * B0 : BX1 + r() * B0; g.pen([[x, y], [x + (r() - 0.5) * 3, y + 50 + r() * 80]], { w: 1, color: dark, seed: 71 + i, wobble: 0.6, boil: 0, opacity: 0.45, retrace: false }); }
    for (let i = 0; i < 22; i++) { const x = r() * W, y = r() < 0.5 ? r() * B0 : LEDGE + 26 + r() * 54; g.pen([[x, y], [x + 80 + r() * 110, y + (r() - 0.5) * 3]], { w: 1, color: dark, seed: 110 + i, wobble: 0.6, boil: 0, opacity: 0.45, retrace: false }); }
    fillShape(g, [[B0, B0], [BX1, B0], [BX1 - 6, B0 + 8], [B0 + 8, B0 + 8], [B0 + 8, LEDGE - 4], [B0, LEDGE - 4]], "#0e1512", 0.55);
    for (let i = 0; i < 180; i++) { const x = B0 + r() * (BX1 - B0), y = LEDGE + 2 + r() * 20; fillShape(g, blob(x, y, 0.9 + r() * 1.8, 0.6 + r(), 150 + i, 0.3, 6), CHALK, 0.25 + r() * 0.45); }
    // chalk stub + felt eraser
    const st: P[] = [[1260, LEDGE + 2], [1370, LEDGE - 6], [1374, LEDGE + 10], [1264, LEDGE + 18]];
    fillShape(g, [[1266, LEDGE + 20], [1376, LEDGE + 12], [1380, LEDGE + 20], [1270, LEDGE + 26]], "#3a2616", 0.6);
    fillShape(g, st, CHALK); fillShape(g, [[1260, LEDGE + 11], [1374, LEDGE + 3], [1374, LEDGE + 10], [1264, LEDGE + 18]], "#d9d3c6");
    const er: P[] = [[460, LEDGE - 16], [610, LEDGE - 22], [616, LEDGE + 14], [466, LEDGE + 20]];
    fillShape(g, [[466, LEDGE + 20], [616, LEDGE + 14], [624, LEDGE + 24], [472, LEDGE + 28]], "#2a1a0e", 0.6);
    fillShape(g, er, "#a0714a"); fillShape(g, [[462, LEDGE + 4], [614, LEDGE - 2], [616, LEDGE + 14], [466, LEDGE + 20]], "#8e8a86");
  });
};

// ---------------------------------------------------------------- Shot 1: Hook (0..140)
const drawHook = (ctx: Ctx, local: number, env: Env) => {
  const g = new Gfx(ctx, env, 0, CHALK_M);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  board(g, ctx, ease(prog(local, 0, 42)));
  chalk(g, (dust) => {
    letter(g, "HOW MUTUAL FUNDS WORK", W / 2, 390, { cap: 76, color: CHALK, seed: 10, align: "center", w: 4.2, opacity: 0.96, progress: prog(local, 40, 96) });
    line(g, dust, [[420, 492], [960, 487], [1500, 494]], 4.0, YEL, 11, 0.92, 1.2, prog(local, 94, 108));
    line(g, dust, [[460, 508], [970, 504], [1460, 510]], 3.0, YEL, 12, 0.78, 1.4, prog(local, 100, 114));
    letter(g, "ONE POOL  ·  MANY STOCKS  ·  SHARED GROWTH", W / 2, 595, { cap: 32, color: BLUE, seed: 13, align: "center", w: 2.5, opacity: 0.9, progress: prog(local, 108, 134) });
  });
  frame(g);
};

// ---------------------------------------------------------------- Shot 2: Pooling (140..360, local 0..220)
const drawPooling = (ctx: Ctx, local: number, env: Env) => {
  const g = new Gfx(ctx, env, 0, CHALK_M);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  board(g, ctx, 1);

  const poolCenter: P = [1320, 540];
  const poolPoly: P[] = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    return [poolCenter[0] + Math.cos(a) * 240, poolCenter[1] + Math.sin(a) * 195];
  });

  chalk(g, (dust) => {
    letter(g, "1. POOLING MONEY", 130, 105, { cap: 46, color: CHALK, seed: 20, w: 3.0, progress: prog(local, 0, 24) });
    line(g, dust, [[130, 165], [580, 162]], 3.2, YEL, 21, 0.9, 1.0, prog(local, 20, 32));

    // 5 small investors on the left
    const ys = [265, 400, 535, 670, 805];
    ys.forEach((iy, idx) => {
      const pInv = prog(local, 22 + idx * 10, 48 + idx * 10);
      if (pInv <= 0) return;
      const ix = 230;
      const head = Array.from({ length: 13 }, (_, k) => {
        const a = (k / 12) * Math.PI * 2;
        return [ix + Math.cos(a) * 22, iy - 16 + Math.sin(a) * 22] as P;
      });
      line(g, dust, head, 2.5, CHALK, 30 + idx * 5, 0.9, 0.8, Math.min(1, pInv * 1.8));
      line(g, dust, [[ix - 28, iy + 36], [ix - 18, iy + 14], [ix + 18, iy + 14], [ix + 28, iy + 36]], 2.5, CHALK, 31 + idx * 5, 0.9, 0.8, Math.max(0, pInv * 1.8 - 0.8));
      // coin stack next to each investor
      const pCoin = prog(local, 42 + idx * 8, 62 + idx * 8);
      if (pCoin > 0) {
        const cx = ix + 86, cy = iy + 6;
        const coin = Array.from({ length: 13 }, (_, k) => {
          const a = (k / 12) * Math.PI * 2;
          return [cx + Math.cos(a) * 18, cy + Math.sin(a) * 18] as P;
        });
        line(g, dust, coin, 2.2, YEL, 32 + idx * 5, 0.92, 0.6, pCoin);
        letter(g, "$", cx, cy - 11, { cap: 20, color: YEL, seed: 33 + idx * 5, align: "center", w: 2.0, progress: pCoin });
      }
      // arrow from investor to pool
      const pArr = prog(local, 72 + idx * 8, 118 + idx * 8);
      const midX = 680 + (idx - 2) * 18;
      const targetY = poolCenter[1] + (idx - 2) * 58;
      arrow(g, dust, smooth([[365, iy + 4], [midX, (iy + targetY) / 2], [1055, targetY]], false, 3), 2.6, BLUE, 60 + idx * 4, pArr);
    });

    // Central Mutual Fund Pool
    const pFill = prog(local, 105, 165);
    scumble(g, dust, poolPoly, YEL, { angle: -0.6, gap: 11, w: 7, alpha: 0.24, seed: 80, progress: pFill });
    line(g, dust, [...poolPoly, poolPoly[0]], 3.6, YEL, 81, 0.95, 1.2, prog(local, 90, 130));
    letter(g, "MUTUAL FUND", poolCenter[0], poolCenter[1] - 46, { cap: 40, color: CHALK, seed: 82, align: "center", w: 3.0, progress: prog(local, 125, 155) });
    letter(g, "SHARED POOL", poolCenter[0], poolCenter[1] + 18, { cap: 26, color: YEL, seed: 83, align: "center", w: 2.2, progress: prog(local, 145, 175) });

    // Bottom takeaway
    letter(g, "MANY SMALL INVESTORS TO ONE COMBINED FUND", W / 2, 912, { cap: 28, color: CHALK, seed: 84, align: "center", w: 2.2, progress: prog(local, 160, 195) });
  });
  frame(g);
};

// ---------------------------------------------------------------- Shot 3: Diversification (360..600, local 0..240)
const drawDiversify = (ctx: Ctx, local: number, env: Env) => {
  const g = new Gfx(ctx, env, 0, CHALK_M);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  board(g, ctx, 1);

  const poolX = 330, poolY = 510;
  const poolPoly: P[] = Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * Math.PI * 2;
    return [poolX + Math.cos(a) * 145, poolY + Math.sin(a) * 125];
  });

  const sectors = [
    { name: "TECH", x: 1180, y: 195, col: BLUE, note: "+14%" },
    { name: "HEALTH", x: 1180, y: 365, col: GREEN, note: "+9%" },
    { name: "ENERGY", x: 1180, y: 535, col: PINK, note: "-6%" },
    { name: "BONDS", x: 1180, y: 705, col: CHALK, note: "+5%" },
  ];

  chalk(g, (dust) => {
    letter(g, "2. DIVERSIFICATION", 130, 105, { cap: 46, color: CHALK, seed: 100, w: 3.0, progress: prog(local, 0, 24) });
    line(g, dust, [[130, 165], [640, 162]], 3.2, YEL, 101, 0.9, 1.0, prog(local, 20, 32));

    // Left pool
    scumble(g, dust, poolPoly, YEL, { angle: -0.5, gap: 11, w: 6, alpha: 0.22, seed: 102, progress: prog(local, 22, 46) });
    line(g, dust, [...poolPoly, poolPoly[0]], 3.4, YEL, 103, 0.94, 1.1, prog(local, 18, 42));
    letter(g, "FUND", poolX, poolY - 32, { cap: 34, color: CHALK, seed: 104, align: "center", w: 2.6, progress: prog(local, 26, 46) });
    letter(g, "POOL", poolX, poolY + 12, { cap: 28, color: YEL, seed: 105, align: "center", w: 2.3, progress: prog(local, 32, 50) });

    // Branching arrows + 4 sector cards (clean vertical stack, zero arrow crossings)
    sectors.forEach((s, idx) => {
      const cy = s.y + 66;
      const pArr = prog(local, 44 + idx * 14, 84 + idx * 14);
      arrow(g, dust, smooth([[poolX + 150, poolY + (idx - 1.5) * 32], [820, (poolY + cy) / 2], [s.x - 18, cy]], false, 3), 2.5, BLUE, 120 + idx * 3, pArr);

      const pBox = prog(local, 68 + idx * 16, 114 + idx * 16);
      const boxPoly: P[] = [[s.x, s.y], [s.x + 520, s.y], [s.x + 520, s.y + 132], [s.x, s.y + 132]];
      scumble(g, dust, boxPoly, s.col, { angle: 0.7, gap: 15, w: 5, alpha: 0.12, seed: 140 + idx, progress: pBox });
      chalkBox(g, dust, s.x, s.y, 520, 132, s.col, 150 + idx, pBox);
      letter(g, s.name, s.x + 56, s.y + 46, { cap: 32, color: CHALK, seed: 160 + idx, w: 2.6, progress: prog(local, 90 + idx * 12, 120 + idx * 12) });

      const pStat = prog(local, 134 + idx * 10, 166 + idx * 10);
      letter(g, s.note, s.x + 410, s.y + 44, { cap: 34, color: s.col, seed: 170 + idx, align: "center", w: 2.6, progress: pStat });
    });

    // Pink ring on risk spread out
    const pNote = prog(local, 164, 198);
    letter(g, "IF ONE DIPS, OTHERS BALANCE IT", 1440, 885, { cap: 25, color: PINK, seed: 180, align: "center", w: 2.1, progress: pNote });
    const ringPts = Array.from({ length: 13 }, (_, k) => {
      const a = -0.2 + (k / 12) * Math.PI * 2.08;
      return [1440 + Math.cos(a) * 330, 898 + Math.sin(a) * 38] as P;
    });
    line(g, dust, ringPts, 2.4, PINK, 181, 0.85, 1.4, prog(local, 190, 222));

    letter(g, "ONE SHARE  =  DOZENS OF COMPANIES", 460, 912, { cap: 26, color: CHALK, seed: 182, align: "center", w: 2.1, progress: prog(local, 175, 212) });
  });
  frame(g);
};

// ---------------------------------------------------------------- Shot 4: Compounding (600..900, local 0..300)
const drawCompound = (ctx: Ctx, local: number, env: Env) => {
  const g = new Gfx(ctx, env, 0, CHALK_M);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  board(g, ctx, 1);

  const ox = 180, oy = 810, gw = 920, gh = 540;
  const curvePts: P[] = Array.from({ length: 21 }, (_, i) => {
    const t = i / 20;
    return [ox + t * gw, oy - Math.pow(t, 2.05) * (gh - 50) - 26];
  });
  const areaPoly: P[] = [...curvePts, [ox + gw, oy], [ox, oy]];

  chalk(g, (dust) => {
    letter(g, "3. COMPOUNDING OVER TIME", 130, 105, { cap: 46, color: CHALK, seed: 200, w: 3.0, progress: prog(local, 0, 26) });
    line(g, dust, [[130, 165], [760, 162]], 3.2, YEL, 201, 0.9, 1.0, prog(local, 20, 34));

    // Axes
    const pAxes = prog(local, 28, 62);
    arrow(g, dust, [[ox, oy], [ox, oy - gh]], 3.0, CHALK, 202, pAxes);
    arrow(g, dust, [[ox, oy], [ox + gw + 30, oy]], 3.0, CHALK, 203, pAxes);
    letter(g, "VALUE", ox - 40, oy - gh - 44, { cap: 24, color: CHALK, seed: 204, align: "center", w: 2.0, progress: prog(local, 44, 66) });
    letter(g, "TIME", ox + gw + 56, oy - 12, { cap: 24, color: CHALK, seed: 205, w: 2.0, progress: prog(local, 44, 66) });

    // Cash flat baseline
    const pCash = prog(local, 62, 106);
    line(g, dust, [[ox + 20, oy - 36], [ox + gw - 20, oy - 120]], 2.6, BLUE, 206, 0.85, 0.9, pCash);
    letter(g, "CASH", ox + gw - 140, oy - 158, { cap: 24, color: BLUE, seed: 207, w: 2.0, progress: prog(local, 88, 114) });

    // Compounding curve + scumbled fill
    const pCurve = prog(local, 92, 178);
    scumble(g, dust, areaPoly, GREEN, { angle: 0.75, gap: 14, w: 5.5, alpha: 0.16, seed: 210, progress: pCurve });
    line(g, dust, curvePts, 4.0, GREEN, 211, 0.96, 0.9, pCurve);
    letter(g, "COMPOUNDING", ox + 430, oy - 430, { cap: 30, color: GREEN, seed: 212, w: 2.4, progress: prog(local, 130, 172) });

    // Milestone dots
    [0.25, 0.5, 0.75, 1.0].forEach((t, idx) => {
      const pDot = prog(local, 110 + idx * 18, 126 + idx * 18);
      if (pDot <= 0) return;
      const mx = ox + t * gw, my = oy - Math.pow(t, 2.05) * (gh - 50) - 26;
      const dot = Array.from({ length: 11 }, (_, k) => {
        const a = (k / 10) * Math.PI * 2;
        return [mx + Math.cos(a) * 9, my + Math.sin(a) * 9] as P;
      });
      line(g, dust, dot, 3.0, YEL, 220 + idx, 0.95, 0.4, pDot);
    });

    // Takeaway box on the right
    const bx = 1230, by = 270, bw = 560, bh = 510;
    chalkBox(g, dust, bx, by, bw, bh, YEL, 230, prog(local, 168, 204));
    letter(g, "KEY TAKEAWAYS", bx + bw / 2, by + 48, { cap: 32, color: YEL, seed: 231, align: "center", w: 2.6, progress: prog(local, 186, 214) });
    line(g, dust, [[bx + 60, by + 104], [bx + bw - 60, by + 104]], 2.2, YEL, 232, 0.8, 0.8, prog(local, 198, 218));
    letter(g, "1. START SMALL", bx + 66, by + 165, { cap: 30, color: CHALK, seed: 233, w: 2.4, progress: prog(local, 206, 230) });
    letter(g, "2. STAY DIVERSIFIED", bx + 66, by + 265, { cap: 30, color: BLUE, seed: 234, w: 2.4, progress: prog(local, 220, 244) });
    letter(g, "3. LET TIME WORK", bx + 66, by + 365, { cap: 30, color: GREEN, seed: 235, w: 2.4, progress: prog(local, 234, 258) });
  });
  frame(g);
};

// ---------------------------------------------------------------- Foley & Audio
const foley: ChalkFoley[] = [
  { t0: 0 / FPS, t1: 40 / FPS, kind: "erase", x: 0.5 },
  { t0: 40 / FPS, t1: 112 / FPS, kind: "chalk", x: 0.5 },
  { t0: 140 / FPS, t1: 170 / FPS, kind: "chalk", x: 0.2 },
  { t0: 215 / FPS, t1: 295 / FPS, kind: "scumble", x: 0.65 },
  { t0: 360 / FPS, t1: 392 / FPS, kind: "chalk", x: 0.2 },
  { t0: 430 / FPS, t1: 520 / FPS, kind: "chalk", x: 0.7 },
  { t0: 600 / FPS, t1: 632 / FPS, kind: "chalk", x: 0.25 },
  { t0: 692 / FPS, t1: 778 / FPS, kind: "scumble", x: 0.45 },
  { t0: 786 / FPS, t1: 856 / FPS, kind: "chalk", x: 0.8 },
];

export const mutualFunds: Film = {
  meta: {
    title: "How Mutual Funds Work",
    W,
    H,
    fps: FPS,
    bpm: BPM,
    durationFrames: DURATION,
    raster: "cpu",
    kind: "drawing",
    holds: [[860, 900, "final takeaway read"]],
    poster: 880,
    score: { tempo: BPM, form: "G major minimalist ostinato + plucked melody + chapter pings + resolve" },
  },
  assets: { images: {} },
  shots: [
    { id: "hook", start: 0, end: 140, draw: drawHook },
    { id: "pooling", start: 140, end: 360, draw: drawPooling },
    { id: "diversify", start: 360, end: 600, draw: drawDiversify },
    { id: "compound", start: 600, end: 900, draw: drawCompound },
  ],
  audio: mutualFundsAudio({
    bpm: BPM,
    seconds: DURATION / FPS,
    chapterBeats: [0, 7, 18, 30],
    resolveBeat: 42,
    foley,
  }),
};
