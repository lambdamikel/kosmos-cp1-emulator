function fresh(){ m.reset(); m.pid.reset(); m.ext.reset(); m.p2 = 0xff; m.port1In = 0xff; m.run(500000); }
function watch(label, n, act){ const r = []; let last = ''; for (let i = 0; i < n; i++) { if (act) act(i); m.run(40000); const d = disp(8000); if (d !== last) { r.push(d.trim() + '@' + (i / 10).toFixed(1)); last = d; } } console.log(label, r.slice(0, 16).join(' | ')); }
fresh(); keys('8 RUN'); watch('8 RUN, no key:        ', 120);
fresh(); keys('8 RUN'); watch('8 RUN, STP at 2.0 s:  ', 80, i => { if (i === 20) m.keyDown('STP'); if (i === 23) m.keyUp('STP'); });
fresh(); keys('5 RUN'); watch('5 RUN:', 10); fresh(); keys('8 RUN'); watch('8 RUN, port line 1 low at 2 s:', 80, i => { if (i === 20) m.port1In = 0xfe; });
fresh(); keys('3 8 RUN'); watch('38 RUN:', 10);
