# Collect the Italy map pictures (all groups, all levels) into build/raster.json + build/files.json
import json, os
D = '/home/claude/gmap/it'; G = json.load(open(f'{D}/groups.json'))
R = []
for g in G:
    f = f'{D}/raster-{g["id"]}.json'
    if not os.path.exists(f): print('missing', g['id']); continue
    for r in json.load(open(f)):
        if os.path.exists(f'{D}/tiles/' + os.path.basename(r['src'])): R.append(r)
json.dump(R, open('/home/claude/ie/build/raster.json', 'w'), separators=(',', ':'))
json.dump([r['src'] for r in R], open('/home/claude/ie/build/files.json', 'w'))
print(len(R), 'tiles', round(sum(os.path.getsize(f'{D}/tiles/' + os.path.basename(r['src'])) for r in R) / 1e6, 1), 'MB')
