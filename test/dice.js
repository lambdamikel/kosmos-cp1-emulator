const rx = /^(\d{3})\s+(?:[A-Za-z][A-Za-z0-9]*\s+)?(\d{2})[.,](\d{1,3})$/;
const p = CP1_PROGRAMS.find(p => p.name === 'L038'); m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.port1In = 0xff; m.run(500000);
for (let line of p.text.split('\n')) { line = line.replace(/[#;].*$/, '').trim(); if (!line) continue; const t = line.match(rx); m.writeCell(+t[1], (+t[2] << 8) | +t[3]); }
keys('0 0 1 PC RUN'); const cell = a => m.readCell(a) & 255;
const s = []; for (let i = 0; i < 6; i++) { m.run(37000); s.push(cell(103) + '/' + cell(104) + '@' + m.ram[0x38]); } console.log('running:', s.join(' '));
for (let k = 0; k < 4; k++) { m.run(123457 * (k + 1)); m.port1In = 0xfe; m.run(60000); m.port1In = 0xff; const o = []; let last = ''; for (let i = 0; i < 30; i++) { m.run(40000); const d = disp(20000); if (d !== last) { o.push(d.trim()); last = d; } } console.log('roll', k + 1, '->', o.join(' | '), ' dice', cell(103), cell(104)); }
