function fresh(){ m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.port1In = 0xff; m.run(500000); }
const D = t => console.log(t.padEnd(16), '[' + disp() + '] R7', m.ram[7]);
fresh(); keys('9 OUT'); D('9 OUT (fresh)'); keys('0 2 0 INP 0 4 0 0 1 INP 0 4 0 0 2 INP'); D('3 entries'); keys('9 OUT'); D('9 OUT'); keys('0 4 0 0 3 INP'); D('one more'); keys('9 OUT'); D('9 OUT'); keys('0 2 0 OUT OUT'); D('020 OUT OUT'); keys('9 OUT'); D('9 OUT'); keys('7 OUT'); D('7 OUT');
