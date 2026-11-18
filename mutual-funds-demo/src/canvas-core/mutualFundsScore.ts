// Composed score + chalk/eraser foley for "How Mutual Funds Work" (30 s, 90 bpm, 45 beats, G major).
import { rng } from "./core";
import { line, renderPiece, loudness, truePeak, type Note, type Part, type Piece, type Role } from "./music";
import { Biquad, db, gauss, onePoleCoef, pan } from "./music/dsp";

export type ChalkFoley = { t0: number; t1: number; kind: "chalk" | "scumble" | "erase"; x: number };
export type MutualFundsSoundPlan = {
  bpm: number;
  seconds: number;
  chapterBeats: number[];
  resolveBeat: number;
  foley: ChalkFoley[];
};

const bar = (t: number, src: string, role: Role, v: number, roll?: number) => line(t, src, { role, v, bpb: 4, roll });
const hit = (t: number, src: string, role: Role, v: number) => line(t, src, { role, v, bpb: 4, hit: true });
const eighths = (names: string) => names.split(" ").map((n) => `${n}:.5`).join(" ");

type Bar = { ost: string; mel: string; bass: string };
const G_BAR: Bar = { ost: "G3 D4 G4 B4 D4 G4 B4 D4", mel: "r:.5 D5:.5 G5:.5 A5:.5 B5:1 G5:1", bass: "G2:2 D3:2" };
const CYCLE: Bar[] = [
  G_BAR,
  { ost: "E3 B3 E4 G4 B3 E4 G4 B3", mel: "E5:.5 G5:.5 B5:1 A5:.5 G5:.5 E5:1", bass: "E2:2 B2:2" },
  { ost: "C3 G3 C4 E4 G3 C4 E4 G3", mel: "C5:.5 E5:.5 G5:.5 E5:.5 A5:1 G5:1", bass: "C3:2 G2:2" },
  { ost: "D3 A3 D4 F#4 A3 D4 F#4 A3", mel: "F#5:.5 E5:.5 D5:1 A4:1 r:1", bass: "D3:2 A2:2" },
  { ...G_BAR, mel: "r:.5 D5:.5 G5:.5 A5:.5 B5:1 D6:1" },
  { ost: "E3 B3 E4 G4 B3 E4 G4 B3", mel: "C6:.5 B5:.5 G5:1 E5:.5 G5:.5 B5:1", bass: "E2:2 B2:2" },
  { ost: "A2 E3 A3 C4 D3 A3 D4 F#4", mel: "A5:.5 C6:.5 B5:.5 A5:.5 F#5:1 A5:1", bass: "A2:2 D3:2" },
  { ...G_BAR, mel: "G5:2 r:2" },
];
const D7: Bar = { ost: "D3 A3 C4 F#4 A3 C4 F#4 A4", mel: "F#5:.5 G5:.5 A5:.5 B5:.5 C6:.5 B5:.5 A5:.5 F#5:.5", bass: "D3:2 A2:2" };
const PINGS = ["G5", "B5", "D6", "G6"];

