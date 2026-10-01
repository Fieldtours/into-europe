# all named POI-like features (with centre coordinates) from an OSM file
import osmium, sys, json
from shapely import wkb as swkb
KEYS=('historic','tourism','memorial','military','man_made','natural','place','building','leisure','landuse','amenity','railway','bridge','highway')
OKV={'tourism':None,'historic':None,'memorial':None,'military':None,'place':None,
 'man_made':{'bridge','tower','lighthouse','pier','breakwater'},'natural':{'peak','beach','bay','cape','ridge','hill','saddle','valley'},
 'building':{'church','cathedral','chapel','bunker','castle','monastery','palace'},'leisure':{'park','nature_reserve'},'landuse':{'cemetery'},
 'amenity':{'grave_yard','place_of_worship','townhall','arts_centre'},'railway':{'station'}}
fab=osmium.geom.WKBFactory();out=open(sys.argv[2],'w');n=0
def want(t):
    if 'name' not in t: return None
    for k,v in OKV.items():
        x=t.get(k)
        if x and (v is None or x in v): return k+'='+x
    if t.get('bridge')=='yes' and t.get('highway'): return 'bridge=yes'
    return None
fp=osmium.FileProcessor(sys.argv[1]).with_locations().with_areas()
for o in fp:
    t=o.tags;k=want(t)
    if not k: continue
    try:
        if o.is_node(): la,lo=o.location.lat,o.location.lon
        elif o.is_way():
            if o.is_closed(): continue  # closed ways come again as areas
            g=swkb.loads(fab.create_linestring(o),hex=True);c=g.interpolate(0.5,normalized=True);la,lo=c.y,c.x
        elif o.is_area():
            g=swkb.loads(fab.create_multipolygon(o),hex=True);c=g.representative_point();la,lo=c.y,c.x
        else: continue
    except Exception: continue
    out.write(json.dumps([t.get('name'),t.get('name:en',''),round(la,6),round(lo,6),k])+'\n');n+=1
print(sys.argv[1],n)
