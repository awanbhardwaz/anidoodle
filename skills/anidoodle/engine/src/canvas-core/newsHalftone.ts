import type { Ctx, Env, Layer, P } from "./core";
import { clamp, newsprint, plateLayer, screenDots, starve, toneAt, newTone, type Tone } from "./halftoneKit";

// NEWSPRINT HALFTONE · Web-offset press printing of the CNBC news broadsheet
// Two plates: BLACK on 45° AM contact screen, SPOT ORANGE on 15° screen (30° rosette).
// Oil ink on unbleached groundwood newsprint with dot gain, spread halos, and fibre wicking.
// Process: Press make-ready sequence over 300 frames (10.0 seconds @ 30 fps).
// Each 15 frames (0.5s) a fresh newsprint sheet slides from the press onto the delivery pile.

const DURATION = 300;
const BEAT = 15; // 0.5s per sheet
const SLIDE = 6; // frames for sheet to land

export const BLACK = "#1d1a17", SPOT = "#e86a2c";
const PITCH = 5.0, ANG_K = 45, ANG_S = 15, GAIN_K = 0.40, GAIN_S = 0.28, FAN = 0.0015;
const REG_FINAL: P = [0.8, 1.2]; // Approved sheet register
const REG_START: P = [8.5, -6.5]; // Initial misregistration
const KEYS = 12; // Ink fountain keys
const STRIPS = 54;

const CUE = {
  firstSheet: 15,
  blackOn: 105,
  register: 210,
  lastSheet: 270,
} as const;

const SHEETS = Math.floor((CUE.lastSheet - CUE.firstSheet) / BEAT) + 1; // 18 sheets thrown

// Build the two continuous-tone separations (Black and Spot) from the user's news image
const buildNewsTone = (env: Env): Tone => {
  const W = env.W, H = env.H;
  const key = `newsHalftone:tone:${W}x${H}`;
  let hit = env.cache.get(key) as Tone | undefined;
  if (hit) return hit;

  const tw = Math.round(W / 2), th = Math.round(H / 2);
  const T = newTone(tw, th, W, H);

  const img = env.image?.("news") as (CanvasImageSource & { width: number; height: number; naturalWidth?: number; naturalHeight?: number }) | undefined;
  if (!img) return T;

  const iw = img.naturalWidth ?? img.width ?? 1024;
  const ih = img.naturalHeight ?? img.height ?? 358;

  // Render on offscreen canvas at logical scale
  const L = env.canvas(W, H);
  const c = L.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, W, H);

  // Position news clipping on the broadsheet
  const scale = Math.min((W - 80) / iw, 1.0);
  const dw = Math.round(iw * scale);
  const dh = Math.round(ih * scale);
  const ox = Math.round((W - dw) / 2);
  const oy = 280;

  // Masthead & Broadsheet furniture
  c.fillStyle = "#1d1a17";
  c.font = "bold 22px serif";
  c.textAlign = "center";
  c.fillText("★ THE FINANCIAL DISPATCH ★", W / 2, 195);

  c.font = "11px sans-serif";
  c.fillText("NEW YORK · WASHINGTON · SUNDAY, OCTOBER 4, 2026 · FINAL LATE EDITION", W / 2, 222);

  // Ruled borders around the article
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(ox, 240);
  c.lineTo(ox + dw, 240);
  c.moveTo(ox, 245);
  c.lineTo(ox + dw, 245);
  c.stroke();

  // Draw the image
  c.drawImage(img, ox, oy, dw, dh);

  // Bottom double rule
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(ox, oy + dh + 35);
  c.lineTo(ox + dw, oy + dh + 35);
  c.stroke();

  c.font = "italic 11px serif";
  c.textAlign = "left";
  c.fillText("CNBC WIRE SERVICES · POLITICS & POLICY REPORT", ox, oy + dh + 58);
  c.textAlign = "right";
  c.fillText("PRINTED ON WEB-OFFSET PRESS NO. 4", ox + dw, oy + dh + 58);

  // Extract pixel data to build Black (k) and Spot (s) float separations
  const src = c.getImageData(0, 0, W, H).data;

  for (let j = 0; j < th; j++) {
    for (let i = 0; i < tw; i++) {
      const sx = Math.floor((i / tw) * W);
      const sy = Math.floor((j / th) * H);
      const p = (sy * W + sx) * 4;

      const r = src[p] / 255;
      const g = src[p + 1] / 255;
      const b = src[p + 2] / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      let kVal = 0, sVal = 0;

      // Detect "POLITICS & POLICY" tag or navy blue header bar
      const isTopNav = sy >= oy && sy < oy + Math.round(48 * scale);
      const isTag = sy >= oy + Math.round(52 * scale) && sy < oy + Math.round(92 * scale) && sx < ox + Math.round(260 * scale);
      const isReporter = sy >= oy + Math.round(260 * scale) && sx < ox + Math.round(180 * scale);

      if (lum < 0.92) {
        const dark = 1.0 - lum;

        if (isTag) {
          // Vibrant spot orange headline tag
          sVal = clamp(dark * 1.25);
          kVal = clamp(dark * 0.2);
        } else if (isTopNav) {
          // Navy CNBC bar: rich warm black
          kVal = clamp(dark * 1.05);
          sVal = clamp(dark * 0.45);
        } else if (isReporter) {
          // Photo portrait: warm halftone separation
          kVal = clamp(dark * 0.95);
          sVal = clamp(dark * (1 - r) * 0.8 + 0.15 * dark);
        } else {
          // Main headline text: crisp black with spot warmth on emphasis
          kVal = clamp(dark * 1.1);
          // Spot accents on "$5,000" region
          if (sx > ox + Math.round(80 * scale) && sx < ox + Math.round(450 * scale) && sy > oy + Math.round(130 * scale) && sy < oy + Math.round(230 * scale)) {
            sVal = clamp(dark * 0.35);
          } else {
            sVal = clamp(dark * 0.12);
          }
        }
      }

      // Border and masthead lines: solid black with spot accent
      if (sy < oy - 20 || sy > oy + dh + 10) {
        if (lum < 0.85) {
          kVal = clamp((1.0 - lum) * 1.2);
          sVal = 0.15 * kVal;
        }
      }

      const q = j * tw + i;
      T.k[q] = kVal;
      T.s[q] = sVal;
    }
  }

  env.cache.set(key, T);
  return T;
};

