# Plan the Into Europe (Italy) maps: overview g0 + middle tier (40 km groups) + close-ups (15 km groups) around every site.
import json, math
P0 = json.load(open('/home/claude/ie/research/places.json'))
def merc(l): return math.degrees(math.log(math.tan(math.pi/4 + math.radians(l)/2)))
def km(a, b): return math.hypot((a[0]-b[0])*111.2, (a[1]-b[1])*111.2*math.cos(math.radians(a[0])))
P = [(p['lat'], p['lon'], p['key']) for p in P0 if p.get('lat')]
def groups(d):
    C = [[p] for p in P]; ch = True
    while ch:
        ch = False
        for i in range(len(C)):
            for j in range(i+1, len(C)):
                if min(km(a, b) for a in C[i] for b in C[j]) < d: C[i] += C[j]; del C[j]; ch = True; break
            if ch: break
    C.sort(key=lambda c: -sum(p[0] for p in c)/len(c)); return C
G = [{'id': 'italy', 'b': [6.4, 36.4, 19.0, 47.3]}]
for n, c in enumerate(groups(15)):
    b = [min(p[1] for p in c)-.09, min(p[0] for p in c)-.07, max(p[1] for p in c)+.09, max(p[0] for p in c)+.07]
    G.append({'id': f'a{n+1:02d}', 'b': [round(x, 4) for x in b], 'stops': [p[2] for p in c]})
for n, c in enumerate(groups(40)):
    b = [min(p[1] for p in c)-.26, min(p[0] for p in c)-.2, max(p[1] for p in c)+.26, max(p[0] for p in c)+.2]
    G.append({'id': f'm{n+1:02d}', 'b': [round(x, 4) for x in b], 'stops': [p[2] for p in c], 'tier': 'mid'})
tot = 0
for g in G:
    r = 600 if g['id'] == 'italy' else 1400 if g.get('tier') else 4550; w0, s0, e0, n0 = g['b']
    g['w'] = round((e0-w0)*r); g['h'] = round((merc(n0)-merc(s0))*r); tot += g['w']*g['h']
json.dump(G, open('groups.json', 'w'), indent=0)
print(len(G), 'groups', sum(1 for g in G if g['id'][0]=='a'), 'close', sum(1 for g in G if g.get('tier')), 'mid', round(tot/1e6), 'Mpx')
for g in sorted(G, key=lambda g: -g['w']*g['h'])[:8]: print(g['id'], g['w'], g['h'], len(g.get('stops', [])))
