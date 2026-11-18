import { Gfx, PENCIL, rng, type Ctx, type Env } from "./core";

// NEWS HEADLINE · pen-and-ink stipple on hot-press bristol.
// One technical pen (0.25 mm) touched straight down onto hot-press bristol, thousands of times.
// Every tone is the NUMBER of dots in a square centimetre, and every edge is where dot density changes.
// Drawn from the user's news screenshot asset ('news.png'):
// The CNBC masthead, bold headline, date line, and reporter portrait are all translated into
// variable-radius Poisson-disk dots (Secord / Bridson distribution).

const DURATION = 300, HOLD = 25;
const PASSES = 5;
const INK = "#15120e", PAPER = "#fbfaf5";
const DOT = 1.25; // Technical pen nib radius

type Dot = { x: number; y: number; t: number; pass: number; key: number };
type NewsStip = { dots: Dot[]; shape: Float32Array; alpha: Uint8Array; start: number[] };

// Build the tone field from the decoded user image asset 'news'
const buildToneField = (env: Env): Float32Array => {
  const W = env.W, H = env.H;
  const T = new Float32Array(W * H);
  const img = env.image?.("news") as (CanvasImageSource & { width: number; height: number; naturalWidth?: number; naturalHeight?: number }) | undefined;
  if (!img) return T;

  const iw = img.naturalWidth ?? img.width ?? 1024;
  const ih = img.naturalHeight ?? img.height ?? 358;

  // Center horizontally, position in upper-mid of the 1080x1080 page
  const scale = Math.min((W - 60) / iw, 1.0);
  const dw = Math.round(iw * scale);
  const dh = Math.round(ih * scale);
  const ox = Math.round((W - dw) / 2);
  const oy = Math.round((H - dh) / 2) - 30;

  const L = env.canvas(W, H);
  L.ctx.setTransform(1, 0, 0, 1, 0, 0);
  L.ctx.fillStyle = "#ffffff";
  L.ctx.fillRect(0, 0, W, H);
  L.ctx.drawImage(img, ox, oy, dw, dh);

  // Read pixel data
  const data = L.ctx.getImageData(0, 0, W, H).data;

  // Broadsheet margins & subtle framing lines in stipple
  for (let y = oy - 40; y <= oy + dh + 60; y++) {
    if (y < 0 || y >= H) continue;
    for (let x = ox - 20; x <= ox + dw + 20; x++) {
      if (x < 0 || x >= W) continue;
      // Border lines
      if ((y === oy - 30 || y === oy + dh + 40) && x >= ox - 10 && x <= ox + dw + 10) {
        T[y * W + x] = 0.75;
        continue;
      }
      if ((x === ox - 10 || x === ox + dw + 10) && y >= oy - 30 && y <= oy + dh + 40) {
        T[y * W + x] = 0.75;
        continue;
      }

      // Inside image area
      if (x >= ox && x < ox + dw && y >= oy && y < oy + dh) {
        const idx = (y * W + x) * 4;
        const r = data[idx] / 255;
        const g = data[idx + 1] / 255;
        const b = data[idx + 2] / 255;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        // Invert luminance: dark ink on white paper
        let tone = Math.max(0, 1 - lum);

        // Filter clean white background to prevent noisy rogue dots
        if (tone < 0.12) {
          tone = 0;
        } else {
          // Enhance text contrast for crisp stippled letterforms
          tone = Math.pow(tone, 0.95);
        }
        T[y * W + x] = tone;
      }
    }
  }

  return T;
};

