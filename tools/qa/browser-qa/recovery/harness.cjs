/* Harness da recuperação de senha (PR P0).
   Roda o index.html REAL com o supabase-js REAL (bundle UMD) contra um GoTrue/PostgREST SIMULADO.
   Nada vai à rede: tudo que é supabase.co é atendido aqui; CDNs externas são respondidas vazias.

   Variáveis de ambiente:
     RM_PLAYWRIGHT   módulo do playwright (padrão: 'playwright')
     RM_SUPABASE_UMD caminho do supabase.js UMD (obrigatório). Ex.: npm pack @supabase/supabase-js@2 &&
                     tar xzf *.tgz && export RM_SUPABASE_UMD=$PWD/package/dist/umd/supabase.js
     RM_SITE_DIR     pasta com o index.html (padrão: Repasso-Med-Site--main/Atual - Copia)
     RM_SHOTS        pasta para capturas de tela (opcional)
   O harness NUNCA chama o Supabase real e nunca grava nada em banco algum. */
const path=require('path'), http=require('http');
const {chromium}=require(process.env.RM_PLAYWRIGHT||'playwright');
const fs=require('fs');
const SB='https://ltizbamvskcgigmqobfo.supabase.co';
const UMD=process.env.RM_SUPABASE_UMD;
if(!UMD||!fs.existsSync(UMD)){ console.error('Defina RM_SUPABASE_UMD com o caminho do supabase.js UMD (ver cabeçalho de harness.cjs).'); process.exit(2); }
const SITE=process.env.RM_SITE_DIR||path.resolve(__dirname,'../../../../Repasso-Med-Site--main/Atual - Copia');
const b64=o=>Buffer.from(typeof o==='string'?o:JSON.stringify(o)).toString('base64url');
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2'};
let SERVER=null, BASE='';
function startServer(){
  return new Promise(ok=>{
    SERVER=http.createServer((req,res)=>{
      let p=decodeURIComponent(new URL(req.url,'http://x').pathname); if(p.endsWith('/')) p+='index.html';
      const f=path.join(SITE,p); if(!f.startsWith(SITE)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end('nf'); }
      res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(res);
    }).listen(0,'127.0.0.1',()=>{ BASE='http://127.0.0.1:'+SERVER.address().port; ok(BASE); });
  });
}
function stopServer(){ try{ SERVER&&SERVER.close(); }catch(e){} }

