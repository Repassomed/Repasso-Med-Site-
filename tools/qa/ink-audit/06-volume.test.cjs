/* 06 · Volume e concorrência, em ambiente ISOLADO e com limites. Números são do sandbox (Postgres local + adaptador + Chromium
   emulado): servem para comparar volumes entre si e achar a FORMA da curva, NÃO para prever o Supabase de produção
   (outro hardware, rede, pooler, plano). «300 cadastrados» não equivale a 300 simultâneos: ver seção C (perfil de requisições). */
const L=require('./lib.cjs'); const {ok,info}=L;
const pct=(a,p)=>{ const s=[...a].sort((x,y)=>x-y); return s.length?s[Math.min(s.length-1,Math.floor(p*s.length))]:0; };
(async()=>{
  const st=await L.startStack(); const br=await L.pw().launch();
  await fetch(st.url+'/__test/maxrows',{method:'POST',body:JSON.stringify({n:100000})});   // medir a curva sem o teto de 1000 (ver 04 para o teto)
  const probe=await L.mkUser(st,'probe'); const sp=await L.session(br,st,probe);
  const anchors=await sp.page.evaluate(()=>{ const out=[]; document.querySelectorAll('#materias-container section[id]').forEach(sec=>{ out.push(sec.id); const subs=sec.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote'); for(let i=0;i<subs.length&&i<60;i++) out.push(sec.id+'>'+i); }); return out; }); await sp.context.close();
  const seed=async(u,n,pts=40)=>{ await L.sql(st,'delete from public.user_ink_strokes where user_id=$1',[u.id]); if(!n) return;
    await L.sql(st,`insert into public.user_ink_strokes(user_id,subject_slug,anchor_id,color,width,points,created_at) select $1,'semiologia-ii',($2::text[])[1+(g % $3)],'black','medium',(select jsonb_agg(jsonb_build_array(round((0.05+k*0.02)::numeric,5),round((0.3+0.1*sin(k+g))::numeric,5))) from generate_series(1,$4) k),now()-((($5)-g)||' seconds')::interval from generate_series(1,$5) g`,[u.id,anchors,anchors.length,pts,n]); };

  console.log('== A · curva por volume (1 usuário, 1 matéria; 40 pontos por traço ≈ traço típico; produção hoje: média 21, máx. 195)');
  const rows=[];
  for(const N of [0,100,500,1000,2500,5000]){
    const u=await L.mkUser(st,'vol'+N); await seed(u,N); await L.logClear(st);
    const t0=Date.now(); const s=await L.session(br,st,u,{wait:800}); const cdp=await s.context.newCDPSession(s.page); await cdp.send('Performance.enable');
    const nInk=await L.inkCount(s.page); const tLoad=Date.now()-t0;
    const lg=(await L.logOf(st)).log.filter(x=>x.table==='user_ink_strokes'&&x.method==='GET'); const g=lg[0]||{};
    const m=await cdp.send('Performance.getMetrics'); const heap=(m.metrics.find(x=>x.name==='JSHeapUsedSize')||{}).value/1048576, nodes=(m.metrics.find(x=>x.name==='Nodes')||{}).value;
    const rep=await s.page.evaluate(()=>{ const t=performance.now(); for(let i=0;i<5;i++) RMToolsV2.reposicionar(); return (performance.now()-t)/5; });
    const fr=await s.page.evaluate(()=>new Promise(res=>{ const d=[]; let last=performance.now(); let y=0; const t0=last; function f(now){ d.push(now-last); last=now; y+=40; window.scrollTo(0,y); if(now-t0<1800) requestAnimationFrame(f); else res(d); } requestAnimationFrame(f); }));
    await s.page.evaluate(()=>window.scrollTo(0,0)); await s.page.waitForTimeout(300);
    const dr=await L.drawStroke(s.page,2); const pl=(await L.logOf(st)).log.filter(x=>x.table==='user_ink_strokes'&&x.method==='POST').pop();
    rows.push({N,desenhados:nInk,tLoadMs:tLoad,getMs:g.ms,getKB:g.outB?Math.round(g.outB/1024):0,reqsRest:s.reqs.length,heapMB:Math.round(heap),nodes,repMs:Math.round(rep*10)/10,frameP95:Math.round(pct(fr,0.95)),frameMax:Math.round(Math.max(...fr)),postMs:pl&&pl.ms,ok:dr&&dr.status===201});
    await s.context.close(); }
  console.log('\n   N     | desenhados | carga total ms | GET traços ms | GET KB | req. REST | heap MB | nós DOM | reposicionar() ms | frame p95/máx ms | POST ms');
  rows.forEach(r=>console.log(`   ${String(r.N).padStart(5)} | ${String(r.desenhados).padStart(10)} | ${String(r.tLoadMs).padStart(14)} | ${String(r.getMs??'-').padStart(13)} | ${String(r.getKB).padStart(6)} | ${String(r.reqsRest).padStart(9)} | ${String(r.heapMB).padStart(7)} | ${String(r.nodes).padStart(7)} | ${String(r.repMs).padStart(17)} | ${(r.frameP95+'/'+r.frameMax).padStart(16)} | ${r.postMs}`));
  console.log('');
  ok(rows.every(r=>r.desenhados===r.N),'todos os volumes foram carregados e desenhados por completo (com o teto do servidor elevado)');
  ok(rows.every(r=>r.ok),'com qualquer volume, gravar um novo traço continua funcionando (201)');
  const r5=rows.find(r=>r.N===5000), r0=rows.find(r=>r.N===0), r1=rows.find(r=>r.N===1000);
  info(`custo incremental: 5000 traços → +${r5.tLoadMs-r0.tLoadMs} ms de carga, +${r5.heapMB-r0.heapMB} MB de heap, ${r5.getKB} KB no GET; 1000 traços → +${r1.tLoadMs-r0.tLoadMs} ms, ${r1.getKB} KB`);
  L.finding(r5.repMs>50,`reposicionar() com 5000 traços leva ${r5.repMs} ms (síncrono, O(N)) — roda a cada redimensionar/rotação/ResizeObserver; 1000 traços: ${r1.repMs} ms`);
  L.finding(r5.frameP95>24,`rolagem com 5000 traços: p95 de quadro ${r5.frameP95} ms (acima de 16,7 ms = 60 fps)`);

  console.log('== B · concorrência HTTP (mesmo adaptador/Postgres; pool de 40 conexões): K leituras simultâneas de 300 traços (carga inicial)');
  const users=[]; for(let i=0;i<40;i++){ const u=await L.mkUser(st,'c'+i); await seed(u,300); const t=(await (await fetch(st.url+'/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:u.email,password:u.password})})).json()).access_token; users.push({u,t}); }
  for(const K of [10,50,150,300]){ const lat=[]; let errs=0; const t0=Date.now(); await Promise.all(Array.from({length:K},async(_,i)=>{ const {u,t}=users[i%users.length]; const a=Date.now(); try{ const r=await fetch(st.url+`/rest/v1/user_ink_strokes?select=id,anchor_id,color,width,points,created_at&user_id=eq.${u.id}&subject_slug=eq.semiologia-ii`,{headers:{authorization:'Bearer '+t}}); const j=await r.json(); if(!r.ok||j.length!==300) errs++; }catch(e){errs++;} lat.push(Date.now()-a); }));
    console.log(`   K=${String(K).padStart(3)} leituras simultâneas: p50 ${pct(lat,0.5)} ms · p95 ${pct(lat,0.95)} ms · máx ${Math.max(...lat)} ms · erros ${errs} · total ${Date.now()-t0} ms`); ok(errs===0,'K='+K+': 0 erros e 300 traços completos por resposta'); }

  console.log('== C · perfil de requisições por ação (base para estimar carga; sem inventar simultaneidade)');
  { const u=await L.mkUser(st,'perfil'); await seed(u,50); await L.logClear(st); const s=await L.session(br,st,u,{wait:800}); const carga=s.reqs.map(r=>r.m+' '+r.u.split('?')[0]); const cont={}; carga.forEach(c=>cont[c]=(cont[c]||0)+1);
    info('abrir a matéria = '+carga.length+' requisições REST: '+Object.entries(cont).map(([k,v])=>k+'×'+v).join(' · '));
    await L.logClear(st); for(let i=0;i<3;i++) await L.drawStroke(s.page,i*2); const w=(await L.logOf(st)).log.filter(x=>x.table==='user_ink_strokes'); info('3 traços desenhados = '+w.length+' requisições ('+w.map(x=>x.method).join(',')+'): 1 POST por traço, nunca por ponto');
    ok(w.filter(x=>x.method==='POST').length===3,'1 POST por traço'); await s.context.close(); }

  console.log('== D · 10 NAVEGADORES simultâneos (contextos independentes), cada um desenhando 5 traços na própria conta');
  { const us=[]; for(let i=0;i<10;i++) us.push(await L.mkUser(st,'sim'+i)); const ss=await Promise.all(us.map(u=>L.session(br,st,u,{wait:800}))); await L.logClear(st); const t0=Date.now();
    const res=await Promise.all(ss.map(async s=>{ const out=[]; for(let i=0;i<5;i++) out.push(await L.drawStroke(s.page,i*2,{timeout:8000})); return out; })); const dt=Date.now()-t0;
    const flat=res.flat(); ok(flat.length===50&&flat.every(r=>r&&r.status===201),'50 gravações de 10 sessões simultâneas → 50 respostas 201 ('+dt+' ms no total)');
    let perdidos=0; for(const u of us){ if((await L.countStrokes(st,u.id))!==5) perdidos++; } ok(perdidos===0,'nenhum usuário perdeu traço (5 linhas cada)');
    const lat=(await L.logOf(st)).log.filter(x=>x.table==='user_ink_strokes'&&x.method==='POST').map(x=>x.ms); info('latência do POST no servidor: p50 '+pct(lat,0.5)+' ms · p95 '+pct(lat,0.95)+' ms · máx '+Math.max(...lat)+' ms');
    await Promise.all(ss.map(s=>s.context.close())); }
  console.log('\nLIMITES DA CONCLUSÃO: sandbox único (CPU/RAM/disco compartilhados com os navegadores), Postgres local sem rede real, adaptador REST próprio, Chromium emulado. Não são dados do Supabase de produção nem de aparelhos reais.');
  await br.close(); await st.close(); process.exit(L.finish('VOLUME')?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
