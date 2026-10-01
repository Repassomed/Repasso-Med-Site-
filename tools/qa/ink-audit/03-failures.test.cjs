/* 03 · Falhas provocadas: rede lenta, requisição pendurada, offline, gravação rejeitada, resposta perdida depois do
   commit, falha de DELETE, fechamento com operação pendente, traço denso demais.
   Cada cenário usa usuário e sessão próprios. Observação do banco = superuser (só observar).
   Objetivo: medir RISCO de perda / duplicação / traço apagado que reaparece, e confirmar que falha NÃO é apresentada
   como sucesso. Nada aqui é "correção": é diagnóstico reproduzível. */
const L=require('./lib.cjs'); const {ok,info}=L;
const INK='user_ink_strokes';
(async()=>{
  const st=await L.startStack(); const br=await L.pw().launch();
  const rowsOf=(u)=>L.sql(st,'select id,created_at from public.user_ink_strokes where user_id=$1 order by created_at',[u.id]);
  const until=async(fn,pred,ms=5000)=>{ const t0=Date.now(); let v=await fn(); while(!pred(v)&&Date.now()-t0<ms){ await L.sleep(150); v=await fn(); } return v; };
  const watchToasts=(page)=>page.evaluate(()=>{ window.__toasts=[]; const obs=()=>{ const t=document.querySelector('.rm-toast'); if(t&&!window.__tobs){ window.__tobs=new MutationObserver(()=>window.__toasts.push({m:t.textContent,err:t.classList.contains('err'),on:t.classList.contains('on')})); window.__tobs.observe(t,{attributes:true,childList:true,characterData:true,subtree:true}); } }; window.__iv=setInterval(obs,30); });
  const toasts=(page)=>page.evaluate(()=>window.__toasts.filter(x=>x.on));
  const fresh=async(tag,opts)=>{ const u=await L.mkUser(st,tag); const s=await L.session(br,st,u,opts||{}); await watchToasts(s.page); await L.chaos(st,[]); await L.logClear(st); return {u,s}; };
  const noList=(page,id)=>page.evaluate((id)=>!(RMToolsV2.estado.strokes['semiologia-ii']||[]).some(r=>String(r.id)===String(id)),id);
  const erase=async(page,id)=>{ let did=false; for(let k=0;k<3;k++){ did=await L.eraseStroke(page,id); if(did&&await noList(page,id)) return true; await page.waitForTimeout(500); } return false; };   // repete se a máquina estiver lenta
  const posts=async()=>(await L.logOf(st)).log.filter(x=>x.table===INK&&x.method==='POST');
  const dels=async()=>(await L.logOf(st)).log.filter(x=>x.table===INK&&x.method==='DELETE');

  console.log('== 1 · rede LENTA (POST com 3 s de atraso): o traço aparece na hora (provisório) e é confirmado depois');
  { const {u,s}=await fresh('lenta'); await L.chaos(st,[{method:'POST',table:INK,mode:'delay',delayMs:3000}]);
    const t0=Date.now(); const pr=L.drawStroke(s.page,0,{timeout:9000}); await s.page.waitForTimeout(700);
    ok(await L.inkCount(s.page)===1&&await L.tmpCount(s.page)===1,'aos 0,7 s: traço visível com id provisório «tmp-» (NÃO está gravado ainda)');
    ok((await rowsOf(u)).length===0,'…e o banco ainda tem 0 linhas (visível ≠ salvo)');
    const r=await pr; const dt=Date.now()-t0; ok(r&&r.status===201,'resposta 201 chegou depois de ~'+Math.round(dt/100)/10+' s');
    await s.page.waitForTimeout(300); ok(await L.tmpCount(s.page)===0&&(await rowsOf(u)).length===1,'confirmado: id real no DOM e 1 linha no banco');
    await s.context.close(); }

  console.log('== 2 · requisição PENDURADA (12 s) — sem timeout no cliente; aba fechada antes da resposta');
  { const {u,s}=await fresh('pendurada'); await L.chaos(st,[{method:'POST',table:INK,mode:'delay',delayMs:12000}]);
    await L.drawStroke(s.page,0,{wait:false}); await s.page.waitForTimeout(6000);
    ok(await L.tmpCount(s.page)===1,'aos 6 s continua provisório, sem aviso de erro ao usuário ('+JSON.stringify(await toasts(s.page))+')');
    await s.context.close();           // fecha o navegador com a gravação pendente
    const r=await until(()=>rowsOf(u),x=>x.length>=1,14000);
    info('após fechar a aba com INSERT pendente: o servidor '+(r.length?'AINDA gravou (a requisição já tinha chegado)':'NÃO gravou')+' — depende de a requisição ter chegado ao servidor; o cliente nunca soube o resultado'); }

  console.log('== 3 · gravação REJEITADA pelo servidor (500, 401, 403, 429, 503): aviso de erro, nada salvo, sem reenvio');
  for(const code of [500,401,403,429,503]){ const {u,s}=await fresh('rej'+code); await L.chaos(st,[{method:'POST',table:INK,mode:'status',status:code}]);
    const r=await L.drawStroke(s.page,0); await s.page.waitForTimeout(400); const tt=await toasts(s.page);
    ok(r&&r.status===code&&(await rowsOf(u)).length===0,'HTTP '+code+': servidor recusou, 0 linhas no banco');
    ok(tt.some(x=>x.err&&/No se pudo guardar/.test(x.m)),'HTTP '+code+': o usuário recebe «No se pudo guardar el trazo.» (toast de erro, 2,2 s)');
    if(code===500){
      ok(await L.tmpCount(s.page)===1,'o traço CONTINUA desenhado na tela (id «tmp-», não salvo) → parece salvo para quem não viu o aviso');
      await s.page.waitForTimeout(6000); ok((await posts()).length===1,'NENHUM reenvio automático em 6 s (1 única tentativa de POST) — não há fila durável');
      await L.chaos(st,[]); await s.page.reload(); await s.page.waitForFunction('window.__ready===true'); await s.page.waitForTimeout(700);
      ok(await L.inkCount(s.page)===0,'após recarregar o traço desapareceu: PERDA de desenho (já avisada por toast)'); }
    await s.context.close(); }

  console.log('== 4 · OFFLINE (navegador sem rede): escrever, voltar a rede, recarregar');
  { const {u,s}=await fresh('offline'); await s.context.setOffline(true);
    const r=await L.drawStroke(s.page,0,{timeout:4000}); await s.page.waitForTimeout(600);
    ok(r===null||r.status!==201,'offline: nenhuma resposta 201 (falha de rede)'); const tt=await toasts(s.page); ok(tt.some(x=>x.err),'offline: o usuário recebe o toast de erro ('+(tt[0]&&tt[0].m)+')');
    await s.context.setOffline(false); await s.page.waitForTimeout(5000); ok((await posts()).length===0,'voltou a rede e NADA é reenviado (0 POST em 5 s): o traço feito offline só existe na memória da aba');
    await L.drawStroke(s.page,2); await s.page.waitForTimeout(300); ok((await rowsOf(u)).length===1,'um traço feito já ONLINE é gravado (1 linha); o offline não');
    await s.context.close(); }

  console.log('== 5a · conexão REINICIADA depois do commit: o próprio navegador reenvia o POST (INSERT não é idempotente)');
  { const {u,s}=await fresh('reset'); await L.chaos(st,[{method:'POST',table:INK,mode:'drop-after-commit',remaining:1}]);
    await L.drawStroke(s.page,0,{wait:false}); await s.page.waitForTimeout(2500); const n=(await rowsOf(u)).length, np=(await posts()).length;
    ok(np===2&&n===2,'1 traço desenhado → '+np+' POSTs enviados pelo navegador e '+n+' LINHAS no banco: DUPLICAÇÃO (reenvio automático do navegador após reset; o servidor gerou dois ids)');
    ok(await L.inkCount(s.page)===1,'…mas a tela mostra 1 traço só: o usuário não percebe a duplicata até recarregar ('+await L.inkCount(s.page)+')');
    await s.page.reload(); await s.page.waitForFunction('window.__ready===true'); await s.page.waitForTimeout(700); ok(await L.inkCount(s.page)===2,'após recarregar: 2 traços sobrepostos (o desenho aparece duplicado; apagar remove um de cada vez)');
    await s.context.close(); }
  console.log('== 5b · erro 504 do gateway DEPOIS do commit (servidor gravou, cliente vê falha): traço «desfeito» que volta e duplicação manual');
  { const {u,s}=await fresh('perdida'); await L.chaos(st,[{method:'POST',table:INK,mode:'commit-then-status',status:504,remaining:1}]);
    await L.drawStroke(s.page,0); await s.page.waitForTimeout(600);
    ok((await rowsOf(u)).length===1,'o servidor GRAVOU a linha (commit feito)'); const tt=await toasts(s.page); ok(tt.some(x=>x.err&&/No se pudo guardar/.test(x.m)),'…mas o cliente mostra «No se pudo guardar» (falha aparente)');
    ok(await L.tmpCount(s.page)===1,'o cliente ficou com id «tmp-» (não sabe que está salvo)');
    await s.page.evaluate(()=>RMToolsV2.desfazer()); await s.page.waitForTimeout(800);
    ok(await L.inkCount(s.page)===0&&(await dels()).length===0,'desfazer remove da tela mas NÃO envia DELETE (id provisório)');
    ok((await rowsOf(u)).length===1,'RISCO CONFIRMADO: a linha continua no banco após o usuário desfazer → o traço REAPARECE no próximo carregamento');
    await s.page.reload(); await s.page.waitForFunction('window.__ready===true'); await s.page.waitForTimeout(700);
    ok(await L.inkCount(s.page)===1,'após recarregar: o traço «desfeito» voltou (1 traço)');
    await L.drawStroke(s.page,0); await s.page.waitForTimeout(300); ok((await rowsOf(u)).length===2,'redesenhar o traço que «falhou» cria SEGUNDA linha: duplicação (2)');
    await s.context.close(); }

  console.log('== 6 · DELETE que falha (500 / rede): o traço apagado na tela REAPARECE no recarregamento; undo duplica');
  for(const mode of ['status500','drop']){ const {u,s}=await fresh('del'+mode); await L.drawStroke(s.page,0); await s.page.waitForTimeout(400); const id=(await rowsOf(u))[0].id;
    await L.chaos(st,[mode==='drop'?{method:'DELETE',table:INK,mode:'drop-before'}:{method:'DELETE',table:INK,mode:'status',status:500}]);
    await L.logClear(st); await s.page.waitForTimeout(600); const did=await erase(s.page,id); await s.page.waitForTimeout(800);
    ok(did&&await L.inkCount(s.page)===0,'['+mode+'] borracha: o traço some da tela');
    ok((await dels()).length>=1&&(await rowsOf(u)).length===1,'['+mode+'] o DELETE falhou: a linha continua no banco');
    const tt=await toasts(s.page); ok(!tt.some(x=>x.err),'['+mode+'] o usuário NÃO recebe nenhum aviso de erro ('+JSON.stringify(tt.map(x=>x.m))+') — falha silenciosa');
    await L.chaos(st,[]); await s.page.evaluate(()=>RMToolsV2.escolherFerramenta('pen')); await s.page.evaluate(()=>RMToolsV2.desfazer()); await s.page.waitForTimeout(1000);
    const rr=await rowsOf(u); ok(rr.length===2,'['+mode+'] desfazer a borracha cria uma CÓPIA: agora 2 linhas para 1 desenho (duplicação)');
    await s.page.reload(); await s.page.waitForFunction('window.__ready===true'); await s.page.waitForTimeout(700); ok(await L.inkCount(s.page)===2,'['+mode+'] após recarregar: o desenho aparece DUPLICADO (2 traços idênticos)');
    await s.context.close(); }
  { const {u,s}=await fresh('delreap'); await L.drawStroke(s.page,0); await s.page.waitForTimeout(400); const id=(await rowsOf(u))[0].id;
    await L.chaos(st,[{method:'DELETE',table:INK,mode:'status',status:500}]); await s.page.waitForTimeout(600); await erase(s.page,id); await s.page.waitForTimeout(600); await L.chaos(st,[]);
    await s.page.reload(); await s.page.waitForFunction('window.__ready===true'); await s.page.waitForTimeout(700);
    ok(await L.inkCount(s.page)===1,'traço APAGADO REAPARECE após recarregar (DELETE falhou sem aviso e sem novo envio)'); await s.context.close(); }

  console.log('== 7 · fechar a aba com operação pendente: o que o navegador faz');
  { const {u,s}=await fresh('fechar'); await L.chaos(st,[{method:'POST',table:INK,mode:'drop-before'}]);
    await L.drawStroke(s.page,0,{wait:false}); await s.page.waitForTimeout(150); await s.page.close({runBeforeUnload:true}); await L.sleep(800);
    ok((await rowsOf(u)).length===0,'INSERT cortado antes de chegar ao servidor (fechamento/queda): 0 linhas — perda silenciosa'); await s.context.close(); }
  { const fs=require('fs'); const code=fs.readFileSync(require('path').resolve(__dirname,'../../../Repasso-Med-Site--main/Atual - Copia/assets/rm-tools-v2.js'),'utf8');
    ok(!/keepalive/.test(code),'código: nenhum fetch com keepalive (INSERT/DELETE não sobrevivem ao fechamento da página)');
    ok(!/sendBeacon/.test(code),'código: nenhum sendBeacon');
    const ink=code.slice(code.indexOf('async function filaGravar'),code.indexOf('async function filaGravar')+2200);
    ok(!/retry|retent|setTimeout|online/.test(ink),'código de filaGravar: sem retry, sem timer, sem evento online → sem fila durável/reenvio');
    ok(!/beforeunload/.test(code)&&/addEventListener\('pagehide', flushNotas\)/.test(code),'só as NOTAS têm flush no pagehide; nenhum alerta/flush para traços pendentes'); }

  console.log('== 8 · traço denso/longo demais: o teto do banco (1200 pontos) pode rejeitar o que o cliente envia');
  { const {u,s}=await fresh('denso',{viewport:{width:1280,height:1400}}); await s.page.evaluate(()=>RMToolsV2.escolherFerramenta('pen')); await L.target(s.page,0); await s.page.waitForTimeout(400);
    const box=await s.page.evaluate(()=>{ const ps=[...document.querySelectorAll('#materias-container section[id] p')].filter(x=>x.textContent.length>150&&x.getBoundingClientRect().height>=50); const r=ps[0].getBoundingClientRect(); return {x:r.left+20,y:r.top+r.height/2,w:r.width}; });
    await s.page.mouse.move(box.x,box.y); await s.page.mouse.down(); let rnd=12345; const rand=()=>{ rnd=(rnd*1103515245+12345)&0x7fffffff; return rnd/0x7fffffff; };
    for(let k=0;k<3400;k++){ await s.page.mouse.move(box.x+(k%700)*0.9+rand()*3,box.y+(rand()-0.5)*90); }
    const resp=s.page.waitForResponse(r=>/user_ink_strokes/.test(r.url())&&r.request().method()==='POST',{timeout:15000}).catch(()=>null);
    await s.page.mouse.up(); const r=await resp; await s.page.waitForTimeout(300); const lg=(await posts()).pop(); const n=(await rowsOf(u)).length;
    info('traço com 3400 eventos de ponteiro e ruído alto → POST '+(r?r.status():'sem resposta')+'; corpo='+(lg?lg.inB:'?')+' bytes; linhas gravadas='+n);
    const tt=await toasts(s.page);
    ok(r&&r.status()===400&&n===0,'o cliente enviou MAIS de 1200 pontos (mesmo após simplificar e decimar) e o banco rejeitou (400): o traço NÃO foi salvo');
    ok(tt.some(x=>x.err&&/No se pudo guardar/.test(x.m)),'…e o usuário recebe o toast de erro (o traço mais longo/denso se perde; some ao recarregar)');
    await s.context.close(); }

  await br.close(); await st.close(); process.exit(L.finish('FALHAS')?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
