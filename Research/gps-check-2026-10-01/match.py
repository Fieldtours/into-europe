# Compare every marker with OpenStreetMap: named landmarks nearby + name searches (Nominatim).
import json, math, re, unicodedata, glob, sys
from collections import defaultdict
P = json.load(open('points.json'))
def norm(s):
    s = unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9 ]', ' ', s)
STOP = set('the and of di de del della dei degli delle la le il lo el los las da do dos du des a and at in on near for to e y i memorial museum museo cemetery war site and ponte monte mount castle church old town front line battle'.split())
GEN = set('memorial museum museo cemetery cimitero war bridge ponte monte castle castell castillo church chiesa iglesia refugio refugi shelter bunker beach spiaggia playa'.split())
def toks(s): return [t for t in norm(s).split() if len(t) > 2 and t not in STOP]
def km(a, b, c, d):
    return 6371 * 2 * math.asin(math.sqrt(math.sin(math.radians(c - a) / 2) ** 2 + math.cos(math.radians(a)) * math.cos(math.radians(c)) * math.sin(math.radians(d - b) / 2) ** 2))
# OSM landmarks, gridded
G = defaultdict(list)
for f in glob.glob('poi-*.jsonl'):
    for l in open(f):
        n, ne, la, lo, k = json.loads(l)
        G[(int(la * 20), int(lo * 20))].append((n, ne, la, lo, k))
def near(la, lo, r_km):
    out = []
    for i in range(int(la * 20) - 2, int(la * 20) + 3):
        for j in range(int(lo * 20) - 3, int(lo * 20) + 4):
            for c in G.get((i, j), []):
                d = km(la, lo, c[2], c[3])
                if d <= r_km: out.append((d,) + c)
    return out
def sim(a, b):
    A, B = set(toks(a)), set(toks(b))
    if not A or not B: return 0
    inter = A & B
    return len(inter) / min(len(A), len(B)) * (0.5 if inter <= GEN else 1)
NR = json.load(open('nres.json')) if glob.glob('nres.json') else {}
NQ = json.load(open('nomq.json'))
byp = defaultdict(list)
for k, (i, q, la, lo) in enumerate(NQ):
    for r in NR.get(str(k), []) or []:
        if isinstance(r, list) and len(r) == 5: byp[i].append(r)
rows = []
for i, p in enumerate(P):
    nm = p['name'] + ' ' + p.get('town', '')
    cand = near(p['lat'], p['lon'], 6)
    best = sorted([(sim(nm, c[1]) + 0.6 * sim(nm, c[2] or ''), -c[0], c) for c in cand], reverse=True)[:5]
    nom = sorted([(sim(nm, r[0] or r[4]), r) for r in byp[i]], key=lambda x: -x[0])[:3]
    rows.append({'i': i, 'app': p['app'], 'key': p['key'], 'name': p['name'], 'conf': p['conf'], 'lat': p['lat'], 'lon': p['lon'],
                 'osm': [[round(s, 2), round(c[0] * 1000), c[1], c[3], c[4], c[5]] for s, _, c in best if s > 0],
                 'nom': [[round(s, 2), round(km(p['lat'], p['lon'], r[1], r[2]) * 1000), r[0], r[1], r[2], r[3], r[4]] for s, r in nom]})
json.dump(rows, open('match.json', 'w'), ensure_ascii=False, indent=0)
print(len(rows))
