// list top-level statements of every inline script in an html file: key, start, end (absolute offsets)
const fs=require('fs'),acorn=require('../node_modules/acorn');
const f=process.argv[2],s=fs.readFileSync(f,'utf8');const out=[];
const re=/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g;let m,bi=0;
while(m=re.exec(s)){const off=m.index+m[0].indexOf('>')+1,code=m[1];let ast;
 try{ast=acorn.parse(code,{ecmaVersion:'latest',sourceType:'script',allowReturnOutsideFunction:true})}catch(e){out.push({key:'PARSEFAIL'+bi,err:e.message,a:off,b:off+code.length,blk:bi});bi++;continue}
 const seen={};const cp=new Int32Array(code.length+1);{let c=0;for(let i=0;i<code.length;i++){cp[i]=c;const h=code.charCodeAt(i);if(!(h>=0xDC00&&h<=0xDFFF))c++}cp[code.length]=c}
 const offc=Array.from(s.slice(0,off)).length;
 for(const n of ast.body){let k;
  if(n.type==='FunctionDeclaration')k='fn:'+n.id.name;
  else if(n.type==='VariableDeclaration')k='var:'+n.declarations.map(d=>d.id.name||'?').join(',');
  else if(n.type==='ClassDeclaration')k='cls:'+n.id.name;
  else k='x:'+code.slice(n.start,n.end).replace(/\s+/g,' ').slice(0,70);
  seen[k]=(seen[k]||0)+1;if(seen[k]>1)k+='#'+seen[k];
  out.push({key:k,a:offc+cp[n.start],b:offc+cp[n.end],blk:bi});}
 bi++}
fs.writeFileSync(process.argv[3],JSON.stringify(out));console.log(f,out.length,out.filter(o=>o.err).map(o=>o.err));
