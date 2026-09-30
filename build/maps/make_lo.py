# lighter road layer for the zoomed-out overview levels: merge pieces of the same road, simplify
import json, os, shutil, collections
from shapely.geometry import shape, mapping
from shapely.ops import linemerge, unary_union
D='/home/claude/gmap/data'; os.makedirs(f'{D}/italy-ov-lo', exist_ok=True)
for f in os.listdir(f'{D}/italy-ov'): shutil.copy(f'{D}/italy-ov/{f}', f'{D}/italy-ov-lo/{f}')
R=json.load(open(f'{D}/italy-ov/roads.geojson'))['features']; G=collections.defaultdict(list)
for f in R: G[(f['properties'].get('c'), f['properties'].get('ref',''))].append(shape(f['geometry']))
out=[]
for (c,ref),gs in G.items():
    u=unary_union(gs); m=(linemerge(u) if u.geom_type=="MultiLineString" else u).simplify(0.0025, preserve_topology=False)
    for g in (getattr(m,'geoms',None) or [m]):
        if g.length>0.01 or c==0: out.append({'type':'Feature','geometry':mapping(g),'properties':{'c':c,'ref':ref,'name':''}})
json.dump({'type':'FeatureCollection','features':out}, open(f'{D}/italy-ov-lo/roads.geojson','w'), separators=(',',':'))
print(len(R),'->',len(out))
