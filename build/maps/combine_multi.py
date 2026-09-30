# Combine the region pickles into map layers: data/it-<area>/ for every close-up, data/italy-ov/ for the overview.
import json, pickle, glob, os, shutil
from shapely.geometry import box, mapping, shape
from shapely.ops import linemerge, unary_union, polygonize
D = '/home/claude/gmap'
G = json.load(open(f'{D}/it/groups.json')); GB = {g['id']: g['b'] for g in G}
P = [pickle.load(open(f, 'rb')) for f in sorted(glob.glob(f'{D}/it/pkl/*.pkl'))]
nesea = shape(json.load(open(f'{D}/data/italy-ne/sea.geojson'))['features'][0]['geometry'])
def dump(out, name, items, tol, BB):
    fs = []
    for g, p in items:
        try: g = g.intersection(BB).simplify(tol, preserve_topology=True)
        except Exception: continue
        if g.is_empty: continue
        fs.append({'type':'Feature','geometry':mapping(g),'properties':p})
    json.dump({'type':'FeatureCollection','features':fs}, open(f'{out}/{name}.geojson','w'), separators=(',',':')); return len(fs)
report = {}
for aid, b in GB.items():
    if aid == 'italy': continue
    L = {k: [] for k in ('roads','rail','rivers','water','wood','wetland','urban','places','coast')}
    for p in P:
        for k, v in p['areas'].get(aid, {}).items(): L[k] += v
    out = f'{D}/data/it-{aid}'; os.makedirs(out, exist_ok=True)
    w, s, e, n = b; BB = box(w-.03, s-.03, e+.03, n+.03); cnt = {}
    if aid.startswith('m'):   # middle tier: lighter layers (what shows at zoom ~10)
        L['roads'] = [(g, p) for g, p in L['roads'] if p['c'] <= 4]
        L['places'] = [f for f in L['places'] if f['properties']['place'] in ('city', 'town', 'village')]
        L['wood'] = [(g, p) for g, p in L['wood'] if g.area > 2e-5]; L['urban'] = [(g, p) for g, p in L['urban'] if g.area > 5e-6]
        L['rail'] = []
    for k, tol in [('roads',0.00006),('rail',0.0001),('rivers',0.0001),('water',0.00006),('wood',0.0001),('wetland',0.0001),('urban',0.0001)]:
        # the same way can come from two neighbouring region files: keep one copy
        seen = set(); items = []
        for g, pr in L[k]:
            key = (g.wkb[:64], round(g.length if hasattr(g,'length') else 0, 7), round(g.area, 10))
            if key in seen: continue
            seen.add(key); items.append((g, pr))
        cnt[k] = dump(out, k, items, tol, BB)
    pl = {(f['properties']['name'], tuple(f['geometry']['coordinates'])): f for f in L['places']}
    json.dump({'type':'FeatureCollection','features':list(pl.values())}, open(f'{out}/places.geojson','w'), separators=(',',':')); cnt['places'] = len(pl)
    json.dump({'type':'FeatureCollection','features':[]}, open(f'{out}/borders.geojson','w'))
    # sea: cut the area along the coastline; pieces that are mostly sea in Natural Earth are sea
    sea = []; SB = box(w-.02, s-.02, e+.02, n+.02)
    if L['coast']:
        cl = linemerge(unary_union([g for g, _ in L['coast']])).intersection(SB)
        # OSM coastlines have the land on their left: a thin strip on each side decides near the coast, Natural Earth further out
        ways = [g for g, _ in L['coast'] if g.intersects(SB)]
        R = unary_union([g.buffer(-0.006, single_sided=True) for g in ways]); Lb = unary_union([g.buffer(0.006, single_sided=True) for g in ways])
        hyb = nesea.union(R).difference(Lb)
        for pc in polygonize(unary_union([cl, SB.exterior])):
            if pc.area < 1e-8: continue
            f = nesea.intersection(pc).area / pc.area
            if f > 0.97 or (pc.area < 0.002 and (nesea.contains(pc.representative_point()) or f > 0.6)): sea.append(pc)
            elif f > 0.03 or pc.intersects(R): 
                h = pc.intersection(hyb)
                if not h.is_empty and h.area > 1e-8: sea.append(h)
    json.dump({'type':'FeatureCollection','features':[{'type':'Feature','geometry':mapping(g.simplify(0.00005)),'properties':{}} for g in sea]}, open(f'{out}/sea.geojson','w'), separators=(',',':'))
    cnt['sea'] = len(sea); report[aid] = cnt
# overview
import sys
if '--no-ov' in sys.argv: raise SystemExit(print('areas', len(report)))
out = f'{D}/data/italy-ov'; os.makedirs(out, exist_ok=True)
for f in glob.glob(f'{D}/data/italy-ne/*.geojson'): shutil.copy(f, out)
roads = [r for p in P for r in p['ov']['roads']]
seen = set(); RR = []
for g, pr in roads:
    key = g.wkb[:64]
    if key in seen: continue
    seen.add(key); RR.append({'type':'Feature','geometry':mapping(g),'properties':pr})
json.dump({'type':'FeatureCollection','features':RR}, open(f'{out}/roads.geojson','w'), separators=(',',':'))
pl = {}
for p in P:
    for f in p['ov']['places']: pl[(f['properties']['name'], tuple(f['geometry']['coordinates']))] = f
json.dump({'type':'FeatureCollection','features':list(pl.values())}, open(f'{out}/places.geojson','w'), separators=(',',':'))
json.dump(report, open(f'{D}/it/layers-report.json','w'), indent=0)
empty = [a for a, c in report.items() if c['roads'] == 0 or c['places'] == 0]
print('areas', len(report), 'ov roads', len(RR), 'towns', len(pl), 'areas with no roads/places:', empty)
