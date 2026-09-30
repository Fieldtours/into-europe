# One pass over a Geofabrik region file (.osm.pbf): collect the map features for every close-up area it touches,
# and the main roads and towns for the Spain overview. Saves a pickle per region; combine_multi.py writes the layers.
# usage: python3 extract_multi.py <file.osm.pbf> <out.pkl>
import sys, json, pickle, osmium, time
from shapely.geometry import LineString, box, Polygon, MultiPolygon
from shapely import wkb as swkb
pbf, outp = sys.argv[1], sys.argv[2]; t0 = time.time()
G = json.load(open('/home/claude/gmap/it/groups.json'))
AREAS = [(g['id'], box(*g['b']).buffer(0.01, join_style=2), g['b']) for g in G[1:]]
ROADS = {'motorway':0,'motorway_link':0,'trunk':1,'trunk_link':1,'primary':2,'primary_link':2,'secondary':3,'secondary_link':3,
         'tertiary':4,'tertiary_link':4,'unclassified':5}
URB = ('residential','industrial','commercial','retail')
TAGS = [('highway', v) for v in ROADS] + [('railway','rail'), ('waterway','river'), ('waterway','canal'), ('natural','water'), ('landuse','reservoir'),
        ('landuse','forest'), ('natural','wood'), ('natural','wetland'), ('natural','coastline')] + [('landuse', u) for u in URB] + \
       [('place', p) for p in ('city','town','village','hamlet','suburb')]
ATAGS = [('natural','water'), ('landuse','reservoir'), ('landuse','forest'), ('natural','wood'), ('natural','wetland')] + [('landuse', u) for u in URB]
fab = osmium.geom.WKBFactory()
OUT = {a[0]: {k: [] for k in ('roads','rail','rivers','water','wood','wetland','urban','places','coast')} for a in AREAS}
OV = {'roads': [], 'places': []}
def hit(bounds):
    x0, y0, x1, y1 = bounds
    return [a for a in AREAS if not (x1 < a[2][0]-.03 or x0 > a[2][2]+.03 or y1 < a[2][1]-.03 or y0 > a[2][3]+.03)]
n = 0
fp = osmium.FileProcessor(pbf).with_locations().with_areas(osmium.filter.TagFilter(*ATAGS)).with_filter(osmium.filter.TagFilter(*TAGS))
for o in fp:
    n += 1
    t = o.tags
    if o.is_node():
        p = t.get('place'); nm = t.get('name')
        if not nm or p not in ('city','town','village','hamlet','suburb'): continue
        lo, la = o.location.lon, o.location.lat
        pop = (t.get('population') or '').replace(' ', '').replace('.', '').replace(',', '')
        f = {'type':'Feature','geometry':{'type':'Point','coordinates':[round(lo,5), round(la,5)]},'properties':{'name':nm,'place':p,'pop':int(pop) if pop.isdigit() else 0}}
        if p in ('city','town'): OV['places'].append(f)
        for a in hit((lo, la, lo, la)): OUT[a[0]]['places'].append(f)
    elif o.is_way():
        hw = t.get('highway'); k = None; props = {}
        if hw in ROADS: k = 'roads'; props = {'c': ROADS[hw], 'ref': (t.get('ref') or '').split(';')[0], 'name': t.get('name') or ''}
        elif t.get('railway') == 'rail' and t.get('service') is None: k = 'rail'
        elif t.get('waterway') in ('river','canal'): k = 'rivers'; props = {'name': t.get('name') or '', 'w': t.get('waterway')}
        elif t.get('natural') == 'coastline': k = 'coast'
        if not k: continue
        try: g = swkb.loads(fab.create_linestring(o), hex=True)
        except Exception: continue
        if k == 'roads' and props['c'] <= 2: OV['roads'].append((g.simplify(0.0004), dict(props, name='')))
        for a in hit(g.bounds): OUT[a[0]][k].append((g, props))
    elif o.is_area():
        k = None
        if t.get('natural') == 'water' or t.get('landuse') == 'reservoir': k = 'water'
        elif t.get('landuse') == 'forest' or t.get('natural') == 'wood': k = 'wood'
        elif t.get('natural') == 'wetland': k = 'wetland'
        elif t.get('landuse') in URB: k = 'urban'
        if not k: continue
        try: g = swkb.loads(fab.create_multipolygon(o), hex=True)
        except Exception: continue
        if g.area < 2e-7 and k != 'water': continue
        for a in hit(g.bounds): OUT[a[0]][k].append((g, {}))
OUT = {k: v for k, v in OUT.items() if any(v.values())}
pickle.dump({'areas': OUT, 'ov': OV}, open(outp, 'wb'))
print(pbf.split('/')[-1], 'objects', n, 'areas', sorted(OUT), 'ov roads', len(OV['roads']), 'towns', len(OV['places']), round(time.time()-t0), 's', flush=True)
