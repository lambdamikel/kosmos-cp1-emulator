const rx = /^(\d{3})\s+(?:[A-Za-z][A-Za-z0-9]*\s+)?(\d{2})[.,](\d{1,3})$/;
for (const name of ['L010', 'L011', 'L017']) { const p = CP1_PROGRAMS.find(p => p.name === name); m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.port1In = 0xff; m.run(500000);
  for (let line of p.text.split('\n')) { line = line.replace(/[#;].*$/, '').trim(); if (!line) continue; const t = line.match(rx); m.writeCell(+t[1], (+t[2] << 8) | +t[3]); }
  keys('0 0 1 PC RUN'); const o = []; let last = -1; for (let i = 0; i < 400 && o.length < 10; i++) { m.run(8000); const v = m.port1Pins & 3; if (v !== last) { o.push(v); last = v; } }
  console.log(name, p.title, '| lamps flag', !!p.lamps, '| lines 1-2 over time:', o.join(' ')); }
