// Intel 8049 core + Kosmos CP1 board model (two 8155 RAM/IO chips, display, keypad, ports).
//
// Runs the original CP1 firmware ROM instruction by instruction; nothing is patched
// or intercepted.  The 8049 core and the board wiring follow Andreas Signer's
// kosmos-cp1 emulator (https://github.com/asig/kosmos-cp1, GPL-3).
"use strict";

// keypad matrix: key -> [row, column].  A row is selected by a low bit on port C of the
// internal 8155; the columns are read on the low nibble of the 8049's port 2.
const CP1_KEYS = {
  "0": [4, 0], "1": [4, 1], "2": [4, 2], "3": [4, 3], "4": [3, 0], "5": [3, 1], "6": [3, 2], "7": [3, 3],
  "8": [2, 0], "9": [2, 1], OUT: [2, 2], INP: [2, 3], CAL: [1, 0], STEP: [1, 1], STP: [1, 2], RUN: [1, 3],
  CAS: [0, 0], CLR: [0, 1], PC: [0, 2], ACC: [0, 3],
};

class I8155 {
  constructor() { this.ram = new Uint8Array(256); this.reset(); }
  reset() { this.cmd = 0; this.pa = 0; this.pb = 0; this.pc = 0; this.ram.fill(0); }
}

