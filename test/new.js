const rx = /^(\d{3})\s+(?:[A-Za-z][A-Za-z0-9]*\s+)?(\d{2})[.,](\d{1,3})$/;
function start(name){ const p = CP1_PROGRAMS.find(p => p.name === name); m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.port1In = 0xff; m.p2ToP1 = p.cross ? p.cross.split(' ').map(n => n - 1) : null; m.run(500000);
  for (let line of p.text.split('\n')) { line = line.replace(/[#;].*$/, '').trim(); if (!line) continue; const t = line.match(rx); m.writeCell(+t[1], (+t[2] << 8) | +t[3]); }
  keys([...String(p.start).padStart(3,'0'), 'PC', 'RUN'].join(' ')); return p; }
const seq = (n, step) => { const o = []; let last = ''; for (let i = 0; i < n; i++) { m.run(step || 100000); const s = disp(30000); if (s !== last) { o.push(s.trim()); last = s; } } return o.join(' | '); };
const cell = a => m.readCell(a) & 255;
start('L042'); console.log('42 multiplication 156x255:', seq(80));
start('L043'); console.log('43 division 22/7:', seq(160));
start('L041'); console.log('41 chess, player on 011 ->', seq(60));
start('L036'); m.run(400000 * 40); const f = []; for (let a = 1; a <= 36; a++) f.push(cell(a)); const cnt = {}; f.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
console.log('36 pairs: fields', f.join(' '), '| display [' + disp(30000) + '] values 0-17 each twice:', Object.keys(cnt).length === 18 && Object.values(cnt).every(c => c === 2));
start('L045'); m.run(400000 * 6); console.log('45 arithmetic: operands', cell(114), cell(115), 'operation', cell(113), 'expected result', cell(117), '| display [' + disp(30000) + ']');
start('L038'); m.run(400000); m.port1In = 0xfe; m.run(400000 * 2); console.log('38 dice, clip held: [' + disp(30000) + '] dice cells', cell(103), cell(104));
start('L052'); const p2 = []; for (let i = 0; i < 12; i++) { m.run(60000); p2.push(m.port2Out); } m.port1In = 0xfe; m.run(200000); m.port1In = 0xff; m.run(400000 * 20); console.log('52 roulette: LEDs', p2.join(' '), '| after rolling out: LED value', m.port2Out, 'display [' + disp(30000) + ']');
