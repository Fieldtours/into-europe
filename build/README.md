# Into Europe v2 (30 Sep 2026): brought up to the DZ Charlie standard

v1 (app/v1, as live 24 Sep 2026) + the Easy Company upgrades, ported statement by statement:

- `v2-port/stm.js` lists every top-level script statement (acorn); `common.py` compares Easy Company before (n3) and
  after (n9) the upgrades with Into Europe v1: unchanged in Into Europe -> take the new Easy Company code; changed in both ->
  3-way patch (`fuzzpatch.py`) or a hand edit in `assemble.py`; new -> inserted (area planner, build my own route,
  trip diary engine, ease-of-use tour switch, rasPick map picker, tap-the-label explanations, visiting info).
- Layout/styles: `mask.py` patches the page with the scripts masked out; home tiles, hero buttons, diary button by hand.
- Data made for Italy: `Research/ap_areas.json` (9 areas by tour day), `Research/aar-*.json` (War Diary page per stop),
  `Research/visit-*.json` (verified visiting info, checked Sep 2026), `Research/gps-check.json` (independent GPS check, 21 fixes).
- Maps (`maps/`): Geofabrik Italy region files -> overview (600 px/deg) + 15 middle areas (1,400) + 37 close-ups (4,550),
  Google style, drawn with the gmap renderer (render.html + shoot.js); `gather_raster.py` makes the list for the page.
- PDF (`pdf/`): house layout (as Easy Company / Spanish Civil War): extract_ie.js then make_pdf_ie.py.
- `release.sh` builds the finished folder; tests: ui*.js, maptest.js, gpsverify.js, coords.js (Playwright).
