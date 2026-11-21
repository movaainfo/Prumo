# PRUMO · monta o tutorial em vídeo: gravação do app + narração + títulos + legendas (16:9 para o site e 9:16 para as redes sociais).
# Uso: python3 montar.py <tutorial.json> <pasta da voz> <pasta dos quadros (tut/)> <pasta das letras> <selo.svg> <pasta de saída> [vertical.mp4]
import json, os, sys, subprocess, re, wave, tempfile, shutil, html
rot_p, voz, qd, fontes, selo, saida = sys.argv[1:7]; vert = sys.argv[7] if len(sys.argv) > 7 else ''
ROT = json.load(open(rot_p)); DUR = json.load(open(os.path.join(voz, 'duracoes.json'))); MAN = {m['id']: m for m in json.load(open(os.path.join(qd, 'manifesto.json')))}
FPS = 30; tmp = tempfile.mkdtemp(prefix='tut-'); os.makedirs(saida, exist_ok=True)
run = lambda *a: subprocess.run(list(a), check=True, capture_output=True)
esc = html.escape

# tempos de cada capítulo (a voz começa 0,25 s depois do capítulo)
t, caps, legs = 0.0, [], []
def pedacos(txt, mx=78):
    fr = re.split(r'(?<=[.:!?])\s+', txt.strip()); out = []
    for f in fr:
        while len(f) > mx:
            k = f.rfind(', ', 0, mx); k = k if k > 30 else f.rfind(' ', 0, mx)
            out.append(f[:k + 1].strip()); f = f[k + 1:].strip()
        if f: out.append(f)
    return out
for i, s in enumerate(ROT):
    n = MAN[s['id']]['n']; d = n / FPS; v0 = t + .25; vd = DUR[s['id']]
    caps.append({'i': i, 'id': s['id'], 'cap': s['cap'], 't0': t, 't1': t + d})
    ps = pedacos(s['txt']); tot = sum(len(p) for p in ps); a = v0
    for p in ps:
        b = a + vd * len(p) / tot; legs.append({'txt': p, 't0': a, 't1': min(b + .25, t + d)}); a = b
    t += d
TOTAL = t

# 1) o telemóvel: todos os quadros seguidos
lst = os.path.join(tmp, 'q.txt')
with open(lst, 'w') as f:
    f.write('ffconcat version 1.0\n')
    for s in ROT:
        dd = os.path.join(qd, s['id']); fs = sorted(x for x in os.listdir(dd) if x.endswith('.jpg'))
        for x in fs: f.write(f"file '{os.path.join(dd, x)}'\nduration {1 / FPS:.6f}\n")
    f.write(f"file '{os.path.join(dd, fs[-1])}'\n")
tel = os.path.join(tmp, 'tel.mp4')
run('ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-vf', f'fps={FPS},scale=780:-2:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', tel)

# 2) a narração: cada capítulo com o seu silêncio à volta
wl = os.path.join(tmp, 'a.txt')
with open(wl, 'w') as f:
    for c in caps:
        src = os.path.join(voz, c['id'] + '.wav'); dst = os.path.join(tmp, c['id'] + '.wav'); d = c['t1'] - c['t0']
        run('ffmpeg', '-y', '-i', src, '-af', f'adelay=250|250,apad,atrim=0:{d:.3f},aresample=48000', '-ac', '1', dst); f.write(f"file '{dst}'\n")
aud = os.path.join(tmp, 'voz.wav'); run('ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', wl, '-c', 'copy', aud)

