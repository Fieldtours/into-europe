# Add Natural Earth roads and towns outside Spain (Portugal, France, Andorra, North Africa) to the overview layers.
import json
from shapely.geometry import shape
from shapely.prepared import prep
D='/home/claude/gmap/data'
C=[f for f in json.load(open('/home/claude/ne/ne_10m_admin_0_countries.geojson'))['features'] if f['properties']['ADMIN']=='Italy'][0]
es=prep(shape(C['geometry']).buffer(0.02))
for n in ['roads','places']:
    ov=json.load(open(f'{D}/italy-ov/{n}.geojson')); ne=json.load(open(f'{D}/italy-ne/{n}.geojson'))
    add=[f for f in ne['features'] if not es.intersects(shape(f['geometry']).representative_point() if n=='roads' else shape(f['geometry']))]
    ov['features']+=add; json.dump(ov,open(f'{D}/italy-ov/{n}.geojson','w'),separators=(',',':')); print(n,'added outside Spain',len(add))
