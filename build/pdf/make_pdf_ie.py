# Printed edition of each Easy Company guide, in the same structure as the Spanish Civil War PDF:
# cover · contents · the story in brief · one chapter per tour day (map, then each site) · extras ·
# timeline · the wider war · museums · people (The Men) · words to know · credits.
import json, html, asyncio, re, os, shutil, sys
from playwright.async_api import async_playwright
E = lambda s: html.escape(str(s or ''))
ROOT = '/home/claude/ie/test/'          # served on :8820 — fonts, welcome.jpg
BUILD = ROOT + 'pdfbuild/'
os.makedirs(BUILD + 'maps', exist_ok=True)
from PIL import Image
for f in os.listdir('/home/claude/ie/pdf/maps'):
    im = Image.open('/home/claude/ie/pdf/maps/' + f).convert('RGB')
    if im.width > 1300: im = im.resize((1300, round(im.height * 1300 / im.width)), Image.LANCZOS)
    im.save(BUILD + 'maps/' + f.replace('.png', '.jpg'), quality=74, optimize=True)

GUIDES = {
 'italy': dict(out='Into-Europe-Italy-1943-1945.pdf', place='Italy 1943–1945', foot='Into Europe · Italy 1943–1945'),
}

def links(L):
    if not L: return ''
    return '<p class="src"><b>Read more:</b> ' + ' · '.join(f'<a href="{E(u)}">{E(t)}</a>' for t, u in L) + '</p>'

def pill(c): return f'<span class="c c-{E(c)}">{E(c)}</span>'

def stop(no, name, meta, text, look=None, plan=None, priv=False, lat=None, lon=None, L=None, lookLabel='What you can see'):
    return (f'<div class="stop"><div class="sh"><span class="no">{no}</span><div><b>{E(name)}</b><div class="meta">{meta}</div></div></div>'
            f'<p>{E(text)}</p>'
            + (f'<p class="look"><b>{lookLabel}:</b> {E(look)}</p>' if look else '')
            + (f'<p class="plan"><b>Plan:</b> {E(plan)}{" <b>Private land — view from the road.</b>" if priv else ""}</p>' if plan or priv else '')
            + (f'<p class="gps">GPS {lat:.5f}, {lon:.5f}</p>' if lat is not None else '')
            + links(L) + '</div>')

GM = '/home/claude/ie/pdf/gmaps/'
def mapblock(key, name, items):
    import os, json as _j
    f = f'{key}-{name}.jpg'
    if os.path.exists(GM + f):
        shutil.copy(GM + f, BUILD + 'maps/g-' + f)
        off = _j.load(open(GM + f'{key}-off.json')).get(f, []) if os.path.exists(GM + f'{key}-off.json') else []
        keyl = ''.join(f'<span><b>{n}</b>{E(t)}</span>' for n, t in items if n not in off)
        note = ''.join(f'<span class="offm"><b>{n}</b>{E(t)} — off this map</span>' for n, t in items if n in off)
        return f'<img class="rimg" src="maps/g-{f}"><div class="mkey">{keyl}{note}</div><p class="cap">Map data © OpenStreetMap contributors</p>'
    return f'<img class="rimg" src="maps/{key}-{name}.jpg">'
