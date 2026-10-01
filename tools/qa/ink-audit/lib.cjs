/* Utilitários comuns da auditoria da caneta. Ver README.md para pré-requisitos. */
const path=require('path'), fs=require('fs');
const {create}=require('./adapter.cjs');
let chromium=null; function pw(){ if(!chromium) chromium=require(process.env.RM_PLAYWRIGHT||'playwright').chromium; return chromium; }
const {Pool}=require(process.env.PG_MODULE||'pg');

const R={n:0,fails:0,items:[]};
const ok=(c,m,extra)=>{ R.n++; if(!c){R.fails++;console.log('  ✗ FALHA:',m);} else console.log('  ✓',m); R.items.push({ok:!!c,m,extra}); return !!c; };
const F={items:[]};
/* ACHADO: comportamento problemático REPRODUZIDO (não conta como falha do teste; vai para o relatório). cond=true → o problema apareceu */
const finding=(cond,m)=>{ F.items.push({reproduzido:!!cond,m}); console.log(cond?'  ⚠ ACHADO (reproduzido):':'  ✓ não reproduzido:',m); return !!cond; };
const info=(m)=>console.log('  ·',m);          // achado/medida que não é asserção
const finish=(nome)=>{ console.log(`\n${nome}: ${R.n-R.fails}/${R.n} verificações OK`+(R.fails?` — ${R.fails} FALHAS`:'')); return R.fails; };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function startStack(){ const st=await create({port:0}); return st; }
let uSeq=0;
async function mkUser(st,tag,{beta=true,id}={}){ const email=`${tag}-${Date.now()}-${++uSeq}@teste.invalid`, password='senha-de-teste-123'; const r=await fetch(st.url+'/__test/user',{method:'POST',body:JSON.stringify({email,password,beta,id})}); const j=await r.json(); return {id:j.id,email,password}; }
async function sql(st,q,params){ const r=await st.admin.query(q,params||[]); return r.rows; }          // SÓ para observar/semear (superuser); nunca como prova de RLS
const countStrokes=async(st,uid,slug='semiologia-ii')=>(await sql(st,'select count(*)::int c from public.user_ink_strokes where user_id=$1 and subject_slug=$2',[uid,slug]))[0].c;
async function chaos(st,rules){ await fetch(st.url+'/__test/chaos',{method:'POST',body:JSON.stringify({rules})}); }
async function logOf(st){ return (await (await fetch(st.url+'/__test/log')).json()); }
async function logClear(st){ await fetch(st.url+'/__test/log/clear',{method:'POST',body:'{}'}); }

