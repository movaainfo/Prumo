# Alcorão em árabe: troca os sinais da escrita uthmani que muitos telemóveis não desenham (sukun, tanwin aberto, sinais de pausa)
# pelos sinais comuns, e junta o tanwin ao alif maqsura. Corre depois de conv_quran.py: python3 simplifica_arabe.py <quran-ar.json>
import json, re, sys
p = sys.argv[1]; d = json.load(open(p, encoding='utf-8'))
M = {0x06E1: 0x0652, 0x08F0: 0x064B, 0x08F1: 0x064C, 0x08F2: 0x064D}
DROP = {0x06D6, 0x06D7, 0x06D8, 0x06D9, 0x06DA, 0x06DB, 0x06DC, 0x06DE, 0x06E2, 0x06ED, 0x06E0, 0x06E7, 0x06E8, 0x06EC, 0x200F}
def fix(t):
    t = ''.join(chr(M.get(ord(c), ord(c))) for c in t if ord(c) not in DROP)
    return re.sub(r'([ً-ٍ]) (ى)', r'\1\2', re.sub(r'\s+', ' ', t)).strip()
for b in d['b']: b[3] = [[fix(v) for v in ch] for ch in b[3]]
d['a'] = 'Texto árabe (Hafs, escrita simplificada para todos os aparelhos) · Tanzil'
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
