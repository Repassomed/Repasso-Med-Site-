/* Adaptador de TESTE para a auditoria da caneta (PR de auditoria; não é código de produção).
   Serve: (1) a página de teste + assets reais do site; (2) um Auth mínimo (HS256) e (3) uma camada REST
   compatível com o subconjunto do PostgREST que o supabase-js usa — sobre um Postgres REAL, isolado.

   O que é REAL:   Postgres 16, a migration real (tabelas, constraints, índices, POLICIES de RLS), o papel
                   `authenticated` com SET LOCAL ROLE + request.jwt.claims (mesmo mecanismo do PostgREST),
                   o supabase-js real e o rm-tools-v2.js real no navegador.
   O que é EMULADO (declarado): o servidor PostgREST em si (este arquivo), o GoTrue, o teto `max_rows`
                   (RM_MAX_ROWS, padrão 1000 = padrão do Supabase) e o gateway. Nada disto comprova o
                   comportamento do Supabase em produção; comprova a lógica do cliente e as regras do banco.

   Variáveis:  PGURL (padrão postgres://authenticator@127.0.0.1:54329/inktest), PGADMIN (postgres://postgres@…),
               RM_SUPABASE_UMD, RM_SITE_DIR (pasta do site), RM_MATERIAS_DIR, RM_MAX_ROWS, PORT, PG_MODULE. */
const http=require('http'), fs=require('fs'), path=require('path'), crypto=require('crypto');
const {Pool}=require(process.env.PG_MODULE||'pg');
const SITE=process.env.RM_SITE_DIR||path.resolve(__dirname,'../../../Repasso-Med-Site--main/Atual - Copia');
const MAT=process.env.RM_MATERIAS_DIR||path.join(SITE,'netlify/functions/materias-privadas');
const UMD=process.env.RM_SUPABASE_UMD;
const SECRET='segredo-de-teste-nao-e-de-producao';
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2'};
const TABLES=new Set(['user_ink_strokes','user_highlights','user_notes','study_tools_beta','profiles']);
const b64u=o=>Buffer.from(typeof o==='string'?o:JSON.stringify(o)).toString('base64url');
function sign(p){const h=b64u({alg:'HS256',typ:'JWT'}),b=b64u(p);return h+'.'+b+'.'+crypto.createHmac('sha256',SECRET).update(h+'.'+b).digest('base64url');}
function verify(tok){ try{const [h,b,s]=tok.split('.'); const ok=crypto.createHmac('sha256',SECRET).update(h+'.'+b).digest('base64url')===s; if(!ok) return null; const p=JSON.parse(Buffer.from(b,'base64url')); return (p.exp&&p.exp<Date.now()/1000)?null:p;}catch(e){return null;} }

