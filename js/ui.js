// Console GUI for the Kosmos CP1 emulator: display, keypad, ports, program library, memory view.
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const d3 = n => String(n).padStart(3, "0"), d2 = n => String(n).padStart(2, "0");
  const m = new KosmosCP1(cp1RomFromBase64(CP1_ROM_B64));
  window.cp1 = m;                                 // for poking around in the dev console

  // ------------------------------------------------------------------ timed events (in CPU cycles)
  const HOLD = 40000, GAP = 40000, BOOT = 500000;
  let queue = [], typeEnd = 0;
  const at = (cycle, fn) => { queue.push({ cycle, fn }); queue.sort((a, b) => a.cycle - b.cycle); };
  function typeKeys(names, startDelay) {
    let t = Math.max(m.cycles, typeEnd) + (startDelay || 0);
    for (const k of names) {
      at(t, () => { m.keyDown(k); showKey(k, true); });
      at(t + HOLD, () => { m.keyUp(k); showKey(k, false); });
      t += HOLD + GAP;
    }
    typeEnd = t;
  }

  // ------------------------------------------------------------------ display: 6 digits, grouped 1 + 2 + 3, point after the third
  const segEls = [];
  (function buildDisplay() {
    const NS = "http://www.w3.org/2000/svg", svg = $("display");
    const h = (x, y, l) => `${x},${y} ${x + 4},${y - 4} ${x + l - 4},${y - 4} ${x + l},${y} ${x + l - 4},${y + 4} ${x + 4},${y + 4}`;
    const v = (x, y, l) => `${x},${y} ${x + 4},${y + 4} ${x + 4},${y + l - 4} ${x},${y + l} ${x - 4},${y + l - 4} ${x - 4},${y + 4}`;
    const shapes = [h(3, 4, 30), v(34, 5, 30), v(34, 37, 30), h(3, 68, 30), v(2, 37, 30), v(2, 5, 30), h(3, 36, 30)];
    const X = [26, 100, 158, 240, 298, 356];
    for (let d = 0; d < 6; d++) {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("transform", `translate(${X[d]},14) skewX(-8)`);
      const els = shapes.map(p => { const e = document.createElementNS(NS, "polygon"); e.setAttribute("points", p); return e; });
      const dp = document.createElementNS(NS, "circle"); dp.setAttribute("cx", 46); dp.setAttribute("cy", 68); dp.setAttribute("r", 4.5); els.push(dp);
      els.forEach(e => { e.setAttribute("class", "seg"); g.appendChild(e); });
      svg.appendChild(g); segEls[d] = els;
    }
  })();
  const segLevel = new Float32Array(48);
  function renderLight() {
    const seg = m.collectLight();
    for (let i = 0; i < 48; i++) {
      const target = Math.min(1, seg[i] * 14);    // a steadily multiplexed digit is lit a small part of the time
      const lv = segLevel[i] = segLevel[i] + (target - segLevel[i]) * (target > segLevel[i] ? 0.7 : 0.45);
      segEls[i >> 3][i & 7].style.opacity = (0.05 + 0.95 * lv).toFixed(3);
    }
  }

  // ------------------------------------------------------------------ screw terminals and the brass straps that join the modules
  (function buildConnectors() {
    const P = 2.46, seq = (x0, n) => Array.from({ length: n }, (_, i) => x0 + i * P);
    const pad = (x, y, c) => `<rect x="${(x - .95).toFixed(2)}" y="${(y - .95).toFixed(2)}" width="1.9" height="1.9" rx=".18" fill="${c}"/>`;
    const screw = (x, y, a) => `<circle cx="${x.toFixed(2)}" cy="${y}" r=".72" fill="url(#scr)"/><line x1="${(x - .55 * Math.cos(a)).toFixed(2)}" y1="${(y - .55 * Math.sin(a)).toFixed(2)}" x2="${(x + .55 * Math.cos(a)).toFixed(2)}" y2="${(y + .55 * Math.sin(a)).toFixed(2)}" stroke="#4a4d4b" stroke-width=".2"/>`;
    const term = (x, y, c, i) => pad(x, y, c) + screw(x, y, (i * 2.4 + x) % 3.1);
    const strap = (x, y1, y2) => `<rect x="${(x - .42).toFixed(2)}" y="${y1}" width=".84" height="${y2 - y1}" fill="url(#brass)"/>`;
    const latch = (x, y) => `<path d="M${x - 1.1} ${y - .9}h2.2l-.5 .9l.5 .9h-2.2l.5 -.9z" fill="#0c0e0d"/>`;
    const clip = (x, y) => `<path d="M${x - .7} ${y - .7}l1.4 1.4M${x + .7} ${y - .7}l-1.4 1.4" stroke="#d8362c" stroke-width=".42" stroke-linecap="round"/>`;
    const defs = `<defs><radialGradient id="scr" cx="38%" cy="32%"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#c3c6c4"/><stop offset="1" stop-color="#7d817f"/></radialGradient>
      <linearGradient id="brass" x1="0" x2="1"><stop offset="0" stop-color="#a98f3c"/><stop offset=".45" stop-color="#f1dc8c"/><stop offset="1" stop-color="#b59a42"/></linearGradient></defs>`;
    const BRASS = "#cdb65e", TIN = "#dcdedb", COPPER = "#e3a58a";
    const gA = [5.3, 7.76], gB = [12.9, 15.36], gC = seq(19.9, 8), gR = seq(73.6, 9), gLong = seq(39.16, 23);
    // top edge of the input/output module: a row of terminals, nothing plugged in above
    $("connTop").innerHTML = defs + [...gA, ...gB, ...gC, ...gR].map((x, i) => term(x, 2.2, BRASS, i)).join("");
    // the seam: bottom terminals of the module, top terminals of the computer, and the straps across
    let h = defs;
    [...gA, ...gB].forEach((x, i) => { h += strap(x, 2, 9) + term(x, 2, BRASS, i) + term(x, 9, BRASS, i + 3); });
    gC.forEach((x, i) => { h += term(x, 2, TIN, i) + term(x, 9, COPPER, i + 1); });
    gLong.forEach((x, i) => { const joined = x >= gR[0] - .5; h += (joined ? strap(x, 2, 9) + term(x, 2, BRASS, i) : "") + term(x, 9, joined ? BRASS : TIN, i + 2); });
    h += [26.5, 50, 70.6].map(x => latch(x, 5.2)).join("") + clip(10.3, 5.4) + clip(64.5, 5.4);
    $("connMid").innerHTML = h + '<g id="xwires"></g>';
  })();

  // ------------------------------------------------------------------ keypad
  const keyEls = {}, downAt = {};
  function showKey(k, on) { (keyEls[k] || []).forEach(el => el.classList.toggle("down", on)); }
  function press(k) { if (downAt[k] !== undefined) return; downAt[k] = m.cycles; m.keyDown(k); showKey(k, true); }
  function release(k) {
    if (downAt[k] === undefined) return;
    const t = downAt[k] + 24000; delete downAt[k];            // hold at least ~60 ms so the firmware's scan sees it
    at(Math.max(t, m.cycles), () => { m.keyUp(k); showKey(k, false); });
  }
  const SUB = { STEP: "Schritt", STP: "Stopp", RUN: "Lauf", CAL: "Cass. lesen", CLR: "Irrtum", ACC: "Akku", CAS: "Cass. speichern", PC: "Programmzähler", OUT: "auslesen", INP: "eingeben" };
  const HINT = { STEP: "T", STP: ". or H", RUN: "R", CAL: "L", CLR: "X or Delete", ACC: "A", CAS: "S", PC: "P", OUT: "O", INP: "I or Enter" };
  function makeKey(k, cls) {
    const el = document.createElement("div");
    el.className = "key " + cls; el.innerHTML = `<span>${k}</span>` + (SUB[k] ? `<small>${SUB[k]}</small>` : "");
    el.setAttribute("role", "button"); el.setAttribute("aria-label", k); el.title = `${k} (keyboard: ${HINT[k] || k})`;
    el.addEventListener("pointerdown", e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {} press(k); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(t => el.addEventListener(t, () => release(k)));
    (keyEls[k] = keyEls[k] || []).push(el);
    return el;
  }
  // key positions measured off a photo: [x centre, row, width] in cqw relative to the key plate
  const ROWY = [4.5, 11, 17.3, 23.8], plate = $("keyplate");
  const place = (k, cls, x, row, w) => { const el = makeKey(k, cls); el.style.left = x + "cqw"; el.style.top = ROWY[row] + "cqw"; if (w) el.style.width = w + "cqw"; plate.appendChild(el); };
  "0123456789".split("").forEach((k, i) => place(k, "digit", 4.1 + i * 5.83, 0));
  [["STEP", 11.2], ["STP", 23.8], ["RUN", 36.5], ["CAL", 49.1]].forEach(([k, x]) => place(k, "fn", x, 1, 11.2));
  [["CLR", 15.6], ["ACC", 30], ["CAS", 44.5]].forEach(([k, x]) => place(k, "fn", x, 2, 13.2));
  [["PC", 15.6], ["OUT", 30], ["INP", 44.5]].forEach(([k, x]) => place(k, "fn", x, 3, 13.2));
  [["7", 65.5, 0], ["8", 73, 0], ["9", 80.6, 0], ["4", 65.5, 1], ["5", 73, 1], ["6", 80.6, 1], ["1", 65.5, 2], ["2", 73, 2], ["3", 80.6, 2]].forEach(([k, x, r]) => place(k, "pad", x, r));
  place("0", "pad zero", 69.4, 3);
  const KB = { enter: "INP", i: "INP", o: "OUT", p: "PC", a: "ACC", r: "RUN", ".": "STP", h: "STP", t: "STEP", delete: "CLR", x: "CLR", backspace: "CLR", l: "CAL", s: "CAS" };
  const kbKey = e => { const k = e.key.toLowerCase(); return /^[0-9]$/.test(k) ? k : KB[k]; };
  function typing(e) { return /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName || ""); }
  const typing_unused = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName || "");
  addEventListener("keydown", e => {
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") { powerCycle(); return; }
    const k = kbKey(e); if (!k || e.shiftKey) return;
    e.preventDefault(); if (!e.repeat) press(k);
  });
  addEventListener("keyup", e => { const k = kbKey(e); if (k) release(k); });
  addEventListener("blur", () => Object.keys(downAt).forEach(release));

  // ------------------------------------------------------------------ ports
  const p2Led = [];
  let switches = 0xff;                                          // port 1 input switches, up = 1
  for (let b = 0; b < 8; b++) {
    const led = document.createElement("span"); led.className = "led"; p2Led.push(led); $("port2").appendChild(led);
    const sw = document.createElement("button"); sw.className = "sw on"; sw.setAttribute("aria-label", `Port 1 switch ${b + 1}`); sw.title = `Port 1, line ${b + 1} (counts ${1 << b})`;
    sw.addEventListener("click", () => { switches ^= 1 << b; sw.classList.toggle("on", !!(switches & (1 << b))); updateP1(); });
    $("port1").appendChild(sw);
  }
  // Ground rail and contact clips (manual section 1.53): a clip screwed to a Port 1 terminal is a push button -
  // tapping it touches the ground rail and pulls that line to 0 V for as long as it is held.
  let fitted = 0x80, tapped = 0;                                // which lines have a clip (default: line 8, as in the manual)
  const clipEls = [], clipBox = [];
  function updateP1() { m.port1In = switches & ~(tapped & fitted) & 255; }
  function setFitted(v) {
    fitted = v & 255; tapped &= fitted;
    clipEls.forEach((el, b) => el.classList.toggle("fitted", !!(fitted & (1 << b))));
    clipBox.forEach((c, b) => { c.checked = !!(fitted & (1 << b)); });
    try { localStorage.setItem("cp1.clips", String(fitted)); } catch (_) {}
    updateP1();
  }
  function tap(b, on) { if (!(fitted & (1 << b))) return; tapped = on ? tapped | (1 << b) : tapped & ~(1 << b); clipEls[b].classList.toggle("down", on); updateP1(); }
  for (let b = 0; b < 8; b++) {
    const el = document.createElement("button"); el.className = "clip"; el.style.left = (73.6 + b * 2.46) + "cqw";
    el.setAttribute("aria-label", `Contact clip on Port 1 line ${b + 1}`); el.title = `Contact clip on Port 1 line ${b + 1}: hold to connect it to 0 V (keyboard: Shift+${b + 1})`;
    el.addEventListener("pointerdown", e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {} tap(b, true); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(t => el.addEventListener(t, () => tap(b, false)));
    clipEls.push(el); $("rail").appendChild(el);
    const lab = document.createElement("label"), c = document.createElement("input"); c.type = "checkbox";
    c.addEventListener("change", () => setFitted(c.checked ? fitted | (1 << b) : fitted & ~(1 << b)));
    lab.append(c, String(b + 1)); clipBox.push(c); $("clipcfg").appendChild(lab);
  }
  { let v = 0x80; try { const t = localStorage.getItem("cp1.clips"); if (t !== null) v = +t; } catch (_) {} setFitted(v); }
  addEventListener("keydown", e => { const mt = e.shiftKey && !typing(e) && /^Digit([1-8])$/.exec(e.code); if (mt) { e.preventDefault(); e.stopImmediatePropagation(); tap(+mt[1] - 1, true); } }, true);
  addEventListener("keyup", e => { const mt = /^Digit([1-8])$/.exec(e.code); if (mt && (tapped & (1 << (+mt[1] - 1)))) tap(+mt[1] - 1, false); }, true);

  // Cross-wiring Port 2 to Port 1 (manual Bild 65, the "random number" wiring): what the program puts on Port 2
  // comes back on Port 1 with the lines shuffled.
  const WCOL = ["#d8362c", "#e08a1e", "#e2c714", "#3aa655", "#2f9fd0", "#2f55d0", "#8e5bd0", "#c9c9c9"];
  function setCross(on, mapText) {
    const nums = (mapText || $("crossmap").value).trim().split(/[\s,]+/).map(Number);
    const ok = nums.length === 8 && nums.every(n => n >= 0 && n <= 8 && Number.isInteger(n));
    $("crossmap").classList.toggle("bad", !ok); if (mapText) $("crossmap").value = mapText;
    $("cross").checked = on;
    m.p2ToP1 = on && ok ? nums.map(n => n - 1) : null;
    let h = "";
    if (m.p2ToP1) nums.forEach((n, i) => { if (!n) return; const x1 = 19.9 + i * 2.46, x2 = 73.6 + (n - 1) * 2.46, y = 3.5 + i * 0.52;
      h += `<path d="M${x1.toFixed(2)} 2V${y.toFixed(2)}H${x2.toFixed(2)}V2" fill="none" stroke="${WCOL[i]}" stroke-width=".32" stroke-linejoin="round"/>`; });
    $("xwires").innerHTML = h;
    try { localStorage.setItem("cp1.cross", (on ? "1" : "0") + "|" + $("crossmap").value); } catch (_) {}
  }
  $("cross").addEventListener("change", () => setCross($("cross").checked));
  $("crossmap").addEventListener("change", () => setCross($("cross").checked));
  { let on = false, mp = ""; try { const t = (localStorage.getItem("cp1.cross") || "").split("|"); on = t[0] === "1"; mp = t[1] || ""; } catch (_) {} setCross(on, mp || undefined); }

  // little lamps on the Port 1 terminals, as the manual wires them for the blinker programs: lit while the line is 1
  const lampEls = [];
  for (let b = 0; b < 8; b++) { const l = document.createElement("i"); l.className = "lamp"; l.style.left = (73.6 + b * 2.46) + "cqw"; lampEls.push(l); $("rail").appendChild(l); }
  function setLamps(on) { $("lamps").checked = on; $("rail").classList.toggle("lamps", on); try { localStorage.setItem("cp1.lamps", on ? "1" : "0"); } catch (_) {} }
  $("lamps").addEventListener("change", () => setLamps($("lamps").checked));
  { let on = false; try { on = localStorage.getItem("cp1.lamps") === "1"; } catch (_) {} setLamps(on); }

  function renderPorts() {
    const o2 = m.port2Out, p1 = m.port1Pins;
    for (let b = 0; b < 8; b++) lampEls[b].style.setProperty("--on", (p1 >> b) & 1);
    for (let b = 0; b < 8; b++) p2Led[b].style.setProperty("--on", (o2 >> b) & 1);
    $("portvals").textContent = `Port 1 reads ${m.port1Pins}. Port 2 (LEDs) shows ${o2}.`;
  }

  // ------------------------------------------------------------------ programs
  const MN = { HLT: 1, ANZ: 2, VZG: 3, AKO: 4, LDA: 5, ABS: 6, ADD: 7, SUB: 8, SPU: 9, VGL: 10, SPB: 11, VGR: 12, VKL: 13, NEG: 14, UND: 15,
               P1E: 16, P1A: 17, P2A: 18, LIA: 19, AIS: 20, SIU: 21, P3E: 22, P4A: 23, P5A: 24 };
  const NAME = Object.fromEntries(Object.entries(MN).map(([k, v]) => [v, k]));
  const disasm = w => { const op = w >> 8, x = w & 255; return op === 0 ? (x ? `     ${d3(x)}` : "") : `${NAME[op] || "???"} ${d3(x)}`; };
  function status(t) { $("status").textContent = t; }
  // accepted line forms:  "012 ako 04.200"   "012 04.200"   "012 04200"   ".ORG 12" / "@12"   "AKO 200"   "DATA 17"
  function parseProgram(text) {
    const out = []; let a = 0;
    for (let line of text.split(/\r?\n/)) {
      line = line.replace(/[#;].*$/, "").trim(); if (!line) continue;
      let mt;
      if ((mt = line.match(/^(?:\.ORG|@)\s*(\d{1,3})$/i))) { a = +mt[1]; continue; }
      if ((mt = line.match(/^(\d{3})\s+(?:[A-Za-z][A-Za-z0-9]*\s+)?(\d{2})[.,](\d{1,3})$/) || line.match(/^(\d{3})\s+(\d{2})(\d{3})$/))) { a = +mt[1]; out.push([a++, (+mt[2] << 8) | +mt[3]]); }
      else if ((mt = line.match(/^(\d{2})[.,](\d{3})$/))) out.push([a++, (+mt[1] << 8) | +mt[2]]);
      else if ((mt = line.match(/^([A-Za-z][A-Za-z0-9]{2})(?:\s+(\d{1,3}))?$/)) && MN[mt[1].toUpperCase()]) out.push([a++, (MN[mt[1].toUpperCase()] << 8) | +(mt[2] || 0)]);
      else if ((mt = line.match(/^(?:DATA|\.DB)\s+(\d{1,3})$/i))) out.push([a++, +mt[1]]);
      else throw new Error(`cannot read "${line}"`);
      if (a > 256 || out[out.length - 1][1] > 0x18ff || (out[out.length - 1][1] & 255) > 255) throw new Error(`"${line}" is out of range`);
    }
    return out;
  }
  function loadText(text, name, run, entry) {
    let cells;
    try { cells = parseProgram(text); } catch (err) { status(`${name}: ${err.message}`); return; }
    if (!cells.length) { status(`${name}: no instructions found`); return; }
    powerCycle();
    $("p2tones").checked = !!(entry && entry.p2tones); sound.apply();
    if (entry && entry.clips !== undefined) setFitted(entry.clips);
    setCross(!!(entry && entry.cross), entry && entry.cross || undefined);
    if (entry && entry.lamps) setLamps(true);
    at(m.cycles + BOOT, () => { for (const [a, w] of cells) m.writeCell(a, w); });
    const start = entry && entry.start !== undefined ? entry.start : cells[0][0];
    const go = [...d3(start), "PC"]; if (run) go.push("RUN");
    typeKeys(go, BOOT + 20000);
    status(`${name}: ${cells.length} cells loaded${run ? `, running from ${d3(start)}` : `, program counter at ${d3(start)}`}.` + (entry && entry.note ? " " + entry.note : ""));
  }
  const lib = $("library");
  { const groups = {}; CP1_PROGRAMS.forEach((p, i) => { const g = groups[p.group] || (groups[p.group] = lib.appendChild(Object.assign(document.createElement("optgroup"), { label: p.group }))); g.appendChild(new Option(p.title, i)); }); }
  const chosen = () => CP1_PROGRAMS[+lib.value];
  $("loadrun").addEventListener("click", () => loadText(chosen().text, chosen().title, true, chosen()));
  $("loadonly").addEventListener("click", () => loadText(chosen().text, chosen().title, false, chosen()));
  $("openfile").addEventListener("click", () => $("file").click());
  $("file").addEventListener("change", async e => { const f = e.target.files[0]; if (!f) return; loadText(await f.text(), f.name, false); e.target.value = ""; });
  $("savefile").addEventListener("click", () => {
    let last = 255; while (last > 0 && m.readCell(last) === 0) last--;
    let t = "# Kosmos CP1 program, saved from the browser emulator\n\n";
    for (let a = 0; a <= last; a++) { const w = m.readCell(a); t += `${d3(a)} ${(NAME[w >> 8] || "   ").toLowerCase()} ${d2(w >> 8)}.${d3(w & 255)}\n`; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([t], { type: "text/plain" })); a.download = "PROGRAM-CP1.txt"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("clearram").addEventListener("click", () => { for (let a = 0; a < 256; a++) m.writeCell(a, 0); status("Program memory cleared."); });
  // The firmware clears all memory when it starts, so "power off/on" also empties the program memory.
  function powerCycle() { sound.set(0); queue = []; typeEnd = 0; Object.keys(keyEls).forEach(k => { m.keyUp(k); showKey(k, false); delete downAt[k]; }); m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; }

  // ------------------------------------------------------------------ tone generator on Port 4
  // The manual's programs switch a tone generator from Port 4: 0 is silence, any other value a tone.
  // Here the value picks the pitch in semitone steps: 1 = middle C, 2 = C sharp, ... 13 = the C above, and so on.
  const sound = (() => {
    let ctx = null, osc = null, gain = null, value = 0, hush = false;      // hush: silenced by the Sound off button until a port is written again
    // all tones pass through one low-pass filter: a small loudspeaker, not raw square waves
    let lp = null;
    const out = () => { if (!lp) { lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800; lp.Q.value = 0.5; lp.connect(ctx.destination); } return lp; };
    const hz = v => 261.63 * Math.pow(2, ((v - 1) % 49) / 12);
    function wake() {
      if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ctx = new C(); gain = ctx.createGain(); gain.gain.value = 0; gain.connect(out());
        osc = ctx.createOscillator(); osc.type = "square"; osc.connect(gain); osc.start(); }
      if (ctx.state === "suspended") ctx.resume(); apply();
    }
    function apply() {
      const idle = value === 0 || value === 255;                  // 255 is what the firmware puts on the port at switch-on
      $("tone").textContent = idle ? `Port 4 = ${value}: silent` : `Port 4 = ${value}: ${hz(value).toFixed(0)} Hz` + (hush ? " (sound off)" : "");
      if (!ctx) return;
      const on = !idle && !hush && $("sound").checked;
      if (on) osc.frequency.setValueAtTime(hz(value), ctx.currentTime);
      gain.gain.setTargetAtTime(on ? 0.06 : 0, ctx.currentTime, 0.004);
    }
    // Port 2 tone outputs, as in the manual's melody generator: one oscillator per line, c d e f g a h c'
    const P2HZ = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
    let p2 = null, p2val = 0;
    function applyP2() {
      if (!ctx) return;
      const en = !hush && $("sound").checked && $("p2tones").checked;
      if (en && !p2) p2 = P2HZ.map(f => { const g = ctx.createGain(); g.gain.value = 0; g.connect(out()); const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = f; o.connect(g); o.start(); return g; });
      if (p2) p2.forEach((g, b) => g.gain.setTargetAtTime(en && ((p2val >> b) & 1) ? 0.04 : 0, ctx.currentTime, 0.004));
    }
    return { wake() { wake(); applyP2(); }, apply() { apply(); applyP2(); }, set(v) { hush = false; value = v; apply(); applyP2(); }, setP2(v) { hush = false; p2val = v; apply(); applyP2(); }, off() { hush = true; apply(); applyP2(); } };
  })();
  m.onPort4 = v => sound.set(v);
  m.onPort2 = v => sound.setP2(v);
  $("p2tones").addEventListener("change", sound.apply);
  ["pointerdown", "keydown"].forEach(t => addEventListener(t, sound.wake, { capture: true }));
  $("sound").addEventListener("change", sound.apply);
  $("soundoff").addEventListener("click", sound.off);

  // ------------------------------------------------------------------ speed
  let speed = 1;
  $("speeds").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    speed = +b.dataset.speed; [...$("speeds").children].forEach(x => x.classList.toggle("on", x === b));
  });

  // ------------------------------------------------------------------ inside view
  const listing = $("listing"), rows = [], shown = new Int32Array(256).fill(-1);
  let pcRow = -1, editing = false;
  for (let a = 0; a < 256; a++) { const d = document.createElement("div"); d.dataset.a = a; listing.appendChild(d); rows.push(d); }
  function renderRow(a) {
    const w = m.readCell(a); shown[a] = w;
    rows[a].textContent = `${d3(a)}  ${d2(w >> 8)}.${d3(w & 255)}  ${disasm(w)}`;
    rows[a].classList.toggle("nop", w === 0);
  }
  listing.addEventListener("click", e => { const row = e.target.closest("div[data-a]"); if (!row || editing) return; edit(+row.dataset.a); });
  function edit(a) {
    editing = true;
    const row = rows[a], inp = document.createElement("input"), w = m.readCell(a);
    inp.maxLength = 6; inp.value = d2(w >> 8) + d3(w & 255);
    row.textContent = d3(a) + "  "; row.appendChild(inp); inp.focus(); inp.select();
    const done = (commit, next) => {
      if (!editing) return; editing = false;
      const mt = inp.value.match(/^(\d{2})[.,]?(\d{3})$/);
      if (commit && mt && +mt[2] < 256) m.writeCell(a, (+mt[1] << 8) | +mt[2]);
      renderRow(a);
      if (next && a < 255) edit(a + 1);
    };
    inp.addEventListener("keydown", e => { if (e.key === "Enter") done(true, true); else if (e.key === "Escape") done(false, false); });
    inp.addEventListener("blur", () => done(true, false));
  }
  function renderInside() {
    const pc = m.ram[0x38], acc = (m.ram[0x36] << 8) | m.ram[0x37];
    const bits = v => Array.from({ length: 8 }, (_, b) => (v >> b) & 1).join(" ");        // line 1 first, as on the module
    const in1 = m.port1Pins, out1 = m.port1Out, out2 = m.port2Out;
$("state").textContent = `Program counter ${d3(pc)}  Akku ${d2(acc >> 8)}.${d3(acc & 255)}\n` +
      `line         1 2 3 4 5 6 7 8\n` +
      `Port 1 in    ${bits(in1)}  ${d3(in1)}\n` +
      `Port 1 out   ${bits(out1)}  ${d3(out1)}\n` +
      `Port 2 LEDs  ${bits(out2)}  ${d3(out2)}\n` +
      `Port 4 tone  ${bits(m.port4Out)}  ${d3(m.port4Out)}`;
    if (!editing) for (let a = 0; a < 256; a++) if (shown[a] !== m.readCell(a)) renderRow(a);
    if (pc !== pcRow) {
      if (pcRow >= 0) rows[pcRow].classList.remove("pc");
      rows[pc].classList.add("pc"); pcRow = pc;
      if (!editing && !listing.matches(":hover")) listing.scrollTop = Math.max(0, rows[pc].offsetTop - listing.offsetTop - listing.clientHeight / 2);
    }
  }

  // ------------------------------------------------------------------ deep links: ?load=HANOI&run=1&speed=4
  (function fromURL() {
    const q = new URLSearchParams(location.search);
    const sp = q.get("speed"), b = sp && [...$("speeds").children].find(x => x.dataset.speed === sp);
    if (b) b.click();
    const name = (q.get("load") || "").toUpperCase(), i = CP1_PROGRAMS.findIndex(p => p.name.toUpperCase() === name);
    if (i >= 0) { lib.value = i; loadText(chosen().text, chosen().title, q.get("run") !== "0", chosen()); }
  })();

  // ------------------------------------------------------------------ main loop
  let last = performance.now(), frac = 0, frames = 0, rateCycles = 0, rateT = last;
  function frame(now) {
    const dt = Math.min(100, now - last); last = now;
    frac += dt / 1000 * m.cps * speed;
    let n = Math.floor(frac); frac -= n;
    const deadline = performance.now() + 12;
    while (n > 0) {
      while (queue.length && queue[0].cycle <= m.cycles) queue.shift().fn();
      let chunk = Math.min(n, 2000);
      if (queue.length) chunk = Math.max(1, Math.min(chunk, queue[0].cycle - m.cycles));
      const c0 = m.cycles; m.run(chunk); const did = m.cycles - c0; n -= did; rateCycles += did;
      if (performance.now() > deadline) break;                  // host too slow for this speed: drop the rest
    }
    renderLight();
    if (++frames % 6 === 0) { renderInside(); renderPorts(); }
    if (now - rateT > 1000) {
      $("rate").textContent = `8049 at ${Math.round(rateCycles / (now - rateT) * 1000).toLocaleString()} machine cycles/s (original: ${m.cps.toLocaleString()}).`;
      rateCycles = 0; rateT = now;
    }
    nextFrame();
  }
  const useTimer = new URLSearchParams(location.search).has("timer");   // for headless testing
  const nextFrame = () => useTimer ? setTimeout(() => frame(performance.now()), 16) : requestAnimationFrame(frame);
  renderInside(); renderPorts();
  nextFrame();
})();
