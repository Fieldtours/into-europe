# Print-quality PDF maps, step 2: the road map for each PDF map, drawn from the saved OpenStreetMap data at 4x sharpness
import json, math, sys
sys.path.insert(0, '/home/claude/ie/pdf/pmaps')
from cover import P, plan, imerc
O = '/home/claude/ie/pdf/pmaps'
keys = sys.argv[1:] or list(P)
J = []
for k in keys:
    cx, cy, sc, W, H = P[k]; r = plan(k); z = r['z']; fz = math.floor(z); zs = r['zs'] or 4
    shift = max(0, zs - fz)
    J.append({'w': round(W), 'h': round(H), 'ratio': 4, 'center': [cx, imerc(cy)], 'zoom': z, 'textScale': 1.35, 'png': True,
              'shift': shift, 'srcMax': zs, 'labels': [], 'out': f'{O}/base-{k}.png'})
json.dump(J, open(f'{O}/jobs.json', 'w')); print(len(J), 'jobs')
