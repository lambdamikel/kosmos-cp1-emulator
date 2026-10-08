function fresh(){ m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.port1In = 0xff; m.run(500000); }
const nz = () => { const o = []; for (let a = 0; a < 256; a++) if (m.readCell(a)) o.push(a + '=' + (m.readCell(a) >> 8) + '.' + (m.readCell(a) & 255)); return o.join(' '); };
const D = t => console.log(t.padEnd(22), '[' + disp() + '] pc', m.ram[0x38], '| cells:', nz());
fresh(); D('power on'); keys('0 1 2 INP'); D('012 INP'); keys('0 4 0 4 2 INP'); D('04042 INP'); keys('0 5 0 0 9 INP'); D('05009 INP'); keys('0 1 2 OUT'); D('012 OUT'); keys('OUT'); D('OUT'); keys('OUT'); D('OUT');
keys('0 1 2 PC'); D('012 PC'); keys('STEP'); D('STEP'); keys('ACC'); D('ACC'); keys('STEP'); D('STEP'); keys('ACC'); D('ACC');
keys('0 0 0 7 7 ACC'); D('00077 ACC');
