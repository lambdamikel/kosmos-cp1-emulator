// "Load & run" late in a session (cycle counter far from zero), driven through the page itself
addEventListener('load', () => { const m = window.cp1; setTimeout(() => { document.getElementById('library').value = 2; document.getElementById('loadrun').click();
  setTimeout(() => { document.title = 'cycles=' + m.cycles + ' memsize=' + m.ram[0x3b] + ' pc=' + m.ram[0x38] + ' cell0=' + m.readCell(0).toString(16) + ' cell200=' + m.readCell(200).toString(16) + ' vram=' + Array.from(m.ram.slice(0x20,0x26)).map(v=>v.toString(16)).join(','); }, 6000); }, 4000); });
