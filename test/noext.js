function run(hasExt, cells){ m.hasExt = hasExt; m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.port1In = 0xff; m.run(500000); for (const [a,o,x] of cells) m.writeCell(a,(o<<8)|x); keys('0 0 0 PC RUN'); m.run(300000); return '[' + disp() + '] memsize ' + m.ram[0x3b] + ' acc ' + m.ram[0x37] + ' pc ' + m.ram[0x38]; }
for (const ext of [true, false]) {
  console.log(ext ? 'with CP3   ' : 'without CP3', 'P4A:', run(ext, [[0,4,7],[1,23,0],[2,4,1],[3,2,0],[4,1,0]]), '| P3E:', run(ext, [[0,22,0],[1,2,0],[2,1,0]]), '| P5A:', run(ext, [[0,4,3],[1,24,0],[2,4,2],[3,2,0],[4,1,0]]), '| opcode 25:', run(ext, [[0,25,0]]));
}
m.hasExt = true;
