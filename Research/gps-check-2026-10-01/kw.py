# usage: python3 kw.py lat lon radius_m regex   -> OSM landmarks near a point whose name/kind matches
import json, sys, re, math, glob
la, lo, r, rx = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), re.compile(sys.argv[4], re.I)
def km(a, b, c, d): return 6371*2*math.asin(math.sqrt(math.sin(math.radians(c-a)/2)**2+math.cos(math.radians(a))*math.cos(math.radians(c))*math.sin(math.radians(d-b)/2)**2))
out = []
for f in glob.glob('poi-*.jsonl'):
    for l in open(f):
        n, ne, a, b, k = json.loads(l)
        if abs(a-la) > r/100000 + .01 or abs(b-lo) > r/80000 + .01: continue
        d = km(la, lo, a, b)*1000
        if d <= r and (rx.search(n or '') or rx.search(ne or '') or rx.search(k)): out.append((round(d), n, k, a, b))
for x in sorted(out)[:25]: print(x)
