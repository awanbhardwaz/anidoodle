import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3002;
const HTML_PATH = path.join(__dirname, "skills/anidoodle/engine/dist/blueprint25.html");
const STILL_ACT1 = path.join(__dirname, "skills/anidoodle/engine/out/still-blueprint15-blueprint15.png");
const STILL_ACT2 = path.join(__dirname, "skills/anidoodle/engine/out/still-blueprint25-newsHalftone.png");

const CUES = [
  // ACT 1: 0 - 15.0s (Cyanotype Blueprint)
  { id: "border", start: 0, end: 40, label: "ACT 1: Ruled Border & Zone Marks", cat: "blueprint", time: "0.0s - 1.3s" },
  { id: "titleBox", start: 40, end: 65, label: "Title Block Framing", cat: "blueprint", time: "1.3s - 2.2s" },
  { id: "construct", start: 65, end: 125, label: "Centre Lines & Pitch Circles", cat: "blueprint", time: "2.2s - 4.2s" },
  { id: "plate", start: 125, end: 145, label: "Pillar Plate & Mounts", cat: "blueprint", time: "4.2s - 4.8s" },
  { id: "w0", start: 145, end: 170, label: "Centre Wheel (64T)", cat: "blueprint", time: "4.8s - 5.7s" },
  { id: "p1", start: 170, end: 180, label: "Third Pinion (8L)", cat: "blueprint", time: "5.7s - 6.0s" },
  { id: "w1", start: 180, end: 200, label: "Third Wheel (60T)", cat: "blueprint", time: "6.0s - 6.7s" },
  { id: "p2", start: 200, end: 210, label: "Fourth Pinion (8L)", cat: "blueprint", time: "6.7s - 7.0s" },
  { id: "w2", start: 210, end: 225, label: "Fourth Wheel (60T - Seconds)", cat: "blueprint", time: "7.0s - 7.5s" },
  { id: "p3", start: 225, end: 235, label: "Escape Pinion (7L)", cat: "blueprint", time: "7.5s - 7.8s" },
  { id: "w3", start: 235, end: 250, label: "Escape Wheel (15 Club Teeth)", cat: "blueprint", time: "7.8s - 8.3s" },
  { id: "section", start: 250, end: 285, label: "Section A-A Cutaway", cat: "blueprint", time: "8.3s - 9.5s" },
  { id: "lining", start: 285, end: 310, label: "45° Section Cross-Hatch", cat: "blueprint", time: "9.5s - 10.3s" },
  { id: "detail", start: 310, end: 325, label: "Detail C: 24° Club Tooth", cat: "blueprint", time: "10.3s - 10.8s" },
  { id: "detailD", start: 325, end: 340, label: "Detail D: Ogival Depthing", cat: "blueprint", time: "10.8s - 11.3s" },
  { id: "dims", start: 340, end: 365, label: "Dimensions & Cutting Plane", cat: "blueprint", time: "11.3s - 12.2s" },
  { id: "table", start: 365, end: 385, label: "Train Spec Table & Scale", cat: "blueprint", time: "12.2s - 12.8s" },
  { id: "notes", start: 385, end: 405, label: "Drafting Notes & Balloons", cat: "blueprint", time: "12.8s - 13.5s" },
  { id: "title", start: 405, end: 420, label: "Title Block & Signature", cat: "blueprint", time: "13.5s - 14.0s" },
  { id: "hold1", start: 420, end: 450, label: "Complete Blueprint Inspection", cat: "blueprint", time: "14.0s - 15.0s" },

  // ACT 2: 15.0 - 25.0s (Newsprint Halftone Make-Ready Extension)
  { id: "press-start", start: 450, end: 465, label: "ACT 2: Web-Offset Press Startup", cat: "halftone", time: "15.0s - 15.5s" },
  { id: "spot-keys", start: 465, end: 555, label: "Spot Unit: 15° Screen Orange Ink Keys", cat: "halftone", time: "15.5s - 18.5s" },
  { id: "black-on", start: 555, end: 660, label: "Black Unit: 45° Screen Rosette & Gain", cat: "halftone", time: "18.5s - 22.0s" },
  { id: "register-nudge", start: 660, end: 720, label: "Pressman Registration Alignment", cat: "halftone", time: "22.0s - 24.0s" },
  { id: "hold2", start: 720, end: 750, label: "Final Approved Broadsheet Delivery", cat: "halftone", time: "24.0s - 25.0s" }
];