// Generate Bridson variable-radius Poisson-disk dot field
const buildDots = (env: Env): NewsStip => {
  const key = `newsStipple:dots:${env.W}x${env.H}`;
  let S = env.cache.get(key) as NewsStip | undefined;
  if (S) return S;

  const W = env.W, H = env.H;
  const T = buildToneField(env);
  const at = (x: number, y: number) => {
    const ix = x | 0, iy = y | 0;
    return ix < 0 || iy < 0 || ix >= W || iy >= H ? 0 : T[iy * W + ix];
  };

  const MIN_T = 0.04;
  // Tone to spacing: dense stipple in dark headline stems, wider in light tones
  const spacing = (t: number) => 1.85 / Math.pow(Math.max(t, MIN_T), 0.62);

  const cell = 1.8;
  const gw = Math.ceil(W / cell), gh = Math.ceil(H / cell);
  const grid = new Int32Array(gw * gh).fill(-1);
  const xs: number[] = [], ys: number[] = [], rs: number[] = [];
  const r = rng(20261006);

  const ok = (x: number, y: number, d: number) => {
    const reach = Math.ceil((d * 1.2) / cell);
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    for (let j = Math.max(0, gy - reach); j <= Math.min(gh - 1, gy + reach); j++) {
      for (let i = Math.max(0, gx - reach); i <= Math.min(gw - 1, gx + reach); i++) {
        const k = grid[j * gw + i];
        if (k < 0) continue;
        const dx = xs[k] - x, dy = ys[k] - y;
        const m = 0.5 * (d + rs[k]);
        if (dx * dx + dy * dy < m * m) return false;
      }
    }
    return true;
  };

  const add = (x: number, y: number, d: number) => {
    const k = xs.length;
    xs.push(x); ys.push(y); rs.push(d);
    grid[Math.floor(y / cell) * gw + Math.floor(x / cell)] = k;
    return k;
  };

  const grow = (k0: number) => {
    const active = [k0];
    while (active.length) {
      const ai = Math.floor(r() * active.length), k = active[ai];
      let found = false;
      for (let n = 0; n < 14; n++) {
        const a = r() * Math.PI * 2;
        const d0 = rs[k];
        const rr = d0 * (1 + r() * 0.9);
        const x = xs[k] + Math.cos(a) * rr, y = ys[k] + Math.sin(a) * rr;
        if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
        const t = at(x, y);
        if (t < MIN_T) continue;
        const d = spacing(t);
        if (!ok(x, y, d)) continue;
        active.push(add(x, y, d));
        found = true;
      }
      if (!found) {
        active[ai] = active[active.length - 1];
        active.pop();
      }
    }
  };

  // Seed across active regions
  for (let y = 100; y < H - 100; y += 8) {
    for (let x = 30; x < W - 30; x += 8) {
      const px = x + (r() - 0.5) * 6, py = y + (r() - 0.5) * 6;
      const t = at(px, py);
      if (t < MIN_T) continue;
      const d = spacing(t);
      if (ok(px, py, d)) grow(add(px, py, d));
    }
  }

  // Stipple ordering: darkest tone masses placed first
  const PATCH = 72;
  const dots: Dot[] = xs.map((x, i) => {
    const t = at(x, ys[i]), u = r();
    return { x, y: ys[i], t, pass: 0, key: (1 - t) + 0.35 * u };
  });

  let lo = 1e9, hi = -1e9;
  dots.forEach((d) => { lo = Math.min(lo, d.key); hi = Math.max(hi, d.key); });
  dots.forEach((d) => {
    d.pass = Math.min(PASSES - 1, Math.floor(((d.key - lo) / (hi - lo + 1e-9)) ** 1.2 * PASSES));
  });

  const patchOf = (d: Dot) => {
    const py = Math.floor(d.y / PATCH);
    const px0 = Math.floor(d.x / PATCH);
    const px = py % 2 ? 100 - px0 : px0;
    return py * 128 + px;
  };

  dots.sort((a, b) => a.pass - b.pass || patchOf(a) - patchOf(b) || a.key - b.key);

  const start: number[] = [];
  for (let p = 0, i = 0; p <= PASSES; p++) {
    while (i < dots.length && dots[i].pass < p) i++;
    start.push(i);
  }

  // Shape each dot with authentic oval 7-gon geometry and ragged nib tilt
  const V = 7;
  const shape = new Float32Array(dots.length * V * 2);
  const alpha = new Uint8Array(dots.length);
  const tilt = -0.58;

  dots.forEach((d, i) => {
    const s = rng(i * 7919 + 23);
    const rad = DOT * (0.88 + s() * 0.25);
    const el = 1.05 + s() * 0.12;
    const ph = s() * 6.283;
    const h2 = s() * 0.09, h3 = s() * 0.07;
    const tail = s() < 0.03;
    alpha[i] = s() < 0.04 ? 160 : 235 + Math.floor(s() * 20);

    for (let v = 0; v < V; v++) {
      const a = (v / V) * Math.PI * 2;
      const k = 1 + h2 * Math.sin(2 * a + ph) + h3 * Math.sin(3 * a + ph * 1.7);
      let ex = Math.cos(a) * rad * k * el, ey = Math.sin(a) * rad * k;
      if (tail && v === 0) ex += rad * 1.25;
      shape[(i * V + v) * 2] = d.x + ex * Math.cos(tilt) - ey * Math.sin(tilt);
      shape[(i * V + v) * 2 + 1] = d.y + ex * Math.sin(tilt) + ey * Math.cos(tilt);
    }
  });

  S = { dots, shape, alpha, start };
  env.cache.set(key, S);
  return S;
};