class KosmosCP1 {
  constructor(romBytes) {
    if (romBytes.length !== 2048) throw new Error("ROM must be 2048 bytes");
    this.rom = romBytes;
    this.ram = new Uint8Array(128);          // 8049 internal RAM
    this.pid = new I8155();                  // main unit: RAM (program cells 000-127), display, keypad rows, port 2 out
    this.ext = new I8155();                  // CP3 memory expansion (program cells 128-255)
    this.hasExt = true;
    this.keys = new Uint8Array(8);           // per row: column bits of held keys
    this.port1In = 0xff;                     // levels applied from outside to the 8 lines of port 1
    this.cps = 400000;                       // machine cycles per second (6 MHz crystal / 15)
    this.cycles = 0; this.lastLight = 0; this.accSince = 0;
    this.segAcc = new Float64Array(48);      // 6 digits x 8 segments, on-time in cycles
    this.onPort2 = null;                     // optional observer(value): user port 2 (8155 port B) written
    this.onPort4 = null;                     // optional observer(value): port 4 (expansion 8155 port A) written
    this.p2ToP1 = null;                      // optional wiring: p2ToP1[i] = Port 1 line (0-7) that Port 2 line i is wired to
    this.port3In = 0xff;                     // levels applied to port 3 (expansion 8155 port B, an input)
    this.reset();
  }
  reset() {
    this._light();
    this.a = 0; this.pc = 0; this.psw = 8; this.dbf = 0; this.f1 = 0; this.t = this.t | 0;
    this.tf = false; this.timerIrq = false; this.extIrqEn = false; this.tcntIrqEn = false;
    this.timerRunning = false; this.counterRunning = false; this.inIrq = false; this.untilCount = 0;
    this.p1 = 0xff; this.p2 = 0xff; this.bus = 0;
    this.ram.fill(0);
  }
  // ---- board ----
  keyDown(k) { const m = CP1_KEYS[k]; if (m) this.keys[m[0]] |= 1 << m[1]; }
  keyUp(k) { const m = CP1_KEYS[k]; if (m) this.keys[m[0]] &= ~(1 << m[1]); }
  _chip() {                                  // which 8155 is selected by port 2 (bit4 = /CE main, bit5 = /CE expansion)
    if (!(this.p2 & 0x10)) return this.pid;
    if (!(this.p2 & 0x20) && this.hasExt) return this.ext;
    return null;
  }
  _setP2(v) {
    const old = this.p2; this.p2 = v & 0xff;
    if (!(old & 0x40) && (v & 0x40)) { this._light(); this.pid.reset(); this.ext.reset(); }   // bit 6 = RESET of the 8155s
  }
  _busRead(addr) {
    const c = this._chip(); if (!c) return 0xff;
    if (this.p2 & 0x80) {                    // IO/M high: I/O registers
      switch (addr & 3) { case 1: return c.pa; case 2: return c === this.ext ? this.port3In : c.pb; case 3: return c.pc; default: return 0; }
    }
    return c.ram[addr];
  }
  _busWrite(addr, v) {
    const c = this._chip(); if (!c) return;
    if (this.p2 & 0x80) {
      if (c === this.pid) this._light();
      switch (addr & 3) {
        case 0: c.cmd = v; break;
        case 1: c.pa = v; if (c === this.ext && this.onPort4) this.onPort4(v); break;
        case 2: c.pb = v; if (c === this.pid && this.onPort2) this.onPort2(v); break;
        case 3: c.pc = v; break;
      }
    } else c.ram[addr] = v;
  }
  _keyNibble() {                             // MOVD A,P4: columns of the selected keypad row
    const sel = this.pid.pc;
    for (let i = 0; i < 8; i++) if (!(sel & (1 << i))) return this.keys[i] & 15;
    return 0;
  }
  _light() {                                 // integrate segment on-time up to now
    const dt = this.cycles - this.lastLight;
    if (dt > 0) {
      const seg = this.pid.pa, sel = this.pid.pc;
      if (seg) for (let i = 0; i < 6; i++) if (!(sel & (1 << i))) {
        const d = 5 - i;                     // digit 0 = leftmost
        for (let b = 0; b < 8; b++) if ((seg >> b) & 1) this.segAcc[d * 8 + b] += dt;
      }
    }
    this.lastLight = this.cycles;
  }
  collectLight() {
    this._light();
    const span = Math.max(1, this.cycles - this.accSince);
    const seg = Array.from(this.segAcc, v => v / span);
    this.segAcc.fill(0); this.accSince = this.cycles;
    return seg;
  }
  _port1Pins() {                             // levels on the Port 1 terminals: outside inputs, plus any Port 2 lines wired across
    let v = this.port1In;
    if (this.p2ToP1) { const o = this.pid.pb; for (let i = 0; i < 8; i++) if (this.p2ToP1[i] >= 0 && !((o >> i) & 1)) v &= ~(1 << this.p2ToP1[i]); }
    return v & 255;
  }
  get port1Pins() { return this.p1 & this._port1Pins(); }
  get port2Out() { return this.pid.pb; }     // user port 2 (outputs)
  get port1Out() { return this.p1; }         // what the program last wrote to port 1
  get port4Out() { return this.ext.pa; }     // port 4 (outputs, on the expansion's 8155)
  get port5Out() { return this.ext.pc; }     // port 5 (outputs)
  // program cells: 3-digit address 000-255, each cell = opcode byte + operand byte (opcode first)
  readCell(n) { const c = n < 128 ? this.pid : this.ext, i = (n & 127) * 2; return (c.ram[i] << 8) | c.ram[i + 1]; }
  writeCell(n, w) { const c = n < 128 ? this.pid : this.ext, i = (n & 127) * 2; c.ram[i] = (w >> 8) & 255; c.ram[i + 1] = w & 255; }

