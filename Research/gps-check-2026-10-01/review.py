import json, math, re, unicodedata, glob
from collections import defaultdict
P = json.load(open('points.json'))
def norm(s):
    s = unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9 ]', ' ', s)
STOP = set('the and of di de del della dei degli delle la le il lo el los las da do dos du des and at in on near for to e y i al d l s sur'.split())
def toks(s): return {t for t in norm(s).split() if len(t) > 2 and t not in STOP}
def km(a, b, c, d):
    return 6371 * 2 * math.asin(math.sqrt(math.sin(math.radians(c - a) / 2) ** 2 + math.cos(math.radians(a)) * math.cos(math.radians(c)) * math.sin(math.radians(d - b) / 2) ** 2))
G = defaultdict(list)
for f in glob.glob('poi-*.jsonl'):
    for l in open(f):
        n, ne, la, lo, k = json.loads(l); G[(int(la * 20), int(lo * 20))].append((n, ne, la, lo, k))
def near(la, lo, r):
    o = []
    for i in range(int(la * 20) - 3, int(la * 20) + 4):
        for j in range(int(lo * 20) - 4, int(lo * 20) + 5):
            for c in G.get((i, j), []):
                d = km(la, lo, c[2], c[3])
                if d <= r: o.append((d,) + c)
    return o
NR = json.load(open('nres.json')); NQ = json.load(open('nomq.json'))
byp = defaultdict(list)
for k, (i, q, la, lo) in enumerate(NQ):
    for r in NR.get(str(k), []) or []:
        if isinstance(r, list) and len(r) == 5 and r not in byp[i]: byp[i].append(r)
out = []
for i, p in enumerate(P):
    T = toks(p['name'])
    cand = [c for c in near(p['lat'], p['lon'], 8) if T & (toks(c[1]) | toks(c[2]))]
    cand.sort(key=lambda c: (-len(T & (toks(c[1]) | toks(c[2]))), c[0]))
    lines = [f"  osm {round(c[0]*1000):>5}m  {c[1][:60]} [{c[5]}] {c[3]:.5f},{c[4]:.5f}" for c in cand[:6]]
    for r in byp[i][:4]:
        lines.append(f"  nom {round(km(p['lat'],p['lon'],r[1],r[2])*1000):>5}m  {(r[0] or '')[:40]} [{r[3]}] {r[1]:.5f},{r[2]:.5f} | {r[4][:50]}")
    out.append(f"#{i} {p['app']}:{p['key']} [{p['conf']}] {p['name']}  ({p.get('town','')}) @ {p['lat']},{p['lon']}  cat={p.get('cat','')[:40]}\n" + '\n'.join(lines))
open('review.txt', 'w').write('\n'.join(out)); print(len(out))
