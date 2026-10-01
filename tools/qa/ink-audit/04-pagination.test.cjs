/* 04 · Mais de 1.000 traços por conta/matéria: recuperação completa? duplicados? qual parte se perde?
   O teto `max_rows` do PostgREST é EMULADO no adaptador (RM_MAX_ROWS, padrão 1000 = padrão do Supabase). Em produção o
   valor é configuração do painel da API (Project Settings → API → Max rows) e NÃO é visível por SQL: confirmar lá.
   Semeadura por superuser (só para criar volume); a leitura é feita pelo cliente real, com RLS real. */
const L=require('./lib.cjs'); const {ok,info}=L;
(async()=>{
  const st=await L.startStack(); const br=await L.pw().launch();
  // âncoras reais da matéria (seções e elementos internos)
  const probe=await L.mkUser(st,'probe'); const sp=await L.session(br,st,probe);
  const anchors=await sp.page.evaluate(()=>{ const out=[]; document.querySelectorAll('#materias-container section[id]').forEach(sec=>{ out.push(sec.id); const subs=sec.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote'); for(let i=0;i<subs.length&&i<60;i++) if(subs[i].getBoundingClientRect().height>=36||true) out.push(sec.id+'>'+i); }); return out; });
  await sp.context.close(); info('âncoras reais disponíveis na matéria: '+anchors.length);
  const seed=async(u,n,slug='semiologia-ii')=>{ await L.sql(st,'delete from public.user_ink_strokes where user_id=$1',[u.id]);
    await L.sql(st,`insert into public.user_ink_strokes(user_id,subject_slug,anchor_id,color,width,points,created_at)
      select $1,$2,($3::text[])[1+(g % $4)],'black','medium',
        (select jsonb_agg(jsonb_build_array(round((0.05+k*0.02)::numeric,5),round((0.3+0.1*sin(k+g))::numeric,5))) from generate_series(1,40) k),
        now()-((($5)-g)||' seconds')::interval
      from generate_series(1,$5) g`,[u.id,slug,anchors,anchors.length,n]); };
  const table=[];
  for(const N of [999,1000,1001,1500,2500]){
    const u=await L.mkUser(st,'pag'+N); await seed(u,N);
    const t0=Date.now(); const s=await L.session(br,st,u,{wait:1200}); const dt=Date.now()-t0;
    const r=await s.page.evaluate(()=>{ const a=RMToolsV2.estado.strokes['semiologia-ii']||[]; const ids=a.map(x=>x.id); return {n:a.length,uniq:new Set(ids).size,dom:document.querySelectorAll('#rm2-ink path').length,loaded:!!RMToolsV2.estado.carregado['semiologia-ii']}; });
    const newest=(await L.sql(st,'select id from public.user_ink_strokes where user_id=$1 order by created_at desc limit 1',[u.id]))[0].id;
    const newestLoaded=await s.page.evaluate((id)=>(RMToolsV2.estado.strokes['semiologia-ii']||[]).some(x=>String(x.id)===String(id)),newest);
    const req=s.reqs.filter(x=>/user_ink_strokes/.test(x.u)); table.push({N,carregados:r.n,dom:r.dom,unicos:r.uniq,maisRecenteCarregado:newestLoaded,reqsTracos:req.length});
    await s.context.close(); }
  console.log('\n   N banco | carregados | no DOM | ids únicos | traço mais recente carregado | requisições de traços');
  table.forEach(t=>console.log(`   ${String(t.N).padStart(7)} | ${String(t.carregados).padStart(10)} | ${String(t.dom).padStart(6)} | ${String(t.unicos).padStart(10)} | ${String(t.maisRecenteCarregado).padEnd(28)} | ${t.reqsTracos}`));
  console.log('');
  const T=Object.fromEntries(table.map(t=>[t.N,t]));
  ok(T[999].carregados===999,'999 traços no banco → 999 carregados (abaixo do teto)');
  ok(T[1000].carregados===1000,'1000 traços → 1000 carregados (exatamente o teto)');
  ok(T[1001].carregados===1000&&T[2500].carregados===1000,'1001 e 2500 traços → SÓ 1000 carregados: truncamento silencioso do cliente');
  ok(T[1001].reqsTracos===1&&T[2500].reqsTracos===1,'o cliente faz UMA única requisição (sem paginação, sem .range(), sem contagem para detectar que faltou)');
  ok(Object.values(T).every(t=>t.unicos===t.carregados),'sem duplicados nos traços carregados');
  ok(T[1500].maisRecenteCarregado===false&&T[2500].maisRecenteCarregado===false,'RISCO: sem ORDER BY, os traços MAIS RECENTES ficam de fora (o PostgREST devolve na ordem física: os primeiros 1000 inseridos)');

  console.log('== o traço recém-desenhado some depois do teto');
  { const u=await L.mkUser(st,'pagnovo'); await seed(u,1000); const s=await L.session(br,st,u,{wait:1200}); const r=await L.drawStroke(s.page,0); ok(r&&r.status===201,'com 1000 traços já gravados, o 1001º é gravado normalmente (201)');
    await s.context.close(); const s2=await L.session(br,st,u,{wait:1200}); const n=await s2.page.evaluate(()=>RMToolsV2.estado.strokes['semiologia-ii'].length);
    const novo=(await L.sql(st,'select id from public.user_ink_strokes where user_id=$1 order by created_at desc limit 1',[u.id]))[0].id; const vis=await s2.page.evaluate((id)=>RMToolsV2.estado.strokes['semiologia-ii'].some(x=>String(x.id)===String(id)),novo);
    ok(n===1000&&vis===false,'após recarregar: 1000 carregados e o traço que o aluno acabou de salvar NÃO aparece (gravado, mas invisível) — o usuário percebe como "perdi o desenho"'); await s2.context.close(); }

  console.log('== com o teto do servidor elevado (simulando Max rows maior no painel)');
  { await fetch(st.url+'/__test/maxrows',{method:'POST',body:JSON.stringify({n:100000})}); const u=await L.mkUser(st,'pagmax'); await seed(u,5000); const t0=Date.now(); const s=await L.session(br,st,u,{wait:1200}); const dt=Date.now()-t0;
    const r=await s.page.evaluate(()=>({n:RMToolsV2.estado.strokes['semiologia-ii'].length,dom:document.querySelectorAll('#rm2-ink path').length}));
    ok(r.n===5000&&r.dom>0,'Max rows alto: 5000 traços carregados pelo MESMO código (sem paginação é 1 requisição grande) — DOM='+r.dom+' paths, sessão pronta em '+dt+' ms'); await s.context.close(); await fetch(st.url+'/__test/maxrows',{method:'POST',body:JSON.stringify({n:1000})}); }

  await br.close(); await st.close(); process.exit(L.finish('PAGINAÇÃO')?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