// Halftone plate generation
const photoBounds = (W: number, H: number) => ({
  x0: Math.round(W * 0.03),
  y0: Math.round(H * 0.08),
  x1: Math.round(W * 0.97),
  y1: Math.round(H * 0.92),
});

const plates = (env: Env) => {
  const T = buildNewsTone(env);
  const b = photoBounds(env.W, env.H);
  const tag = `news:${env.W}x${env.H}@${env.scale}`;
  const inside = (x: number, y: number) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;

  const kDots = (env.cache.get(`halftone:kdots:${tag}`) as ReturnType<typeof screenDots> | undefined) ?? (() => {
    const d = screenDots(b, PITCH, ANG_K, (x, y) => (inside(x, y) ? toneAt(T, T.k, x, y) : 0), GAIN_K);
    env.cache.set(`halftone:kdots:${tag}`, d);
    return d;
  })();

  const sDots = (env.cache.get(`halftone:sdots:${tag}`) as ReturnType<typeof screenDots> | undefined) ?? (() => {
    const d = screenDots(b, PITCH, ANG_S, (x, y) => (inside(x, y) ? toneAt(T, T.s, x, y) : 0), GAIN_S, FAN);
    env.cache.set(`halftone:sdots:${tag}`, d);
    return d;
  })();

  return {
    k: plateLayer(env, `halftone:kplate:${tag}`, kDots, BLACK, 0.92, 7),
    s: plateLayer(env, `halftone:splate:${tag}`, sDots, SPOT, 0.82, 11),
    b,
  };
};

