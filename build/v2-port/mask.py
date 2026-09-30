import re,sys
sys.path.insert(0,'../port')
from fuzzpatch import patch
R=re.compile(r'(<script(?![^>]*src)[^>]*>)(.*?)(</script>)',re.S)
def mask(s):
    parts=[]
    def f(m): parts.append(m.group(2)); return m.group(1)+'\x00'+m.group(3)
    return R.sub(f,s),parts
n3,_=mask(open('../ec/n3-ease.html').read())
n9,_=mask(open('../ec/n9-now.html').read())
ie,iep=mask(open('../orig/index.html').read())
out,n,fail=patch(n3,n9,ie)
print('applied',n,'fail',len(fail),'scripts ie',len(iep),'out',out.count('\x00'))
open('html_patched.html','w').write(out)
import json;json.dump(fail,open('html_fail.json','w'),ensure_ascii=False,indent=0)
for i,x in enumerate(fail): print(i,len(x['old']),len(x['new']),repr(x['old'][:60]),'=>',repr(x['new'][:80]))
