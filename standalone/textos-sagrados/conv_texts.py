# Dhammapada (Müller), Tao Te Ching (Legge), Meditações (Long) e Bhagavad Gita (Purohit Swami + sânscrito) → formato do leitor
import json, re, os
D = os.path.dirname(os.path.abspath(__file__)); S = D + '/src'; O = D + '/out'
def save(fid, d):
    p = f'{O}/{fid}.json'; json.dump(d, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
    b = d['b'][0]; print(fid, len(b[3]), 'cap.', sum(len(c) for c in b[3]), 'versos', round(os.path.getsize(p) / 1e3), 'KB')
body = lambda t: t[t.index('*** START'):t.index('*** END')]
para = lambda s: re.sub(r'[ \t]*\n[ \t]*', ' ', s).strip()
# ---- Dhammapada: 26 capítulos, 423 versos numerados por todo o livro
t = body(open(S + '/pg2017.txt', encoding='utf-8').read())
parts = re.split(r'\n(Chapter [IVXL]+\. [^\n]+)\n', t)[1:]
chs, titles, off = [], [], []
for i in range(0, len(parts), 2):
    title = re.sub(r'^Chapter [IVXL]+\. ', '', parts[i]).rstrip('.').strip(); txt = parts[i + 1]
    vs = re.split(r'\n\n(?=\d+(?:, \d+)?\. )', '\n\n' + txt.strip())
    nums, out = [], []
    for v in vs:
        m = re.match(r'(\d+)(?:, (\d+))?\. (.*)', v.strip(), re.S)
        if not m: continue
        nums.append(int(m.group(1))); out.append(para(m.group(3)))
        if m.group(2): out.append('')   # dois versos traduzidos juntos: o segundo fica vazio
    chs.append(out); titles.append(title); off.append(nums[0] if nums else 1)
# cortar notas no fim do último capítulo (se houver)
assert sum(len(c) for c in chs) >= 420, sum(len(c) for c in chs)
save('dhammapada-en', {'n': 'The Dhammapada · Max Müller', 'a': 'F. Max Müller (1881) · Public domain · Project Gutenberg', 'l': 'en', 'b': [['DHP', 'Dhammapada', 'Dhp', chs, titles, off]]})
# ---- Tao Te Ching: 81 capítulos; os parágrafos numerados são os "versos"
t = body(open(S + '/pg216.txt', encoding='utf-8').read())
t = t[t.index('PART 1.'):]
t = re.sub(r'\nPART II\.\n', '\n', t)
blocks = re.split(r'\n[ \t]*\n[ \t]*\n+(?=(?:Ch\. )?\d+\.)', t.replace('\r', ''))
chs = {}; k = 1
for blk in blocks:
    m = re.match(r'(?:Ch\. )?(\d+)\.[ \t]*(.*)', blk.strip(), re.S)
    if not m or int(m.group(1)) != k: continue
    txt = m.group(2); k += 1
    if not re.match(r'1\.', txt.strip()): txt = '1. ' + txt.strip()     # capítulo de um só parágrafo
    ps = re.split(r'\n\s*\n(?=\d+\.(?:\s|$))', '\n\n' + txt.strip())
    out = []
    for p in ps:
        p = p.strip(); mm = re.match(r'(\d+)\.\s*(.*)', p, re.S)
        if not mm: continue
        bl = re.split(r'\n\s*\n', mm.group(2))
        out.append('\n'.join(('\n'.join(l.strip() for l in x.split('\n') if l.strip()) if re.search(r'^\s{2,}\S', x, re.M) else para(x)) for x in bl if x.strip()))
    chs[int(m.group(1))] = out
assert len(chs) == 81, len(chs)
save('tao-en', {'n': 'Tao Te Ching · James Legge', 'a': 'James Legge (1891) · Public domain · Project Gutenberg', 'l': 'en', 'pre': 1, 'b': [['TAO', 'Tao Te Ching', 'Tao', [chs[i] for i in range(1, 82)], [str(i) for i in range(1, 82)]]]})
# ---- Meditações (George Long): 12 livros; as secções são os "versos"
t = body(open(S + '/pg15877.txt', encoding='utf-8').read())
t = t[t.index('THE THOUGHTS\n\nOF\n\nMARCUS AURELIUS'):]
books = re.split(r'\n([IVX]+)\.\n', t)
chs = []
for i in range(1, len(books), 2):
    txt = books[i + 1]
    txt = re.sub(r'\n {2,}\[[A-Z0-9]+\][^\n]*(?:\n {2,}[^\n]+)*', '\n', txt)   # notas do tradutor
    txt = re.sub(r'\[[A-Z]\]', '', txt)
    txt = re.sub(r'\[([^\]\n]{1,60})\]', r'\1', txt)
    secs = re.split(r'\n\s*\n(?=\d+\. )', '\n\n' + txt.strip())
    out = []
    for s in secs:
        s = s.strip()
        if not s: continue
        m = re.match(r'(\d+)\. (.*)', s, re.S)
        out.append(para(m.group(2) if m else s))
    chs.append(out)
    if len(chs) == 12: break
# o fim do livro XII: cortar o que vem depois (índice, notas)
last = chs[-1]; cut = next((k for k, s in enumerate(last) if re.match(r'^(INDEX|THE PHILOSOPHY|NOTES)', s)), None)
if cut: chs[-1] = last[:cut]
save('meditacoes-en', {'n': 'Meditations · George Long', 'a': 'Marcus Aurelius, translated by George Long (1862) · Public domain · Project Gutenberg', 'l': 'en', 'b': [['MED', 'Meditations', 'Med', chs, ['Book ' + r for r in 'I II III IV V VI VII VIII IX X XI XII'.split()]]]})
# ---- Bhagavad Gita: sânscrito (devanágari + transliteração) e Purohit Swami (inglês)
V = json.load(open(S + '/gita_verse.json')); T = json.load(open(S + '/gita_translation.json')); C = json.load(open(S + '/gita_chapters.json'))
C.sort(key=lambda c: c['chapter_number']); V.sort(key=lambda v: (v['chapter_number'], v['verse_number']))
tr = {x['verse_id']: x['description'].strip() for x in T if x['authorName'] == 'Shri Purohit Swami'}
sa = [[] for _ in range(18)]; en = [[] for _ in range(18)]
for v in V:
    dev = re.sub(r'[।|]{1,2}\s*\d+\.\d+\s*[।|]{1,2}', '', v['text']).strip()
    dev = '\n'.join(l.strip() for l in dev.split('\n') if l.strip())
    sa[v['chapter_number'] - 1].append(dev + '\n' + '\n'.join(l.strip() for l in v['transliteration'].split('\n') if l.strip()))
    en[v['chapter_number'] - 1].append(re.sub(r'\s+', ' ', tr.get(v['id'], '')).strip())
ti_sa = [c['name'] for c in C]; ti_en = [f"{c['name_transliterated']} · {c['name_meaning']}" for c in C]
save('gita-sa', {'n': 'भगवद्गीता · Sânscrito', 'a': 'Texto sânscrito e transliteração · gita/gita (domínio público)', 'l': 'sa', 'pre': 1, 'b': [['BG', 'भगवद्गीता', 'BG', sa, ti_sa]]})
save('gita-en', {'n': 'The Bhagavad Gita · Shri Purohit Swami', 'a': 'Shri Purohit Swami (1935) · gita/gita', 'l': 'en', 'b': [['BG', 'Bhagavad Gita', 'BG', en, ti_en]]})
json.dump([{'n': c['chapter_number'], 'tr': c['name_transliterated'], 'en': c['name_meaning']} for c in C], open(O + '/gita-chapters.json', 'w'), ensure_ascii=False)
