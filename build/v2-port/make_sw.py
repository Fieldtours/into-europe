# sw.js for Into Europe v2: new caches (ie-core2 / ie-data2 / ie-seen2) so old v1 map pictures are dropped.
import sys
s = open('/home/claude/ie/orig/sw.js').read()
def rep(a, b):
    global s; assert s.count(a) >= 1, a; s = s.replace(a, b)
rep('const CORE="ie-core", DATA="ie-data", VERSION="v1";', 'const CORE="ie-core2", DATA="ie-data2", VERSION="v2";')
rep('k!=="ie-seen"', 'k!=="ie-seen2"')
rep('"ie-seen":CORE', '"ie-seen2":CORE')
open(sys.argv[1], 'w').write(s); print('sw ok')
