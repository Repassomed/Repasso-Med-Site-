/* Servidor estático mínimo para o QA de Farmacología II (2026-10). Serve o site real (assets/) e duas versões da matéria:
   /m/orig.html (a da base, `git show <RM_BASE_REF>:…`, padrão origin/main) e /m/new.html (a do working tree). Sem rede, sem Supabase. */
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const ROOT=path.resolve(__dirname,'../../../..');
const SITE=path.join(ROOT,'Repasso-Med-Site--main/Atual - Copia');
const REL='Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/farmacologia-ii.html';
const NEW=path.join(ROOT,REL);
let ORIG=process.env.RM_ORIG_HTML;
if(!ORIG){ ORIG=path.join(os.tmpdir(),'farmacologia-ii.orig.html'); fs.writeFileSync(ORIG,cp.execFileSync('git',['show',(process.env.RM_BASE_REF||'origin/main')+':'+REL],{cwd:ROOT,maxBuffer:1<<28})); }
const MAT={orig:ORIG,new:NEW};
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2'};
function start(){return new Promise(ok=>{
 const s=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x'); let p=decodeURIComponent(u.pathname);
  if(p==='/qa.html'){res.writeHead(200,{'content-type':MIME['.html']});return res.end(fs.readFileSync(path.join(__dirname,'qa.html')));}
  const m=/^\/m\/(orig|new)\.html$/.exec(p); if(m){res.writeHead(200,{'content-type':MIME['.html']});return res.end(fs.readFileSync(MAT[m[1]]));}
  const f=path.join(SITE,p); if(!f.startsWith(SITE)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('nf');}
  res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
 }).listen(0,'127.0.0.1',()=>ok({s,base:'http://127.0.0.1:'+s.address().port}));
});}
module.exports={start};
