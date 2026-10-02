/* 07 · Caminho do PILOTO (José + Semiología II) após a #416 («primeira tinta síncrona no contacto»).
   Os usuários comuns das outras suítes NÃO passam por este código (gate `pilotoPermitido()`); aqui a conta de teste usa o
   UID do José (já presente na migration) contra o banco isolado. Eventos pointerType=pen SINTÉTICOS: provam a rota de código
   e a persistência, NÃO a latência/hardware reais. Compara com um usuário comum nas mesmas operações. */
const L=require('./lib.cjs'); const {ok,info}=L;
const JOSE='d4d215d3-36dd-4efb-8869-bdea5376c648';
const pen=(page,idx)=>page.evaluate((idx)=>{ const ps=[...document.querySelectorAll('#materias-container section[id] p')].filter(x=>x.textContent.length>150&&x.getBoundingClientRect().height>=50); const e=ps[idx%ps.length]; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); const mk=(t,x,y,p)=>new PointerEvent(t,{pointerType:'pen',pointerId:9,isPrimary:true,clientX:x,clientY:y,pressure:p,buttons:p?1:0,bubbles:true,cancelable:true,composed:true}); const x0=r.left+r.width*0.2,y0=r.top+r.height/2; const n=()=>document.querySelectorAll('#rm2-ink path').length; const n0=n(); e.dispatchEvent(mk('pointerdown',x0,y0,0.5)); const nDown=n(); document.dispatchEvent(mk('pointermove',x0+9,y0+3,0.5)); const nMove=n(); for(let k=2;k<=16;k++) document.dispatchEvent(mk('pointermove',x0+k*9,y0+Math.sin(k/2)*10,0.5)); document.dispatchEvent(mk('pointerup',x0+150,y0,0)); return {n0,nDown,nMove}; },idx);
(async()=>{
  const st=await L.startStack(); const br=await L.pw().launch();
  await L.sql(st,'delete from public.user_ink_strokes where user_id=$1',[JOSE]);   // UID fixo: limpa o estado da execução anterior (banco ISOLADO)
  const J=await L.mkUser(st,'jose',{id:JOSE}); const C=await L.mkUser(st,'comum');
  for(const [nome,u] of [['conta do José (piloto)',J],['usuário comum',C]]){
    console.log('== '+nome);
    const s=await L.session(br,st,u); const pilot=await s.page.evaluate(()=>RMToolsV2._test.pilotoPermitido());
    ok(pilot===(u===J),'pilotoPermitido() = '+pilot+(u===J?' (esperado: true)':' (esperado: false)'));
    await s.page.evaluate(()=>RMToolsV2.escolherFerramenta('pen')); const out=[];
    for(let i=0;i<3;i++){ const resp=s.page.waitForResponse(r=>/user_ink_strokes/.test(r.url())&&r.request().method()==='POST',{timeout:8000}).catch(()=>null); const m=await pen(s.page,i*3); const r=await resp; out.push({m,status:r&&r.status()}); await s.page.waitForTimeout(300); }
    ok(out.every(o=>o.status===201),'3 traços (stylus sintético) → 3 respostas 201 ('+out.map(o=>o.status)+')');
    info('tinta no DOM: antes do contato '+out[0].m.n0+' → logo após pointerdown '+out[0].m.nDown+' → após o 1º movimento '+out[0].m.nMove+' (síncrono, mesma tarefa)');
    ok(out[0].m.nDown>out[0].m.n0||out[0].m.nMove>out[0].m.n0,'a tinta existe na mesma tarefa do contato/1º movimento'+(u===J?' (piloto; o ganho de latência da #416 só é mensurável em HARDWARE — em emulação a conta comum mostra o mesmo)':''));
    await s.page.waitForTimeout(400); ok(await L.countStrokes(st,u.id)===3,'3 linhas no banco (observação superuser)'); ok(await L.pendingCount(s.page)===0,'nenhum indicador "não salvo" restou');
    const ids=await L.inkIds(s.page); await s.context.close();
    const s2=await L.session(br,st,u); ok(JSON.stringify(await L.inkIds(s2.page))===JSON.stringify(ids)&&ids.length===3,'sessão independente (login novo) carrega os MESMOS 3 ids');
    // desfazer + borracha com este usuário
    await s2.page.evaluate(()=>RMToolsV2.escolherFerramenta('pen')); const before=await L.countStrokes(st,u.id);
    const rows=await L.sql(st,'select id from public.user_ink_strokes where user_id=$1 order by created_at',[u.id]);
    const erased=await L.eraseStroke(s2.page,rows[0].id); await s2.page.waitForTimeout(900); const after=await L.countStrokes(st,u.id);
    ok(erased&&after===before-1,'borracha apaga no banco ('+before+' → '+after+')'); await s2.page.evaluate(()=>RMToolsV2.desfazer()); await s2.page.waitForTimeout(1000); ok(await L.countStrokes(st,u.id)===before,'desfazer da borracha restaura ('+before+')');
    const al=await s2.page.evaluate(()=>{ const out=[]; document.querySelectorAll('#rm2-ink svg[data-anchor]').forEach(sv=>{ const a=sv.getAttribute('data-anchor').split('>'); const sec=document.getElementById(a[0]); const el=a[1]!==undefined?sec.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+a[1]]:sec; const r=el.getBoundingClientRect(),q=sv.getBoundingClientRect(); out.push(Math.max(Math.abs(q.left-r.left),Math.abs(q.width-r.width),Math.abs(q.height-r.height))); }); return Math.max(...out); });
    ok(al<=1.5,'alinhamento horizontal/tamanho exato após recarregar (máx. '+al.toFixed(2)+' px)');
    const errs=[...s.errs,...s2.errs].filter(e=>!/Failed to load resource/.test(e)); ok(errs.length===0,'0 erros JS'); await s2.context.close(); }
  await br.close(); await st.close(); process.exit(L.finish('CAMINHO DO PILOTO (#416)')?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
