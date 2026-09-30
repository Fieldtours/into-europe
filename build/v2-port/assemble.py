# Build Into Europe v2 = Into Europe v1 + the Easy Company upgrades (area planner, build my own route,
# trip diary, ease-of-use layout, Google-style multi-level maps, visiting info + report a problem).
# Data that is made separately lives in /home/claude/ie/build/*.json and is filled in here.
import json, re, sys, os
sys.path.insert(0, '/home/claude/ie/port')
from fuzzpatch import patch
from common import S, L, D, P
B = '/home/claude/ie/build'
def J(n, d=None):
    p = f'{B}/{n}'
    return json.load(open(p)) if os.path.exists(p) else d

def rep(s, old, new, n=1, what=''):
    c = s.count(old)
    if c != n: raise SystemExit(f'REPLACE FAILED ({what}): found {c}x, wanted {n}x: {old[:120]!r}')
    return s.replace(old, new)

# ---------- 1. page layout + styles (scripts masked) ----------
R = re.compile(r'(<script(?![^>]*src)[^>]*>)(.*?)(</script>)', re.S)
html = open('/home/claude/ie/fx/html_patched.html').read()
ie_scripts = [m.group(2) for m in R.finditer(S['ie'])]
st9 = {m.group(1): m.group(2) for m in re.finditer(r'<style([^>]*)>(.*?)</style>', S['n9'], re.S)}
i = html.find('<style id="opt5-style">'); j = html.find('</style>', i)
html = html[:i] + '<style id="opt5-style">' + st9[' id="opt5-style"'] + html[j:]

# header: trip diary button
_t = re.search(r'<b id="rdtitle">[^<]*</b></div>', html).group(0)
html = rep(html, _t, _t + '<button type="button" class="hbtn aar-hbtn" data-aar="open" aria-label="War Diary — your trip journal: save or share each day of your route" title="War Diary — your trip journal"><svg class="aar-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 3.5h10.5a1.5 1.5 0 0 1 1.5 1.5v15a1 1 0 0 1-1 1H5z"/><path d="M5 3.5v17.5"/><path d="M8.5 8h5M8.5 11.5h5M8.5 15h3"/><path d="M20.5 7.5l-3.5 9-1.2 2.6.3-2.9 3.5-9z"/></svg><span class="hl">Diary</span></button>', what='diary button')

# hero: quick actions, shorter lede, old buttons out
QA = '<div class="qa"><button type="button" class="cta wide" id="qa-plan" data-go="tab-tour">▶ Plan my tour</button><button type="button" class="cta alt" id="qa-loc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/><circle cx="12" cy="12" r="7"/></svg>Where am I?</button><button type="button" class="cta alt" data-go="tab-brief">Read the briefing</button></div>'
html = rep(html, '<div class="hero-stamp">10 Jul 1943 – 2 May 1945</div>\n', '<div class="hero-stamp">10 Jul 1943 – 2 May 1945</div>\n        ' + QA + '\n', what='qa')
html = re.sub(r'<p class="hero-lede">.*?</p>', '<p class="hero-lede">Follow the Allied armies for twenty-two months, from the Sicilian beaches of July 1943 to the German surrender of 2 May 1945 — landing beaches, mountain battlefields, liberated cities, cemeteries and museums, every position rated for how sure we are and every stop linked to your maps.</p>', html, count=1, flags=re.S)
html = re.sub(r'\s*<div class="hero-cta">.*?</div>\n', '\n', html, count=1, flags=re.S)

# home tiles: five main ones + "More to explore"
def tile(k, go, b, sp, em, extra=''):
    return f'<button type="button" class="tile" data-go="{go}"{extra}><span class="k">{k}</span><b>{b}</b><span>{sp}</span><em>{em}</em></button>'
