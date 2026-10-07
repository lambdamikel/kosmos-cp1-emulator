const m = new KosmosCP1(cp1RomFromBase64(CP1_ROM_B64));
const GL = {0x3f:'0',0x06:'1',0x5b:'2',0x4f:'3',0x66:'4',0x6d:'5',0x7d:'6',0x07:'7',0x7f:'8',0x6f:'9',0x77:'A',0x79:'E',0x73:'P',0x39:'C',0x1c:'u',0x23:'n',0x71:'F',0x40:'-',0:' '};
function disp(n){ m.collectLight(); m.run(n||40000); const l=m.collectLight(); let s='';
  for(let d=0;d<6;d++){ let p=0; for(let b=0;b<7;b++) if(l[d*8+b]>0.004) p|=1<<b; s+=(GL[p]||('?'+p.toString(16))); if(l[d*8+7]>0.004) s+='.'; } return s; }
function press(k){ m.keyDown(k); m.run(40000); m.keyUp(k); m.run(40000); }
function keys(s){ for(const k of s.split(' ')) press(k); }
