# Bíblias do eBible (um versículo por linha) → formato do leitor do Prumo: {n, a, l, b: [[id, nome, abrev, [[versículos]]]]}
import json, re, sys, os, glob
from books import names, SIL
SRC = os.path.join(os.path.dirname(__file__), 'src/eb')
OUT = os.path.join(os.path.dirname(__file__), 'out')
def read(eid):
    f = glob.glob(f'{SRC}/{eid}/*_vpl.txt')[0]; B = {}; order = []
    for line in open(f, encoding='utf-8-sig'):
        m = re.match(r'^([0-9A-Z]{3}) (\d+):(\d+) ?(.*)$', line.rstrip('\n'))
        if not m: continue
        b, c, v, t = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4).strip()
        b = SIL.get(b, b).replace('*', 'G')            # ESG→ESTG? (ver abaixo)
        if b == 'ESTG': b = 'ESG'
        if b == 'DANG': b = 'DNG'
        t = re.sub(r'^\[\d+:\d+\]\s*', '', t)                   # Luther: número alternativo
        t = re.sub(r'\[([^\]]{1,40})\]', r'\1', t) if eid == 'spaRV1909' else t   # RV1909: palavras acrescentadas
        t = re.sub(r'\s+', ' ', t).strip()
        if b not in B: B[b] = {}; order.append(b)
        ch = B[b].setdefault(c, {}); ch[v] = (ch.get(v, '') + ' ' + t).strip()
    return B, order
def build(eid, lang, name, attr, fill=None, strip_he=False):
    B, order = read(eid)
    if fill:
        F, fo = read(fill)
        for b in fo:
            if b not in B: B[b] = F[b]; order.insert(fo.index(b), b)
    N = names(lang); out = []
    for b in order:
        if b in ('4ES', '4MA'): continue
        chs = B[b]; n = max(chs)
        arr = []
        for c in range(1, n + 1):
            vs = chs.get(c, {}); m = max(vs) if vs else 0
            arr.append([vs.get(v, '') for v in range(1, m + 1)])
        if b == 'PSX' and len(arr) > 1: arr = [next(c for c in reversed(arr) if c)]
        if strip_he: arr = [[re.sub('[֑-ֽ֯]', '', v) for v in ch] for ch in arr]
        base = {'ESG': 'EST', 'DNG': 'DAN', 'PSX': 'PSX'}.get(b, b)
        nm, ab = N.get(base, (b, b)) 
        out.append([b, nm, ab, arr])
    d = {'n': name, 'a': attr, 'l': lang, 'b': out}
    if lang == 'he': d['dir'] = 'rtl'
    p = f'{OUT}/{eid}.json'; json.dump(d, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(eid, len(out), 'livros', sum(len(x[3]) for x in out), 'capítulos', round(os.path.getsize(p) / 1e6, 2), 'MB')
JOBS = [('porbrbsl', 'pt', 'Bíblia Portuguesa Mundial', 'Domínio público · eBible.org', None),
        ('eng-web-c', 'en', 'World English Bible (Catholic)', 'Public domain · eBible.org', 'engwebp'),
        ('engwebp', 'en', 'World English Bible', 'Public domain · eBible.org', None),
        ('engjps', 'en', 'JPS Tanakh 1917', 'Public domain · eBible.org', None),
        ('spaRV1909', 'es', 'Reina-Valera 1909', 'Dominio público · eBible.org', None),
        ('spablm', 'es', 'Biblia Libre para el Mundo', 'Dominio público · eBible.org', None),
        ('fraLSG', 'fr', 'Louis Segond 1910', 'Domaine public · eBible.org', None),
        ('frasbl', 'fr', 'Sainte Bible Libre pour le monde', 'Domaine public · eBible.org', None),
        ('deu1912', 'de', 'Lutherbibel 1912', 'Gemeinfrei · eBible.org', None),
        ('ita1927', 'it', 'Riveduta 1927', 'Pubblico dominio · eBible.org', None),
        ('hebwlc', 'he', 'תנ״ך · Westminster Leningrad Codex', 'Public domain · eBible.org', None)]
for eid, lang, nm, at, fill in JOBS: build(eid, lang, nm, at, fill, strip_he=(lang == 'he'))
