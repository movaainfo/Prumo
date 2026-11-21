# PRUMO · narração do tutorial: uma voz neural em português de Portugal (Piper, voz "tugão", dados CC0), gerada aqui, sem serviços de fora.
# Uso: python3 voz.py <tutorial.json> <modelo.onnx> <pasta>  → <pasta>/<id>.wav e duracoes.json
import json, sys, subprocess, os, wave
roteiro, modelo, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True); dur = {}
for seg in json.load(open(roteiro)):
    w = os.path.join(out, seg['id'] + '.wav')
    subprocess.run([sys.executable, '-m', 'piper', '-m', modelo, '-f', w, '--length-scale', '1.05', '--sentence-silence', '0.35'], input=seg['fala'].encode(), check=True, capture_output=True)
    with wave.open(w) as f: dur[seg['id']] = round(f.getnframes() / f.getframerate(), 3)
    print(seg['id'], dur[seg['id']], 's')
json.dump(dur, open(os.path.join(out, 'duracoes.json'), 'w'), indent=1)