// Make-ready schedule
type Sheet = { spot: (x: number) => number; black: (x: number) => number; reg: P; seed: number };
const hash = (a: number, b: number) => (Math.abs(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1);

const across = (level: number, seed: number) => (x: number) => {
  if (level >= 1) return 1;
  if (level <= 0) return 0;
  const f = x * (KEYS - 1), i = Math.floor(f), t = f - i;
  const e = (1 - Math.cos(t * Math.PI)) / 2;
  const key = (z: number) => clamp(level * 1.5 - hash(z, seed) * 0.6 - 0.1);
  return key(i) * (1 - e) + key(Math.min(KEYS - 1, i + 1)) * e;
};

const I_BLACK = Math.floor((CUE.blackOn - CUE.firstSheet) / BEAT);
const I_REG = Math.floor((CUE.register - CUE.firstSheet) / BEAT);

const sheet = (i: number): Sheet => {
  const done = i >= SHEETS - 1;
  const lS = done ? 1 : Math.min(1, (i + 1) / I_BLACK) * (i >= I_BLACK + 2 ? 2 : 1);
  const lK = done ? 1 : i < I_BLACK ? 0 : Math.min(1, (i - I_BLACK + 1) / (I_REG - I_BLACK)) * (i >= I_REG ? 2 : 1);
  const nudge = clamp((i - I_REG) / Math.max(1, SHEETS - 1 - I_REG));
  const reg: P = [REG_START[0] + (REG_FINAL[0] - REG_START[0]) * nudge, REG_START[1] + (REG_FINAL[1] - REG_START[1]) * nudge];
  return { spot: across(lS, 3 + (i % 3)), black: across(lK, 7 + (i % 2)), reg, seed: i };
};

// Print one newsprint sheet off the press
const printSheet = (env: Env, i: number): Layer => {
  const key = `newsHalftone:sheet:${i}:${env.W}x${env.H}@${env.scale}`;
  let L = env.cache.get(key) as Layer | undefined;
  if (L) return L;

  for (const ck of [...env.cache.keys()]) {
    if (ck.startsWith("newsHalftone:sheet:")) {
      const n = Number(ck.split(":")[2]);
      if (n < i - 1 || n > i + 1) env.cache.delete(ck);
    }
  }

  const W = env.W, H = env.H, k = env.scale;
  const DW = Math.round(W * k), DH = Math.round(H * k);
  L = env.canvas(DW, DH);
  const c = L.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);

  // Background: Unbleached groundwood newsprint paper
  c.drawImage(newsprint(env, `newsHalftone:paper:${W}x${H}@${k}`).canvas, 0, 0);

  if (i < 0) {
    env.cache.set(key, L);
    return L;
  }

  const sh = sheet(i), P = plates(env);
  const tk = `newsHalftone:tmp:${DW}x${DH}`;
  const tmp = (env.cache.get(tk) as Layer | undefined) ?? (() => {
    const t = env.canvas(DW, DH);
    env.cache.set(tk, t);
    return t;
  })();

  const ink = (plate: Layer, dens: (x: number) => number, off: P, seed: number) => {
    const sw = W / STRIPS;
    const d = Array.from({ length: STRIPS }, (_, z) => dens((z + 0.5) / STRIPS));
    if (d.every((v) => v <= 0)) return;

    const t = tmp.ctx;
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.globalCompositeOperation = "copy";
    t.drawImage(plate.canvas, Math.round(off[0] * k), Math.round(off[1] * k));
    t.globalCompositeOperation = "source-over";

    const sft: P = [hash(seed, 1) * 256, hash(seed, 2) * 256];
    d.forEach((v, z) => {
      if (v < 1) starve(t, env, [z * sw, 0, (z + 1) * sw, H], 1 - v * 0.9, sft);
    });

    c.save();
    c.globalCompositeOperation = "multiply";
    d.forEach((v, z) => {
      if (v <= 0) return;
      const x0 = Math.floor(z * sw * k);
      const x1 = z === STRIPS - 1 ? DW : Math.floor((z + 1) * sw * k);
      c.globalAlpha = v >= 1 ? 1 : 0.3 + 0.7 * v;
      c.drawImage(tmp.canvas, x0, 0, x1 - x0, DH, x0, 0, x1 - x0, DH);
    });
    c.restore();
  };

  ink(P.s, sh.spot, sh.reg, sh.seed * 2 + 1);
  ink(P.k, sh.black, [0, 0], sh.seed * 2 + 2);

  env.cache.set(key, L);
  return L;
};

export const drawNewsHalftone = (ctx: Ctx, localFrame: number, env: Env) => {
  const f = Math.max(0, Math.min(DURATION - 1, localFrame));
  const k = env.scale;
  const DW = Math.round(env.W * k), DH = Math.round(env.H * k);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const n = f < CUE.firstSheet ? -1 : Math.min(SHEETS - 1, Math.floor((f - CUE.firstSheet) / BEAT));
  const t0 = CUE.firstSheet + n * BEAT;
  const u = n < 0 ? 1 : clamp((f - t0) / SLIDE);

  if (f >= CUE.lastSheet + SLIDE || u >= 1) {
    ctx.drawImage(printSheet(env, n).canvas, 0, 0);
    return;
  }

  // Incoming sheet sliding down onto the pile with realistic drop shadow
  ctx.drawImage(printSheet(env, n - 1).canvas, 0, 0);
  const e = 1 - Math.pow(1 - u, 3);
  const y = Math.round(-DH * (1 - e));

  const sg = ctx.createLinearGradient(0, y + DH, 0, y + DH + 28 * k);
  sg.addColorStop(0, "rgba(25, 20, 16, 0.40)");
  sg.addColorStop(1, "rgba(25, 20, 16, 0)");
  ctx.fillStyle = sg;
  ctx.fillRect(0, y + DH, DW, 28 * k);

  ctx.drawImage(printSheet(env, n).canvas, 0, y);
};