def build(key):
    G = GUIDES[key]; D = json.load(open(f'/home/claude/ie/pdf/{key}.json'))
    nstops = sum(len(d['stops']) for d in D['days']) + len(D['extra'])
    P = []
    # ---- cover
    P.append(f'''<section class="cover"><div class="doc"><span>{E(D["top"])}</span><span>{E(D["dates"])}</span></div>
<div class="ttl"><h1><small>Into Europe</small><br>{G["place"]}</h1>
<p class="sub">{E(D["sub"])}</p><p class="stamp">{nstops} SITES · {len(D["days"])} DAYS · {len(D["tl"])} POSITIONS</p></div>
<p class="note">Free guide · dzcharlie.com · Printed edition of the phone guide. Positions carry a rating for how sure we are of the exact spot: HIGH (exact spot known), MEDIUM (right area), LOW (general area only).</p></section>''')
    # ---- contents + the story in brief
    toc = [f'Day {d["n"]} — {E(d["title"])} <span>{len(d["stops"])} sites</span>' for d in D['days']]
    if D['extra']: toc.append(f'Worth a detour <span>{len(D["extra"])} sites</span>')
    toc += [f'The timeline <span>{len(D["tl"])} positions</span>', f'{E(D["ddTitle"])} <span>{len(D["dd"])} sites</span>',
            f'Museums <span>{len(D["mus"])}</span>', 'The armies', f'Key figures <span>{len(D["men"])}</span>', 'Words to know', 'Credits']
    P.append('<section><h2>Contents</h2><ol class="toc">' + ''.join(f'<li>{t}</li>' for t in toc) + '</ol>')
    P.append('<h2>The story in brief</h2>' + ''.join(f'<p>{x}</p>' for x in D['orders']) + ''.join(f'<p>{x}</p>' for x in D['story']))
    P.append('<h3>The accuracy rule</h3>' + ''.join(f'<p>{re.sub(r"<(?!/?b>)[^>]+>", " ", x)}</p>' for x in D['accuracy'] if 'legend' not in x))
    P.append('<p class="leg">' + pill('HIGH') + ' exact spot known — a landmark, museum, memorial or town &nbsp; ' + pill('MEDIUM') + ' well supported, but the exact spot is uncertain &nbsp; ' + pill('LOW') + ' general area only — the pin is the centre of a search area</p>')
    if D['why']: P.append('<h3>Why the wider tour</h3>' + f'<p>{D["why"][0]}</p>')
    P.append('</section>')
    # ---- the tour, day by day
    for d in D['days']:
        P.append(f'<section class="reg"><h2>Day {d["n"]} — {E(d["title"])}</h2>{mapblock(key, "day%d" % d["n"], [(i+1, s["name"]) for i, s in enumerate(d["stops"])])}<p class="cap">{E(d["route"])}</p><p class="lede">{E(d["q"])}</p>')
        for i, s in enumerate(d['stops']):
            meta = f'{pill(s["cert"])} {E(s["cat"])} · ≈{s["min"]} min' + (' · ★ must see' if s['pri'] == 1 else '')
            P.append(stop(i + 1, s['name'], meta, s['text'], s['look'], s['plan'], s['priv'], s['lat'], s['lon'], s['links']))
        n = d.get('night')
        if n: P.append(f'<div class="night"><b>End of day {d["n"]} — where to sleep:</b> a good area to stay is {E(n.get("base"))}. The phone guide opens hotels, Airbnb and campsites around it on a map, with prices and availability.</div>')
        P.append('</section>')
    if D['extra']:
        P.append(f'<section class="reg"><h2>Worth a detour</h2>{mapblock(key, "extra", [(i+1, s["name"]) for i, s in enumerate(D["extra"])])}<p class="lede">Extra sites, added to the tour when you have more days.</p>')
        for i, s in enumerate(D['extra']):
            P.append(stop(i + 1, s['name'], f'{pill(s["cert"])} {E(s["cat"])} · ≈{s["min"]} min', s['text'], s['look'], s['plan'], s['priv'], s['lat'], s['lon'], s['links']))
        P.append('</section>')
    # ---- timeline
    P.append(f'<section class="reg"><h2>The timeline</h2>{mapblock(key, "tl", [(t["n"], t["name"]) for t in D["tl"]])}<p class="lede">{len(D["tl"])} historical positions in date order: what happened, where and when. The numbers follow the campaign from south to north.</p>')
    for t in D['tl']:
        P.append(stop(t['n'], t['name'], f'{pill(t["cert"])} {E(t["when"])}' + (f' · {E(t["phase"])}' if t['phase'] else ''), t['text'], t['look'], None, False, t['lat'], t['lon'], t['links'], 'On the ground'))
    P.append('</section>')
    # ---- the wider war
    P.append(f'<section class="reg"><h2>{E(D["ddTitle"])}</h2>{mapblock(key, "dd", [(i+1, s["name"]) for i, s in enumerate(D["dd"])])}<h3>{E(D["ddHeads"][0] if D["ddHeads"] else "The decisive factors")}</h3>')
    for f in D['factors']:
        P.append(f'<p class="tl"><b>{E(f[0])}.</b> {E(f[1])}' + (f' <span class="stat">{E(f[2])}</span>' if len(f) > 2 and f[2] else '') + '</p>')
    P.append(f'<h3>{E(D["ddHeads"][-1] if D["ddHeads"] else "Key sites")}</h3>')
    for i, s in enumerate(D['dd']):
        P.append(stop(i + 1, s['name'], f'{pill(s["cert"])} {E(s["cat"])}', s['text'], s['look'], None, False, s['lat'], s['lon'], s['links']))
    P.append('</section>')
    # ---- museums
    P.append(f'<section class="reg"><h2>Museums</h2>{mapblock(key, "mus", [(i+1, s["name"]) for i, s in enumerate(D["mus"])])}<p class="lede">The museums worth your time on this part of the route. Check opening days before you travel.</p>')
    for i, m in enumerate(D['mus']):
        P.append(stop(i + 1, m['name'], f'{E(m["place"])} · {E(m["day"])} · {E(m["tip"])}', m['text'], None, None, False, m['lat'], m['lon'], m['links']))
    P.append('</section>')
    # ---- people
    A = D.get('armies', [])
    if A:
        P.append('<section><h2>The armies</h2>')
        for a in A:
            if a[0] == 'h': P.append(f'<h3>{E(a[1])}</h3>')
            elif a[0] == 'f': P.append(f'<div class="stop"><p><b>{E(a[1])}</b></p>' + ''.join(f'<p class="tl">{x}</p>' for x in a[2]) + '</div>')
            else: P.append(f'<p class="tl">{a[1]}</p>')
        P.append('</section>')
    P.append('<section><h2>Key figures</h2><h3>A campaign of many nations</h3>' + ''.join(f'<p class="tl">{x}</p>' for x in D['syn']))
    grp = None
    for m in D['men']:
        if m['grp'] != grp:
            grp = m['grp']; P.append(f'<h3>{E(grp)}</h3>')
        P.append(f'<div class="man"><p class="tl"><b>{E(m["name"])}</b> {E(m["nick"])} — {E(m["role"])}. <span class="life">{E(m["life"])}</span></p>'
                 + ''.join(f'<p class="tl">{E(b)}</p>' for b in m['bio'])
                 + (('<p class="deco"><b>Decorations:</b> ' + '; '.join(E(x) for x in m['decos']) + '.</p>') if m['decos'] else '')
                 + (f'<p class="deco"><b>After the war:</b> {E(m["after"])}</p>' if m['after'] else '') + '</div>')
    for n in D['notes']:
        P.append(f'<h3>{E(n["h"])}</h3><div class="notes">{n["html"]}</div>')
    P.append('</section>')
    # ---- words to know + credits
    seen = set(); W = []
    for t, d in D['gloss'] + D['gloss2']:
        t2 = re.sub(r's\?$', '', t)
        if t2.lower() in seen: continue
        seen.add(t2.lower()); W.append((t2, d))
    P.append('<section><h2>Words to know</h2>' + ''.join(f'<p class="tl"><b>{E(a)}</b> — {E(b)}</p>' for a, b in W))
    P.append('<h2>Credits</h2>' + ''.join(f'<p class="cap">{E(s)}</p>'.replace('\n', '<br>') for s in [x.replace('Sources for this page', 'Sources:') for x in D['sources']])
             + '<p class="cap">Maps: © OpenStreetMap contributors, available under the Open Database License (openstreetmap.org/copyright). Positions checked against Wikipedia, Wikidata, OpenStreetMap, TracesOfWar, museum and memorial websites, and the books named above.</p>'
             + '<p class="cap">A free DZ Charlie field guide · dzcharlie.com. The phone guide adds the step-by-step battle maps, the weapons and equipment, a tour planner by area or your own route, verified visiting details and a personal war diary of your tour.</p></section>')
    css = '''@font-face{font-family:SS;src:url(../fonts/stardos-stencil-700.woff2);font-weight:700}@font-face{font-family:SE;src:url(../fonts/special-elite-400.woff2)}
@page{size:A4;margin:16mm 15mm 16mm 15mm}
body{font-family:Georgia,serif;font-size:10.5pt;line-height:1.45;color:#1c1a15}
a{color:#3a4118}
h1,h2,h3{font-family:SS,Impact,sans-serif;font-weight:700;text-transform:uppercase;color:#3a4118;letter-spacing:.5px}
h2{font-size:24pt;margin:0 0 8px;border-bottom:3px double #a3261e;padding-bottom:4px;line-height:1.1}
h3{font-size:14pt;margin:12px 0 2px}
section{page-break-before:always}
section.cover{page-break-before:auto;box-sizing:border-box;height:258mm;background:#3a4118 url(../welcome.jpg) center 20%/cover;color:#fff;padding:14mm;position:relative}
.cover .doc{display:flex;justify-content:space-between;gap:12px;font-family:SE;font-size:8pt;letter-spacing:1px;padding:6px;background:rgba(20,22,10,.6)}
.cover .ttl{position:absolute;left:14mm;right:14mm;bottom:40mm;background:rgba(30,34,14,.82);padding:8mm 8mm 6mm}
.cover h1{font-size:44pt;line-height:.95;color:#fff;margin:0}.cover h1 small{font-size:20pt;color:#e9e3c8}
.cover .sub{font-family:SE;font-size:12pt;margin:8px 0}
.cover .stamp{display:inline-block;border:3px solid #e0877d;color:#e0877d;font-family:SS;font-weight:700;font-size:14pt;padding:2px 10px;transform:rotate(-3deg);margin:4px 0 0}
.cover .note{position:absolute;bottom:12mm;left:14mm;right:14mm;font-size:9pt;background:rgba(20,22,10,.75);padding:6px;margin:0}
.toc li{font-size:13pt;margin:4px 0}.toc span{color:#6f6a58;font-size:10pt}
.rimg{width:100%;max-height:118mm;object-fit:contain;border:1px solid #8b8a4e;display:block}
.mkey{columns:3;column-gap:10px;font-family:Helvetica,Arial,sans-serif;font-size:7.6pt;line-height:1.25;margin:5px 0 0;color:#1c1a15}.mkey span{display:block;break-inside:avoid;margin:0 0 2px}.mkey b{display:inline-block;min-width:14px;height:14px;border-radius:7px;background:#3a4118;color:#fff;text-align:center;font-size:7pt;line-height:14px;margin-right:4px;padding:0 1px}.mkey .offm{color:#6f6a58}
.cap{font-size:8.5pt;color:#6f6a58;margin:2px 0 8px}
.lede{font-style:italic}
.leg{font-size:9pt}
.stop{break-inside:avoid;border-top:1px dashed #b9b39c;padding:8px 0 4px}
.sh{display:flex;gap:8px;align-items:flex-start}.no{flex:0 0 26px;height:26px;border:2px solid #3a4118;border-radius:50%;text-align:center;font-family:SS;font-weight:700;font-size:12pt;line-height:24px}
.sh b{font-size:12pt;font-family:Helvetica,Arial,sans-serif}
.meta{font-size:8.5pt;color:#6f6a58;font-family:Helvetica,Arial,sans-serif}
.c{font-weight:bold;padding:0 5px;border-radius:6px;color:#fff;font-family:Helvetica,Arial,sans-serif;font-size:8pt}.c-HIGH{background:#2e7d32}.c-MEDIUM{background:#f2c200;color:#1c1a15}.c-LOW{background:#c62828}
.stop p{margin:4px 0}.look,.plan{font-size:9.5pt}.gps{font-family:monospace;font-size:8.5pt;color:#6f6a58}
.src{font-size:8pt;color:#6f6a58}.src a{color:#6f6a58}
.night{break-inside:avoid;border:2px solid #3a4118;background:#efeadb;padding:6px 8px;margin:10px 0;font-size:9.5pt}
.tl{font-size:9.5pt;margin:0 0 5px}.stat{font-size:8.5pt;color:#6f6a58}
.man{break-inside:avoid;border-top:1px dashed #b9b39c;padding:6px 0 2px}.life{color:#6f6a58;font-size:8.5pt}.deco{font-size:9pt;margin:0 0 4px}
.notes{font-size:9.5pt}.notes dt{font-weight:bold}.notes dd{margin:0 0 4px 12px}'''
    doc = '<!doctype html><html><head><meta charset="utf-8"><style>' + css + '</style></head><body>' + ''.join(P) + '</body></html>'
    open(BUILD + key + '.html', 'w').write(doc)
    return G

async def main(keys):
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        for k in keys:
            G = build(k)
            await pg.goto(f'http://localhost:8820/pdfbuild/{k}.html'); await pg.wait_for_timeout(1500)
            await pg.pdf(path=f'/home/claude/ie/pdf/out/{G["out"]}', format='A4', print_background=True, display_header_footer=True,
                         header_template='<span></span>',
                         footer_template=f'<div style="font-size:8px;width:100%;text-align:center;color:#6f6a58">{G["foot"]} · DZ Charlie field guide · <span class="pageNumber"></span></div>',
                         margin={'top': '16mm', 'bottom': '16mm', 'left': '15mm', 'right': '15mm'})
            print(k, 'done')
        await b.close()
os.makedirs('/home/claude/ie/pdf/out', exist_ok=True)
asyncio.run(main(sys.argv[1:] or list(GUIDES)))
