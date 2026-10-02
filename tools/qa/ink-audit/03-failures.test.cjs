/* 03 · Falhas provocadas: rede lenta, requisição pendurada, offline, gravação rejeitada, resposta perdida depois do
   commit, falha de DELETE, fechamento com operação pendente, traço denso demais.
   Cada cenário usa usuário e sessão próprios. Observação do banco = superuser (só observar).
   Objetivo: medir RISCO de perda / duplicação / traço apagado que reaparece, e confirmar que falha NÃO é apresentada
   como sucesso.

   ATUALIZADO após a correção dos achados A/B/C/E (#420): os cenários §5a, §5b, §6 e §8 agora EXIGEM o
   comportamento corrigido (id gerado no cliente e idempotente, DELETE que avisa e reenvia, decimação em laço);
   §1-4 e §7 continuam a documentar limitações REAIS e deliberadamente não resolvidas nesta rodada (achado D —
   sem fila durável completa, sem reenvio de INSERT ao voltar online, sem keepalive/sendBeacon no fechamento da
   aba): só o indicador persistente de "não salvo" muda de forma de detecção (de id «tmp-» para a classe
   `.rm2-ink-pendiente`, ver `pendingCount` em `lib.cjs`), nunca o resultado de rede em si. Não declarar aqui
   que o achado D foi resolvido.

   §9 (nova): a auditoria independente encontrou uma 2ª ocorrência do padrão do achado B — o DELETE
   COMPENSATÓRIO de `filaGravar()` (traço desfeito/apagado enquanto o INSERT ainda estava em voo) também só
   tinha try/catch, sem conferir `result.error`. CORRIGIDO reusando a mesma infraestrutura segura (nunca uma
   segunda implementação): `tentarApagarNoBanco()` + fila durável `penApagarPendente.<uid>`. */
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
    const t0=Date.now(); const pr=L.drawStroke(s.page,0,{timeout:9000});
    /* Poll pelo indicador "não salvo" (não por `inkCount`): a tinta já existe no DOM desde o
       `pointerdown` (onDown cria o <path>), mas `marcarComoPendente()` só liga a classe dentro de
       `filaGravar()`, chamado do `onUp` — depois do gesto inteiro (16 micro-movimentos simulados +
       soltar). Esperar só por `inkCount>0` mede o instante ERRADO (meio do gesto, antes de filaGravar
       sequer começar); esperar pelo indicador mede o instante certo: logo que o envio começa. Uma
       espera fixa (700 ms, 1,5 s) tanto pode ser curta demais quanto, como o atraso provocado é de 3 s,
       nunca chega tarde demais — então o polling é mais robusto que os dois extremos. */
    let apareceuEm=null;
    for(let i=0;i<60;i++){ await s.page.waitForTimeout(50); if(await L.pendingCount(s.page)>0){ apareceuEm=Date.now()-t0; break; } }
    ok(apareceuEm!=null&&apareceuEm<2500,'indicador "não salvo" ligou em ~'+apareceuEm+' ms (bem antes do atraso de 3 s provocado)');
    ok(await L.inkCount(s.page)===1&&await L.pendingCount(s.page)===1,'no instante em que o envio começa: tinta visível com indicador "não salvo" ligado (NÃO está gravado ainda)');
    ok((await rowsOf(u)).length===0,'…e o banco ainda tem 0 linhas (visível ≠ salvo)');
    const r=await pr; const dt=Date.now()-t0; ok(r&&r.status===201,'resposta 201 chegou depois de ~'+Math.round(dt/100)/10+' s');
    await s.page.waitForTimeout(300); ok(await L.pendingCount(s.page)===0&&(await rowsOf(u)).length===1,'confirmado: indicador "não salvo" removido e 1 linha no banco');
    await s.context.close(); }

  console.log('== 2 · requisição PENDURADA (12 s) — sem timeout no cliente; aba fechada antes da resposta');
  { const {u,s}=await fresh('pendurada'); await L.chaos(st,[{method:'POST',table:INK,mode:'delay',delayMs:12000}]);
    await L.drawStroke(s.page,0,{wait:false}); await s.page.waitForTimeout(6000);
    ok(await L.pendingCount(s.page)===1,'aos 6 s continua com indicador "não salvo", sem aviso de erro ao usuário ('+JSON.stringify(await toasts(s.page))+')');
    await s.context.close();           // fecha o navegador com a gravação pendente
    const r=await until(()=>rowsOf(u),x=>x.length>=1,14000);
    info('após fechar a aba com INSERT pendente: o servidor '+(r.length?'AINDA gravou (a requisição já tinha chegado)':'NÃO gravou')+' — depende de a requisição ter chegado ao servidor; o cliente nunca soube o resultado'); }

  console.log('== 3 · gravação REJEITADA pelo servidor (500, 401, 403, 429, 503): aviso de erro, nada salvo, sem reenvio');
  for(const code of [500,401,403,429,503]){ const {u,s}=await fresh('rej'+code); await L.chaos(st,[{method:'POST',table:INK,mode:'status',status:code}]);
    const r=await L.drawStroke(s.page,0); await s.page.waitForTimeout(400); const tt=await toasts(s.page);
    ok(r&&r.status===code&&(await rowsOf(u)).length===0,'HTTP '+code+': servidor recusou, 0 linhas no banco');
    ok(tt.some(x=>x.err&&/No se pudo guardar/.test(x.m)),'HTTP '+code+': o usuário recebe «No se pudo guardar el trazo.» (toast de erro, 2,2 s)');
    if(code===500){
      ok(await L.pendingCount(s.page)===1,'o traço CONTINUA desenhado na tela, com indicador "não salvo" (confirma que não foi gravado) → parece salvo para quem não viu o aviso nem reparou no tracejado');
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

  console.log('== 5a · conexão REINICIADA depois do commit: o próprio navegador reenvia o POST — ACHADO C CORRIGIDO: id gerado no cliente, idempotente');
  { const {u,s}=await fresh('reset'); await L.chaos(st,[{method:'POST',table:INK,mode:'drop-after-commit',remaining:1}]);
    await L.drawStroke(s.page,0,{wait:false}); await s.page.waitForTimeout(2500); const n=(await rowsOf(u)).length, np=(await posts()).length;
    ok(np===2&&n===1,'1 traço desenhado → '+np+' POSTs enviados pelo navegador (reenvio automático após reset) mas só '+n+' LINHA no banco: o id gerado no cliente faz o segundo POST bater em 23505, confirmado por leitura, sem duplicar');
    ok(await L.inkCount(s.page)===1,'a tela mostra 1 traço só');
    await s.page.reload(); await s.page.waitForFunction('window.__ready===true'); await s.page.waitForTimeout(700); ok(await L.inkCount(s.page)===1,'após recarregar: continua 1 traço só (sem duplicata)');
    await s.context.close(); }
  console.log('== 5b · erro 504 do gateway DEPOIS do commit (servidor gravou, cliente vê falha) — ACHADO C CORRIGIDO: desfazer agora apaga de verdade');
  { const {u,s}=await fresh('perdida'); await L.chaos(st,[{method:'POST',table:INK,mode:'commit-then-status',status:504,remaining:1}]);
    await L.drawStroke(s.page,0); await s.page.waitForTimeout(600);
    ok((await rowsOf(u)).length===1,'o servidor GRAVOU a linha (commit feito)'); const tt=await toasts(s.page); ok(tt.some(x=>x.err&&/No se pudo guardar/.test(x.m)),'…mas o cliente mostra «No se pudo guardar» (falha aparente)');
    ok(await L.pendingCount(s.page)===1,'o cliente mostra o indicador "não salvo" (não sabe que, na verdade, já está gravado no servidor)');
    await s.page.evaluate(()=>RMToolsV2.desfazer()); await s.page.waitForTimeout(800);
    ok(await L.inkCount(s.page)===0&&(await dels()).length===1,'desfazer remove da tela E ENVIA o DELETE — o id já é o real (gerado no cliente), não provisório');
    ok((await rowsOf(u)).length===0,'CORRIGIDO: a linha foi mesmo apagada do banco depois do desfazer — o traço NÃO reaparece no próximo carregamento');
    await s.page.reload(); await s.page.waitForFunction('window.__ready===true'); await s.page.waitForTimeout(700);
    ok(await L.inkCount(s.page)===0,'após recarregar: o traço «desfeito» continua desfeito (0 traços)');
    await L.drawStroke(s.page,0); await s.page.waitForTimeout(300); ok((await rowsOf(u)).length===1,'redesenhar depois disso cria só UMA linha nova (sem duplicação residual)');
    await s.context.close(); }

  console.log('== 6 · DELETE que falha (500 / rede) — ACHADO B CORRIGIDO: aviso + fila de pendentes com reenvio no próximo carregamento');
  for(const mode of ['status500','drop']){ const {u,s}=await fresh('del'+mode); await L.drawStroke(s.page,0); await s.page.waitForTimeout(400); const id=(await rowsOf(u))[0].id;
    await L.chaos(st,[mode==='drop'?{method:'DELETE',table:INK,mode:'drop-before'}:{method:'DELETE',table:INK,mode:'status',status:500}]);
    await L.logClear(st); await s.page.waitForTimeout(600); const did=await erase(s.page,id); await s.page.waitForTimeout(800);
    ok(did&&await L.inkCount(s.page)===0,'['+mode+'] borracha: o traço some da tela');
    ok((await dels()).length>=1&&(await rowsOf(u)).length===1,'['+mode+'] o DELETE falhou: a linha continua no banco (por enquanto)');
    const tt=await toasts(s.page); ok(tt.some(x=>x.err&&/Se reintentará/.test(x.m)),'['+mode+'] CORRIGIDO: o usuário RECEBE aviso de erro e de que vai reintentar ('+JSON.stringify(tt.map(x=>x.m))+')');
    /* DÍVIDA RESIDUAL, documentada de propósito (não fingir resolvida): se a REDE AINDA ESTIVER FORA DO
       AR no instante exato do desfazer, a reconciliação do achado 3 (abaixo) também tenta o DELETE do id
       antigo e TAMBÉM falha — duplicação temporária esperada até o próximo reenvio automático
       (carregamento/evento `online`). Isto não é fila durável completa; é o limite honesto do que dá
       para fechar sem ela. */
    await s.page.evaluate(()=>RMToolsV2.escolherFerramenta('pen')); await s.page.evaluate(()=>RMToolsV2.desfazer()); await s.page.waitForTimeout(1000);
    const rr=await rowsOf(u); L.finding(rr.length===2,'['+mode+'] DÍVIDA RESIDUAL (rede ainda fora do ar no desfazer): ainda pode duplicar temporariamente (checar: '+rr.length+' linha(s))');
    await L.chaos(st,[]); await s.context.close(); }

  console.log('== 6b · ACHADO 3 da auditoria independente (HEAD 11084b7a) CORRIGIDO: desfazer a borracha com a rede JÁ RECUPERADA reconcilia o DELETE pendente, sem duplicar');
  for(const mode of ['status500','drop']){ const {u,s}=await fresh('fechaduplic'+mode); await L.drawStroke(s.page,0); await s.page.waitForTimeout(400); const id=(await rowsOf(u))[0].id;
    await L.chaos(st,[mode==='drop'?{method:'DELETE',table:INK,mode:'drop-before'}:{method:'DELETE',table:INK,mode:'status',status:500}]);
    await L.logClear(st); await s.page.waitForTimeout(600); const did=await erase(s.page,id); await s.page.waitForTimeout(800);
    ok(did&&await L.inkCount(s.page)===0,'['+mode+'] borracha: o traço some da tela');
    ok((await rowsOf(u)).length===1,'['+mode+'] o DELETE falhou: a linha continua no banco (por enquanto)');
    await L.chaos(st,[]);           // "a rede já se recuperou" — exatamente a janela que o achado 3 fecha
    await s.page.evaluate(()=>RMToolsV2.escolherFerramenta('pen')); await s.page.evaluate(()=>RMToolsV2.desfazer()); await s.page.waitForTimeout(1000);
    const rr=await rowsOf(u);
    ok(rr.length===1,'['+mode+'] CORRIGIDO: desfazer reconciliou o DELETE pendente do id antigo (idempotente) antes de restaurar — exatamente 1 linha, sem duplicação (obtido: '+rr.length+')');
    ok(rr[0]&&rr[0].id!==id,'['+mode+'] a linha que sobrou é a NOVA (do restaurar), não a antiga reconciliada');
    await s.context.close(); }
  { const {u,s}=await fresh('delreap'); await L.drawStroke(s.page,0); await s.page.waitForTimeout(400); const id=(await rowsOf(u))[0].id;
    await L.chaos(st,[{method:'DELETE',table:INK,mode:'status',status:500}]); await s.page.waitForTimeout(600); await erase(s.page,id); await s.page.waitForTimeout(600); await L.chaos(st,[]);
    await s.page.reload(); await s.page.waitForFunction('window.__ready===true'); await s.page.waitForTimeout(700);
    ok(await L.inkCount(s.page)===0,'CORRIGIDO: traço apagado NÃO reaparece após recarregar — o reenvio pendente roda ANTES de buscar os traços, então o DELETE (agora sem chaos) completa antes do SELECT ler a linha de volta');
    ok((await rowsOf(u)).length===0,'…e a linha realmente não existe mais no banco (não é só um efeito visual)'); await s.context.close(); }

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

  console.log('== 8 · traço denso/longo demais — ACHADO E CORRIGIDO: decimação em laço até caber em 1200 pontos');
  { const {u,s}=await fresh('denso',{viewport:{width:1280,height:1400}}); await s.page.evaluate(()=>RMToolsV2.escolherFerramenta('pen')); await L.target(s.page,0); await s.page.waitForTimeout(400);
    const box=await s.page.evaluate(()=>{ const ps=[...document.querySelectorAll('#materias-container section[id] p')].filter(x=>x.textContent.length>150&&x.getBoundingClientRect().height>=50); const r=ps[0].getBoundingClientRect(); return {x:r.left+20,y:r.top+r.height/2,w:r.width}; });
    await s.page.mouse.move(box.x,box.y); await s.page.mouse.down(); let rnd=12345; const rand=()=>{ rnd=(rnd*1103515245+12345)&0x7fffffff; return rnd/0x7fffffff; };
    for(let k=0;k<3400;k++){ await s.page.mouse.move(box.x+(k%700)*0.9+rand()*3,box.y+(rand()-0.5)*90); }
    const resp=s.page.waitForResponse(r=>/user_ink_strokes/.test(r.url())&&r.request().method()==='POST',{timeout:15000}).catch(()=>null);
    await s.page.mouse.up(); const r=await resp; await s.page.waitForTimeout(300); const lg=(await posts()).pop(); const n=(await rowsOf(u)).length;
    const nPontos=n?(await L.sql(st,'select jsonb_array_length(points) n from public.user_ink_strokes where user_id=$1',[u.id]))[0].n:null;
    info('traço com 3400 eventos de ponteiro e ruído alto → POST '+(r?r.status():'sem resposta')+'; corpo='+(lg?lg.inB:'?')+' bytes; linhas gravadas='+n+'; pontos gravados='+nPontos);
    const tt=await toasts(s.page);
    ok(r&&r.status()===201&&n===1,'CORRIGIDO: mesmo um traço que antes excedia 1200 pontos depois de UMA decimação agora é aceito (201) — a decimação em laço reduziu o suficiente');
    ok(nPontos!=null&&nPontos<=1200,'o traço gravado tem <= 1200 pontos (dentro da constraint do banco), medido: '+nPontos);
    ok(!tt.some(x=>x.err),'nenhum toast de erro: o traço denso não se perde mais');
    await s.context.close(); }

  console.log('== 9 · DELETE compensatório de filaGravar() falha (auditoria independente: 2ª ocorrência do padrão do ACHADO B) — CORRIGIDO: reusa tentarApagarNoBanco()+fila pendente, nunca finge sucesso');
  /* Cenário exato: 1 INSERT começa → 2 usuário desfaz ANTES da resposta → 3 INSERT confirma (rec.cancelado===true)
     → 4 DELETE compensatório de filaGravar() recebe a falha provocada → 5 a linha permanece no banco (quando o
     DELETE nem chegou a comitar) → 6 o id entra em penApagarPendente.<uid> → 7 conexão normaliza + reload →
     8 reenviarApagarPendentes() reenvia o DELETE ANTES do SELECT (sincronizarAba) → 9 a linha desaparece de
     vez → 10 o traço desfeito não reaparece. Testado nas 3 formas de falha aplicáveis a um DELETE. */
  for (const variant of ['status500', 'drop-before', 'drop-after']) {
    const {u,s}=await fresh('comp'+variant);
    await L.chaos(st,[{method:'POST',table:INK,mode:'delay',delayMs:1200}]);
    await L.drawStroke(s.page,0,{wait:false});                  // 1 · INSERT parte e fica em voo (1200 ms de atraso provocado)
    const id=await s.page.evaluate(()=>{ const l=RMToolsV2.estado.strokes['semiologia-ii']||[]; return l.length?l[l.length-1].id:null; });
    ok(!!id,'['+variant+'] traço criado localmente com id próprio (INSERT ainda em voo)');
    await s.page.evaluate(()=>RMToolsV2.desfazer());            // 2 · usuário desfaz antes da resposta do INSERT (rec.cancelado=true)
    await s.page.waitForTimeout(400);                           // dá tempo ao DELETE prematuro de apagarNoBanco() (linha ainda não existe: 0 apagadas, sem erro) terminar SEM caos
    const regraDelete = variant==='status500' ? {method:'DELETE',table:INK,mode:'status',status:500}
      : variant==='drop-before' ? {method:'DELETE',table:INK,mode:'drop-before'}
      : {method:'DELETE',table:INK,mode:'drop-after-commit'};
    await L.chaos(st,[regraDelete]);                            // só agora: a falha provocada espera o DELETE COMPENSATÓRIO de filaGravar()
    await s.page.waitForTimeout(1800);                          // 3-4 · espera o INSERT (1200 ms) confirmar e o DELETE compensatório disparar e falhar
    const rows=await rowsOf(u);
    if (variant==='drop-after') {
      ok(rows.length===0,'['+variant+'] 5 · o DELETE comitou de verdade antes da conexão cair — a linha já não existe (o cliente só não sabe)');
    } else {
      ok(rows.length===1,'['+variant+'] 5 · BLOCKER 1 CORRIGIDO: INSERT confirmou e o DELETE compensatório falhou sem comitar — a linha permanece no banco (nunca finge que apagou)');
    }
    const pendentes=await s.page.evaluate((uid)=>JSON.parse(localStorage.getItem('rm2.penApagarPendente.'+uid)||'[]'),u.id);
    ok(pendentes.indexOf(id)!==-1,'['+variant+'] 6 · o id entrou na fila durável de DELETE pendente (mesma infraestrutura do achado B, sem segunda implementação)');
    const tt=await toasts(s.page);
    ok(tt.some(x=>x.err&&/Se reintentará/.test(x.m)),'['+variant+'] o usuário recebe o mesmo aviso de erro/reintento do achado B ('+JSON.stringify(tt.map(x=>x.m))+')');
    ok(await L.inkCount(s.page)===0,'['+variant+'] o traço desfeito não aparece mais na tela, apesar do DELETE compensatório ter falhado');

    await L.chaos(st,[]);                                       // 7 · "conexão normaliza"
    await s.page.reload(); await s.page.waitForFunction('window.__ready===true'); await s.page.waitForTimeout(700);
    ok(await L.inkCount(s.page)===0,'['+variant+'] 8-9-10 · após recarregar: o traço desfeito NÃO reaparece (reenviarApagarPendentes roda antes do SELECT)');
    ok((await rowsOf(u)).length===0,'['+variant+'] …e a linha de fato não existe mais no banco (não é só efeito visual)');
    const pendentesDepois=await s.page.evaluate((uid)=>JSON.parse(localStorage.getItem('rm2.penApagarPendente.'+uid)||'[]'),u.id);
    ok(pendentesDepois.length===0,'['+variant+'] fila de pendentes drenada (sem resíduo)');
    await s.context.close();
  }

  console.log('== 10 · ACHADO 1 da auditoria independente (HEAD 11084b7a) CORRIGIDO: novoIdTraco() sem crypto.randomUUID nunca mais devolve "tmp-" (quebrava o INSERT na coluna uuid)');
  const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  { const {u,s}=await fresh('semrandomuuid');
    const testado=await s.page.evaluate(()=>{
      window.crypto.randomUUID = undefined;                // simula um navegador sem crypto.randomUUID
      return RMToolsV2._test.novoIdTraco();
    });
    ok(UUID_V4_RE.test(testado)&&testado.indexOf('tmp-')!==0,'sem crypto.randomUUID: novoIdTraco() ainda devolve um UUID v4 válido, nunca "tmp-" (obtido: '+testado+')');
    const r=await L.drawStroke(s.page,0);                   // a mesma página continua com randomUUID indisponível
    ok(r&&r.status===201,'sem crypto.randomUUID: desenhar grava 201 (ANTES do achado 1 o INSERT rejeitava "tmp-…" como uuid inválido) — status: '+(r&&r.status));
    const row=(await L.sql(st,'select id from public.user_ink_strokes where user_id=$1',[u.id]))[0];
    ok(row&&UUID_V4_RE.test(row.id),'a linha gravada no banco tem um UUID v4 válido na coluna id (obtido: '+(row&&row.id)+')');
    await s.context.close(); }
  { const {s}=await fresh('semcryptoalgum');
    const testado=await s.page.evaluate(()=>{
      window.crypto.randomUUID = undefined;
      window.crypto.getRandomValues = undefined;            // navegador antigo demais até para getRandomValues
      return RMToolsV2._test.novoIdTraco();
    });
    ok(UUID_V4_RE.test(testado),'sem crypto.randomUUID NEM crypto.getRandomValues (último recurso): ainda devolve um UUID v4 válido (obtido: '+testado+')');
    await s.context.close(); }

  console.log('== 11 · ACHADO 2 da auditoria independente (HEAD 11084b7a) CORRIGIDO: desfazer ANTES do commit + servidor confirma mas devolve erro — o catch também compensa');
  { const {u,s}=await fresh('corrida504');
    await L.chaos(st,[{method:'POST',table:INK,mode:'commit-then-status',status:504,delayMs:1200}]);
    await L.drawStroke(s.page,0,{wait:false});              // 1 · INSERT parte (vai comitar de verdade em 1200 ms, depois volta 504)
    const id=await s.page.evaluate(()=>{ const l=RMToolsV2.estado.strokes['semiologia-ii']||[]; return l.length?l[l.length-1].id:null; });
    ok(!!id,'traço criado localmente com id próprio (INSERT ainda em voo)');
    await s.page.evaluate(()=>RMToolsV2.desfazer());        // 2 · desfaz ANTES do commit (cancelado=true, DELETE prematuro 0 linhas)
    await s.page.waitForTimeout(1900);                      // 3 · espera o commit real (1200 ms) + o 504 + o catch rodarem
    const rows=await rowsOf(u);
    ok(rows.length===0,'CORRIGIDO: o servidor confirmou o INSERT (commit real) mas a resposta chegou como 504 — o catch ainda assim compensou, sem linha órfã (obtido: '+rows.length+')');
    await s.context.close(); }

  console.log('== 12 · UID de origem travado (auditoria independente, HEAD 11084b7a): trocar de conta no meio de uma operação em voo não redireciona a pendência');
  { const {u,s}=await fresh('uidorigem'); await L.drawStroke(s.page,0); await s.page.waitForTimeout(400); const id=(await rowsOf(u))[0].id;
    await L.chaos(st,[{method:'DELETE',table:INK,mode:'status',status:500,delayMs:1200}]);
    await L.logClear(st); await s.page.waitForTimeout(300);
    const did=await erase(s.page,id);
    ok(did,'borracha clicada (DELETE ainda em voo, atrasado 1200 ms antes de falhar)');
    const outroUid='11111111-1111-1111-1111-111111111111';
    await s.page.evaluate((outroUid)=>{ RMToolsV2.estado.uid=outroUid; },outroUid);   // troca de conta NO MEIO do DELETE em voo
    await s.page.waitForTimeout(1900);                      // espera o DELETE atrasado (1200 ms) + a falha 500 resolverem
    const log=(await L.logOf(st)).log.filter(x=>x.table===INK&&x.method==='DELETE');
    ok(log.length>=1&&log[log.length-1].q&&log[log.length-1].q.indexOf('user_id=eq.'+u.id)!==-1,'o DELETE em voo usou o UID de ORIGEM ('+u.id+'), não a conta trocada depois ('+(log[log.length-1]&&log[log.length-1].q)+')');
    const pendOriginal=await s.page.evaluate((uid)=>JSON.parse(localStorage.getItem('rm2.penApagarPendente.'+uid)||'[]'),u.id);
    ok(pendOriginal.indexOf(id)!==-1,'o id entrou na fila pendente da conta ORIGINAL, não da conta trocada');
    const pendOutraConta=await s.page.evaluate((outroUid)=>JSON.parse(localStorage.getItem('rm2.penApagarPendente.'+outroUid)||'[]'),outroUid);
    ok(pendOutraConta.length===0,'a conta trocada não recebeu nenhuma pendência que não era dela');
    await s.page.evaluate((uid)=>{ RMToolsV2.estado.uid=uid; },u.id); await s.context.close(); }

  console.log('== 13 · pontos inicial/final preservados na decimação de traços densos (auditoria independente, HEAD 11084b7a)');
  { const {s}=await fresh('extremos');
    const r=await s.page.evaluate(()=>{
      var pts=[]; for (var i=0;i<4000;i++) pts.push([Math.random(),Math.random()]);
      var primeiro=pts[0].slice(), ultimo=pts[pts.length-1].slice();
      var out=RMToolsV2._test.decimarPreservandoExtremos(pts.slice(),1200);
      return { n:out.length, igualPrimeiro: out[0][0]===primeiro[0]&&out[0][1]===primeiro[1],
        igualUltimo: out[out.length-1][0]===ultimo[0]&&out[out.length-1][1]===ultimo[1] };
    });
    ok(r.n<=1200,'decimarPreservandoExtremos() reduz para <=1200 pontos (obtido: '+r.n+')');
    ok(r.igualPrimeiro,'o PRIMEIRO ponto do array decimado é byte a byte igual ao original (antes: podia já não ser, se tamanho par)');
    ok(r.igualUltimo,'o ÚLTIMO ponto do array decimado é byte a byte igual ao original (CORRIGIDO: antes do achado, o filtro por índice par descartava o último ponto sempre que o array tinha tamanho par antes de cada passada)');
    // array de tamanho PAR explícito, para garantir que o caso que falhava antes é exercido
    const r2=await s.page.evaluate(()=>{
      var pts=[]; for (var i=0;i<3000;i++) pts.push([i,i*2]);     // tamanho par (3000), valores determinísticos
      var primeiro=pts[0].slice(), ultimo=pts[pts.length-1].slice();
      var out=RMToolsV2._test.decimarPreservandoExtremos(pts.slice(),1200);
      return { igualPrimeiro: out[0][0]===primeiro[0]&&out[0][1]===primeiro[1],
        igualUltimo: out[out.length-1][0]===ultimo[0]&&out[out.length-1][1]===ultimo[1] };
    });
    ok(r2.igualPrimeiro&&r2.igualUltimo,'caso determinístico com array de tamanho par: extremos ainda preservados (regressão direta do bug de paridade)');
    await s.context.close(); }

  await br.close(); await st.close(); process.exit(L.finish('FALHAS')?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