main = ''.join([
  tile('01', 'tab-tour', 'Tour planner', 'A ready-made route, only the area you choose, or your own list of sites — with the driving order, the overnights and the map links.', 'Ready-made · by area · your own · 1 – 21 days'),
  tile('02', 'tab-brief', 'Briefing', 'The story in brief, the accuracy rule, where the sources disagree, and how the buttons work.', 'Start here'),
  tile('03', 'tab-time', 'Timeline', '48 dated positions, from the Sicily landings to the German surrender, in seven phases.', '10 Jul 1943 – 2 May 1945'),
  tile('04', 'tab-dday', 'The campaign', 'Why Italy was so hard to fight through, two clocks side by side, and the key sites of the whole peninsula.', 'Factors · clocks · key sites'),
  tile('05', 'tab-dday', 'Battle maps', '8 battles step by step: where the armies stood and how they moved, drawn over the real map.', 'Sicily to the Po', ' data-scroll="battles"')])
more = ''.join([
  tile('06', 'tab-mus', 'Museums', 'The museums and memorials worth your time, south to north.', '22 museums · opening notes'),
  tile('07', 'tab-men', 'Key figures', 'Generals, soldiers and partisans who shaped the campaign — Allied, German and Italian.', '22 short biographies'),
  tile('08', 'tab-armies', 'The armies', 'Who fought in Italy: soldiers from five continents on the Allied side, and the German and Italian forces.', 'Nation by nation'),
  tile('09', 'tab-orig', 'Origins', 'Why the Allies went into Italy, how Italy left the war, and how the armies were organised.', 'Before the story'),
  tile('10', 'tab-weap', 'Weapons &amp; equipment', 'The rifles, machine guns, tanks, guns and landing craft of the campaign, with drawings.', '20 items explained')])
i = html.find('<div class="tiles">'); j = html.find('<div class="pdfdl pdfbtn" id="pdfdl-home">')
html = html[:i] + f'<div class="tiles">{main}</div>\n      <details class="uxmore"><summary class="tile"><span class="k">+</span><b>More to explore</b><span>Museums, Key figures, The armies, Origins and Weapons.</span></summary><div class="tiles">{more}</div></details>\n\n      ' + html[j:]
# the PDF box had a stray </details>
html = rep(html, '</small></a></details><p class="pn">', '</small></a><p class="pn">', what='pdf details')
# before you visit: short
i = html.find('<div class="memo" style="margin-top:14px"><div class="head">Before you visit</div>'); j = html.find('<div class="homefoot">', i)
html = html[:i] + '<div class="memo" style="margin-top:14px"><div class="head">Before you visit</div>\n        <p style="font-size:13.5px;margin:0"><b>Accuracy.</b> A pin marked <span class="pill c-low">LOW</span> is the centre of a search area, not a foxhole. <b>Respect.</b> The war cemeteries and memorials are places of remembrance first; many battlefields are farms and private land — view from the road. <b>Safety.</b> Mountain roads are slow and narrow: allow extra time, and never pick up old ammunition.</p></div>\n      ' + html[j:]
# credits: the new maps are OpenStreetMap
PDFINFO = J('pdfinfo.json')
if PDFINFO: html = re.sub(r'(<a class="pdl main" href="pdf/Into-Europe-Italy-1943-1945.pdf" download data-pdf><b>[^<]*</b><small>)[^<]*', r'\g<1>' + PDFINFO['label'], html)