function create({port=0}={}){
  const pool=new Pool({connectionString:process.env.PGURL||'postgres://authenticator@127.0.0.1:54329/inktest',max:40});
  const admin=new Pool({connectionString:process.env.PGADMIN||'postgres://postgres@127.0.0.1:54329/inktest',max:10});
  const S={users:new Map(),sessions:new Map(),refresh:new Map(),log:[],chaos:[],maxRows:+(process.env.RM_MAX_ROWS||1000),bytesOut:0,bytesIn:0};
  const pub=u=>({id:u.id,aud:'authenticated',role:'authenticated',email:u.email,app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'});
  function issue(u,sid){const now=Math.floor(Date.now()/1000),exp=now+3600,ssid=sid||crypto.randomUUID();const at=sign({sub:u.id,role:'authenticated',aud:'authenticated',email:u.email,exp,iat:now,session_id:ssid});const rt='rt-'+crypto.randomUUID();S.sessions.set(at,{uid:u.id,alive:true,sid:ssid});S.refresh.set(rt,{uid:u.id,alive:true,sid:ssid});return {access_token:at,token_type:'bearer',expires_in:3600,expires_at:exp,refresh_token:rt,user:pub(u)};}
  async function addUser(email,password,{beta=true,id:fixed}={}){const id=fixed||crypto.randomUUID();await admin.query('insert into public.profiles(id,email) values($1,$2) on conflict (id) do update set email=excluded.email',[id,email]);if(beta) await admin.query('insert into public.study_tools_beta(user_id) values($1) on conflict do nothing',[id]);const u={id,email,password};S.users.set(email,u);return u;}

  /* ---------- caos: regras por método+tabela; consumidas em ordem ---------- */
  function chaosFor(method,table){ for(const c of S.chaos){ if(c.method&&c.method!==method) continue; if(c.table&&c.table!==table) continue; if(c.remaining===0) continue; if(c.remaining>0) c.remaining--; c.hits=(c.hits||0)+1; return c; } return null; }

  /* ---------- filtros PostgREST (subconjunto) ---------- */
  const ident=s=>{ if(!/^[a-z_][a-z0-9_]*$/.test(s)) throw Object.assign(new Error('identificador inválido'),{http:400}); return '"'+s+'"'; };
  function where(url,params){ const w=[]; for(const [k,v] of url.searchParams){ if(['select','order','limit','offset','on_conflict','columns'].includes(k)) continue; const m=/^(eq|neq|in|gt|gte|lt|lte|is)\.(.*)$/.exec(v); if(!m) continue; const col=ident(k); if(m[1]==='in'){ const vals=m[2].replace(/^\(|\)$/g,'').split(',').map(x=>x.replace(/^"|"$/g,'')); params.push(vals); w.push(col+'::text = any($'+params.length+'::text[])'); } else if(m[1]==='is'){ w.push(col+(m[2]==='null'?' is null':' is not null')); } else { params.push(m[2]); const op={eq:'=',neq:'<>',gt:'>',gte:'>=',lt:'<',lte:'<='}[m[1]]; w.push(col+'::text '+op+' $'+params.length); } } return w.length?' where '+w.join(' and '):''; }
  const sel=url=>{ const s=url.searchParams.get('select')||'*'; return s==='*'?'*':s.split(',').map(c=>ident(c.trim())).join(','); };

  async function rest(req,res,url,body){
    const table=url.pathname.replace('/rest/v1/','').split('/')[0]; const method=req.method;
    if(!TABLES.has(table)){ return send(res,200,method==='GET'?[]:null,{}); }
    const auth=(req.headers['authorization']||'').replace(/^Bearer /,''); const claims=verify(auth);
    const role=claims&&claims.role==='authenticated'?'authenticated':'anon';
    const t0=Date.now(); const entry={t:t0,method,table,q:url.search.slice(0,120),inB:body?body.length:0,role};
    const ch=chaosFor(method,table); entry.chaos=ch?ch.name||ch.mode:undefined; S.log.push(entry);
    if(ch&&ch.delayMs) await new Promise(r=>setTimeout(r,ch.delayMs));
    if(ch&&ch.mode==='drop-before'){ entry.outcome='drop-before'; req.socket.destroy(); return; }
    if(ch&&ch.mode==='status'){ entry.outcome='status '+ch.status; entry.status=ch.status; return send(res,ch.status,{message:'falha provocada pelo teste',code:'TEST'}); }
    const client=await pool.connect();
    try{
      await client.query('begin'); await client.query('set local role '+role);
      await client.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims||{role:'anon'})]);
      let out, status=200, hdr={}; const params=[];
      if(method==='GET'){
        const w=where(url,params); let order=''; const o=url.searchParams.get('order'); if(o) order=' order by '+o.split(',').map(p=>{const [c,d]=p.split('.');return ident(c)+(d==='desc'?' desc':' asc');}).join(',');
        let off=+(url.searchParams.get('offset')||0), lim=url.searchParams.has('limit')?+url.searchParams.get('limit'):Infinity;
        const rg=/^(\d+)-(\d*)$/.exec(req.headers['range']||''); if(rg){ off=+rg[1]; if(rg[2]!=='') lim=Math.min(lim,+rg[2]-off+1); }
        const eff=Math.min(lim,S.maxRows); // teto max_rows emulado
        const r=await client.query('select '+sel(url)+' from public.'+ident(table)+w+order+' limit '+eff+' offset '+off,params);
        out=r.rows; entry.outB=Buffer.byteLength(JSON.stringify(r.rows)); const wantCount=/count=exact/.test(req.headers['prefer']||''); let total='*'; if(wantCount){ total=(await client.query('select count(*)::int c from public.'+ident(table)+w,params)).rows[0].c; }
        hdr['content-range']=(r.rows.length?off+'-'+(off+r.rows.length-1):'*')+'/'+total;
        if(wantCount&&r.rows.length<total) status=206;
        entry.rows=r.rows.length;
      }else if(method==='POST'){
        const rows=JSON.parse(body||'{}'); const arr=Array.isArray(rows)?rows:[rows]; const cols=Object.keys(arr[0]||{}); const vals=[]; const tup=arr.map(r=>'('+cols.map(c=>{vals.push(typeof r[c]==='object'&&r[c]!==null?JSON.stringify(r[c]):r[c]); return '$'+vals.length;}).join(',')+')').join(',');
        const r=await client.query('insert into public.'+ident(table)+' ('+cols.map(ident).join(',')+') values '+tup+' returning '+sel(url),vals); out=r.rows; status=201; entry.rows=r.rows.length;
      }else if(method==='DELETE'){
        const w=where(url,params); const r=await client.query('delete from public.'+ident(table)+w+' returning '+sel(url),params); out=r.rows; status=/return=representation/.test(req.headers['prefer']||'')?200:204; entry.rows=r.rows.length;
      }else return send(res,405,{message:'método'});
      if(ch&&ch.mode==='commit-then-status'){ await client.query('commit'); entry.outcome='committed,status '+ch.status; entry.status=ch.status; return send(res,ch.status,{message:'falha depois do commit (provocada)',code:'TEST'}); }
      if(ch&&ch.mode==='drop-after-commit'){ /* commit real e depois derruba a resposta */ await client.query('commit'); entry.outcome='committed,dropped'; req.socket.destroy(); return; }
      await client.query('commit');
      const single=/vnd\.pgrst\.object/.test(req.headers['accept']||'');
      if(single){ if(out.length!==1){ entry.status=406; return send(res,406,{code:'PGRST116',message:'JSON object requested, multiple (or no) rows returned',details:'The result contains '+out.length+' rows'}); } out=out[0]; }
      entry.status=status; entry.outcome='ok';
      if(status===204||(method==='POST'&&/return=minimal/.test(req.headers['prefer']||''))) { res.writeHead(status===201?201:204,hdr); return res.end(); }
      return send(res,status,out,hdr);
    }catch(e){
      try{ await client.query('rollback'); }catch(_){}
      const code=e.code||''; const st=code==='42501'?403:(code&&code.startsWith('23'))?(code==='23505'?409:400):(e.http||500);
      entry.status=st; entry.outcome='erro '+code+' '+String(e.message).slice(0,70); return send(res,st,{code,message:e.message,details:e.detail||null,hint:null});
    }finally{ client.release(); entry.ms=Date.now()-t0; }
  }
  function send(res,status,obj,hdr={}){ const b=obj===undefined||obj===null?'':JSON.stringify(obj); S.bytesOut+=Buffer.byteLength(b); res.writeHead(status,{'content-type':'application/json','access-control-allow-origin':'*',...hdr}); res.end(b); }

  async function auth(req,res,url,body){
    const ep=url.pathname.replace('/auth/v1/',''); const j=body?JSON.parse(body):{};
    if(ep==='token'){ const g=url.searchParams.get('grant_type');
      if(g==='password'){ const u=S.users.get(String(j.email).toLowerCase()); if(!u||u.password!==j.password) return send(res,400,{code:400,error_code:'invalid_credentials',msg:'Invalid login credentials'}); return send(res,200,issue(u)); }
      if(g==='refresh_token'){ const r=S.refresh.get(j.refresh_token); if(!r||!r.alive) return send(res,400,{error_code:'refresh_token_not_found',msg:'Invalid Refresh Token'}); return send(res,200,issue([...S.users.values()].find(x=>x.id===r.uid),r.sid)); } }
    if(ep==='user'){ const s=S.sessions.get((req.headers['authorization']||'').replace(/^Bearer /,'')); if(!s||!s.alive) return send(res,401,{code:401,error_code:'bad_jwt',msg:'invalid JWT'}); return send(res,200,pub([...S.users.values()].find(x=>x.id===s.uid))); }
    if(ep==='logout'){ const s=S.sessions.get((req.headers['authorization']||'').replace(/^Bearer /,'')); if(s){ s.alive=false; for(const r of S.refresh.values()) if(r.sid===s.sid) r.alive=false; } res.writeHead(204,{'access-control-allow-origin':'*'}); return res.end(); }
    return send(res,200,{});
  }

  const server=http.createServer((req,res)=>{
    const chunks=[]; req.on('data',c=>chunks.push(c)); req.on('end',async()=>{
      const body=Buffer.concat(chunks).toString(); S.bytesIn+=body.length; const url=new URL(req.url,'http://x');
      try{
        if(req.method==='OPTIONS'){ res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}); return res.end(); }
        if(url.pathname.startsWith('/__test/')) return await testApi(req,res,url,body);
        if(url.pathname.startsWith('/rest/v1/')) return await rest(req,res,url,body);
        if(url.pathname.startsWith('/auth/v1/')) return await auth(req,res,url,body);
        if(url.pathname.startsWith('/rpc')||url.pathname.startsWith('/functions')||url.pathname.startsWith('/.netlify')) return send(res,200,{});
        // estáticos
        let p=decodeURIComponent(url.pathname);
        if(p==='/ink.html') return file(res,path.join(__dirname,'page/ink.html'));
        if(p==='/supabase.js') return file(res,UMD);
        if(p.startsWith('/m/')) return file(res,path.join(MAT,p.slice(3)));
        return file(res,path.join(SITE,p));
      }catch(e){ try{ send(res,500,{message:String(e.message)}); }catch(_){} }
    });
  });
  function file(res,f){ if(!f||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('nf');} res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream','cache-control':'no-store'}); fs.createReadStream(f).pipe(res); }

  /* API de controle do teste (NÃO existe em produção) */
  async function testApi(req,res,url,body){
    const ep=url.pathname.replace('/__test/',''); const j=body?JSON.parse(body):{};
    const ok=(o)=>send(res,200,o||{ok:true});
    if(ep==='user'){ const u=await addUser(j.email,j.password,{beta:j.beta!==false,id:j.id}); return ok({id:u.id}); }
    if(ep==='chaos'){ S.chaos=(j.rules||[]).map(r=>({remaining:-1,...r})); return ok(); }
    if(ep==='log'){ return ok({log:S.log,bytesOut:S.bytesOut,bytesIn:S.bytesIn}); }
    if(ep==='log/clear'){ S.log=[]; S.bytesOut=0; S.bytesIn=0; return ok(); }
    if(ep==='maxrows'){ S.maxRows=j.n; return ok(); }
    if(ep==='sql'){ const r=await admin.query(j.sql,j.params||[]); return ok({rows:r.rows}); }     // verificação/seed como superuser (NÃO é prova de RLS)
    if(ep==='kill-sessions'){ for(const s of S.sessions.values()) s.alive=false; for(const r of S.refresh.values()) r.alive=false; return ok(); }
    send(res,404,{message:'?'});
  }
  return new Promise(ok=>server.listen(port,'127.0.0.1',()=>ok({S,server,url:'http://127.0.0.1:'+server.address().port,admin,pool,close:async()=>{server.closeAllConnections&&server.closeAllConnections();server.close();await pool.end();await admin.end();}})));
}
module.exports={create,verify,sign};
if(require.main===module){ create({port:+(process.env.PORT||8150)}).then(x=>console.log('adaptador em',x.url)); }
