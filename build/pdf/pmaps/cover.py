import json, math, os
P = json.load(open('/home/claude/ie/pdf/pmaps/proj.json'))
VT = '/home/claude/gmap/vt'
imerc = lambda y: math.degrees(math.atan(math.sinh(math.radians(y))))
def tiles(z, w, s, e, n):
    N = 2**z
    tx = lambda lo: int((lo + 180) / 360 * N)
    ty = lambda la: int((1 - math.log(math.tan(math.radians(la)) + 1 / math.cos(math.radians(la))) / math.pi) / 2 * N)
    return [(z, x, y) for x in range(tx(w), tx(e) + 1) for y in range(ty(n), ty(s) + 1)]
def plan(k):
    cx, cy, sc, W, H = P[k]
    w, e = cx - W / 2 / sc, cx + W / 2 / sc; s, n = imerc(cy - H / 2 / sc), imerc(cy + H / 2 / sc)
    z = math.log2(sc * 360 / 512); fz = math.floor(z)
    best = None
    for zs in range(min(fz + 1, 13), 3, -1):
        T = tiles(zs, w, s, e, n); have = sum(os.path.exists(f'{VT}/{a}/{b}/{c}.pbf') for a, b, c in T)
        if have == len(T): best = zs; break
    return dict(k=k, z=z, zs=best, box=[w, s, e, n])
if __name__ == '__main__':
    for k in P: r = plan(k); print(k, round(r['z'], 2), 'source zoom', r['zs'])
