import json, math, re, unicodedata, glob, sys
from collections import defaultdict
exec(open('review.py').read().split("out = []")[0])
TOWNISH = re.compile(r'^(place=|railway=|tourism=(hotel|guest_house|apartment|hostel|camp_site|caravan_site|information)|amenity=townhall|boundary=|highway=)')
GENERIC = set('war cemetery memorial museum museo monument monumento castle castell castillo church chiesa iglesia bridge ponte puente beach spiaggia playa old town front line battle site hill monte mount refugio refugi shelter bunker park parco parque centre center the'.split())
TOL = {'DOC': 150, 'HIGH': 150, 'MEDIUM': 500, 'AREA': 2500, 'LOW': 2500}
auto_ok, rest = [], []
for i, p in enumerate(P):
    nm = p['name']; T = toks(nm); town = toks(p.get('town', '')) | toks(nm.split(',')[-1] if ',' in nm else '')
    spec = (T - GENERIC - town) or (T - GENERIC)
    cands = [(c[0]*1000, c[1], c[5]) for c in near(p['lat'], p['lon'], 8)]
    cands += [(km(p['lat'],p['lon'],r[1],r[2])*1000, r[0] or '', r[3]) for r in byp[i]]
    good = [c for c in cands if spec & toks(c[1]) and not TOWNISH.match(c[2])]
    tol = TOL.get(p['conf'], 500)
    if good and min(c[0] for c in good) <= tol: auto_ok.append(i)
    else: rest.append(i)
json.dump({'ok': auto_ok, 'rest': rest}, open('triage.json', 'w'))
print('auto ok', len(auto_ok), 'to review', len(rest))
