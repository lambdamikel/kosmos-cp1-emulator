m.run(400000); console.log('boot   ['+disp()+'] pc', m.pc.toString(16), 'p2', m.p2.toString(16), 'cycles', m.cycles);
keys('1 2 3'); console.log('123    ['+disp()+']');
keys('PC'); console.log('PC     ['+disp()+']');
keys('CLR'); console.log('CLR    ['+disp()+']');
keys('0 4 0 4 2 INP'); console.log('04.042 INP ['+disp()+'] cell0', m.readCell(0).toString(16), 'cell1', m.readCell(1).toString(16));
keys('0 2 0 0 0 INP 0 1 0 0 0 INP'); console.log('cells', [0,1,2].map(i=>m.readCell(i).toString(16)).join(' '));
keys('0 0 0 PC RUN'); m.run(400000); console.log('RUN    ['+disp()+']');
