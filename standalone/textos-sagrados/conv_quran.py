# Alcorão (fawazahmed0/quran-api) → formato do leitor: um livro QUR com 114 suras (capítulos) e os nomes das suras
import json, re, os
D = os.path.dirname(os.path.abspath(__file__))
info = json.load(open(f'{D}/src/quran/info.json'))['chapters']
EDS = [('ar', 'ara-quranuthmanihaf', 'القرآن الكريم (حفص)', 'القرآن', 'Texto árabe (Uthmani, Hafs)'),
       ('pt', 'por-helminasr', 'Alcorão · Helmi Nasr', 'Alcorão', 'Tradução de Helmi Nasr (Complexo Rei Fahd)'),
       ('en', 'eng-mohammedmarmadu', 'The Quran · Pickthall', 'Quran', 'Marmaduke Pickthall (1930)'),
       ('es', 'spa-juliocortes', 'El Corán · Julio Cortés', 'Corán', 'Traducción de Julio Cortés'),
       ('fr', 'fra-muhammadhamidul', 'Le Coran · Hamidullah', 'Coran', 'Traduction de Muhammad Hamidullah'),
       ('de', 'deu-frankbubenheima', 'Der Koran · Bubenheim & Elyas', 'Koran', 'Übersetzung von Frank Bubenheim und Nadeem Elyas'),
       ('it', 'ita-hamzarobertopic', 'Il Corano · Piccardo', 'Corano', 'Traduzione di Hamza Roberto Piccardo')]
names_tr = [c['name'] for c in info]
for lang, ed, title, book, attr in EDS:
    q = json.load(open(f'{D}/src/quran/{ed}.json'))['quran']
    ch = [[] for _ in range(114)]
    for x in q:
        t = re.sub(r'\s+', ' ', x['text']).strip()
        if ed == 'por-helminasr' and x['verse'] == 1: t = re.sub(r'^Suratu [^.]{2,40}\.\s*', '', t)
        ch[x['chapter'] - 1].append(t)
    titles = [c['arabicname'] for c in info] if lang == 'ar' else names_tr
    d = {'n': title, 'a': attr, 'l': lang, 'b': [['QUR', book, book[:3], ch, titles]]}
    if lang == 'ar': d['dir'] = 'rtl'
    p = f'{D}/out/quran-{lang}.json'; json.dump(d, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(lang, sum(len(c) for c in ch), round(os.path.getsize(p) / 1e6, 2), 'MB')
json.dump([{'n': c['name'], 'en': c['englishname'], 'ar': c['arabicname'], 'rev': c['revelation'], 'v': len(c['verses'])} for c in info], open(f'{D}/out/quran-info.json', 'w'), ensure_ascii=False)
