const rx = /^(\d{3})\s+(?:[A-Za-z][A-Za-z0-9]*\s+)?(\d{2})[.,](\d{1,3})$/;
function start(name){ const p = CP1_PROGRAMS.find(p => p.name === name); m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.port1In = 0xff; m.run(500000);
  for (let line of p.text.split('\n')) { line = line.replace(/[#;].*$/, '').trim(); if (!line) continue; const t = line.match(rx); m.writeCell(+t[1], (+t[2] << 8) | +t[3]); }
  keys([...String(p.start).padStart(3,'0'), 'PC', 'RUN'].join(' ')); }
const cell = a => m.readCell(a) & 255;
function fly(name, burnLine) {            // burnLine(height, speed, fuel) -> Port 1 line to pull low (1-8)
  start('MOON'); const log = []; let last = '';
  for (let i = 0; i < 4000; i++) {
    m.port1In = 255 & ~(1 << (burnLine(cell(106), cell(108), cell(105)) - 1));
    m.run(100000);
    const st = cell(105) + '/' + cell(106) + '/' + cell(107);
    if (st !== last) { log.push(st); last = st; }
    if (m.ram[0x38] >= 97 && m.ram[0x38] <= 99) break;
  }
  console.log(name + ': fuel/height/speed ->', log.slice(0, 6).join('  '), '...', log.slice(-3).join('  '), '| final display [' + disp(60000) + '] steps', log.length);
}
fly('no burn      ', () => 1);
fly('full burn    ', () => 8);
fly('gentle pilot ', (h, v) => v > 100 + Math.max(1, Math.floor(h / 12)) ? 5 : (v > 101 ? 3 : 2));
let log = []; m.onPort2 = v => log.push(v); start('MELODY40'); log = []; m.run(400000 * 8); console.log('MELODY40 Port 2 in 8 s:', log.join(' '));
