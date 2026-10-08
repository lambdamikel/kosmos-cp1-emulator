const rx = /^(\d{3})\s+(?:[A-Za-z][A-Za-z0-9]*\s+)?(\d{2})[.,](\d{1,3})$/;
function start(name){ const p = CP1_PROGRAMS.find(p => p.name === name); m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.port1In = 0xff; m.p2ToP1 = p.cross ? p.cross.split(' ').map(n => n - 1) : null; m.run(500000);
  for (let line of p.text.split('\n')) { line = line.replace(/[#;].*$/, '').trim(); if (!line) continue; const t = line.match(rx); if (!t) { console.log('UNPARSED', name, line); continue; } m.writeCell(+t[1], (+t[2] << 8) | +t[3]); }
  keys([...String(p.start).padStart(3,'0'), 'PC', 'RUN'].join(' ')); }
const seq = (n, step) => { const o = []; let last = ''; for (let i = 0; i < n; i++) { m.run(step || 40000); const s = disp(10000).trim(); if (s !== last) { o.push(s); last = s; } } return o.join(' | '); };
const cell = a => m.readCell(a) & 255;
start('FIRST'); console.log('FIRST   ', seq(10), '| acc', m.ram[0x37]);
start('ADD'); m.run(300000); console.log('ADD      cell 012 =', cell(12), '[' + disp() + ']');
start('COUNT10'); console.log('COUNT10 ', seq(120));
start('MULT'); console.log('MULT    ', seq(60), '| product', cell(22));
start('TABLESUM'); m.run(600000); console.log('TABLESUM sum =', cell(31), '[' + disp() + '] acc', m.ram[0x37]);
start('SUBR'); console.log('SUBR    ', seq(120));
start('BUTTON'); m.run(200000); for (let i = 0; i < 3; i++) { m.port1In = 0x7f; m.run(120000); m.port1In = 0xff; m.run(120000); } console.log('BUTTON   after 3 taps: count', cell(20), '[' + disp() + ']');
start('SHUFFLE'); console.log('SHUFFLE ', seq(60));
