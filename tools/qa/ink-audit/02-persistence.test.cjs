/* 02 · Persistência ponta a ponta (navegador real → supabase-js real → Postgres real).
   Prova = resposta de gravação confirmada + linha no banco + OUTRA sessão independente (contexto novo, login novo)
   carregando os mesmos traços. Traço visível ou estado em memória NÃO é prova. */
const L=require('./lib.cjs'); const {ok,info}=L;
(async()=>{
  const st=await L.startStack(); const br=await L.pw().launch();
  const A=await L.mkUser(st,'a');
  const until=async(fn,pred,ms=4000)=>{ const t0=Date.now(); let v=await fn(); while(!pred(v)&&Date.now()-t0<ms){ await L.sleep(150); v=await fn(); } return v; };   // gravações são assíncronas: espera o estado final (limite 4 s)
  const inkRows=()=>L.sql(st,'select id,anchor_id,color,width,jsonb_array_length(points) n,points from public.user_ink_strokes where user_id=$1 and subject_slug=$2 order by created_at',[A.id,'semiologia-ii']);

  console.log('== 1 · desenhar → gravação confirmada → encerrar sessão → sessão independente carrega os mesmos traços');
  let s1=await L.session(br,st,A); ok(!s1.page.url().includes('error')&&await s1.page.evaluate(()=>!window.__loginError),'login real no adaptador (sessão 1)');
  ok(await s1.page.evaluate(()=>typeof RMToolsV2==='object'&&RMToolsV2.hasAccess&&true),'V2 montada para um usuário comum da beta (não-José)');
  const resp=[]; for(let i=0;i<3;i++){ resp.push(await L.drawStroke(s1.page,i)); }
  ok(resp.every(r=>r&&r.status===201),'3 traços → 3 respostas de gravação 201 confirmadas ('+resp.map(r=>r&&r.status)+')');
  await s1.page.waitForTimeout(500);
  ok(await L.tmpCount(s1.page)===0,'nenhum traço ficou com id provisório «tmp-» após a confirmação');
  let rows=await inkRows(); ok(rows.length===3,'banco tem 3 linhas (observação superuser)');
  const idsDom1=await L.inkIds(s1.page); ok(JSON.stringify(idsDom1)===JSON.stringify(rows.map(r=>r.id).sort()),'ids no DOM = ids no banco');
  const anchors=rows.map(r=>r.anchor_id); info('âncoras gravadas: '+anchors.join(' | '));
  await s1.context.close();       // "encerrar a sessão do navegador": storage, memória e DOM descartados
  let s2=await L.session(br,st,A);
  ok(await L.inkCount(s2.page)===3,'sessão 2 (contexto novo, login novo) desenha 3 traços carregados do banco');
  ok(JSON.stringify(await L.inkIds(s2.page))===JSON.stringify(rows.map(r=>r.id).sort()),'sessão 2 carrega EXATAMENTE os mesmos ids');
  const geo=await s2.page.evaluate(()=>[...document.querySelectorAll('#rm2-ink path')].map(p=>({id:p.getAttribute('data-ink'),d:p.getAttribute('d').length})));
  ok(geo.every(g=>g.d>20),'cada traço recarregado tem geometria (d) não vazia');

  console.log('== 2 · desfazer (undo) e apagar (borracha) persistem; «restaurar» cria NOVA linha');
  await s2.page.evaluate(()=>RMToolsV2.escolherFerramenta('pen'));
  await L.drawStroke(s2.page,4); await s2.page.waitForTimeout(400); ok((await inkRows()).length===4,'4.º traço gravado');
  await s2.page.evaluate(()=>RMToolsV2.desfazer()); await s2.page.waitForTimeout(700);
  rows=await inkRows(); ok(rows.length===3,'desfazer apaga a linha no banco (DELETE confirmado): 3 linhas');
  const alvo=rows[0]; await L.logClear(st); const erased=await L.eraseStroke(s2.page,alvo.id); await s2.page.waitForTimeout(300); if(process.env.DEBUG_INK) console.log('   dbg erase=',erased,(await L.logOf(st)).log.filter(x=>x.table==='user_ink_strokes').map(x=>x.method+' '+(x.status||x.outcome)+' rows='+x.rows), 'tool=',await s2.page.evaluate(()=>RMToolsV2.estado.tool),'strokes=',await s2.page.evaluate(()=>RMToolsV2.estado.strokes['semiologia-ii'].map(r=>r.anchor_id+':'+String(r.id).slice(0,6))));
  rows=await until(inkRows,r=>r.length===2); ok(rows.length===2&&!rows.find(r=>r.id===alvo.id),'borracha: a linha apagada some do banco (2 linhas)');
  await s2.page.evaluate(()=>RMToolsV2.desfazer()); await s2.page.waitForTimeout(1000);
  rows=await inkRows(); ok(rows.length===3&&!rows.find(r=>r.id===alvo.id),'desfazer da borracha RE-INSERE: 3 linhas, mas com NOVO id (o antigo não volta)');
  await s2.context.close();
  let s3=await L.session(br,st,A); ok(await L.inkCount(s3.page)===3,'sessão 3 independente: 3 traços (o estado final do banco)');
  ok(JSON.stringify(await L.inkIds(s3.page))===JSON.stringify((await inkRows()).map(r=>r.id).sort()),'ids da sessão 3 = ids atuais do banco');

  console.log('== 3 · duas sessões escrevendo ao mesmo tempo na mesma conta/matéria');
  let sa=s3, sb=await L.session(br,st,A); const base=(await inkRows()).length;
  const loop=async(pg,off)=>{ const out=[]; for(let i=0;i<3;i++) out.push(await L.drawStroke(pg,off+i*2)); return out; };   // sequencial DENTRO de cada página, em paralelo ENTRE páginas
  const rs=(await Promise.all([loop(sa.page,0),loop(sb.page,1)])).flat(); ok(rs.length===6&&rs.every(r=>r&&r.status===201),'6 gravações simultâneas (2 sessões × 3) → 6 respostas 201');
  rows=await inkRows(); ok(rows.length===base+6,'banco: nenhum traço perdido ('+base+' + 6 = '+rows.length+')');
  ok(new Set(rows.map(r=>r.id)).size===rows.length,'ids únicos (sem duplicados)');
  const ca=await L.inkCount(sa.page), cb=await L.inkCount(sb.page);
  ok(ca===base+3&&cb===base+3&&rows.length===base+6,'cada sessão vê só os seus: NÃO há sincronização ao vivo (A='+ca+', B='+cb+', banco='+rows.length+')');
  await sa.page.reload(); await sa.page.waitForFunction('window.__ready===true'); await sa.page.waitForTimeout(800);
  ok(await L.inkCount(sa.page)===base+6,'após RECARREGAR, a sessão A passa a ver os '+(base+6)+' traços (a atualização depende de recarga)');

  console.log('== 4 · apagar em uma sessão × sessão desatualizada; undo depois de outro dispositivo apagar');
  const rowsNow=await inkRows(); const vitima=rowsNow[0];
  await L.eraseStroke(sa.page,vitima.id); ok((await until(inkRows,r=>r.length===base+5)).length===base+5,'A apagou 1 → banco '+(base+5));
  ok((await L.inkIds(sb.page)).includes(vitima.id),'B (desatualizada, sem recarregar) AINDA mostra o traço que A apagou');
  await L.eraseStroke(sb.page,vitima.id); await sb.page.waitForTimeout(300);
  ok((await inkRows()).length===base+5,'B apaga o mesmo traço (já inexistente): DELETE em 0 linhas, sem erro e sem alterar o banco');
  await sa.page.evaluate(()=>RMToolsV2.escolherFerramenta('pen')); await sa.page.evaluate(()=>RMToolsV2.desfazer()); await sa.page.waitForTimeout(900);
  ok((await inkRows()).length===base+6,'A desfaz a própria borracha: o traço VOLTA como nova linha ('+(base+6)+'); se B tiver apagado para "concluir" a exclusão, o undo de A o ressuscita — comportamento do undo, não erro');
  // erros de JS
  const errs=[...s1.errs,...s2.errs,...s3.errs,...sb.errs].filter(e=>!/Failed to load resource/.test(e)); ok(errs.length===0,'0 erros JS nas sessões ('+errs.length+')');
  await br.close(); await st.close(); process.exit(L.finish('PERSISTÊNCIA')?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
