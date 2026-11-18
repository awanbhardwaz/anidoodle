import fs from "node:fs";

console.log("Testing Bridson Poisson-disk dot generator...");

// Simple dummy test
const W = 1080, H = 1080;
const T = new Float32Array(W * H);
// Fill a test box with tone 0.8
for (let y = 300; y < 400; y++) {
  for (let x = 100; x < 980; x++) {
    T[y * W + x] = 0.85;
  }
}

const cell = 1.5;
const gw = Math.ceil(W / cell), gh = Math.ceil(H / cell);
const grid = new Int32Array(gw * gh).fill(-1);
const xs = [], ys = [], rs = [];

function rng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const r = rng(2026);
const spacing = (t) => 2.0 / Math.pow(Math.max(t, 0.02), 0.6);

console.log("Ready to benchmark Bridson Poisson-disk...");
