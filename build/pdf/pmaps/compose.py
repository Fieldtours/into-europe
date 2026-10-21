# Print-quality PDF maps, step 3: road map + route/numbers layer -> one sharp JPEG per map (pdf/maps_print/)
import json, os, sys
from PIL import Image
O = '/home/claude/ie/pdf/pmaps'; OUT = '/home/claude/ie/pdf/maps_print'; os.makedirs(OUT, exist_ok=True)
P = json.load(open(f'{O}/proj.json'))
for k in sys.argv[1:] or P:
    b = f'{O}/base-{k}.png'
    if not os.path.exists(b): print('missing', k); continue
    base = Image.open(b).convert('RGBA'); ov = Image.open(f'{O}/ov-{k}.png').convert('RGBA')
    if base.size != ov.size: base = base.resize(ov.size, Image.LANCZOS)
    Image.alpha_composite(base, ov).convert('RGB').save(f'{OUT}/italy-{k}.jpg', quality=88, optimize=True, progressive=True)
print('done')