const STUDIO_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>anidoodle · 25s Blueprint + Newsprint Halftone Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #070d14;
      --panel-bg: rgba(14, 27, 43, 0.85);
      --panel-border: rgba(76, 201, 240, 0.2);
      --accent-cyan: #4cc9f0;
      --accent-glow: rgba(76, 201, 240, 0.35);
      --spot-orange: #e86a2c;
      --newsprint-paper: #e6dfcc;
      --prussian-blue: #123a63;
      --ink-white: #f1f7fb;
      --text-dim: #8faec4;
      --text-bright: #e8f4fc;
      --badge-bg: rgba(76, 201, 240, 0.12);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 15%, #0f2338 0%, var(--bg-dark) 100%);
      color: var(--text-bright);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    header {
      padding: 16px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--panel-border);
      background: rgba(7, 13, 20, 0.85);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-badge {
      background: linear-gradient(135deg, #1f5080, #0a2542);
      border: 1px solid var(--accent-cyan);
      color: var(--ink-white);
      font-family: 'Fira Code', monospace;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      box-shadow: 0 0 12px var(--accent-glow);
    }
    .brand-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--ink-white);
    }
    .brand-sub {
      font-size: 13px;
      color: var(--text-dim);
    }
    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .pill {
      font-family: 'Fira Code', monospace;
      font-size: 12px;
      background: var(--badge-bg);
      border: 1px solid var(--panel-border);
      padding: 6px 12px;
      border-radius: 20px;
      color: var(--accent-cyan);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      background: #4ade80;
      border-radius: 50%;
      box-shadow: 0 0 8px #4ade80;
      animation: pulse 2s infinite ease-in-out;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }

    main {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 24px;
      padding: 24px;
      max-width: 1720px;
      width: 100%;
      margin: 0 auto;
    }
    @media (max-width: 1160px) {
      main { grid-template-columns: 1fr; }
    }

    .viewport-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .canvas-card {
      background: #060b11;
      border: 1px solid var(--panel-border);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
      position: relative;
    }
    .canvas-wrapper {
      position: relative;
      width: 100%;
      aspect-ratio: 1 / 1;
      max-height: 720px;
      margin: 0 auto;
      background: #091929;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    iframe#filmFrame {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      pointer-events: auto;
    }

    .act-tabs {
      display: flex;
      gap: 8px;
      padding: 10px 18px 0;
      background: var(--panel-bg);
      border-top: 1px solid var(--panel-border);
    }
    .act-tab {
      padding: 6px 14px;
      border-radius: 6px 6px 0 0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid transparent;
      border-bottom: none;
      transition: all 0.2s;
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-dim);
    }
    .act-tab.active-blueprint {
      background: #0d2847;
      border-color: var(--accent-cyan);
      color: var(--accent-cyan);
    }
    .act-tab.active-halftone {
      background: #381c10;
      border-color: var(--spot-orange);
      color: var(--spot-orange);
    }

    .player-controls {
      background: var(--panel-bg);
      padding: 14px 20px 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      backdrop-filter: blur(16px);
    }
    .scrubber-row {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .timecode {
      font-family: 'Fira Code', monospace;
      font-size: 13px;
      color: var(--accent-cyan);
      min-width: 130px;
      font-weight: 500;
    }
    .scrubber-slider {
      flex: 1;
      height: 8px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(76, 201, 240, 0.15);
      border-radius: 4px;
      outline: none;
      cursor: pointer;
      position: relative;
    }
    .scrubber-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--accent-cyan);
      cursor: pointer;
      box-shadow: 0 0 12px var(--accent-glow);
      transition: transform 0.15s, background 0.15s;
    }
    .scrubber-slider::-webkit-slider-thumb:hover {
      transform: scale(1.25);
      background: #7fe3ff;
    }

    .buttons-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .btn-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    button.ctl-btn {
      background: rgba(76, 201, 240, 0.08);
      border: 1px solid var(--panel-border);
      color: var(--text-bright);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    button.ctl-btn:hover {
      background: rgba(76, 201, 240, 0.2);
      border-color: var(--accent-cyan);
      transform: translateY(-1px);
    }
    button.ctl-btn.primary {
      background: var(--accent-cyan);
      color: #071524;
      border-color: var(--accent-cyan);
      box-shadow: 0 0 16px var(--accent-glow);
    }
    button.ctl-btn.primary:hover {
      background: #7fe3ff;
      box-shadow: 0 0 24px rgba(76, 201, 240, 0.6);
    }
    .speed-select {
      background: rgba(14, 27, 43, 0.9);
      border: 1px solid var(--panel-border);
      color: var(--text-bright);
      padding: 8px 10px;
      border-radius: 8px;
      font-family: 'Fira Code', monospace;
      font-size: 12px;
      outline: none;
      cursor: pointer;
    }

    /* Sidebar info & cues */
    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .panel {
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      border-radius: 14px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      backdrop-filter: blur(12px);
    }
    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(76, 201, 240, 0.1);
      padding-bottom: 10px;
    }
    .panel-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent-cyan);
    }
    .spec-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .spec-box {
      background: rgba(6, 15, 26, 0.6);
      border: 1px solid rgba(76, 201, 240, 0.08);
      border-radius: 8px;
      padding: 10px;
    }
    .spec-label {
      font-size: 11px;
      color: var(--text-dim);
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .spec-val {
      font-family: 'Fira Code', monospace;
      font-size: 13px;
      color: var(--text-bright);
      font-weight: 600;
    }

    .cue-list {
      max-height: 480px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-right: 4px;
    }
    .cue-list::-webkit-scrollbar {
      width: 5px;
    }
    .cue-list::-webkit-scrollbar-thumb {
      background: rgba(76, 201, 240, 0.25);
      border-radius: 4px;
    }
    .cue-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 12px;
      border-radius: 8px;
      background: rgba(6, 15, 26, 0.5);
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s;
    }
    .cue-item:hover {
      background: rgba(76, 201, 240, 0.1);
      border-color: rgba(76, 201, 240, 0.3);
    }
    .cue-item.active {
      background: rgba(76, 201, 240, 0.18);
      border-color: var(--accent-cyan);
      box-shadow: 0 0 12px rgba(76, 201, 240, 0.2);
    }
    .cue-item.active.halftone-cue {
      background: rgba(232, 106, 44, 0.2);
      border-color: var(--spot-orange);
      box-shadow: 0 0 12px rgba(232, 106, 44, 0.3);
    }
    .cue-title-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .cue-name {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-bright);
    }
    .cue-time {
      font-family: 'Fira Code', monospace;
      font-size: 11px;
      color: var(--text-dim);
    }
    .cue-badge {
      font-family: 'Fira Code', monospace;
      font-size: 10px;
      background: rgba(76, 201, 240, 0.15);
      color: var(--accent-cyan);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .cue-badge.halftone-badge {
      background: rgba(232, 106, 44, 0.2);
      color: var(--spot-orange);
    }

    footer {
      border-top: 1px solid var(--panel-border);
      padding: 16px 28px;
      font-size: 12px;
      color: var(--text-dim);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(7, 13, 20, 0.9);
      margin-top: auto;
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <span class="brand-badge">anidoodle</span>
      <div>
        <h1 class="brand-title">Going Train & Breaking News · 25-Second Film</h1>
        <p class="brand-sub">Act 1: Cyanotype Blueprint (15s) → Act 2: Newsprint Halftone (10s)</p>
      </div>
    </div>
    <div class="header-actions">
      <div class="pill">
        <div class="pulse-dot"></div>
        <span>PREVIEW READY · PORT 3002</span>
      </div>
      <button class="ctl-btn" onclick="openRawPlayer()">Open Standalone Canvas ↗</button>
    </div>
  </header>

  <main>
    <section class="viewport-column">
      <div class="canvas-card">
        <div class="canvas-wrapper">
          <iframe id="filmFrame" src="/blueprint25.html" title="25-Second Combined Film Animation"></iframe>
        </div>
        
        <div class="act-tabs">
          <div class="act-tab active-blueprint" id="tabAct1" onclick="seekToFrame(0)">
            <span>📐 ACT 1: Cyanotype Blueprint (0s - 15s)</span>
          </div>
          <div class="act-tab" id="tabAct2" onclick="seekToFrame(450)">
            <span>📰 ACT 2: Newsprint Halftone (15s - 25s)</span>
          </div>
        </div>

        <div class="player-controls">
          <div class="scrubber-row">
            <span class="timecode" id="timecodeDisplay">00:00.00 / 00:25.00</span>
            <input type="range" class="scrubber-slider" id="scrubber" min="0" max="749" value="0">
            <span class="timecode" style="text-align: right; min-width: 90px;" id="frameDisplay">F 0 / 750</span>
          </div>
          <div class="buttons-row">
            <div class="btn-group">
              <button class="ctl-btn primary" id="playBtn" onclick="togglePlay()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                <span>Play</span>
              </button>
              <button class="ctl-btn" onclick="stepFrame(-1)" title="Step 1 Frame Back (ArrowLeft)">‹ Prev</button>
              <button class="ctl-btn" onclick="stepFrame(1)" title="Step 1 Frame Forward (ArrowRight)">Next ›</button>
              <button class="ctl-btn" onclick="seekToFrame(0); play();">↺ Start Act 1</button>
              <button class="ctl-btn" onclick="seekToFrame(450); play();">⚡ Jump to Act 2 (Halftone)</button>
            </div>
            <div class="btn-group">
              <label for="speedSelect" style="font-size: 12px; color: var(--text-dim);">Speed:</label>
              <select id="speedSelect" class="speed-select" onchange="changeSpeed(this.value)">
                <option value="0.25">0.25x</option>
                <option value="0.5">0.5x</option>
                <option value="1" selected>1.0x (Realtime)</option>
                <option value="1.5">1.5x</option>
                <option value="2">2.0x</option>
              </select>
              <button class="ctl-btn" onclick="savePng()" title="Capture full resolution PNG">📸 Snapshot</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <aside class="sidebar">
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">Production Specification</span>
          <span class="pill" style="padding: 2px 8px; font-size: 11px;">Deterministic Code</span>
        </div>
        <div class="spec-grid">
          <div class="spec-box">
            <div class="spec-label">Total Duration</div>
            <div class="spec-val">25.00 Seconds</div>
          </div>
          <div class="spec-box">
            <div class="spec-label">Frame Count</div>
            <div class="spec-val">750 Frames</div>
          </div>
          <div class="spec-box">
            <div class="spec-label">Frame Rate</div>
            <div class="spec-val">30.00 FPS</div>
          </div>
          <div class="spec-box">
            <div class="spec-label">Canvas Dimensions</div>
            <div class="spec-val">1080 × 1080</div>
          </div>
          <div class="spec-box">
            <div class="spec-label">Act 1 Style</div>
            <div class="spec-val" style="color: var(--accent-cyan);">Cyanotype Blueprint</div>
          </div>
          <div class="spec-box">
            <div class="spec-label">Act 2 Style</div>
            <div class="spec-val" style="color: var(--spot-orange);">Newsprint Halftone</div>
          </div>
        </div>
      </div>

      <div class="panel" style="flex: 1;">
        <div class="panel-head">
          <span class="panel-title">Drafting & Press Timeline</span>
          <span style="font-size: 11px; color: var(--accent-cyan); font-family: 'Fira Code', monospace;" id="activeStageLabel">ACT 1</span>
        </div>
        <div class="cue-list" id="cueList">
          <!-- Dynamically populated -->
        </div>
      </div>
    </aside>
  </main>

  <footer>
    <div>
      <span>Art Core: Pure function of (localFrame, env) · Deterministic render verified</span>
    </div>
    <div>
      <span>Act 1: Watch Movement Going Train · Act 2: Web-Offset Press CNBC Broadsheet</span>
    </div>
  </footer>

  <script>
    const CUES = ${JSON.stringify(CUES)};
    const TOTAL_FRAMES = 750;
    const FPS = 30;

    let iframe = document.getElementById("filmFrame");
    let scrubber = document.getElementById("scrubber");
    let playBtn = document.getElementById("playBtn");
    let timecodeDisplay = document.getElementById("timecodeDisplay");
    let frameDisplay = document.getElementById("frameDisplay");
    let cueList = document.getElementById("cueList");
    let activeStageLabel = document.getElementById("activeStageLabel");
    let tabAct1 = document.getElementById("tabAct1");
    let tabAct2 = document.getElementById("tabAct2");

    let isPlaying = false;
    let playSpeed = 1.0;
    let animId = null;
    let lastTime = 0;
    let currentFrame = 0;

    // Render Cue List
    CUES.forEach((c, idx) => {
      const item = document.createElement("div");
      const isHalftone = c.cat === "halftone";
      item.className = "cue-item" + (idx === 0 ? " active" : "") + (isHalftone ? " halftone-cue" : "");
      item.id = "cue-" + c.id;
      item.onclick = () => seekToFrame(c.start);
      item.innerHTML = \`
        <div class="cue-title-box">
          <div class="cue-name">\${c.label}</div>
          <div class="cue-time">\${c.time}</div>
        </div>
        <div class="cue-badge \${isHalftone ? 'halftone-badge' : ''}">F\${c.start}-\${c.end}</div>
      \`;
      cueList.appendChild(item);
    });

    function getFilm() {
      try {
        return iframe.contentWindow && iframe.contentWindow.FILM;
      } catch (e) {
        return null;
      }
    }

    function formatTime(frame) {
      const totalSec = frame / FPS;
      const m = Math.floor(totalSec / 60);
      const s = Math.floor(totalSec % 60);
      const ms = Math.floor((totalSec % 1) * 100);
      return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0") + "." + String(ms).padStart(2, "0");
    }

    function updateUI(frame) {
      currentFrame = frame;
      scrubber.value = frame;
      timecodeDisplay.textContent = formatTime(frame) + " / " + formatTime(TOTAL_FRAMES);
      frameDisplay.textContent = "F " + Math.round(frame) + " / " + TOTAL_FRAMES;

      if (frame < 450) {
        tabAct1.className = "act-tab active-blueprint";
        tabAct2.className = "act-tab";
      } else {
        tabAct1.className = "act-tab";
        tabAct2.className = "act-tab active-halftone";
      }

      // Update active cue highlight
      let currentIdx = CUES.findIndex(c => frame >= c.start && frame < c.end);
      if (currentIdx === -1) currentIdx = CUES.length - 1;

      CUES.forEach((c, idx) => {
        const el = document.getElementById("cue-" + c.id);
        if (el) {
          if (idx === currentIdx) {
            el.classList.add("active");
            activeStageLabel.textContent = (frame < 450 ? "ACT 1: " : "ACT 2: ") + (idx + 1) + " / " + CUES.length;
          } else {
            el.classList.remove("active");
          }
        }
      });
    }

    function seekToFrame(frame) {
      frame = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(frame)));
      const film = getFilm();
      if (film) {
        film.seek(frame);
      }
      updateUI(frame);
    }

    scrubber.addEventListener("input", (e) => {
      pause();
      seekToFrame(Number(e.target.value));
    });

    function togglePlay() {
      if (isPlaying) {
        pause();
      } else {
        play();
      }
    }

    function play() {
      if (currentFrame >= TOTAL_FRAMES - 1) {
        currentFrame = 0;
      }
      isPlaying = true;
      playBtn.classList.remove("primary");
      playBtn.style.background = "rgba(239, 68, 68, 0.2)";
      playBtn.style.borderColor = "#ef4444";
      playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg><span>Pause</span>';
      lastTime = performance.now();
      loop();
    }

    function pause() {
      isPlaying = false;
      if (animId) cancelAnimationFrame(animId);
      playBtn.classList.add("primary");
      playBtn.style.background = "";
      playBtn.style.borderColor = "";
      playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span>Play</span>';
    }

    function loop() {
      if (!isPlaying) return;
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      currentFrame += dt * FPS * playSpeed;
      if (currentFrame >= TOTAL_FRAMES) {
        currentFrame = 0; // loop
      }
      seekToFrame(currentFrame);
      animId = requestAnimationFrame(loop);
    }

    function stepFrame(delta) {
      pause();
      seekToFrame(currentFrame + delta);
    }

    function changeSpeed(val) {
      playSpeed = parseFloat(val);
    }

    function savePng() {
      const film = getFilm();
      if (!film) return;
      const b64 = film.png();
      const a = document.createElement("a");
      a.href = "data:image/png;base64," + b64;
      a.download = "halftone-frame-" + Math.round(currentFrame) + ".png";
      a.click();
    }

    function openRawPlayer() {
      window.open("/blueprint25.html", "_blank");
    }

    // Keyboard shortcuts
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepFrame(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepFrame(1);
      } else if (e.key === "Home") {
        e.preventDefault();
        seekToFrame(0);
      } else if (e.key === "End") {
        e.preventDefault();
        seekToFrame(TOTAL_FRAMES - 1);
      }
    });

    iframe.addEventListener("load", () => {
      setTimeout(() => {
        seekToFrame(0);
        play();
      }, 250);
    });
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = req.url || "/";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(STUDIO_HTML);
    return;
  }

  if (url === "/blueprint25.html" || url.startsWith("/blueprint25.html?")) {
    if (fs.existsSync(HTML_PATH)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(HTML_PATH).pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("blueprint25.html not built yet.");
    }
    return;
  }

  if (url === "/still-blueprint.png") {
    if (fs.existsSync(STILL_ACT1)) {
      res.writeHead(200, { "Content-Type": "image/png" });
      fs.createReadStream(STILL_ACT1).pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Act 1 still not found");
    }
    return;
  }

  if (url === "/still-halftone.png") {
    if (fs.existsSync(STILL_ACT2)) {
      res.writeHead(200, { "Content-Type": "image/png" });
      fs.createReadStream(STILL_ACT2).pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Act 2 still not found");
    }
    return;
  }

  if (url === "/api/info") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      title: "Going Train & Breaking News · 25-Second Blueprint to Newsprint Halftone",
      durationSeconds: 25,
      fps: 30,
      totalFrames: 750,
      cues: CUES
    }));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Blueprint 25s Preview Server listening on http://localhost:${PORT}`);
});
