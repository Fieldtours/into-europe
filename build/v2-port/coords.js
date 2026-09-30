const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const res={};
for(const [n,u] of [['orig','file:///home/claude/ie/orig/index.html'],['new','http://localhost:8820/index.html']]){const p=await b.newPage();await p.goto(u);await p.waitForTimeout(1200);
res[n]=await p.evaluate(()=>{ensureDdayPool();const o={};POOL.forEach(x=>o[x.id]=[x.lat,x.lon]);MUS.forEach((x,i)=>o['m'+i]=[x[2],x[3]]);DSITES.forEach((x,i)=>o['dd'+i]=[x[2],x[3]]);TL.forEach(t=>o['tl'+t[0]]=[t[4],t[5]]);BASES.forEach((x,i)=>o['b'+i]=[x.lat,x.lon]);return o})}
const fx=new Set(JSON.parse(require('fs').readFileSync('/home/claude/ie/build/gps.json')).map(f=>f.key));
let bad=0;for(const k in res.orig){if(fx.has(k))continue;if(JSON.stringify(res.orig[k])!==JSON.stringify(res.new[k])){bad++;console.log('CHANGED',k,res.orig[k],res.new[k])}}
console.log('keys',Object.keys(res.orig).length,'unexpected changes',bad);await b.close()})();
