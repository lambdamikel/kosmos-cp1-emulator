m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.run(500000);
m.p2ToP1 = [3,4,2,1,7,8,6,5].map(n => n - 1);
// AKO n ; P2A ; P1E ; ANZ ; HLT
function shuffle(n){ m.writeCell(0, 0x0400 | n); m.writeCell(1, 0x1200); m.writeCell(2, 0x1000); m.writeCell(3, 0x0200); m.writeCell(4, 0x0100); keys('0 0 0 PC RUN'); m.run(300000); return m.ram[0x37]; }
const exp = n => { let v = 0; [3,4,2,1,7,8,6,5].forEach((d, i) => { if ((n >> i) & 1) v |= 1 << (d - 1); }); return v; };
for (const n of [1, 2, 8, 16, 128, 37, 200, 255, 0]) console.log('Port 2 =', n, '-> Port 1 reads', shuffle(n), '(expected', exp(n) + ')');