export const mutualFundsPiece = (sp: MutualFundsSoundPlan): Piece => {
  const R = sp.resolveBeat;
  const cut = R - 0.5;
  const ost: Note[] = [], bass: Note[] = [], pl: Note[] = [], mar: Note[] = [], ping: Note[] = [], bell: Note[] = [];
  const keep = (ns: Note[]) => ns.filter((n) => n.t < cut - 1e-6);

  // Intro bar (beats 0..4): marimba ostinato + warm bass
  ost.push(...bar(0, eighths(G_BAR.ost), "accomp", 0.5));
  bass.push(...bar(0, "G2:4", "bass", 0.55));

  const lastBar = Math.floor((cut - 1e-6) / 4) * 4;
  for (let b = 4, k = 0; b < cut; b += 4, k++) {
    const B = b === lastBar ? D7 : CYCLE[k % 8];
    const cyc = Math.floor(k / 8);
    ost.push(...keep(bar(b, eighths(B.ost), "accomp", 0.55)));
    bass.push(...keep(bar(b, B.bass, "bass", 0.62)));
    (cyc % 2 === 0 ? pl : mar).push(...keep(bar(b, B.mel, "melody", 0.8)));
  }

  sp.chapterBeats.forEach((b, i) => ping.push(...hit(b, `${PINGS[Math.min(i, PINGS.length - 1)]}:1`, "color", 0.62)));

  // Final resolve onto beat R (42) and hold to end (45)
  pl.push(...hit(cut, "[D5 F#5 A5]:.5", "melody", 0.72));
  mar.push(...bar(R, "[G3 D4 B4]:3 r:1", "melody", 0.62, 0.03));
  pl.push(...bar(R, "[G4 D5 G5]:2.5 r:1.5", "melody", 0.76, 0.036));
  bass.push(...bar(R, "r:.5 G2:2.5 r:1", "bass", 0.7));
  bell.push(...bar(R, "r:.25 G6:2.75 r:1", "color", 0.64));

  const grid = { grid: true };
  const parts: Part[] = [
    { id: "ostinato", inst: "marimba", role: "accomp", notes: ost, gainDb: -6, opts: grid },
    { id: "bass", inst: "marimba", role: "bass", notes: bass, gainDb: -3, opts: grid },
    { id: "pizz", inst: "guitar", role: "melody", notes: pl, gainDb: 1, opts: grid, pan: -0.15 },
    { id: "hook", inst: "marimba", role: "melody", notes: mar, gainDb: -1, opts: grid, pan: 0.15 },
    { id: "chapters", inst: "celesta", role: "color", notes: ping, gainDb: -5, opts: grid, pan: 0.2 },
    { id: "resolve", inst: "bell", role: "color", notes: bell, gainDb: -7, opts: grid },
  ];

  return {
    title: "How Mutual Funds Work",
    seed: 2026,
    tail: 1.5,
    harmony: [],
    legacy: true,
    plan: {
      style: "minimalist",
      tempo: sp.bpm,
      meter: "4/4",
      rubato: 0,
      ritard: 1,
      sections: [{ id: "all", bars: Math.ceil(R / 4) + 1, mood: "curious", key: "G", mode: "major", melody: ["ostinato", "hook"], dyn: [0.62, 0.7], ending: "button" }],
    },
    parts,
  };
};

const renderChalkFoley = (sp: MutualFundsSoundPlan, sr: number): [Float32Array, Float32Array] => {
  const n = Math.round(sp.seconds * sr);
  const env = new Float32Array(n), envE = new Float32Array(n), px = new Float32Array(n).fill(0.5);
  const att = Math.round(0.008 * sr), rel = 0.035 * sr;
  const AMP = { chalk: 0.85, scumble: 1.0, erase: 0.8 } as const;
  for (const ev of sp.foley) {
    const i0 = Math.round(ev.t0 * sr), i1 = Math.max(i0 + att, Math.round(ev.t1 * sr));
    const tgt = ev.kind === "erase" ? envE : env, a = AMP[ev.kind];
    for (let i = Math.max(0, i0); i < Math.min(n, i1 + Math.round(rel * 5)); i++) {
      const g = i < i0 + att ? (i - i0) / att : i <= i1 ? 1 : Math.exp(-(i - i1) / rel);
      const v = a * g;
      if (v > tgt[i]) { tgt[i] = v; px[i] = ev.x; }
    }
  }
  const r = rng(7171), L = new Float32Array(n), Rr = new Float32Array(n);
  const bp = Biquad.make(sr, "bp", 2800, 0.75), hp = Biquad.make(sr, "hp", 1000, 0.7), rub = Biquad.make(sr, "bp", 650, 0.6), gc = onePoleCoef(sr, 42);
  let grain = 0;
  for (let i = 0; i < n; i++) {
    const w = gauss(r), w2 = gauss(r);
    grain += gc * (Math.abs(w2) - grain);
    const s = hp.tick(bp.tick(w)) * env[i] * (0.35 + 1.05 * grain) + rub.tick(w2) * envE[i] * 0.6;
    const [gl, gr] = pan((px[i] - 0.5) * 0.75);
    L[i] = s * gl; Rr[i] = s * gr;
  }
  return [L, Rr];
};

export const mutualFundsAudio = (sp: MutualFundsSoundPlan) => (sr: number): [Float32Array, Float32Array] => {
  const m = renderPiece(mutualFundsPiece(sp), sr, { seconds: sp.seconds, tempo: sp.bpm, master: "none" });
  const [fL, fR] = renderChalkFoley(sp, sr);
  const n = m.L.length;
  const lm = loudness([m.L, m.R], sr).integrated;
  const lf = loudness([fL, fR], sr).integrated;
  const fg = Number.isFinite(lf) ? db(lm - 15 - lf) : 0;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = m.L[i] + fL[i] * fg; R[i] = m.R[i] + fR[i] * fg; }
  let g = db(-16 - loudness([L, R], sr).integrated);
  for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; }
  const tp = truePeak([L, R]).dbtp;
  if (tp > -1) { g = db(-1.05 - tp); for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; } }
  return [L, R];
};

