const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('http://localhost:8820/index.html');await p.waitForTimeout(1500);
const fx=JSON.parse(fs.readFileSync('/home/claude/ie/build/gps.json'));
const r=await p.evaluate(fx=>{ensureDdayPool();const out=[];
 const get=k=>{let m;if(m=k.match(/^m(\d+)$/)){const x=MUS[+m[1]];return [x[2],x[3]]}
  if(m=k.match(/^dd(\d+)$/)){const x=DSITES[+m[1]];return [x[2],x[3]]}
  if(m=k.match(/^tl(\d+)$/)){const x=TL.find(t=>t[0]==+m[1]);return [x[4],x[5]]}
  const x=POOL.find(p=>p.id===k);return x?[x.lat,x.lon]:null};
 fx.forEach(f=>{const g=get(f.key);out.push([f.key,JSON.stringify(g)===JSON.stringify(f.new)?'OK':'BAD '+JSON.stringify(g)])});return out},fx);
console.log(r.map(x=>x.join(' ')).join('\n'));await b.close()})();