  // ---- cpu ----
  _reg(r) { return this.ram[((this.psw & 0x10) ? 24 : 0) + r]; }
  _setReg(r, v) { this.ram[((this.psw & 0x10) ? 24 : 0) + r] = v & 255; }
  _fetch() { const v = this.rom[this.pc & 0x7ff]; this.pc = (this.pc + 1) & 0xfff; return v; }
  _tick() {
    this.cycles++;
    if (this.timerRunning && --this.untilCount === 0) {
      this.untilCount = 32;
      if (this.t === 0xff) { this.tf = true; this.timerIrq = true; }
      this.t = (this.t + 1) & 255;
    }
  }
  _push() {
    const sp = this.psw & 7;
    this.ram[8 + 2 * sp] = this.pc & 255;
    this.ram[9 + 2 * sp] = (this.psw & 0xf0) | ((this.pc >> 8) & 15);
    this.psw = (this.psw & 0xf8) | ((sp + 1) & 7);
  }
  _pop(restore) {
    const sp = (this.psw - 1) & 7;
    this.pc = ((this.ram[9 + 2 * sp] & 15) << 8) | this.ram[8 + 2 * sp];
    if (restore) { this.psw = (this.ram[9 + 2 * sp] & 0xf0) | 8 | sp; this.inIrq = false; }
    else this.psw = (this.psw & 0xf0) | 8 | sp;
  }
  _add(v, c) {
    const r = this.a + v + c, h = (this.a & 15) + (v & 15) + c;
    this.psw = (this.psw & 0x3f) | (r > 255 ? 0x80 : 0) | (h > 15 ? 0x40 : 0);
    this.a = r & 255;
  }
  _jcond(cond) {                             // conditional jump within the current page
    const b = this._fetch(), addr = ((this.pc - 1) & 0xf00) | b;
    this._tick();
    if (cond) this.pc = addr;
  }
  run(n) { const end = this.cycles + n; while (this.cycles < end) this.step(); }
  step() {
    const op = this._fetch();
    this._tick();
    const lo = op & 15, hi = op >> 4;
    let t, r;
    if (lo >= 8) {                           // register column
      r = op & 7;
      switch (hi) {
        case 0x0: if (r === 0) { this._tick(); this.a = this.bus; }                       // INS A,BUS
                  else if (r <= 2) { this._tick(); this.a = r === 1 ? (this.p1 & this._port1Pins()) : this.p2; }   // IN A,Pp
                  else if (r >= 4) { this._tick(); this.a = this._keyNibble(); }          // MOVD A,Pp
                  break;
        case 0x1: this._setReg(r, this._reg(r) + 1); break;                              // INC Rr
        case 0x2: t = this._reg(r); this._setReg(r, this.a); this.a = t; break;           // XCH A,Rr
        case 0x3: if (r === 1) { this._tick(); this.p1 = this.a; }                        // OUTL P1,A
                  else if (r === 2) { this._tick(); this._setP2(this.a); }                // OUTL P2,A
                  else if (r >= 4) this._tick();                                          // MOVD Pp,A (no expander fitted)
                  break;
        case 0x4: this.a |= this._reg(r); break;                                         // ORL A,Rr
        case 0x5: this.a &= this._reg(r); break;                                         // ANL A,Rr
        case 0x6: this._add(this._reg(r), 0); break;                                     // ADD A,Rr
        case 0x7: this._add(this._reg(r), (this.psw >> 7) & 1); break;                   // ADDC A,Rr
        case 0x8: if (r === 0) { this._tick(); this.bus |= this._fetch(); }               // ORL BUS,#
                  else if (r === 1) { this._tick(); this.p1 |= this._fetch(); }           // ORL P1,#
                  else if (r === 2) { this._tick(); this._setP2(this.p2 | this._fetch()); }
                  else if (r >= 4) this._tick();                                          // ORLD
                  break;
        case 0x9: if (r === 0) { this._tick(); this.bus &= this._fetch(); }               // ANL BUS,#
                  else if (r === 1) { this._tick(); this.p1 &= this._fetch(); }           // ANL P1,#
                  else if (r === 2) { this._tick(); this._setP2(this.p2 & this._fetch()); }
                  else if (r >= 4) this._tick();                                          // ANLD
                  break;
        case 0xa: this._setReg(r, this.a); break;                                        // MOV Rr,A
        case 0xb: t = this._fetch(); this._tick(); this._setReg(r, t); break;             // MOV Rr,#
        case 0xc: this._setReg(r, this._reg(r) - 1); break;                              // DEC Rr
        case 0xd: this.a ^= this._reg(r); break;                                         // XRL A,Rr
        case 0xe: t = this._fetch(); this._tick(); r = op & 7;                            // DJNZ Rr,addr
                  { const v = (this._reg(r) - 1) & 255; this._setReg(r, v); if (v) this.pc = ((this.pc - 1) & 0xf00) | t; }
                  break;
        case 0xf: this.a = this._reg(r); break;                                          // MOV A,Rr
      }
    } else if (lo === 4) {                   // JMP / CALL
      t = (this.dbf << 11) | ((op & 0xe0) << 3) | this._fetch();
      this._tick();
      if (op & 0x10) this._push();
      this.pc = t & 0xfff;
    } else if (lo === 2) {
      if (op === 0x02) { this._tick(); this.bus = this.a; }                               // OUTL BUS,A
      else if (op === 0x42) this.a = this.t;                                              // MOV A,T
      else if (op === 0x62) this.t = this.a;                                              // MOV T,A
      else if (hi & 1) this._jcond(this.a & (1 << (hi >> 1)));                            // JBb
    } else if (lo <= 1) {                    // @R0 / @R1
      r = this._reg(op & 1);
      const p = r & 0x7f;
      switch (hi) {
        case 0x1: this.ram[p] = (this.ram[p] + 1) & 255; break;                           // INC @Rr
        case 0x2: t = this.a; this.a = this.ram[p]; this.ram[p] = t; break;               // XCH A,@Rr
        case 0x3: t = this.ram[p] & 15; this.ram[p] = (this.ram[p] & 0xf0) | (this.a & 15); this.a = (this.a & 0xf0) | t; break; // XCHD
        case 0x4: this.a |= this.ram[p]; break;
        case 0x5: this.a &= this.ram[p]; break;
        case 0x6: this._add(this.ram[p], 0); break;
        case 0x7: this._add(this.ram[p], (this.psw >> 7) & 1); break;
        case 0x8: this._tick(); this.a = this._busRead(r); this.bus = this.a; break;      // MOVX A,@Rr
        case 0x9: this._tick(); this._busWrite(r, this.a); this.bus = this.a; break;      // MOVX @Rr,A
        case 0xa: this.ram[p] = this.a; break;                                            // MOV @Rr,A
        case 0xb: t = this._fetch(); this._tick(); this.ram[p] = t; break;                // MOV @Rr,#
        case 0xd: this.a ^= this.ram[p]; break;                                           // XRL A,@Rr
        case 0xf: this.a = this.ram[p]; break;                                            // MOV A,@Rr
      }
    } else switch (op) {
      case 0x03: t = this._fetch(); this._tick(); this._add(t, 0); break;                 // ADD A,#
      case 0x13: t = this._fetch(); this._tick(); this._add(t, (this.psw >> 7) & 1); break; // ADDC A,#
      case 0x23: t = this._fetch(); this._tick(); this.a = t; break;                      // MOV A,#
      case 0x43: t = this._fetch(); this._tick(); this.a |= t; break;
      case 0x53: t = this._fetch(); this._tick(); this.a &= t; break;
      case 0xd3: t = this._fetch(); this._tick(); this.a ^= t; break;
      case 0x83: this._tick(); this._pop(false); break;                                   // RET
      case 0x93: this._tick(); this._pop(true); break;                                    // RETR
      case 0xa3: this._tick(); this.a = this.rom[((this.pc & 0xf00) | this.a) & 0x7ff]; break;       // MOVP A,@A
      case 0xb3: this._tick(); this.pc = (this.pc & 0xf00) | this.rom[((this.pc & 0xf00) | this.a) & 0x7ff]; break; // JMPP @A
      case 0xe3: this._tick(); this.a = this.rom[0x300 | this.a]; break;                  // MOVP3 A,@A
      case 0x05: this.extIrqEn = true; break;                                             // EN I
      case 0x15: this.extIrqEn = false; break;                                            // DIS I
      case 0x25: this.tcntIrqEn = true; break;                                            // EN TCNTI
      case 0x35: this.tcntIrqEn = false; this.timerIrq = false; break;                    // DIS TCNTI
      case 0x45: this.counterRunning = true; this.timerRunning = false; break;            // STRT CNT
      case 0x55: this.counterRunning = false; this.timerRunning = true; this.untilCount = 32; break; // STRT T
      case 0x65: this.timerRunning = false; this.counterRunning = false; break;           // STOP TCNT
      case 0x07: this.a = (this.a - 1) & 255; break;                                      // DEC A
      case 0x17: this.a = (this.a + 1) & 255; break;                                      // INC A
      case 0x27: this.a = 0; break;                                                       // CLR A
      case 0x37: this.a = ~this.a & 255; break;                                           // CPL A
      case 0x47: this.a = ((this.a << 4) | (this.a >> 4)) & 255; break;                   // SWAP A
      case 0x57: {                                                                        // DA A
        if ((this.a & 15) > 9 || (this.psw & 0x40)) this.a += 6;
        let h = (this.a >> 4) & 0x1f; if (h > 9 || (this.psw & 0x80)) h += 6;
        this.a = ((h << 4) | (this.a & 15)) & 255; this.psw = (this.psw & 0x7f) | (h > 15 ? 0x80 : 0); break; }
      case 0x67: t = this.a & 1; this.a = (this.a >> 1) | (this.psw & 0x80); this.psw = (this.psw & 0x7f) | (t << 7); break;   // RRC A
      case 0x77: this.a = ((this.a >> 1) | (this.a << 7)) & 255; break;                   // RR A
      case 0xe7: this.a = ((this.a << 1) | (this.a >> 7)) & 255; break;                   // RL A
      case 0xf7: t = this.a & 0x80; this.a = ((this.a << 1) | (this.psw >> 7)) & 255; this.psw = (this.psw & 0x7f) | t; break;  // RLC A
      case 0x85: this.psw &= ~0x20; break;                                                // CLR F0
      case 0x95: this.psw ^= 0x20; break;                                                 // CPL F0
      case 0xa5: this.f1 = 0; break;                                                      // CLR F1
      case 0xb5: this.f1 ^= 1; break;                                                     // CPL F1
      case 0x97: this.psw &= 0x7f; break;                                                 // CLR C
      case 0xa7: this.psw ^= 0x80; break;                                                 // CPL C
      case 0xc5: this.psw &= ~0x10; break;                                                // SEL RB0
      case 0xd5: this.psw |= 0x10; break;                                                 // SEL RB1
      case 0xe5: this.dbf = 0; break;                                                     // SEL MB0
      case 0xf5: this.dbf = 1; break;                                                     // SEL MB1
      case 0xc7: this.a = this.psw; break;                                                // MOV A,PSW
      case 0xd7: this.psw = this.a; break;                                                // MOV PSW,A
      case 0x16: t = this.tf; this._jcond(t); if (t) this.tf = false; break;              // JTF
      case 0x26: this._jcond(true); break;                                                // JNT0  (T0 held low)
      case 0x36: this._jcond(false); break;                                               // JT0
      case 0x46: this._jcond(true); break;                                                // JNT1
      case 0x56: this._jcond(false); break;                                               // JT1
      case 0x76: this._jcond(this.f1); break;                                             // JF1
      case 0x86: this._jcond(true); break;                                                // JNI   (no external interrupt)
      case 0x96: this._jcond(this.a !== 0); break;                                        // JNZ
      case 0xb6: this._jcond(this.psw & 0x20); break;                                     // JF0
      case 0xc6: this._jcond(this.a === 0); break;                                        // JZ
      case 0xe6: this._jcond(!(this.psw & 0x80)); break;                                  // JNC
      case 0xf6: this._jcond(this.psw & 0x80); break;                                     // JC
      default: break;                                                                     // NOP and undefined codes
    }
    this.a &= 255;
    if (!this.inIrq && this.timerIrq && this.tcntIrqEn) { this.timerIrq = false; this._push(); this.pc = 7; this.inIrq = true; }
  }
}

function cp1RomFromBase64(b64) {
  if (typeof atob === "function") return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new Uint8Array(Buffer.from(b64, "base64"));
}

if (typeof module !== "undefined") module.exports = { KosmosCP1, CP1_KEYS, cp1RomFromBase64 };
