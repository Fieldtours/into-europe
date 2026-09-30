const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',e=>errs.push('ERR '+e.message));
await p.goto('http://localhost:8820/index.html#x');await p.waitForTimeout(1500);
await p.evaluate(()=>{visited["d8-1"]=true;visited["d8-2"]=true;visited["d8-6"]=true;saveV()});
await p.click('.aar-hbtn');await p.waitForTimeout(500);await p.getByText('Write',{exact:true}).first().click();await p.waitForTimeout(900);
await p.screenshot({path:'/home/claude/ie/test/w05.png'});
console.log((await p.evaluate(()=>document.body.innerText)).slice(0,1400));console.log(errs);await b.close()})();
