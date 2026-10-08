#!/usr/bin/env python3
"""Bundle the CP1 programs into js/programs.js.

programs/*.txt          numeric listings ("012 ako 04.200"), bundled as they are
programs/manual/*.asm   the listings of the Kosmos manual as transcribed by Andreas Signer
                        (github.com/asig/kosmos-cp1, resources/listings); assembled here into numeric listings

    python3 tools-build-programs.py
"""
import json, os, re, glob

MN = dict(HLT=1, ANZ=2, VZG=3, AKO=4, LDA=5, ABS=6, ADD=7, SUB=8, SPU=9, VGL=10, SPB=11, VGR=12, VKL=13, NEG=14, UND=15,
          P1E=16, P1A=17, P2A=18, LIA=19, AIS=20, SIU=21, P3E=22, P4A=23, P5A=24)
DIRECTIVES = ('.ORG', '.DB', '.EQU', '.RAW')

def assemble(text):
    """-> (cells {addr: (word, comment)}, start address).  Syntax: [label] op [param{,param}] ; comment"""
    lines = []
    for raw in text.split('\n'):
        code, _, comment = raw.partition(';')
        if not code.strip(): continue
        toks = code.split(None, 2); label = None
        known = lambda t: t.upper() in MN or t.upper() in DIRECTIVES
        if code[0] not in ' \t' and (len(toks) == 1 and not known(toks[0]) or len(toks) > 1 and known(toks[1])):
            label = toks[0]; toks = code.split(None, 2)[1:]            # a name in column 1 in front of an instruction is a label
        else: toks = code.split(None, 1)
        if not toks: lines.append((label, None, [], comment)); continue
        op = toks[0].upper(); params = [p.strip() for p in (toks[1].split(',') if len(toks) > 1 else []) if p.strip()]
        lines.append((label, op, params, comment.strip()))
    labels = {}
    def val(s):
        if s == '?': return 0
        if re.fullmatch(r'\d+', s): return int(s)
        if s in labels: return labels[s]
        raise KeyError(s)
    cells = {}; first = None
    for final in (False, True):
        pc = 0; cells = {}
        for label, op, params, comment in lines:
            if label and op != '.EQU': labels[label] = pc
            if op is None: continue
            def v(s):
                try: return val(s)
                except KeyError:
                    if final: raise
                    return 0
            if op == '.ORG': pc = v(params[0])
            elif op == '.EQU': labels[label or params[0]] = v(params[-1])
            elif op == '.DB':
                for p in params: cells[pc] = (v(p) & 255, comment); pc += 1
            elif op == '.RAW':
                for p in params:
                    a, b = p.split('.'); cells[pc] = ((int(a) << 8) | int(b), comment); pc += 1
            else:
                if first is None: first = pc
                cells[pc] = ((MN[op] << 8) | (v(params[0]) if params else 0), comment); pc += 1
    start = labels.get('start', first if first is not None else min(cells))
    return cells, start

NAME = {v: k for k, v in MN.items()}
def numeric(cells):
    out = []
    for a in sorted(cells):
        w, c = cells[a]
        out.append(f"{a:03d} {NAME.get(w >> 8, '   ').lower()} {w >> 8:02d}.{w & 255:03d}" + (f"   # {c}" if c else ''))
    return '\n'.join(out) + '\n'

OWN = [('ECHO.txt', 'Port echo: switches to LEDs', 'Flip the Port 1 switches: the Port 2 LEDs follow, and the display shows the value.'), ('COUNTER.txt', 'Counter', ''), ('LIGHTS.txt', 'Running light on Port 2', ''),
       ('MOON.txt', '39: Moon landing (manual)', 'Each input is one step: hold ONE Port 1 contact clip (or put ONE switch down) - line 1 burns 0 units ... line 8 burns 7. The display then cycles fuel, height, speed (1xx falling, 2xx rising); land at 102 or less. F 006 means the numbers left the range 0-255: you climbed above 255 m by burning too long, or two lines were low at once. A switch left down keeps burning every step.'),
       ('MELODY40.txt', '40: Melody generator (manual)', 'Plays "If I had a hammer" on the Port 2 tone outputs (c d e f g a h c on lines 1-8). Set cell 032 to 033 for "Stille Nacht".'),
       ('L036.txt', '36: Pairs search (manual)', 'Needs the random wiring (switched on). It deals the pairs and stops; then enter two field numbers in cells 126 and 127 and start at 052.'),
       ('L038.txt', '38: Two dice with doubles (manual)', 'Hold the contact clip on Port 1 line 1 to roll.'),
       ('L041.txt', '41: Chessboard strategy (manual)', 'Your field is in cell 100 (here 011); the computer answers with its field. See the manual, section 2.14.'),
       ('L042.txt', '42: Multiplication, the elaborate way (manual)', '156 x 255 = 39780, shown as 03, 97, 80. Factors are in cells 102 and 103.'),
       ('L043.txt', '43: The endless division (manual)', '22 / 7, shown digit by digit. Dividend in cell 100, divisor in 101.'),
       ('L045.txt', '45: Arithmetic exercises (manual)', 'Needs the random wiring (switched on). After the task is shown, press STP, put your answer in cell 110 and start at 088.'),
       ('L052.txt', '52: Roulette (manual)', 'A light runs along the Port 2 LEDs; hold the contact clip on Port 1 line 1 to let the ball roll out.'),
       ('SCALE.txt', 'Sound: scale', 'Plays one octave on the tone generator (Port 4).'), ('MELODY.txt', 'Sound: melody', 'Plays "Alle meine Entchen" on the tone generator (Port 4).'),
       ('PIANO.txt', 'Sound: switch piano', 'Each Port 1 switch is a key: put switch 1-8 down (or hold its clip) for c d e f g a h c. All switches up is silence.'),
       ('HANOI.txt', 'Towers of Hanoi (recursive)', 'It shows each move as from-peg and to-peg; cell 008 holds the number of disks.')]