# ---------- 2. main script ----------
lst = [o for o in L['ie'] if o['blk'] == 2]
base = S['ie']; blk_a = min(o['a'] for o in lst); blk_b = max(o['b'] for o in lst)
# find the script-block text boundaries in code-point offsets
scr_i = [m for m in R.finditer(S['ie'])][2]
assert scr_i.start(2) <= blk_a and blk_b <= scr_i.end(2)
edits = {}   # key -> new text
def n9(k): return D['n9'][k]
edits['fn:buildPlan'] = n9('fn:buildPlan')
edits['fn:addSharp'] = n9('fn:addSharp')
om = n9('fn:openMap'); edits['fn:openMap'] = om
rt = n9('fn:renderTour')
rt = rep(rt, '.name.split(/ — | \\/ /)[0]}', '.name.split(/ — | \\/ |, /)[0]}', n=2, what='rt split')
rt = rep(rt, 'ds[0].name.split(/ — | \\/ /)[0]:"Free day"', 'ds[0].name.split(/ — | \\/ |, /)[0]:"Free day"', what='rt split2')
rt = rep(rt, 'html+=sitmap(pts,"DAY "+n+" — "+title.toUpperCase());', 'html+=smartmap(pts,"DAY "+n+" — "+title.toUpperCase());', what='rt smartmap')
rt = rep(rt, '"the Easy Company route fits in about "+APP.easyFits+" days; switch to the full route, "', '"the highlights fit in about "+APP.easyFits+" days; switch to the whole campaign, "', what='rt wording')
edits['fn:renderTour'] = rt
ck = [k for k in D['ie'] if k.startswith('x:document.addEventListener("click",e=>{ cons')][0]
out, n, fail = patch(D['n3'][ck], D['n9'][ck], D['ie'][ck]); assert not fail, fail; edits[ck] = out
sm = D['ie']['fn:sitmap']
old_sel = sm[sm.find('  const RES=r=>r.w/(r.b[2]-r.b[0]);let floorRes=0,hasRaster=false;'):sm.find('    g+=`<image href="${r.url}"')]
sm = rep(sm, old_sel, '  const RES=r=>r.w/(r.b[2]-r.b[0]);let hasRaster=false;\n  rasPick(sc*RAS_PR,vw[0],vw[1],vh[0],vh[1]).forEach(r=>{\n    const x=X(r.b[0]),y=Y(r.b[3]),w=X(r.b[2])-x,h=Y(r.b[1])-y;\n', what='sitmap raster')
sm = rep(sm, 'const cap=opts.cap?esc(opts.cap):`Map data: Natural Earth, GeoNames · ${how}', 'const cap=opts.cap?esc(opts.cap):`Map © OpenStreetMap contributors · ${how}', what='sitmap cap')
edits['fn:sitmap'] = sm
pm = D['ie']['fn:panelmap']; pm = rep(pm, 'map data: Natural Earth, GeoNames', 'map © OpenStreetMap contributors', what='panel cap'); edits['fn:panelmap'] = pm
RAS = J('raster.json')
if RAS is not None:
    edits['var:RASTER'] = 'const RASTER=' + json.dumps(RAS, separators=(',', ':')) + ';'
    edits['var:RGROUPS'] = 'const RGROUPS=[];'
# inserts
ins_after = {}
rp = S['n9'][P['n9']['var:RAS_PR'][0]:P['n9']['fn:rasPick'][1]]
ins_after['var:RASTER_URLS'] = '\n/* pick the map pictures drawn for this zoom (Google-style road maps, several zoom levels; Sep 2026) */\n' + rp
chunk = open('/home/claude/ie/fx/chunk_ap.js').read()
# Italy areas for "Choose your area"
AREAS = J('ap_areas.json')
a0 = chunk.find('const AP_AREAS='); a1 = chunk.find('];', a0) + 2
chunk = chunk[:a0] + 'const AP_AREAS=' + json.dumps(AREAS['areas'], ensure_ascii=False) + ';' + chunk[a1:]
chunk = rep(chunk, 'const AP_OVR={};', 'const AP_OVR=' + json.dumps(AREAS['ovr'], ensure_ascii=False) + ';', what='ovr')
chunk = rep(chunk, '["easy","Only Easy Company","Only where E Company fought and moved",p=>isEasy(p)]', '["easy","Highlights only","Only the must-see sites of the campaign",p=>isEasy(p)]', what='focus')
chunk = rep(chunk, 'const AP_COL=["#a3261e","#2f6f8f","#a8741a","#5d7a2a","#6b4c8a","#2f7f7a","#8a4b2a"];', 'const AP_COL=["#a3261e","#2f6f8f","#a8741a","#5d7a2a","#6b4c8a","#2f7f7a","#8a4b2a","#3d5a99","#7a6a1f"];', what='apcol')
chunk = rep(chunk, '["w2","2 weeks",14]];', '["w2","2 weeks",14],["w3","3 weeks",21]];', what='aptimes')
chunk = rep(chunk, 'const AP_KEY="ec-ap-"', 'const AP_KEY="ie-ap-"', what='apkey')
chunk = rep(chunk, 'const UX_KEY="ecn-tourpick"', 'const UX_KEY="ie-tourpick"', what='uxkey')
chunk = rep(chunk, 'const MY_KEY="ecn-myroute"', 'const MY_KEY="ie-myroute"', what='mykey')
chunk = rep(chunk, 'A ready-made route for 1 to 7 days', 'A ready-made route for 1 to 21 days', what='hint')
chunk = rep(chunk, 'n=Math.max(1,Math.min(7,n))', 'n=Math.max(1,Math.min(21,n))', what='my max')
chunk = rep(chunk, '[1,2,3,4,5,6,7].map(d=>`<button type="button" data-myd', '[1,2,3,4,5,6,7,8,9,10,12,14,21].map(d=>`<button type="button" data-myd', what='my chips')
# trip diary settings
a0 = chunk.find('window.AAR_CFG={'); a1 = chunk.find('\n', chunk.find('onChange:', a0))
AAR = J('aar_data.json', {})
CFG = ('window.AAR_CFG={key:"ie-aar",data:' + json.dumps(AAR, ensure_ascii=False) + ',\n'
 ' tourCard:false,docName:"WAR DIARY",docNameShort:"War Diary",plural:"War Diary pages",short:"pages",guide:"Into Europe · Italy 1943–45",place:"ITALY",\n'
 ' foot:"DZ CHARLIE · INTO EUROPE",stamp:"VISITED",done:"COMPLETED",coverTitle:"IN THE FOOTSTEPS OF THE ITALIAN CAMPAIGN",fileBase:"into-europe-italy",\n'
 ' intro:"At the end of each day, write one page of your war diary: the places you saw, put in the order the events happened, one question to fix it in your memory, and a line in your own words. Keep the pages for your journal, or send them to family.",\n'
 ' hint:"The moment you want to remember",\n')