function makeBackend(){
  const S={users:new Map(),byEmail:new Map(),tokens:new Map(),sessions:new Map(),refresh:new Map(),
    calls:[],mails:[],puts:0,logouts:[],recoverStatus:200,seq:0,rest:[],writes:[]};
  S.addUser=(u)=>{const x={id:u.id||('00000000-0000-4000-8000-'+String(++S.seq).padStart(12,'0')),email:u.email,password:u.password,active:u.active!==false,full_name:u.name||'Aluno Teste'};S.users.set(x.id,x);S.byEmail.set(x.email,x);return x;};
  const userJson=u=>({id:u.id,aud:'authenticated',role:'authenticated',email:u.email,app_metadata:{provider:'email'},user_metadata:{full_name:u.full_name},created_at:'2026-01-01T00:00:00Z'});
  S.issue=(u,amr,keepSid)=>{
    const now=Math.floor(Date.now()/1000), exp=now+3600, sid=keepSid||('s'+(++S.seq)+'-'+Math.random().toString(36).slice(2,8));
    const at=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:u.id,aud:'authenticated',role:'authenticated',email:u.email,exp,iat:now,amr:[{method:amr,timestamp:now}],session_id:sid})+'.sig'+S.seq;
    const rt='rt'+(++S.seq)+'x'+Math.random().toString(36).slice(2,8);
    S.sessions.set(at,{uid:u.id,amr,alive:true,sid}); S.refresh.set(rt,{uid:u.id,amr,alive:true,at,sid});
    return {access_token:at,token_type:'bearer',expires_in:3600,expires_at:exp,refresh_token:rt,user:userJson(u)};
  };
  /* e-mail de recuperação entregue (token de uso único) */
  S.lastMail=()=>S.mails[S.mails.length-1];
  /* o que o servidor do Supabase faz quando o usuário clica no link do e-mail */
  S.click=(mail,{siteFallback}={})=>{
    const t=S.tokens.get(mail.token); const redirect=siteFallback||mail.redirect;
    if(!t||t.used||Date.now()>t.exp){ return redirect+'#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'; }
    t.used=true; const u=S.users.get(t.uid); const s=S.issue(u,'recovery');
    return redirect+'#access_token='+s.access_token+'&expires_at='+s.expires_at+'&expires_in=3600&refresh_token='+s.refresh_token+'&token_type=bearer&type=recovery';
  };
  S.expire=(mail)=>{const t=S.tokens.get(mail.token); if(t) t.exp=0;};
  S.bearer=req=>{const h=req.headers()['authorization']||''; const m=/^Bearer (.+)$/.exec(h); return m?m[1]:null;};
  S.handle=async(route)=>{
    const req=route.request(), u=new URL(req.url()), m=req.method(), p=u.pathname;
    const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
    const J=(status,body,extra)=>route.fulfill({status,contentType:'application/json',headers:{...cors,...(extra||{})},body:JSON.stringify(body)});
    if(m==='OPTIONS') return route.fulfill({status:200,headers:cors,body:''});
    let body={}; try{ body=JSON.parse(req.postData()||'{}'); }catch(e){}
    S.calls.push(m+' '+p);
    if(p.startsWith('/auth/v1/')){
      const ep=p.slice('/auth/v1/'.length);
      if(ep==='recover'&&m==='POST'){
        if(S.recoverStatus===429) return J(429,{code:429,error_code:'over_email_send_rate_limit',msg:'email rate limit exceeded'});
        const u2=S.byEmail.get(String(body.email||'').toLowerCase());
        if(u2){ const token='tok'+(++S.seq)+Math.random().toString(36).slice(2,8); S.tokens.set(token,{uid:u2.id,used:false,exp:Date.now()+3600e3}); S.mails.push({to:u2.email,token,redirect:u.searchParams.get('redirect_to')}); }
        return J(200,{});   // resposta idêntica exista ou não o e-mail
      }
      if(ep==='verify'&&m==='POST'){
        const t=S.tokens.get(body.token_hash);
        if(!t||t.used||Date.now()>t.exp||body.type!=='recovery') return J(403,{code:403,error_code:'otp_expired',msg:'Email link is invalid or has expired'});
        t.used=true; return J(200,S.issue(S.users.get(t.uid),'recovery'));
      }
      if(ep==='user'&&m==='GET'){
        const s=S.sessions.get(S.bearer(req)); if(!s||!s.alive) return J(401,{code:401,error_code:'bad_jwt',msg:'invalid JWT'});
        return J(200,userJson(S.users.get(s.uid)));
      }
      if(ep==='user'&&m==='PUT'){
        S.puts++; const s=S.sessions.get(S.bearer(req)); if(!s||!s.alive) return J(401,{code:401,error_code:'bad_jwt',msg:'invalid JWT'});
        const usr=S.users.get(s.uid), pw=body.password;
        if(typeof pw==='string'){
          if(pw.length<(S.minLen||6)) return J(422,{code:422,error_code:'weak_password',msg:'Password should be at least '+(S.minLen||6)+' characters.',weak_password:{reasons:['length']}});
          if(pw===usr.password) return J(422,{code:422,error_code:'same_password',msg:'New password should be different from the old password.'});
          usr.password=pw; S.pwChanged=(S.pwChanged||0)+1;
        }
        return J(200,userJson(usr));
      }
      if(ep==='logout'&&m==='POST'){
        const s=S.sessions.get(S.bearer(req)); S.logouts.push(u.searchParams.get('scope')||'global');
        if(!s) return J(403,{code:403,error_code:'bad_jwt',msg:'bad'});
        const scope=u.searchParams.get('scope')||'global';
        if(scope!=='local'){ for(const [k,v] of S.sessions) if(v.uid===s.uid) v.alive=false; for(const [k,v] of S.refresh) if(v.uid===s.uid) v.alive=false; }
        else s.alive=false;
        return route.fulfill({status:204,headers:cors,body:''});
      }
      if(ep==='token'&&m==='POST'){
        const g=u.searchParams.get('grant_type');
        if(g==='password'){ const usr=S.byEmail.get(String(body.email||'').toLowerCase()); if(!usr||usr.password!==body.password) return J(400,{code:400,error_code:'invalid_credentials',msg:'Invalid login credentials'}); return J(200,S.issue(usr,'password')); }
        if(g==='refresh_token'){ const r=S.refresh.get(body.refresh_token); if(!r||!r.alive) return J(400,{code:400,error_code:'refresh_token_not_found',msg:'Invalid Refresh Token: Refresh Token Not Found'}); return J(200,S.issue(S.users.get(r.uid),r.amr,r.sid)); }   // a session_id se mantém no refresh (como no GoTrue real)
      }
      if(ep==='signup'&&m==='POST'){ S.signups=(S.signups||0)+1; const usr=S.addUser({email:String(body.email).toLowerCase(),password:body.password,active:false}); return J(200,{...userJson(usr),identities:[{}]}); }
      return J(200,{});
    }
    if(p.startsWith('/rest/v1/')){
      const ep=p.slice('/rest/v1/'.length); S.rest.push(m+' '+ep);
      if(m!=='GET'&&m!=='HEAD'){ S.writes.push(m+' '+ep); return J(200,ep.startsWith('rpc/')?null:[]); }
      const s=S.sessions.get(S.bearer(req)); const usr=s&&S.users.get(s.uid);
      const single=(req.headers()['accept']||'').includes('vnd.pgrst.object');
      if(ep.startsWith('profiles')){ const row=usr?{is_active:usr.active,full_name:usr.full_name}:null; return single?(row?J(200,row):J(406,{code:'PGRST116',message:'no rows'})):J(200,row?[row]:[]); }
      if(ep.startsWith('my_active_subjects')) return J(200,usr&&usr.active?[{subject_slug:'semiologia-ii'},{subject_slug:'biologia'}]:[]);
      return J(200,single?{}:[]);
    }
    return J(200,{});
  };
  return S;
}

async function newSession(browser,variant,{viewport={width:1280,height:800},be,ctx}={}){
  if(!BASE) await startServer();
  be=be||makeBackend();
  const context=ctx||await browser.newContext({viewport});
  if(!ctx){
    await context.route(SB+'/**',r=>be.handle(r));
    await context.route(u=>!/127\.0\.0\.1/.test(new URL(u).host)&&!new URL(u).href.startsWith(SB),r=>{
      const u=r.request().url();
      if(/supabase-js/.test(u)) return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(UMD,'utf8')});
      const t=/\.css|fonts\.googleapis/.test(u)?'text/css':/\.js/.test(u)?'application/javascript':'text/plain';
      return r.fulfill({status:200,contentType:t,body:''});
    });
  }
  const page=await context.newPage(); const con=[],errs=[];
  page.on('console',m=>con.push(m.type()+': '+m.text())); page.on('pageerror',e=>errs.push(String(e)));
  return {be,context,page,con,errs,base:BASE+'/',variant};
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
module.exports={chromium,makeBackend,newSession,sleep,stopServer,SB};
