const rx = /^(\d{3})\s+(?:[A-Za-z][A-Za-z0-9]*\s+)?(\d{2})[.,](\d{1,3})$/;
function start(){ const p = CP1_PROGRAMS.find(p => p.name === 'MOON'); m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.port1In = 0xff; m.run(500000);
  for (let line of p.text.split('\n')) { line = line.replace(/[#;].*$/, '').trim(); if (!line) continue; const t = line.match(rx); m.writeCell(+t[1], (+t[2] << 8) | +t[3]); }
  keys('0 0 1 PC RUN'); }
const cell = a => m.readCell(a) & 255;
function fly(name, pins) { start(); const log = []; let last = '', d = '';
  for (let i = 0; i < 3000; i++) { m.port1In = pins(cell(106), cell(108), i); m.run(100000); const st = cell(105) + '/' + cell(106) + '/' + cell(108); if (st !== last) { log.push(st); last = st; }
    d = disp(20000); if (/^F/.test(d) || (m.ram[0x38] >= 97 && m.ram[0x38] <= 99)) break; }
  console.log(name.padEnd(26), 'ends [' + d + '] at PC', m.ram[0x38], '| fuel/height/speed(internal):', log.slice(-4).join('  ')); }
fly('nothing touched', () => 255);
fly('line 8 held (7 units)', () => 0x7f);
fly('line 5 held (4 units)', () => 0xef);
fly('line 3 held (2 units)', () => 0xfb);
fly('two lines at once (3+4)', () => 0xf3);
fly('line 2 held (1 unit)', () => 0xfd);