MANUAL = {  # listing number -> English title
 1: 'Show cell contents automatically', 2: 'Store the Akku automatically', 3: 'Automatic counter', 4: 'Endless counter', 5: 'Counter: 50 times up to 25',
 6: 'Dice (with VGL)', 7: 'Dice (with VGR)', 8: 'Dice (with VKL)', 9: 'Stopwatch with external start/stop key', 10: 'Simple blinker', 11: 'Alternating blinker',
 12: 'Alternating blinker with start/stop key', 13: '"Rainbow" program', 14: 'Heating control', 15: 'Test program for negation', 16: 'Alternating blinker with P1A 000',
 17: 'Blinker with 4 states', 18: 'Blinker with two lamps in parallel', 19: 'Lottery-number generator', 20: 'Travel-agency computer', 21: 'Countdown',
 22: 'Multiplication 25 x 9', 23: 'Division', 24: 'One-minute delay', 25: 'Knapsack program', 26: 'Shift program', 27: 'Counter that speeds up',
 28: 'Clock with alternating hours and minutes', 29: 'Reaction tester', 30: 'Telephone charge meter', 31: 'Digital voltmeter', 32: 'Nim game', 33: 'Code breaker',
 34: 'Computer time switch', 35: 'Memory training', 54: 'Computer sea battle', 55: 'A "perpetual" calendar',
 90: 'CP5: LED test', 91: 'CP5: switch test', 92: 'CP5: travelling light band', 93: 'CP5: catch the light', 100: 'Bonus: K.I.T.T. light (swinging LED)'}
OUT_OF_SCOPE = {14, 31}     # need external circuitry beyond simple digital I/O and sound: heating control (temperature sensors), digital voltmeter (pulse circuit)
NEEDS_CP5 = re.compile(r'\b(P3E|P4A|P5A)\b', re.I)

def wiring(src):
    """what a manual listing needs on Port 1: push buttons (contact clips) on the lines it reads singly, or the random wiring"""
    code = '\n'.join(l.partition(';')[0] for l in src.split('\n'))
    pins = sorted({int(m) for m in re.findall(r'\bP1E\s+0*([1-8])\b', code, re.I)})
    w = {}
    if pins: w['clips'] = sum(1 << (p - 1) for p in pins)
    if re.search(r'vertausch', src, re.I): w['cross'] = '3 4 2 1 7 8 6 5'
    return w

out = []
for f, title, note in OWN:
    out.append({'name': os.path.splitext(f)[0], 'title': title, 'group': 'New programs', 'start': {'L036.txt': 37, 'L045.txt': 104}.get(f, 1 if f[0] == 'L' and f[1:4].isdigit() or f in ('MOON.txt', 'MELODY40.txt') else 0), 'note': note, 'p2tones': f in ('MELODY40.txt', 'PIANO.txt'), **({'clips': 255} if f in ('MOON.txt', 'PIANO.txt') else {}), **({'clips': 1} if f in ('L038.txt', 'L052.txt') else {}), **({'cross': '3 4 2 1 7 8 6 5'} if f in ('L036.txt', 'L045.txt') else {}), 'text': open(os.path.join('programs', f)).read()})
for f in sorted(glob.glob('programs/manual/listing_*.asm')):
    n = int(re.search(r'(\d+)', os.path.basename(f)).group(1)); src = open(f).read()
    if n in OUT_OF_SCOPE: continue
    if NEEDS_CP5.search('\n'.join(l.partition(';')[0] for l in src.split('\n'))): continue      # needs ports 3-5 of the CP5 (not emulated)
    cells, start = assemble(src)
    head = src.split('\n')[0].lstrip('; ').strip()
    text = f"# {head}\n# From the Kosmos CP1 manual, as transcribed by Andreas Signer (github.com/asig/kosmos-cp1).\n\n" + numeric(cells)
    out.append({'name': f'L{n:03d}', 'title': f'{n}: {MANUAL.get(n, head)}', 'group': 'From the Kosmos manual', 'start': start,
                **({'lamps': True} if re.search(r'\bP1A\b', src, re.I) else {}), **wiring(src), 'note': f'Manual listing {n}: "{head.split(": ", 1)[-1]}". See the manual for how to use it.', 'text': text})
with open('js/programs.js', 'w') as fh:
    fh.write('// Generated by tools-build-programs.py -- Kosmos CP1 program library.\n"use strict";\nconst CP1_PROGRAMS = ')
    json.dump(out, fh, indent=0, ensure_ascii=False)
    fh.write(';\n')
print(len(out), 'programs;', sum(1 for o in out if o['group'].startswith('From')), 'from the manual')
