// load every library program the way the page does, start it, and report what the display shows
const rx = /^(\d{3})\s+(?:[A-Za-z][A-Za-z0-9]*\s+)?(\d{2})[.,](\d{1,3})$/;
for (const p of CP1_PROGRAMS) {
  m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.port1In = 0xff; m.run(500000);
  let n = 0, bad = 0;
  for (let line of p.text.split('\n')) { line = line.replace(/[#;].*$/, '').trim(); if (!line) continue; const t = line.match(rx); if (t) { m.writeCell(+t[1], (+t[2] << 8) | +t[3]); n++; } else bad++; }
  keys([...String(p.start).padStart(3, '0'), 'PC', 'RUN'].join(' ')); m.run(1200000);
  console.log(p.name.padEnd(8), String(n).padStart(3), 'cells', bad ? bad + ' UNPARSED' : '', 'start', String(p.start).padStart(3), '| display [' + disp(60000) + '] port2', m.port2Out, '|', p.title);
}
m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.run(500000);
[[0,0x1000],[1,0x1200],[2,0x0200],[3,0x0900]].forEach(([a,w]) => m.writeCell(a,w)); keys('0 0 0 PC RUN');
for (const v of [255, 0, 5, 170]) { m.port1In = v; m.run(200000); console.log('ECHO switches', v, '-> LEDs', m.port2Out, 'display [' + disp(40000) + ']'); }
