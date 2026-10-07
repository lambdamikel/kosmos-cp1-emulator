#!/usr/bin/env python3
"""Write programs/L0nn.txt for the manual-only listings from the cross-checked OCR rows (tools-ocr-listings.py)
plus the rows and data cells read from the scanned pages."""
import json
d = json.load(open('/tmp/claude-1000/-home-mike-claude-microtronic/5cada504-75cb-4b15-901d-6ca095ac0b0b/scratchpad/ocr_listings.json'))
MN = dict(HLT=1, ANZ=2, VZG=3, AKO=4, LDA=5, ABS=6, ADD=7, SUB=8, SPU=9, VGL=10, SPB=11, VGR=12, VKL=13, NEG=14, UND=15, P1E=16, P1A=17, P2A=18, LIA=19, AIS=20, SIU=21, P3E=22, P4A=23, P5A=24)
NAME = {v: k.lower() for k, v in MN.items()}
V = (3, 255); W = (3, 250)
SPEC = {  # n: (file, rows read from the scan, data cells, instruction range, header lines)
 36: ('L036.txt', {85: V, 86: V, 87: V, 88: V}, {121: (0, 1), 122: (0, 17), 123: (0, 100), 124: (0, 255)}, (37, 115),
      "Listing 36: Pärchen-Suche (pairs / memory game for two players)|Manual section 2.9, pages 89-91. Needs the random-number wiring (Port 2 to Port 1).|Start at 037: the computer deals 18 pairs onto fields 001-036 and stops. Then the player whose turn it is|enters two field numbers in cells 126 and 127 and starts at 052; the display shows both values."),
 38: ('L038.txt', {1: (4, 6), 11: (16, 1)}, {}, (1, 64),
      "Listing 38: Doppelwürfel mit Paschanzeige (two dice, with doubles shown)|Manual section 2.11, pages 95-97. Uses a push button on Port 1 line 1 (contact clip).|Start at 001, then hold the clip on line 1 to roll."),
 41: ('L041.txt', {51: (5, 104), 57: (9, 51), 77: (4, 1)}, {104: (0, 0), 105: (0, 1), 106: (0, 10), 107: (0, 29), 108: (0, 41), 109: (0, 44), 110: (0, 73), 111: (0, 75), 112: (0, 126), 113: (0, 127), 114: (0, 158), 115: (11, 111), 100: (0, 11)}, (1, 78),
      "Listing 41: Strategie am Schachbrett (strategy on the chessboard)|Manual section 2.14, pages 103-105. Enter your field in cell 100 (here: 011), start at 001;|the computer answers with its field. See the manual for the board numbering and the rules."),
 42: ('L042.txt', {38: W, 39: W, 42: W, 43: W}, {100: (0, 0), 101: (0, 1), 104: (0, 100), 102: (0, 156), 103: (0, 255)}, (1, 46),
      "Listing 42: Multiplikation - die aufwendige Art (multiplication, the elaborate way)|Manual section 2.15, pages 105-106. Factors in cells 102 (max 156) and 103 (max 255); here 156 x 255.|The product is shown two digits at a time: 03, 97, 80 = 39780."),
 43: ('L043.txt', {21: W, 24: W}, {103: (0, 1), 105: (0, 10), 100: (0, 22), 101: (0, 7)}, (1, 41),
      "Listing 43: Das endlose Divisionsprogramm (the endless division)|Manual section 2.16, pages 107-108. Dividend in cell 100, divisor in 101 (at most 26); here 22 / 7.|It shows the result digit by digit, one a second: 3, 1, 4, 2, 8, 5, 7 ..."),
 45: ('L045.txt', {86: (16, 0)}, {111: (0, 128), 112: (0, 16), 113: (0, 1), 118: (0, 100), 120: (0, 0), 121: (0, 1), 122: (22, 222)}, (1, 107),
      "Listing 45: Arithmetik-Übungen (arithmetic exercises)|Manual section 2.18, pages 110-113. Needs the random-number wiring (Port 2 to Port 1).|Cell 113 picks the operation: 1 = +, 2 = -, 3 = x, 4 = / (here 1). Start at 104. The computer shows the first number,|the operation code, then the second number. Press STP, enter your answer in cell 110, and start at 088 to have it checked."),
 52: ('L052.txt', {}, {124: (0, 40), 127: (0, 1)}, (1, 44),
      "Listing 52: Roulette|Manual section 2.25, pages 130-131. A light runs along the Port 2 LEDs; hold the push button on Port 1 line 1|(contact clip) to let the ball roll out. The manual also wires a loudspeaker to Port 1 line 2 (not emulated)."),
}
for n, (fn, rows, data, (lo, hi), head) in SPEC.items():
    cells = {int(a): tuple(w) for a, w in d[str(n)]['good'].items()}
    for a, w in rows.items():
        assert a not in cells or cells[a] == w, (n, a, cells.get(a), w); cells[a] = w
    miss = [a for a in range(lo, hi + 1) if a not in cells]; assert not miss, (n, miss)
    t = ''.join('# ' + l + '\n' for l in head.split('|')) + "# From the Kosmos CP1 manual; read from the scanned listing for this emulator (mnemonic and code columns cross-checked).\n\n"
    for a in sorted(cells): t += f"{a:03d} {NAME[cells[a][0]]} {cells[a][0]:02d}.{cells[a][1]:03d}\n"
    for a in sorted(data): t += f"{a:03d} {data[a][0]:02d}.{data[a][1]:03d}\n"
    open('programs/' + fn, 'w').write(t); print(n, fn, len(cells), 'instructions', len(data), 'data cells')