old = chunk[a0:a1]
th = old[old.find(' theme:'):]
chunk = chunk[:a0] + CFG + th + chunk[a1:]
ins_after['fn:renderTour'] = '\n' + chunk

# rebuild the main block: walk IE statements, swap edited ones, add inserts
code = base[scr_i.start(2):scr_i.end(2)]; off = scr_i.start(2)
outp = []; pos = 0
for o in lst:
    a, b = o['a'] - off, o['b'] - off
    outp.append(code[pos:a])
    outp.append(edits.get(o['key'], code[a:b]))
    if o['key'] in ins_after: outp.append(ins_after.pop(o['key']))
    pos = b
outp.append(code[pos:])
assert not ins_after, ins_after.keys()
main = ''.join(outp)
for k in ['fn:buildPlan','fn:addSharp','fn:openMap','fn:renderTour','fn:sitmap','fn:panelmap']: assert k in edits
ie_scripts[2] = main

# block 4 (sticky / search): carry the two small upgrades
k4 = [k for k in D['ie'] if k.startswith('x:(function(){ const $=s=>document.querySelector(s); /* keep')][0]
out, n, fail = patch(D['n3'][k4], D['n9'][k4], D['ie'][k4]); assert not fail, fail
ie_scripts[4] = ie_scripts[4].replace(D['ie'][k4], out)
# block 9 (offline): the map picture list
FILES = J('files.json')
if FILES is not None:
    ie_scripts[9] = re.sub(r'const FILES=\[.*?\];', 'const FILES=' + json.dumps(FILES) + ';', ie_scripts[9], count=1, flags=re.S)

# offline: new caches so the old map pictures are dropped
ie_scripts[9] = ie_scripts[9].replace('const CACHE="ie-data";', 'const CACHE="ie-data2";')
ie_scripts[9] = ie_scripts[9].replace('caches.open("ie-core")', 'caches.open("ie-core2")')
ie_scripts[9] = ie_scripts[9].replace('const key="ie-saved-"+PAGE;', 'const key="ie-saved2-"+PAGE;')