# 3) camadas desenhadas (fundo, moldura, títulos, legendas) nos dois formatos
def camadas(W, H, nome, L):
    sp = {'fontes': fontes, 'saida': tmp, 'w': W, 'h': H, 'itens': []}
    sx, sy, sw, sh = L['ecra']
    sp['itens'].append({'f': nome + '-fundo.png', 'html': f'''<div style="position:absolute;inset:0;background:radial-gradient(45% 60% at {L["brilho"]} ,rgba(224,38,58,.28),transparent 70%),radial-gradient(40% 40% at 90% 0%,rgba(244,217,160,.10),transparent 70%),#120A0B"></div>
      <div style="position:absolute;left:{L["marca"][0]}px;top:{L["marca"][1]}px;display:flex;align-items:center;gap:14px"><img src="file://{selo}" style="width:{L["marca"][2]}px;height:{L["marca"][2]}px"><b style="font:500 {int(L["marca"][2]*.8)}px/1 'Bodoni Moda'">Prumo</b><span style="margin-left:18px;font:600 {L["lbl"]}px Geist;letter-spacing:.24em;text-transform:uppercase;color:#B9A27F">Como usar o Prumo</span></div>'''})
    r = int(sw * .095); bz = int(sw * .045)
    sp['itens'].append({'f': nome + '-moldura.png', 'transparente': True, 'html': f'''<div style="position:absolute;left:{sx - bz}px;top:{sy - bz}px;width:{sw + 2 * bz}px;height:{sh + 2 * bz}px;border-radius:{r + bz}px;box-shadow:0 0 0 {bz}px #1d1115 inset,0 0 0 {bz + 1}px rgba(244,217,160,.18) inset,0 40px 90px rgba(0,0,0,.55)"></div>
      <div style="position:absolute;left:{sx}px;top:{sy}px;width:{sw}px;height:{sh}px;border-radius:{r}px;box-shadow:0 0 0 {bz + 2}px #1d1115"></div>
      <div style="position:absolute;left:{sx + sw / 2 - sw * .13}px;top:{sy + sw * .03}px;width:{sw * .26}px;height:{sw * .075}px;border-radius:99px;background:#000"></div>'''})
    for c in caps:
        sp['itens'].append({'f': f"{nome}-t{c['i']}.png", 'transparente': True, 'html': L['titulo'](c)})
    for k, g in enumerate(legs):
        sp['itens'].append({'f': f'{nome}-l{k}.png', 'transparente': True, 'html': L['legenda'](g)})
    sj = os.path.join(tmp, nome + '.json'); json.dump(sp, open(sj, 'w'))
    run('node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'quadros.js'), sj)

H16 = {'ecra': (300, 64, 438, 948), 'brilho': '28% 55%', 'marca': (64, 52, 46), 'lbl': 14,
       'titulo': lambda c: f'''<div style="position:absolute;left:900px;top:250px;width:900px"><div style="font:600 16px Geist;letter-spacing:.24em;color:#B9A27F">{c["i"] + 1:02d} / {len(caps):02d}</div><div style="margin-top:18px;font:500 112px/0.95 'Bodoni Moda';text-transform:uppercase;color:{'#E0263A' if c['id'] == 'fim' else '#F4D9A0'}">{esc(c["cap"])}</div>{'<div style="margin-top:30px;font:600 30px Geist;color:#F4D9A0">prumo-vida.vercel.app</div>' if c['id'] == 'fim' else ''}</div>''',
       'legenda': lambda g: f'''<div style="position:absolute;left:900px;top:640px;width:860px;padding-left:26px;border-left:3px solid #E0263A;font:500 42px/1.32 Geist;color:#F4D9A0">{esc(g["txt"])}</div>'''}
V916 = {'ecra': (190, 150, 700, 1515), 'brilho': '50% 40%', 'marca': (60, 50, 50), 'lbl': 15,
       'titulo': lambda c: f'''<div style="position:absolute;left:0;right:0;top:1700px;text-align:center;font:600 20px Geist;letter-spacing:.24em;text-transform:uppercase;color:#B9A27F">{c["i"] + 1:02d} · {esc(c["cap"])}</div>''',
       'legenda': lambda g: f'''<div style="position:absolute;left:70px;right:70px;top:1740px;text-align:center;font:600 44px/1.3 Geist;color:#F4D9A0;text-shadow:0 2px 10px rgba(0,0,0,.6)">{esc(g["txt"])}</div>'''}

def compor(W, H, nome, L, out, crf):
    camadas(W, H, nome, L); sx, sy, sw, sh = L['ecra']
    ins = ['-loop', '1', '-framerate', str(FPS), '-t', f'{TOTAL:.3f}', '-i', os.path.join(tmp, nome + '-fundo.png'), '-i', tel, '-i', os.path.join(tmp, nome + '-moldura.png'), '-i', aud]
    fil = [f'[1:v]scale={sw}:{sh}:flags=lanczos[ph]', f'[0:v][ph]overlay={sx}:{sy}[v0]', '[v0][2:v]overlay=0:0[v1]']; k = 4; cur = 'v1'
    for c in caps:
        ins += ['-i', os.path.join(tmp, f"{nome}-t{c['i']}.png")]; fil.append(f"[{cur}][{k}:v]overlay=0:0:enable='between(t,{c['t0']:.3f},{c['t1'] - .001:.3f})'[x{k}]"); cur = f'x{k}'; k += 1
    for j, g in enumerate(legs):
        ins += ['-i', os.path.join(tmp, f'{nome}-l{j}.png')]; fil.append(f"[{cur}][{k}:v]overlay=0:0:enable='between(t,{g['t0']:.3f},{g['t1']:.3f})'[x{k}]"); cur = f'x{k}'; k += 1
    fil.append(f'[{cur}]fade=t=in:st=0:d=0.5,fade=t=out:st={TOTAL - .6:.3f}:d=0.6,format=yuv420p[vf]')
    run('ffmpeg', '-y', *ins, '-filter_complex', ';'.join(fil), '-map', '[vf]', '-map', '3:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-r', str(FPS),
        '-c:a', 'aac', '-b:a', '96k', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-movflags', '+faststart', '-shortest', out)

compor(1920, 1080, 'h', H16, os.path.join(saida, 'tutorial.mp4'), 27)
run('ffmpeg', '-y', '-ss', '1.2', '-i', os.path.join(saida, 'tutorial.mp4'), '-vframes', '1', '-vf', 'scale=1280:-2', '-c:v', 'libwebp', '-quality', '80', os.path.join(saida, 'tutorial.webp'))
if vert: compor(1080, 1920, 'v', V916, vert, 26)
# legendas em texto (WebVTT) e capítulos para os botões da página
fmt = lambda x: f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{x % 60:06.3f}'
with open(os.path.join(saida, 'tutorial.vtt'), 'w') as f:
    f.write('WEBVTT\n\n'); [f.write(f"{fmt(g['t0'])} --> {fmt(g['t1'])}\n{g['txt']}\n\n") for g in legs]
json.dump([{'n': c['cap'], 't': round(c['t0'], 2)} for c in caps], open(os.path.join(saida, 'tutorial-capitulos.json'), 'w'), ensure_ascii=False)
shutil.rmtree(tmp); print('tutorial', round(TOTAL, 1), 's ·', len(legs), 'legendas')
