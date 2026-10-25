# O Evangelho segundo o Espiritismo (Allan Kardec, trad. Guillon Ribeiro) a partir do PDF → formato do leitor
import pymupdf, re, json, os
D = os.path.dirname(os.path.abspath(__file__))
doc = pymupdf.open(D + '/src/uel27.pdf')
ROM = {r: i + 1 for i, r in enumerate('I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX XXI XXII XXIII XXIV XXV XXVI XXVII XXVIII'.split())}
blocks = []
for pi in range(doc.page_count):
    for b in sorted(doc[pi].get_text('blocks'), key=lambda b: (b[1], b[0])):
        x0, y0, x1, y1, t, no, typ = b
        if typ != 0: continue
        t = t.strip()
        if not t: continue
        if y0 < 105 and re.match(r'^\d+\s*(\n|$)', t): continue                       # cabeçalho: número da página + título corrido
        if re.match(r'^_{4,}', t) or (y0 > 560 and re.match(r'^\(\d+\)\s', t)): continue  # notas de rodapé
        lines = [l.strip() for l in t.split('\n') if l.strip()]
        txt = ' '.join(lines); txt = re.sub(r'(\w)- (\w)', r'\1-\2', txt); txt = re.sub(r'\s+', ' ', txt)
        cen = x0 > 120 and (x1 - x0) < 400
        blocks.append((pi, cen, txt))
# começa na Introdução
start = next(i for i, b in enumerate(blocks) if b[1] and b[2].upper() == 'INTRODUÇÃO' and b[0] > 15)
intro, chs, titles = [], [], []
cur = None; mode = 'intro'; pend = []; title_next = False; summary_next = False; expect = 1; lastnum = 0
def push_item(text, num=None):
    global lastnum
    target = intro if mode == 'intro' else chs[-1]
    if num and mode != 'intro':
        while len(target) < num - 1: target.append('')                                   # item que faltou: fica vazio
    head = ('\n'.join(pend) + '\n') if pend else ''
    pend.clear(); target.append(head + text); lastnum = num or lastnum
for pi, cen, t in blocks[start + 1:]:
    m = re.match(r'^CAP[ÍI]TULO ([IVXL]+)$', t)
    if m and cen and ROM.get(m.group(1)) == expect:
        mode = 'ch'; chs.append([]); expect += 1; title_next = True; pend = []; continue
    if (title_next or summary_next) and cen: title_next = False; summary_next = True; continue     # o título (uma ou duas linhas)
    if summary_next and not re.match(r'^\d+\. ', t): summary_next = False; continue           # o sumário do capítulo
    summary_next = False; title_next = False
    if mode == 'intro':
        mi = re.match(r'^([IVXL]+)\s*[-–]\s*(.+)$', t)
        if mi and len(t) < 90: push_item(mi.group(2).capitalize() if mi.group(2).isupper() else mi.group(2)); continue
        if not intro: continue
        if intro: intro[-1] += ('\n' if t[:1].isupper() or t[:1] in '"«' else ' ') + t
        continue
    mi = re.match(r'^(\d+)\. (.*)', t)
    if mi and int(mi.group(1)) == len(chs[-1]) + 1: push_item(mi.group(2), int(mi.group(1))); continue
    if cen and len(t) < 160 and not t.endswith(('.', ',', ';')) : pend.append(t); continue
    if chs[-1]: chs[-1][-1] += ('\n' if t[:1].isupper() or t[:1] in '"«—-' else ' ') + t
    else: pend.append(t)
titles = '''Não vim destruir a lei|Meu reino não é deste mundo|Há muitas moradas na casa de meu Pai|Ninguém poderá ver o reino de Deus se não nascer de novo|Bem-aventurados os aflitos|O Cristo Consolador|Bem-aventurados os pobres de espírito|Bem-aventurados os que têm puro o coração|Bem-aventurados os que são brandos e pacíficos|Bem-aventurados os que são misericordiosos|Amar o próximo como a si mesmo|Amai os vossos inimigos|Não saiba a vossa mão esquerda o que dê a vossa mão direita|Honrai a vosso pai e a vossa mãe|Fora da caridade não há salvação|Não se pode servir a Deus e a Mamon|Sede perfeitos|Muitos os chamados, poucos os escolhidos|A fé transporta montanhas|Os trabalhadores da última hora|Haverá falsos cristos e falsos profetas|Não separeis o que Deus juntou|Estranha moral|Não ponhais a candeia debaixo do alqueire|Buscai e achareis|Dai gratuitamente o que gratuitamente recebestes|Pedi e obtereis|Coletânea de preces espíritas'''.split('|')
print('capítulos', len(chs), 'títulos', len(titles), 'itens', [len(c) for c in chs], 'intro', len(intro))
out = {'n': 'O Evangelho segundo o Espiritismo', 'a': 'Allan Kardec (1864) · tradução de Guillon Ribeiro', 'l': 'pt', 'pre': 1,
       'b': [['ESI', 'Introdução', 'Intr', [intro], ['Introdução']], ['ESE', 'O Evangelho segundo o Espiritismo', 'ESE', chs, titles]]}
json.dump(out, open(D + '/out/evangelho-pt.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(titles[:4], titles[-1]); print(chs[1][0][:300]); print('---'); print(chs[27][1][:300]); print(round(os.path.getsize(D + '/out/evangelho-pt.json') / 1e3), 'KB')
