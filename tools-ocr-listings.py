#!/usr/bin/env python3
"""Pull the listings that are only in the printed manual (36-38, 41-53) out of its OCR text.

Each instruction row is printed twice in the manual - as a mnemonic ("AKO 100") and as a numeric code ("04.100").
A row is accepted only when the two agree; everything else is listed for checking against the scan.
    python3 tools-ocr-listings.py ~/claude/masterlab/CP1-Manual_djvu.txt
"""
import re, sys, json
MN = dict(HLT=1, ANZ=2, VZG=3, AKO=4, LDA=5, ABS=6, ADD=7, SUB=8, SPU=9, VGL=10, SPB=11, VGR=12, VKL=13, NEG=14, UND=15,
          P1E=16, P1A=17, P2A=18, LIA=19, AIS=20, SIU=21, P3E=22, P4A=23, P5A=24)
FIX = {'PIE': 'P1E', 'PIA': 'P1A', 'P1 E': 'P1E', 'P1 A': 'P1A', 'P2 A': 'P2A', 'UA': 'LIA', 'LI A': 'LIA', 'AIS': 'AIS', 'AlS': 'AIS', 'VQL': 'VGL', 'SPÜ': 'SPU', 'SlU': 'SIU', 'HLT': 'HLT'}
L = open(sys.argv[1], errors='replace').read().split('\n')
heads = [(i, int(m.group(1))) for i, l in enumerate(L) for m in [re.match(r'\s*Listing (\d+):', l)] if m and i > 20000]
heads.append((heads[-1][0] + 1900, 99))
code_re = re.compile(r'^(\d{2})[.,]\s?(\d{3})$')
out = {}
for (start, n), (end, _) in zip(heads, heads[1:]):
    if n < 36 or n in (39, 40): continue
    toks = [t.strip() for t in L[start:end] if t.strip()]
    good, bad, data = {}, {}, {}
    i = 0
    while i < len(toks) - 1:
        if re.fullmatch(r'\d{3}', toks[i]):
            a = int(toks[i]); nxt = toks[i + 1]
            if code_re.match(nxt.replace('O', '0')) and nxt[:2] in ('00', 'OO'):                 # data cell: address, code
                c = code_re.match(nxt.replace('O', '0')); data.setdefault(a, int(c.group(2))); i += 2; continue
            if i + 2 < len(toks) and code_re.match(toks[i + 2]):
                c = code_re.match(toks[i + 2]); mn = re.sub(r'\(.*?\)?$', '', toks[i + 1]); mn = re.sub(r'^\S{1,3}\s*:\s*', '', mn).strip().upper().replace(' ', '')
                m = re.match(r'^([A-ZÜ][A-ZÜ0-9]{2})(\d{3})?$', mn)
                op = m and FIX.get(m.group(1), m.group(1).replace(' ', ''))
                w = (int(c.group(1)), int(c.group(2)))
                if op in MN and (MN[op], int(m.group(2) or 0)) == w: good.setdefault(a, w)
                elif a not in good: bad[a] = (toks[i + 1], toks[i + 2])
                i += 3; continue
        i += 1
    for a in list(bad):
        if a in good: del bad[a]
    addrs = sorted(set(good) | set(bad))
    missing = [a for a in range(addrs[0], addrs[-1] + 1) if a not in good and a not in bad and a not in data] if addrs else []
    out[n] = dict(title=L[start].strip(), good={a: good[a] for a in sorted(good)}, bad=bad, data={a: data[a] for a in sorted(data)}, missing=missing)
    print(f"{n}: {L[start].strip()[:58]:58s} agreed {len(good):3d}  to check {len(bad):2d}  data {len(data):3d}  gaps {len(missing)}")
json.dump(out, open('/tmp/claude-1000/-home-mike-claude-microtronic/5cada504-75cb-4b15-901d-6ca095ac0b0b/scratchpad/ocr_listings.json', 'w'))
