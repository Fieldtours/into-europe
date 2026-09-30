# Draw the Spanish Civil War app maps: g0 = Spain overview (spain-ov data), g1.. = close-ups (scw-aNN data).
# Every map at several levels (L0 full, L1 half, ... down to ~640px), plus a names-free copy of the overview; cut into 1024px JPEG tiles.
# usage: python3 make_tiles_scw.py [ids...]   (default: all)   env ONLY_LV=0,1,b
import sys, json, subprocess, os, math
sys.path.insert(0, '/home/claude/gmap'); from tiles import *
from PIL import Image, ImageStat
D = '/home/claude/gmap/it'; G = json.load(open(f'{D}/groups.json'))
want = sys.argv[1:] or [g['id'] for g in G]
os.makedirs('/home/claude/gmap/png/parts', exist_ok=True); OUT = f'{D}/tiles'; os.makedirs(OUT, exist_ok=True)
def lvls(gi, g):
    W, H = g['w'], g['h']; L = 0; out = []
    while True:
        w, h = round(W / 2**L), round(H / 2**L)
        out.append({'g': gi, 'lv': L, 'b': g['b'], 'w': w, 'h': h})
        if max(w, h) / 2 < (640 if gi == 0 else 260) or L >= 4: break
        L += 1
    if gi == 0: out.append(dict(out[0], lv=-1))
    return out
def tag(l): return 'b' if l['lv'] < 0 else str(l['lv'])
for gi, g in enumerate(G):
    if g['id'] not in want: continue
    area = 'italy-ov' if gi == 0 else f"it-{g['id']}"
    R = []
    only = os.environ.get('ONLY_LV')
    old = {}
    if only and os.path.exists(f'{D}/raster-{g["id"]}.json'): old = {(r['lv']): 1 for r in json.load(open(f'{D}/raster-{g["id"]}.json'))}
    for l in lvls(gi, g):
        if only and tag(l) not in only.split(','):
            png = f"/home/claude/gmap/png/it-{gi}{tag(l)}.png"
            if os.path.exists(png):
                for t in cut(png, l, 'italy', OUT):
                    im = Image.open(os.path.join(OUT, os.path.basename(t['src'])))
                    if all(b - a < 8 for a, b in im.getextrema()): os.remove(os.path.join(OUT, os.path.basename(t['src']))); continue
                    R.append(t)
            continue
        if gi == 0 and l['lv'] > 0: area = 'italy-ov-lo'
        elif gi == 0: area = 'italy-ov'
        stem = f"/home/claude/gmap/png/parts/it-{gi}{tag(l)}"
        J = chunk_jobs(l, area, stem)
        if l['lv'] < 0:
            for j in J: j['bare'] = True
        jf = f'{D}/jobs-{g["id"]}-{tag(l)}.json'; json.dump(J, open(jf, 'w'))
        r = subprocess.run(['node', 'shoot.js', jf], cwd='/home/claude/gmap', env=dict(os.environ, NODE_PATH='/opt/node-tools/node_modules'), capture_output=True, text=True)
        if 'timeout' in r.stdout or 'READY' not in r.stdout: print('PROBLEM', g['id'], tag(l), r.stdout[-400:], r.stderr[-400:])
        png = f"/home/claude/gmap/png/it-{gi}{tag(l)}.png"; stitch(J, l, png)
        for t in cut(png, l, 'italy', OUT):
            im = Image.open(os.path.join(OUT, os.path.basename(t['src'])))
            ex = im.getextrema()
            if all(b - a < 8 for a, b in ex):      # a plain picture (open sea): the drawn map underneath already shows it
                os.remove(os.path.join(OUT, os.path.basename(t['src']))); continue
            R.append(t)
    json.dump(R, open(f'{D}/raster-{g["id"]}.json', 'w'))
    print(g['id'], len(R), 'tiles', flush=True)
