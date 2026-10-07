const MN={HLT:1,ANZ:2,VZG:3,AKO:4,LDA:5,ABS:6,ADD:7,SUB:8,SPU:9,VGL:10,SPB:11,VGR:12,VKL:13,NEG:14,UND:15,P1E:16,P1A:17,P2A:18,LIA:19,AIS:20,SIU:21};
function load(name){ const p=CP1_PROGRAMS.find(p=>p.name===name); m.reset(); m.pid.reset(); m.ext.reset(); m.p2=0xff; m.run(500000); let n=0,bad=[];
  for(let line of p.text.split('\n')){ line=line.replace(/[#;].*$/,'').trim(); if(!line) continue; const t=line.match(/^(\d{3})\s+(?:[A-Za-z0-9]+\s+)?(\d{2})[.,]?(\d{3})$/); if(t){ m.writeCell(+t[1],(+t[2]<<8)|+t[3]); n++; } else bad.push(line); }
  return n+' cells'+(bad.length?' UNPARSED: '+bad.slice(0,3).join(' | '):''); }
console.log('COUNTER', load('COUNTER')); keys('0 0 0 PC RUN'); const seen=[]; for(let i=0;i<8;i++){ m.run(100000); seen.push(disp(20000)); } console.log('  display over 0.9 s:', seen.join(' | '));
console.log('LIGHTS', load('LIGHTS')); keys('0 0 0 PC RUN'); const p=[]; for(let i=0;i<12;i++){ m.run(80000); p.push(m.port2Out); } console.log('  port 2:', p.join(' '));
console.log('HANOI', load('HANOI')); keys('0 0 0 PC RUN'); const h=[]; let lastS=''; for(let i=0;i<400&&h.length<12;i++){ const s=disp(40000); if(s!==lastS){h.push(s); lastS=s;} } console.log('  display sequence:', h.join(' | '));
