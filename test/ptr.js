function fresh(){ m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.port1In = 0xff; m.run(500000); }
const D = t => console.log(t.padEnd(18), '[' + disp() + '] R7 =', m.ram[7], ' PC =', m.ram[0x38]);
fresh(); D('power on'); keys('0 1 2 INP'); D('012 INP'); keys('0 4 0 4 2 INP'); D('04042 INP'); keys('0 5 0 0 9 INP'); D('05009 INP'); keys('0 1 2 OUT'); D('012 OUT'); keys('OUT'); D('OUT'); keys('OUT'); D('OUT');
keys('0 1 2 PC'); D('012 PC'); keys('STEP'); D('STEP'); keys('RUN'); m.run(200000); D('RUN (ends F002)'); keys('CLR 2 5 5 INP'); D('255 INP'); keys('0 0 0 0 1 INP'); D('store at 255'); keys('0 0 0 0 2 INP'); D('store again');
[[0,4,1],[1,6,20],[2,2,0],[3,3,50],[4,7,20],[5,9,1]].forEach(([a,o,x]) => m.writeCell(a,(o<<8)|x)); keys('CLR 0 3 0 INP'); keys('0 0 0 PC RUN'); m.run(300000); D('running a loop'); m.run(100000); D('still running');