# ---------- 3. put the scripts back, add the new ones at the end ----------
parts = html.split('\x00'); assert len(parts) == len(ie_scripts) + 1
html = parts[0] + ''.join(s + p for s, p in zip(ie_scripts, parts[1:]))
k = [k for k in D['n9'] if k.startswith('x:(function(){ var ROWS')][0]
kq = [k for k in D['n9'] if k.startswith('x:(function(){ var b=document.getElementById("qa-loc")')][0]
tail = '\n<script>\n/* ===== tap HIGH / MEDIUM / LOW for an explanation ===== */\n' + D['n9'][k] + '\n/* Where am I? on the home page */\n' + D['n9'][kq] + '\n</script>\n'
s9 = S['n9']; vi = s9.find('<!-- DZ Charlie: Visiting info'); ve = s9.find('</script>', vi) + 9
vz = s9[vi:ve]
VZ = J('visit.json', {'V': {}, 'K': {}})
a0 = vz.find('var V='); a1 = vz.find(',G="Easy Company: Normandy"')
vz = vz[:a0] + 'var V=' + json.dumps(VZ['V'], ensure_ascii=False, separators=(',', ':')) + ',K=' + json.dumps(VZ['K'], separators=(',', ':')) + ',G="Into Europe: Italy 1943–45"' + vz[a1 + len(',G="Easy Company: Normandy"'):]
vz = rep(vz, 'CK="Sep 2026",KIND="ec"', 'CK="' + VZ.get('checked', 'Oct 2026') + '",KIND="ec"', what='vz ck')
tail += vz + '\n'
html = rep(html, '\n</body></html>', tail + '</body></html>', what='tail')
# app name in the page title / credits
html = html.replace('Map data: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> · <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a> (CC BY 4.0)', 'Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>')

# ---------- 4. GPS corrections (independent check, Sep 2026) ----------
def num(x):
    return [repr(x), repr(x).rstrip('0').rstrip('.')]
done = 0
for fx in J('gps.json', []):
    nm = fx['name']; (la0, lo0), (la1, lo1) = fx['old'], fx['new']
    hit = False
    for q in ('"' + nm + '"', nm):
        st = 0
        while True:
            i = html.find(q, st)
            if i < 0: break
            seg = html[max(0, i-400):i+700]
            for a in num(la0):
                for b in num(lo0):
                    for sep in (',', ', ', ',lon:', ', lon: '):
                        pass
            # replace the first lat and lon literal after (or just before) the name
            import re as _re
            m1 = _re.search(r'(?<![\d.])' + _re.escape(repr(la0)) + r'(?![\d])', seg)
            m2 = _re.search(r'(?<![\d.])' + _re.escape(repr(lo0)) + r'(?![\d])', seg)
            if m1 and m2:
                seg2 = seg[:m1.start()] + repr(la1) + seg[m1.end():]
                m2 = _re.search(r'(?<![\d.])' + _re.escape(repr(lo0)) + r'(?![\d])', seg2)
                seg2 = seg2[:m2.start()] + repr(lo1) + seg2[m2.end():]
                html = html[:max(0, i-400)] + seg2 + html[i+700:]; hit = True; done += 1
            st = i + len(q)
        if hit: break
    if not hit: print('GPS fix not placed:', fx['key'], nm)
print('gps fixes placed', done)

html = html.replace('<a class="rdrow" href="https://www.naturalearthdata.com/about/terms-of-use/"', '<a class="rdrow" href="https://www.openstreetmap.org/copyright"')
html = html.replace('<b>Map data: Natural Earth · GeoNames</b><small>Relief, coastlines, rivers, lakes and roads from Natural Earth (public domain) and GSHHG/WDBII shorelines and rivers (LGPL); place names from GeoNames (CC BY 4.0). Tap to read the Natural Earth terms.</small>', '<b>Map data © OpenStreetMap contributors</b><small>The map imagery is made from OpenStreetMap data, available under the Open Database License, with sea and country outlines from Natural Earth (public domain). Tap to read the licence.</small>')
html = html.replace('drawn from historical maps · map data: Natural Earth, GeoNames ·', 'drawn from historical maps · map © OpenStreetMap contributors ·')
html = html.replace('opacity=".9">Natural Earth · GeoNames</text>', 'opacity=".9">© OpenStreetMap contributors</text>')
out = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/ie/build/index.html'
open(out, 'w').write(html); print('wrote', out, len(html))
