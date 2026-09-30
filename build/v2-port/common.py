import json,sys
sys.path.insert(0,'../port')
S={k:open(f).read() for k,f in [('n3','/home/claude/ie/ec/n3-ease.html'),('n9','/home/claude/ie/ec/n9-now.html'),('ie','/home/claude/ie/orig/index.html')]}
L={k:json.load(open('/home/claude/ie/fx/'+k+'.json')) for k in S}
D={k:{o['key']:S[k][o['a']:o['b']] for o in L[k]} for k in S}
P={k:{o['key']:(o['a'],o['b']) for o in L[k]} for k in S}
