const rx = /^(\d{3})\s+(?:[A-Za-z][A-Za-z0-9]*\s+)?(\d{2})[.,](\d{1,3})$/;
function start(name){ const p = CP1_PROGRAMS.find(p => p.name === name); m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.port1In = 0xff; m.run(500000);
  for (let line of p.text.split('\n')) { line = line.replace(/[#;].*$/, '').trim(); if (!line) continue; const t = line.match(rx); m.writeCell(+t[1], (+t[2] << 8) | +t[3]); }
  keys('0 0 0 PC RUN'); }
let log = []; m.onPort4 = v => log.push(v);
start('SCALE'); log = []; m.run(400000 * 4); console.log('SCALE  port 4 writes in 4 s:', log.join(' '));
start('MELODY'); log = []; m.run(400000 * 10); console.log('MELODY notes:', log.filter(v => v).join(' '));
start('PIANO'); log = []; m.run(200000); m.port1In = 8; m.run(200000); const a = m.port4Out; m.port1In = 255; m.run(200000); console.log('PIANO  switches 8 -> port 4 =', a, '; all up ->', m.port4Out);
