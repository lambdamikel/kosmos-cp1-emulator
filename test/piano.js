m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.run(500000);
[[0,0x1000],[1,0x0614],[2,0x04ff],[3,0x0814],[4,0x1200],[5,0x0200],[6,0x0900]].forEach(([a,w]) => m.writeCell(a,w)); keys('0 0 0 PC RUN');
for (const sw of [0xff, 0xfe, 0xfd, 0xf7, 0x7f, 0xfa]) { m.port1In = sw; m.run(200000); console.log('switches read', sw, '-> Port 2 =', m.port2Out); }