// Timing schedule across the 300 frames of Act 2
const countAt = (S: NewsStip, localFrame: number): number => {
  const activeFrames = DURATION - HOLD;
  if (localFrame >= activeFrames) return S.dots.length;
  const u = Math.max(0, Math.min(1, localFrame / activeFrames));
  // Smooth easing curve matching the hand's drafting speed
  const progress = u * u * (3 - 2 * u);
  return Math.floor(S.dots.length * progress);
};

const CHUNK = 600;
const inkRange = (ctx: Ctx, env: Env, S: NewsStip, from: number, n: number) => {
  const V = 7;
  const fillRange = (a: number, b: number, cls: number) => {
    const pk = `newsStipple:path:${a}:${b}:${cls}`;
    let path = env.cache.get(pk) as Path2D | undefined;
    if (!path) {
      path = new Path2D();
      for (let i = a; i < b; i++) {
        if ((S.alpha[i] < 200 ? 1 : 0) !== cls) continue;
        const o = i * V * 2;
        path.moveTo(S.shape[o], S.shape[o + 1]);
        for (let v = 1; v < V; v++) path.lineTo(S.shape[o + v * 2], S.shape[o + v * 2 + 1]);
        path.closePath();
      }
      if (b - a === CHUNK) env.cache.set(pk, path);
    }
    ctx.globalAlpha = cls ? 0.65 : 0.96;
    ctx.fill(path);
  };

  ctx.fillStyle = INK;
  for (let a = from; a < n; a += CHUNK) {
    const b = Math.min(n, a + CHUNK);
    fillRange(a, b, 0);
    fillRange(a, b, 1);
  }
  ctx.globalAlpha = 1;
};

const sheet = (ctx: Ctx, env: Env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, env.W, env.H);
};

const tooth = (ctx: Ctx, env: Env) => {
  new Gfx(ctx, env, 0, PENCIL).paper("paper", 0.05);
};

export const drawNewsStipple = (ctx: Ctx, localFrame: number, env: Env) => {
  const S = buildDots(env);
  const n = countAt(S, localFrame);

  // Transition dissolve for first 15 frames of Act 2
  const FADE_IN = 15;
  const alpha = Math.min(1, (localFrame + 1) / FADE_IN);

  // Final hold: cached bitmap
  if (n >= S.dots.length) {
    const k = `newsStipple:final:${env.scale}`;
    let L = env.cache.get(k) as ReturnType<Env["canvas"]> | undefined;
    if (!L) {
      L = env.canvas(Math.round(env.W * env.scale), Math.round(env.H * env.scale));
      sheet(L.ctx, env);
      inkRange(L.ctx, env, S, 0, n);
      tooth(L.ctx, env);
      env.cache.set(k, L);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(L.canvas as CanvasImageSource, 0, 0);
    return;
  }

  // Checkpointed progressive accumulation
  const CK = 4800, c = Math.floor(n / CK) * CK;
  const layer = (m: number): ReturnType<Env["canvas"]> => {
    const k = `newsStipple:ck:${m}:${env.scale}`;
    let L = env.cache.get(k) as ReturnType<Env["canvas"]> | undefined;
    if (L) return L;
    L = env.canvas(Math.round(env.W * env.scale), Math.round(env.H * env.scale));
    const lc = L.ctx;
    lc.setTransform(1, 0, 0, 1, 0, 0);
    if (m > CK) lc.drawImage(layer(m - CK).canvas as CanvasImageSource, 0, 0);
    lc.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    inkRange(lc, env, S, m - CK, m);
    env.cache.set(k, L);
    return L;
  };

  sheet(ctx, env);
  if (c > 0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer(c).canvas as CanvasImageSource, 0, 0);
    ctx.restore();
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  }
  inkRange(ctx, env, S, c, n);
  tooth(ctx, env);

  if (alpha < 1) {
    ctx.save();
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    ctx.fillStyle = "#123a63"; // Prussian blue dissolve
    ctx.globalAlpha = 1 - alpha;
    ctx.fillRect(0, 0, env.W, env.H);
    ctx.restore();
  }
};