/* uma "sessão de navegador" = um contexto isolado (storage próprio) + login real no adaptador */
async function session(browser,st,user,{viewport={width:1280,height:900},wait=1800,noLogin=false,ctx=null,hasTouch=false,isMobile=false,deviceScaleFactor=1,slug='semiologia-ii',tab='semio2',route=null}={}){
  const context=ctx||await browser.newContext({viewport,hasTouch,isMobile,deviceScaleFactor});
  const page=await context.newPage(); const con=[],errs=[],reqs=[];
  page.on('console',m=>con.push(m.type()+': '+m.text())); page.on('pageerror',e=>errs.push(String(e)));
  page.on('request',r=>{ if(/\/rest\/v1\//.test(r.url())) reqs.push({m:r.method(),u:r.url().replace(st.url,''),t:Date.now()}); });
  if(route) await route(page);
  const q=noLogin?'':`email=${encodeURIComponent(user.email)}&pw=${encodeURIComponent(user.password)}&`;
  await page.goto(`${st.url}/ink.html?${q}slug=${slug}&tab=${tab}&wait=${wait}`);
  await page.waitForFunction('window.__ready===true',{timeout:120000}); await page.waitForTimeout(400);
  return {context,page,con,errs,reqs,user};
}
const inkCount=(page)=>page.evaluate(()=>document.querySelectorAll('#rm2-ink path').length);
const inkIds=(page)=>page.evaluate(()=>[...document.querySelectorAll('#rm2-ink path')].map(p=>p.getAttribute('data-ink')||'').sort());
const tmpCount=(page)=>page.evaluate(()=>[...document.querySelectorAll('#rm2-ink path')].filter(p=>(p.getAttribute('data-ink')||'').startsWith('tmp-')).length);

/* pontos de parágrafos visíveis para desenhar; devolve o alvo i-ésimo (rola até ele) */
async function target(page,i=0){
  return page.evaluate((i)=>{ const ps=[...document.querySelectorAll('#materias-container section[id] p')].filter(x=>x.textContent.length>150&&x.getBoundingClientRect().height>=50); const e=ps[i%ps.length]; e.scrollIntoView({block:'center'}); return i%ps.length; },i);
}
/* desenha UM traço (mouse real → eventos de ponteiro reais) e devolve a resposta de gravação (status).
   Se o ponto de partida cair num elemento que não aceita traço, tenta o parágrafo seguinte (máx. 8). */
async function drawStroke(page,i=0,{wait=true,timeout=3500}={}){
  await page.evaluate(()=>RMToolsV2.escolherFerramenta('pen'));
  for(let k=0;k<8;k++){
    const idx=i+k; await target(page,idx); await page.waitForTimeout(220);
    const box=await page.evaluate((idx)=>{ const ps=[...document.querySelectorAll('#materias-container section[id] p')].filter(x=>x.textContent.length>150&&x.getBoundingClientRect().height>=50); const e=ps[idx%ps.length]; const r=e.getBoundingClientRect(); return {x:r.left+r.width*0.25,y:r.top+r.height/2}; },idx);
    const resp=wait?page.waitForResponse(r=>/\/rest\/v1\/user_ink_strokes/.test(r.url())&&r.request().method()==='POST',{timeout}).catch(()=>null):null;
    await page.mouse.move(box.x,box.y); await page.mouse.down(); for(let q=1;q<=16;q++){ await page.mouse.move(box.x+q*8,box.y+Math.round(Math.sin(q/2+idx)*12),{steps:2}); } await page.mouse.up();
    if(!wait){ await page.waitForTimeout(200); return {status:'enviado',idx}; }
    const r=await resp; if(r) return {status:r.status(),body:await r.text().catch(()=>''),idx};
  }
  return null;
}

/* apaga com a borracha o traço `id`: escolhe um VÉRTICE do traço que esteja sobre o conteúdo (a borracha só age sobre
   elementos dentro de uma section; um vértice no fundo da página não pode ser apagado), rola até ele e clica.
   Devolve true se clicou; false se o traço não existe ou nenhum vértice está sobre o conteúdo. */
async function eraseStroke(page,id,slug='semiologia-ii'){
  const vert=(k)=>page.evaluate(([id,slug,k])=>{ const rec=(RMToolsV2.estado.strokes[slug]||[]).find(r=>String(r.id)===String(id)); if(!rec) return null; const a=rec.anchor_id.split('>'); const sec=document.getElementById(a[0]); const el=a[1]!==undefined?sec.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+a[1]]:sec; if(!el) return null; const b=el.getBoundingClientRect(); const n=rec.points.length; const order=[...Array(n).keys()].sort((i,j)=>Math.abs(i-n/2)-Math.abs(j-n/2)); const i=order[k]; if(i===undefined) return null; const p=rec.points[i]; const x=b.left+p[0]*b.width,y=b.top+p[1]*b.height; return {x,y,k}; },[id,slug,k]);
  const sobre=(x,y)=>page.evaluate(([x,y])=>{ const e=document.elementFromPoint(x,y); return !!(e&&e.closest&&e.closest('#materias-container section[id]')); },[x,y]);
  for(let k=0;k<14;k++){
    let v=await vert(k); if(!v) return false;
    await page.evaluate((y)=>window.scrollBy(0,y-window.innerHeight/2),v.y);
    for(let t=0;t<6;t++){ await page.waitForTimeout(250); const v2=await vert(k); if(!v2) return false; const moved=Math.hypot(v2.x-v.x,v2.y-v.y); v=v2; if(moved<1) break; }   // espera o layout (content-visibility) estabilizar
    v=await vert(k); if(!v) return false;
    if(v.y<5||v.y>(await page.evaluate(()=>innerHeight))-5) continue;
    if(!(await sobre(v.x,v.y))) continue;
    await page.evaluate(()=>RMToolsV2.escolherFerramenta('eraser')); await page.waitForTimeout(120);
    await page.mouse.move(v.x,v.y); await page.mouse.down(); await page.mouse.move(v.x+1,v.y+1,{steps:2}); await page.mouse.up(); await page.waitForTimeout(700);
    const ainda=await page.evaluate(([id,slug])=>(RMToolsV2.estado.strokes[slug]||[]).some(r=>String(r.id)===String(id)),[id,slug]);
    if(!ainda) return true;   // saiu da lista do cliente (a rede é outro assunto)
    await page.evaluate(()=>RMToolsV2.escolherFerramenta('eraser'));
  }
  return false;
}
module.exports={finding,F,eraseStroke,R,ok,info,finish,sleep,startStack,mkUser,sql,countStrokes,chaos,logOf,logClear,session,inkCount,inkIds,tmpCount,target,drawStroke,pw,Pool};
