/* Suíte da máquina de estados de recuperação de senha. Saída ≠ 0 se alguma verificação falhar. */
const {chromium,newSession,sleep,stopServer}=require('./harness.cjs');
const V='';
let fails=0,n=0; const ok=(c,m)=>{n++; if(!c){fails++;console.log('  ✗ FALHA:',m);} else console.log('  ✓',m);};
const obs=(page)=>page.evaluate(()=>{const v=id=>{const e=document.getElementById(id);return !!e&&!e.classList.contains('hidden')&&getComputedStyle(e).display!=='none'};
  const ov=document.getElementById('auth-overlay');
  return {form:!!document.getElementById('np-pass')&&v('pane-recovery'),invalid:!!document.querySelector('#pane-recovery h2')&&/Enlace no válido/.test(document.querySelector('#pane-recovery').textContent),
   confirm:!!document.getElementById('np-go'),verifying:/Verificando/.test((document.getElementById('pane-recovery')||{}).textContent||''),
   login:v('pane-login'),reset:v('pane-reset'),tabs:!!ov.querySelector('.auth-tabs')&&!ov.querySelector('.auth-tabs').classList.contains('hidden'),
   overlay:!ov.classList.contains('hidden'),loading:!document.getElementById('loading-screen').classList.contains('hidden'),msg:document.getElementById('au-msg').textContent,
   url:location.pathname+location.search+location.hash,state:(typeof RM_REC!=='undefined')?RM_REC.state:'?',
   flags:{ss:sessionStorage.getItem('rm.rec'),pend:localStorage.getItem('rm.rec.pend'),tok:!!Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k))&&!!localStorage.getItem(Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k)))}};});
const rest0=be=>be.rest.filter(x=>!/^GET (study_tools_beta|user_study_progress)$/.test(x)).length===0;   // leituras de linha PRÓPRIA já feitas por rm-tools/rm-tools-v2 quando existe sessão (pré-existente, sem efeito na tela)
const b64d=t=>Buffer.from(t.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString();
const sidOfPage=(pg)=>pg.evaluate(()=>{const k=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k)); if(!k) return ''; try{const t=JSON.parse(localStorage.getItem(k)).access_token; return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id||''}catch(e){return ''}});
const tokPresent=(pg)=>pg.evaluate(()=>{const k=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k)); return !!k&&!!localStorage.getItem(k)});
const profReqs=be=>be.rest.filter(x=>/profiles|my_active_subjects/.test(x)).length;
async function ask(s,email='aluno@ex.com'){const {page,be}=s; await page.goto(s.base); await page.waitForTimeout(500);
  await page.click('text=¿Olvidaste tu contraseña?'); await page.fill('#rs-email',email); await page.click('text=Enviar enlace'); await page.waitForTimeout(350);
  return be.lastMail();}
async function setup(b,opts={}){const s=await newSession(b,V,opts); const u=s.be.addUser({email:'aluno@ex.com',password:'velha123',active:opts.active!==false}); return {...s,u};}
async function clickLink(s,mail,o){const url=s.be.click(mail,o); await s.page.goto(url); await s.page.waitForTimeout(1500); return url;}
(async()=>{
  const b=await chromium.launch();

  console.log('== 1 · e-mail válido → link → tela de nova senha (sem entrar na plataforma)');
  let s=await setup(b); let mail=await ask(s); let o0=await obs(s.page);
  ok(/Si el e-mail está registrado/.test(o0.msg),'resposta neutra de envio: «'+o0.msg.slice(0,40)+'…»');
  ok(mail&&mail.redirect===s.base+'?recovery=1','redirectTo consistente = origin+caminho+?recovery=1 ('+(mail&&mail.redirect)+')');
  await clickLink(s,mail); let o=await obs(s.page);
  ok(o.form&&o.state==='ready','formulário «Nueva contraseña» exibido com sessão de recuperação provada');
  ok(!o.tabs,'abas Entrar/Criar conta ocultas durante a recuperação');
  ok(rest0(s.be)&&!o.loading&&!(await s.page.evaluate(()=>!!document.querySelector('.rm-resume, #main-tabs .main-tab'))),'recuperação NÃO chamou afterLogin (nenhuma consulta de perfil/matérias; só o GET study_tools_beta da V2: '+JSON.stringify(s.be.rest)+') e a plataforma não carregou');
  ok(!/access_token|recovery|type=/.test(o.url)&&o.url==='/','URL limpa (sem hash/recovery), caminho preservado: '+o.url);
  const pj=(()=>{try{return JSON.parse(o.flags.pend)}catch(e){return null}})(), sj=(()=>{try{return JSON.parse(o.flags.ss)}catch(e){return null}})(), sidA=await sidOfPage(s.page);
  ok(sj&&sj.uid===s.u.id&&sj.sid===sidA&&!!sj.t&&pj&&pj.uid===s.u.id&&pj.sid===sidA,'recuperação vinculada a UID + session_id: marca da ABA {uid,sid,t} e marca entre abas {uid,sid,t} (sid='+sidA.slice(0,6)+'…)');
  ok(!/eyJ|access_token|refresh_token/.test(String(o.flags.ss)+String(o.flags.pend)),'nenhum token em storage adicional')

  console.log('== 5/6 · senhas diferentes e senha curta bloqueiam (0 PUT)');
  await s.page.fill('#np-pass','nova12345'); await s.page.fill('#np-pass2','outra99999'); await s.page.click('#np-save'); await s.page.waitForTimeout(300);
  o=await obs(s.page); ok(s.be.puts===0&&/no coinciden/.test(o.msg)&&o.form,'diferentes: bloqueia («'+o.msg+'»)');
  await s.page.fill('#np-pass','abc'); await s.page.fill('#np-pass2','abc'); await s.page.click('#np-save'); await s.page.waitForTimeout(300);
  o=await obs(s.page); ok(s.be.puts===0&&/al menos 6/.test(o.msg)&&o.form,'curta: bloqueia («'+o.msg+'»)');

  console.log('== 12 · recarregar durante a recuperação NÃO vira login');
  await s.page.reload(); await s.page.waitForTimeout(1500); o=await obs(s.page);
  ok(o.form&&o.state==='ready'&&rest0(s.be),'reload 1: continua na tela de nova senha, 0 consultas ao banco');
  await s.page.reload(); await s.page.waitForTimeout(1500); o=await obs(s.page);
  ok(o.form&&o.state==='ready'&&rest0(s.be)&&!o.loading,'reload 2: idem');
  console.log('== B · 12b · aba NORMAL durante a recuperação: não entra na plataforma e NÃO derruba a recuperação da aba original');
  const m0=await s.page.evaluate(()=>[sessionStorage.getItem('rm.rec'),localStorage.getItem('rm.rec.pend')]);
  const p2=await s.context.newPage(); await p2.goto(s.base); await p2.waitForTimeout(1800); let o2=await obs(p2);
  ok(o2.login&&!o2.form&&!o2.loading&&rest0(s.be),'B · aba normal: cai no login (sem formulário), plataforma não carrega, 0 consultas de perfil/matérias');
  ok(/recuperación de contraseña abierta/.test(o2.msg),'B · mensagem: há recuperação aberta em outra aba (não é usada para entrar)');
  ok(o2.flags.tok&&s.be.logouts.length===0,'B · sessão compartilhada NÃO encerrada (token presente, 0 logout no servidor)');
  await p2.close(); await s.page.bringToFront(); await s.page.waitForTimeout(500); o=await obs(s.page);
  const m1=await s.page.evaluate(()=>[sessionStorage.getItem('rm.rec'),localStorage.getItem('rm.rec.pend')]);
  ok(o.form&&o.state==='ready','B · a aba original segue com a tela de nova senha válida');
  ok(m0[0]&&m0[1]&&m0[0]===m1[0]&&m0[1]===m1[1],'B · as marcas da recuperação da aba 1 (aba e entre abas) NÃO foram apagadas nem alteradas pela aba 2');
  await s.page.fill('#np-pass','nova12345'); await s.page.fill('#np-pass2','nova12345'); await s.page.click('#np-save'); await s.page.waitForTimeout(1500); o=await obs(s.page);
  ok(s.be.puts===1&&s.be.pwChanged===1&&o.login&&/Contraseña actualizada/.test(o.msg),'B · a aba original CONCLUI a troca de senha depois (1 PUT) — a outra aba não a matou');

  console.log('== 2 · nova senha válida → concluída → vai ao login (não entra sozinho)');
  // nova sessão de recuperação (a anterior foi encerrada pela aba nova)
  s=await setup(b); mail=await ask(s); await clickLink(s,mail);
  await s.page.fill('#np-pass','nova12345'); await s.page.fill('#np-pass2','nova12345'); const c0=s.be.calls.length; await s.page.click('#np-save'); await s.page.waitForTimeout(1500); o=await obs(s.page);
  ok(s.be.puts===1&&s.be.pwChanged===1,'G · 1 PUT /user e senha trocada no servidor');
  { const tail=s.be.calls.slice(c0).filter(c=>/\/auth\/v1\/(user|logout)/.test(c)&&!/OPTIONS/.test(c)); const gi=tail.indexOf('GET /auth/v1/user'), pi=tail.indexOf('PUT /auth/v1/user'), li=tail.findIndex(c=>/logout/.test(c));
    ok(gi>=0&&gi<pi&&pi<li,'G · ordem ao salvar: getUser() (confere id === UID da recuperação) → PUT → logout ('+tail.join(' › ')+')'); }
  ok(o.login&&/Contraseña actualizada/.test(o.msg)&&o.tabs,'confirmação clara + painel de login: «'+o.msg+'»');
  ok(s.be.logouts.includes('global')&&!o.flags.tok&&!o.flags.ss&&!o.flags.pend,'sessão de recuperação encerrada (signOut) e marcas limpas');
  ok(rest0(s.be)&&!o.loading,'NÃO entrou na plataforma: 0 consultas ao banco após salvar');
  ok(o.url==='/','URL sem parâmetros de recuperação: '+o.url);
  ok(await s.page.inputValue('#au-email')==='aluno@ex.com','e-mail do login pré-preenchido');
  console.log('== 3 · login com a senha nova funciona');
  await s.page.fill('#au-pass','nova12345'); await s.page.click('#pane-login >> text=Entrar'); await s.page.waitForTimeout(2500);
  o=await obs(s.page); let acc=await s.page.evaluate(()=>({a:ACCOUNT_ACTIVE,al:[...ALLOWED].sort().join(',')}));
  ok(s.be.rest.some(x=>/profiles/.test(x))&&s.be.rest.some(x=>/my_active_subjects/.test(x))&&!o.overlay,'login com a senha nova → afterLogin normal (perfil + my_active_subjects)');
  ok(acc.a===true&&acc.al==='biologia,semiologia-ii','11 · usuário aprovado mantém os mesmos acessos (ALLOWED='+acc.al+')');
  const s4=await newSession(b,V,{be:s.be}); // 4 · senha antiga deixa de funcionar
  await s4.page.goto(s4.base); await s4.page.waitForTimeout(500); await s4.page.fill('#au-email','aluno@ex.com'); await s4.page.fill('#au-pass','velha123'); const r0=s.be.rest.length; await s4.page.click('#pane-login >> text=Entrar'); await s4.page.waitForTimeout(800);
  o=await obs(s4.page); ok(/incorrectos/.test(o.msg)&&s.be.rest.length===r0,'4 · senha antiga rejeitada («'+o.msg.slice(0,36)+'…»), sem acesso');

  console.log('== 10 · usuário NÃO aprovado continua não aprovado');
  s=await setup(b,{active:false}); mail=await ask(s); await clickLink(s,mail);
  ok(rest0(s.be),'recuperação de conta pendente: 0 consultas (nada de acesso)');
  await s.page.fill('#np-pass','nova12345'); await s.page.fill('#np-pass2','nova12345'); await s.page.click('#np-save'); await s.page.waitForTimeout(1500);
  await s.page.fill('#au-pass','nova12345'); await s.page.click('#pane-login >> text=Entrar'); await s.page.waitForTimeout(2000);
  const pend=await s.page.evaluate(()=>({t:document.body.textContent.includes('Cuenta pendiente de aprobación'),a:ACCOUNT_ACTIVE}));
  ok(pend.t&&pend.a===false&&!s.be.rest.some(x=>/my_active_subjects/.test(x)),'após trocar a senha e logar: continua «Cuenta pendiente de aprobación», sem liberar matérias');

  console.log('== 7 · link expirado → mensagem amigável + pedir novo link');
  s=await setup(b); mail=await ask(s); s.be.expire(mail); await clickLink(s,mail); o=await obs(s.page);
  ok(o.invalid&&!o.form&&o.state==='invalid','tela «Enlace no válido» (sem formulário)');
  ok(await s.page.locator('text=Solicitar un nuevo enlace').count()===1&&/venció o ya fue usado/.test(await s.page.locator('#pane-recovery').textContent()),'mensagem amigável + botão «Solicitar un nuevo enlace»');
  ok(o.url==='/'&&s.be.puts===0,'URL limpa e 0 PUT');
  await s.page.click('text=Solicitar un nuevo enlace'); await s.page.waitForTimeout(300); o=await obs(s.page);
  ok(o.reset&&o.tabs&&o.state==='idle','botão volta à tela de recuperação (pedido de e-mail) e limpa o estado');
  await s.page.fill('#rs-email','aluno@ex.com'); await s.page.click('text=Enviar enlace'); await s.page.waitForTimeout(400);
  await s.page.goto(s.be.click(s.be.lastMail())); await s.page.waitForTimeout(1500); o=await obs(s.page); ok(o.form,'com o NOVO link o fluxo funciona até a tela de nova senha');

  console.log('== 8 · link já utilizado (outro navegador, sem sessão) → mensagem amigável');
  s=await setup(b); mail=await ask(s); await clickLink(s,mail);                              // 1.º clique consome o token
  const sB=await newSession(b,V,{be:s.be}); await sB.page.goto(s.be.click(mail)); await sB.page.waitForTimeout(1500); o=await obs(sB.page);
  ok(o.invalid&&!o.form,'2.º clique em navegador sem sessão: «Enlace no válido» (usado)');
  console.log('== 8b · F · 2.º clique: MESMA aba retoma; OUTRA aba do mesmo navegador falha fechada e amigável');
  await s.page.goto(s.be.click(mail)); await s.page.waitForTimeout(1500); o=await obs(s.page);
  ok(o.form&&o.state==='ready','F · 2.º clique na MESMA aba: retoma a tela de nova senha (marca da aba + sessão com o mesmo UID)');
  const sC=await newSession(b,V,{be:s.be,ctx:s.context}); await sC.page.goto(s.be.click(mail)); await sC.page.waitForTimeout(1500); o=await obs(sC.page);
  ok(o.invalid&&!o.form&&/venció o ya fue usado/.test(await sC.page.locator('#pane-recovery').textContent())&&await sC.page.locator('text=Solicitar un nuevo enlace').count()===1,'F · 2.º clique em OUTRA aba: «Enlace no válido» amigável + «Solicitar un nuevo enlace» (não adota por localStorage)');
  ok(o.flags.tok&&s.be.logouts.length===0,'F · …e a sessão compartilhada segue intocada');
  await sC.page.close();

  console.log('== 9 · ?recovery=1 manual sem token/sessão NÃO permite updateUser');
  s=await setup(b); await s.page.goto(s.base+'?recovery=1'); await s.page.waitForTimeout(1200); o=await obs(s.page);
  ok(o.invalid&&!o.form&&o.state==='invalid','tela «Enlace no válido», sem formulário');
  const r=await s.page.evaluate(async()=>{try{await doNewPassword();}catch(e){return 'erro:'+e.message} return 'ok'}); await s.page.waitForTimeout(400);
  ok(s.be.puts===0&&rest0(s.be),'chamar doNewPassword() à força não chega ao servidor (0 PUT, 0 consultas)');
  console.log('   9b · usuário já logado abre ?recovery=1 manualmente');
  const s9=await setup(b); await s9.page.goto(s9.base); await s9.page.waitForTimeout(400); await s9.page.fill('#au-email','aluno@ex.com'); await s9.page.fill('#au-pass','velha123'); await s9.page.click('#pane-login >> text=Entrar'); await s9.page.waitForTimeout(2000);
  await s9.page.goto(s9.base+'?recovery=1'); await s9.page.waitForTimeout(1200); o=await obs(s9.page);
  ok(o.invalid&&!o.form&&s9.be.puts===0,'sessão comum + ?recovery=1 manual: sem formulário, 0 PUT (não troca senha sem prova de recuperação)');
  await s9.page.click('text=← Volver a entrar'); await s9.page.waitForTimeout(2000); o=await obs(s9.page);
  ok(!o.overlay,'«Volver» recarrega no fluxo normal (sessão comum preservada)');

  console.log('== extras · formatos de retorno e bordas');
  s=await setup(b); mail=await ask(s); await s.page.goto('about:blank'); await clickLink(s,mail,{siteFallback:s.base}); o=await obs(s.page); ok(o.form,'implicit/hash sem ?recovery=1 (fallback para a Site URL): detectado só pelo type=recovery + sessão → formulário');
  s=await setup(b); mail=await ask(s); await s.page.goto(s.base+'?recovery=1&token_hash='+mail.token+'&type=recovery'); await s.page.waitForTimeout(1200); o=await obs(s.page);
  ok(o.confirm&&!o.form&&!s.be.calls.some(c=>/POST \/auth\/v1\/verify/.test(c)),'token_hash: mostra «Continuar» e NÃO gasta o token ao abrir a página');
  await s.page.click('#np-go'); await s.page.waitForTimeout(1200); o=await obs(s.page); ok(o.form&&o.state==='ready','token_hash: após «Continuar» → verifyOtp → tela de nova senha');
  s=await setup(b); mail=await ask(s); s.be.expire(mail); await s.page.goto(s.base+'?recovery=1&token_hash='+mail.token+'&type=recovery'); await s.page.waitForTimeout(800); await s.page.click('#np-go'); await s.page.waitForTimeout(1200); o=await obs(s.page); ok(o.invalid,'token_hash vencido → «Enlace no válido»');
  s=await setup(b); await s.page.goto(s.base+'?recovery=1&code=abc123'); await s.page.waitForTimeout(1500); o=await obs(s.page); ok(o.invalid&&!o.form&&s.be.puts===0,'retorno PKCE (?code) sem verificador/troca inválida → «Enlace no válido», 0 PUT');
  s=await setup(b); mail=await ask(s); await clickLink(s,mail); s.be.sessions.forEach(v=>v.alive=false);            // sessão morre no servidor antes de salvar
  await s.page.fill('#np-pass','nova12345'); await s.page.fill('#np-pass2','nova12345'); await s.page.click('#np-save'); await s.page.waitForTimeout(1200); o=await obs(s.page);
  ok(o.invalid&&s.be.puts===0,'sessão inválida na hora de salvar: NÃO tenta silenciosamente, mostra «Enlace no válido» (0 PUT)');
  s=await setup(b); s.be.minLen=8; mail=await ask(s); await clickLink(s,mail); await s.page.fill('#np-pass','abcdef'); await s.page.fill('#np-pass2','abcdef'); await s.page.click('#np-save'); await s.page.waitForTimeout(900); o=await obs(s.page);
  ok(o.form&&/requisitos/.test(o.msg)&&!(await s.page.locator('#np-save').isDisabled()),'regra do projeto mais forte que 6: mostra a exigência do servidor e permite corrigir');
  s=await setup(b); mail=await ask(s); await clickLink(s,mail); await s.page.fill('#np-pass','velha123'); await s.page.fill('#np-pass2','velha123'); await s.page.click('#np-save'); await s.page.waitForTimeout(900); o=await obs(s.page); ok(o.form&&/distinta/.test(o.msg),'mesma senha → mensagem em castelhano');
  s=await setup(b); mail=await ask(s); await clickLink(s,mail); await s.page.fill('#np-pass','nova12345'); await s.page.fill('#np-pass2','nova12345'); await s.page.evaluate(()=>{document.getElementById('np-save').click();document.getElementById('np-save').click();}); await s.page.waitForTimeout(1500); ok(s.be.puts===1,'duplo toque em «Guardar»: 1 único PUT');
  s=await setup(b); s.be.recoverStatus=429; await s.page.goto(s.base); await s.page.click('text=¿Olvidaste tu contraseña?'); await s.page.fill('#rs-email','aluno@ex.com'); await s.page.click('text=Enviar enlace'); await s.page.waitForTimeout(500); o=await obs(s.page); ok(/varios pedidos/.test(o.msg),'429 (limite de e-mails): mensagem amigável');
  s=await setup(b); await s.page.goto(s.base); await s.page.click('text=¿Olvidaste tu contraseña?'); await s.page.fill('#rs-email','ninguem@ex.com'); await s.page.click('text=Enviar enlace'); await s.page.waitForTimeout(500); o=await obs(s.page); ok(/Si el e-mail está registrado/.test(o.msg)&&s.be.mails.length===0,'e-mail inexistente: MESMA resposta neutra, nenhum e-mail gerado');
  s=await setup(b); mail=await ask(s); await clickLink(s,mail); await s.page.fill('#np-pass','nova12345'); await s.page.fill('#np-pass2','nova12345'); await s.page.click('#np-save'); await s.page.waitForTimeout(1200);
  const bad=s.con.filter(x=>/eyJ|access_token|refresh_token|tok\d/.test(x)); ok(bad.length===0&&s.errs.length===0,'console sem tokens/sessão/URL completa e sem erros JS ('+s.con.length+' linhas, '+s.errs.length+' erros)');
  s=await setup(b); mail=await ask(s); await clickLink(s,mail); await s.page.click('text=Cancelar'); await s.page.waitForTimeout(500); o=await obs(s.page);
  ok(o.login&&o.state==='idle'&&!o.flags.tok&&s.be.puts===0,'«Cancelar» na tela de nova senha: encerra a sessão de recuperação e volta ao login (0 PUT)');

  console.log('== ISOLAMENTO · recuperação vinculada a UID + session_id');
  const loginUI=async(ss,email,pw)=>{ await ss.page.goto(ss.base); await ss.page.waitForTimeout(500); await ss.page.fill('#au-email',email); await ss.page.fill('#au-pass',pw); await ss.page.click('#pane-login >> text=Entrar'); await ss.page.waitForTimeout(2200); };
  const KEY=async(pg)=>pg.evaluate(()=>Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k)));
  const setPend=(pg,uid,sid,age)=>pg.evaluate(([u,i,a])=>localStorage.setItem('rm.rec.pend',JSON.stringify({uid:u,sid:i,t:Date.now()-a})),[uid,sid,age]);
  const swapStorage=async(pg,val)=>{ const k=await KEY(pg); await pg.evaluate(([kk,v])=>localStorage.setItem(kk,v),[k,val]); };   // troca a sessão SEM evento (o storage event só dispara em OUTRAS abas)
  const sessionValue=async(be,email,pw)=>{ const x=await newSession(b,V,{be}); await loginUI(x,email,pw); const v=await x.page.evaluate(()=>localStorage.getItem(Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k)))); await x.context.close(); return v; };
  const subj=be=>be.rest.filter(x=>/my_active_subjects/.test(x)).length;
  const newRec=async(withB)=>{ const x=await setup(b); const uBx=withB?x.be.addUser({email:'b@ex.com',password:'senhaB123'}):null; const m=await ask(x); await clickLink(x,m); return {x,uBx,m}; };

  // B1 · A em recuperação; a sessão compartilhada passa a B (login de B em outra aba); depois reload da aba 1
  let {x:R,uBx:uB}=await newRec(true); ok((await obs(R.page)).form,'B · recuperação de A aberta (aba 1)');
  const pB=await R.context.newPage(); await loginUI({page:pB,base:R.base},'b@ex.com','senhaB123'); const sidB1=await sidOfPage(pB);
  await R.page.bringToFront(); await R.page.waitForTimeout(1500); o=await obs(R.page);
  ok(o.invalid&&!o.form,'B1 · sessão compartilhada passou a B: a aba de recuperação fecha o formulário (falha fechada)');
  await R.page.reload(); await R.page.waitForTimeout(1800); o=await obs(R.page);
  ok(!o.form&&R.be.puts===0&&!R.be.pwChanged&&uB.password==='senhaB123','B1 · reload da aba 1: B NUNCA é adotado como recuperação (sem formulário, 0 PUT, senhas intactas)');
  ok(R.be.logouts.length===0&&await tokPresent(R.page)&&(await sidOfPage(R.page))===sidB1,'B1 · a sessão de B não foi deslogada (mesma session_id, 0 logout no servidor)');
  await pB.close();
  // B2 · mesmo cenário, mas com a MARCA DA ABA INTACTA (troca de sessão sem evento) e depois reload: o ponto que o blocker exigia
  ({x:R}=await newRec(true)); const valB=await sessionValue(R.be,'b@ex.com','senhaB123'); const sidBv=JSON.parse(valB).access_token.split('.')[1]; const sidB2=JSON.parse(b64d(sidBv)).session_id;
  const tabMark=await R.page.evaluate(()=>sessionStorage.getItem('rm.rec')); ok(!!tabMark,'B2 · marca da aba 1 presente');
  await swapStorage(R.page,valB); await R.page.reload(); await R.page.waitForTimeout(1800); o=await obs(R.page);
  ok(!o.form&&o.invalid&&R.be.puts===0&&!R.be.pwChanged,'B2 · marca da aba (UID A) + sessão de B + reload: NÃO adota B, NÃO mostra formulário, 0 PUT');
  ok(R.be.logouts.length===0&&(await sidOfPage(R.page))===sidB2&&!(await R.page.evaluate(()=>sessionStorage.getItem('rm.rec'))),'B2 · B NÃO é deslogado (mesma sessão, 0 logout); a marca inválida da aba foi descartada');
  // C · marca global fresca (inclusive a pior: coincide com a sessão) + sessão comum de B
  R=await setup(b); const uBc=R.be.addUser({email:'b@ex.com',password:'senhaB123'}); await loginUI(R,'b@ex.com','senhaB123'); const sidBc=await sidOfPage(R.page);
  await setPend(R.page,uBc.id,sidBc,1000);
  for(const [nome,url,rx] of [['?recovery=1','?recovery=1',/validar|venció/],['#error=otp_expired','?recovery=1#error=access_denied&error_code=otp_expired&error_description=x',/venció|usado/],['?code=lixo','?recovery=1&code=lixo',/validar|venció/]]){
    await R.page.goto('about:blank'); await R.page.goto(R.base+url); await R.page.waitForTimeout(1600); o=await obs(R.page);
    ok(o.invalid&&!o.form&&rx.test(await R.page.locator('#pane-recovery').textContent())&&R.be.puts===0,'C · '+nome+' + marca global fresca + sessão comum de B: «Enlace no válido» amigável, SEM formulário, 0 PUT');
    ok(await tokPresent(R.page)&&(await sidOfPage(R.page))===sidBc&&R.be.logouts.length===0&&!!(await R.page.evaluate(()=>localStorage.getItem('rm.rec.pend'))),'C · '+nome+': B segue logado (mesma session_id), 0 logout, marca global não apagada por quem não a criou');
  }
  // D · sessionStorage de recuperação de A + sessão de B
  await R.page.evaluate(u=>sessionStorage.setItem('rm.rec',JSON.stringify({uid:u,sid:'s-de-A',t:Date.now()})),R.u.id); await R.page.goto('about:blank'); await R.page.goto(R.base); await R.page.waitForTimeout(1600); o=await obs(R.page);
  ok(o.invalid&&!o.form&&R.be.puts===0&&await tokPresent(R.page)&&(await sidOfPage(R.page))===sidBc&&R.be.logouts.length===0,'D · sessionStorage de recuperação (UID A) + sessão de B: SEM formulário, 0 PUT, B intocado');
  // F2 · mesmo UID, session_id DIFERENTE (marca da aba de B com sid antigo + sessão de B atual)
  await R.page.evaluate(u=>sessionStorage.setItem('rm.rec',JSON.stringify({uid:u,sid:'sid-antiga',t:Date.now()})),uBc.id); await R.page.goto('about:blank'); await R.page.goto(R.base); await R.page.waitForTimeout(1600); o=await obs(R.page);
  ok(o.invalid&&!o.form&&R.be.puts===0&&(await sidOfPage(R.page))===sidBc&&R.be.logouts.length===0,'F · marca da aba com o MESMO UID mas OUTRA session_id + sessão atual: não aceita em silêncio (sem formulário, 0 PUT, sessão intocada)');
  await R.page.evaluate(()=>{localStorage.removeItem('rm.rec.pend'); sessionStorage.setItem('rm.rec','1')}); await R.page.goto('about:blank'); await R.page.goto(R.base); await R.page.waitForTimeout(2000); o=await obs(R.page);
  ok(!o.form&&!o.invalid&&!o.overlay,'D · marca antiga (valor «1» / só UID, sem session_id) não autoriza nada: fluxo normal');
  // F1 · ao vivo: A em recuperação; A entra normalmente em outra aba (MESMO UID, sessão NOVA)
  ({x:R}=await newRec(false)); const pA=await R.context.newPage(); await loginUI({page:pA,base:R.base},'aluno@ex.com','velha123'); const sidNew=await sidOfPage(pA);
  await R.page.bringToFront(); await R.page.waitForTimeout(1500); o=await obs(R.page);
  ok(o.invalid&&!o.form&&R.be.puts===0,'F1 · mesmo UID A com NOVA session_id (login em outra aba): a recuperação antiga NÃO é aceita em silêncio; formulário fecha, 0 PUT');
  ok(R.be.logouts.length===0&&(await sidOfPage(R.page))===sidNew,'F1 · a sessão nova de A não foi encerrada'); await pA.close();
  // F2 · mesmo UID com sessão nova trocada SEM evento + reload (marca da aba intacta)
  ({x:R}=await newRec(false)); const valA2=await sessionValue(R.be,'aluno@ex.com','velha123'); const sidA2=JSON.parse(b64d(JSON.parse(valA2).access_token.split('.')[1])).session_id;
  await swapStorage(R.page,valA2); await R.page.reload(); await R.page.waitForTimeout(1800); o=await obs(R.page);
  ok(o.invalid&&!o.form&&R.be.puts===0&&(await sidOfPage(R.page))===sidA2&&R.be.logouts.length===0,'F2 · marca da aba (A, sid antiga) + sessão de A com OUTRA session_id + reload: falha fechada, 0 PUT, sessão intocada');
  // G · a sessão muda DEPOIS de abrir o formulário e ANTES de tocar «Guardar» (sem evento)
  ({x:R,uBx:uB}=await newRec(true)); const valBg=await sessionValue(R.be,'b@ex.com','senhaB123'); await swapStorage(R.page,valBg);
  await R.page.fill('#np-pass','nova12345'); await R.page.fill('#np-pass2','nova12345'); await R.page.click('#np-save'); await R.page.waitForTimeout(1200); o=await obs(R.page);
  ok(o.invalid&&!o.form&&R.be.puts===0&&!R.be.pwChanged&&uB.password==='senhaB123'&&R.be.logouts.length===0,'G1 · sessão trocou para B antes de Guardar: 0 PUT, B intacto, nenhum logout alheio');
  ({x:R}=await newRec(false)); await swapStorage(R.page,await sessionValue(R.be,'aluno@ex.com','velha123'));
  await R.page.fill('#np-pass','nova12345'); await R.page.fill('#np-pass2','nova12345'); await R.page.click('#np-save'); await R.page.waitForTimeout(1200); o=await obs(R.page);
  ok(o.invalid&&!o.form&&R.be.puts===0&&!R.be.pwChanged&&R.be.logouts.length===0,'G2 · sessão de A trocou por OUTRA sessão de A antes de Guardar: 0 PUT, nenhum logout');
  // D-marca · marca entre abas {uid,sid,t}: só NEGA a entrada, nunca libera formulário nem encerra sessão
  R=await setup(b); const uBd=R.be.addUser({email:'b@ex.com',password:'senhaB123'}); await loginUI(R,'b@ex.com','senhaB123'); const sidBd=await sidOfPage(R.page);
  await setPend(R.page,R.u.id,'qualquer-sid',1000); let sA=subj(R.be); await R.page.goto(R.base); await R.page.waitForTimeout(2200); o=await obs(R.page);
  ok(!o.form&&!o.invalid&&subj(R.be)>sA,'D1 · marca fresca de OUTRO usuário + sessão comum de B: sem formulário; B entra normalmente (marca alheia ignorada)');
  await setPend(R.page,uBd.id,'outra-sessao-de-B',1000); sA=subj(R.be); await R.page.goto(R.base); await R.page.waitForTimeout(2200);
  ok(subj(R.be)>sA,'D2 · marca do MESMO usuário mas de OUTRA session_id: não bloqueia a sessão atual (entra normalmente)');
  await setPend(R.page,uBd.id,sidBd,1000); sA=subj(R.be); await R.page.goto(R.base); await R.page.waitForTimeout(1800); o=await obs(R.page);
  ok(!o.form&&o.login&&subj(R.be)===sA&&await tokPresent(R.page)&&R.be.logouts.length===0&&!!(await R.page.evaluate(()=>localStorage.getItem('rm.rec.pend'))),'D3 · marca = EXATAMENTE esta sessão (uid+sid): NÃO entra na plataforma, sem formulário, sessão intocada (0 logout) e marca preservada');
  await setPend(R.page,uBd.id,sidBd,2*3600e3); sA=subj(R.be); await R.page.goto(R.base); await R.page.waitForTimeout(1800); o=await obs(R.page);
  ok(!o.form&&o.login&&subj(R.be)===sA&&await tokPresent(R.page)&&R.be.logouts.length===0,'D4 · mesmo após o prazo do link, uma aba normal NÃO encerra a sessão (apenas não a usa para entrar)');
  await R.page.evaluate(()=>{document.getElementById('au-email').value='b@ex.com'}); await R.page.fill('#au-pass','senhaB123'); await R.page.click('#pane-login >> text=Entrar'); await R.page.waitForTimeout(2200);
  ok(subj(R.be)>sA&&!(await R.page.evaluate(()=>localStorage.getItem('rm.rec.pend'))),'D5 · login com a SENHA entra normalmente e encerra a marca');
  await setPend(R.page,R.u.id,'xyz',2*3600e3); sA=subj(R.be); await R.page.goto(R.base); await R.page.waitForTimeout(2200);
  ok(subj(R.be)>sA&&!(await R.page.evaluate(()=>localStorage.getItem('rm.rec.pend'))),'D6 · marca VENCIDA que já não corresponde a nenhuma sessão: limpa por higiene, sem tocar na sessão');

  console.log('== 14 · regressão: cadastro, login, logout');
  s=await setup(b); await s.page.goto(s.base); await s.page.waitForTimeout(500); o=await obs(s.page); ok(o.overlay&&o.login&&o.tabs&&o.state==='idle','acesso normal sem sessão: tela de login habitual');
  await s.page.click('#tab-signup'); await s.page.fill('#su-name','Novo Aluno'); await s.page.fill('#su-email','novo@ex.com'); await s.page.fill('#su-phone','981234567'); await s.page.fill('#su-pass','senha123'); await s.page.fill('#su-pass2','senha123'); await s.page.click('text=Crear cuenta'); await s.page.waitForTimeout(1200); o=await obs(s.page);
  ok(s.be.signups===1&&/Cuenta creada/.test(o.msg),'cadastro funciona («'+o.msg.slice(0,34)+'…»)');
  s=await setup(b); await s.page.goto(s.base); await s.page.waitForTimeout(400); await s.page.fill('#au-email','aluno@ex.com'); await s.page.fill('#au-pass','velha123'); await s.page.click('#pane-login >> text=Entrar'); await s.page.waitForTimeout(2200);
  ok(s.be.rest.some(x=>/my_active_subjects/.test(x)),'login normal → afterLogin');
  await s.page.reload(); await s.page.waitForTimeout(2200); ok(s.be.rest.filter(x=>/profiles/.test(x)).length>=2,'recarregar com sessão comum entra direto (init normal)');
  const lo=s.be.logouts.length; await s.page.evaluate(()=>{doLogout()}); await s.page.waitForTimeout(1800); o=await obs(s.page); ok(s.be.logouts.length>lo&&o.overlay&&o.login,'logout → sessão encerrada e volta ao login');

  console.log('== 13 · desktop / mobile');
  for(const [w,h] of [[1440,900],[1024,768],[768,1024],[390,844],[320,640]]){
    s=await setup(b,{viewport:{width:w,height:h}}); mail=await ask(s); await clickLink(s,mail);
    const lay=await s.page.evaluate(()=>{const r=e=>{const b=document.querySelector(e).getBoundingClientRect();return {t:b.top,b:b.bottom,l:b.left,r:b.right}};const ov=document.getElementById('auth-overlay');return {save:r('#np-save'),p2:r('#np-pass2'),vw:innerWidth,vh:innerHeight,hov:document.documentElement.scrollWidth>document.documentElement.clientWidth,scroll:getComputedStyle(ov).overflowY,oh:ov.scrollHeight,ch:ov.clientHeight}});
    ok(lay.save.l>=0&&lay.save.r<=lay.vw&&!lay.hov&&(lay.save.b<=lay.vh||lay.oh>lay.ch),`${w}×${h}: formulário dentro da tela, sem overflow horizontal, botão ${lay.save.b<=lay.vh?'visível':'alcançável por rolagem'}`);
    if(process.env.RM_SHOTS) await s.page.screenshot({path:`${process.env.RM_SHOTS}/recovery_ready_${w}.png`});
    if(w===390){ const t=await setup(b,{viewport:{width:w,height:h}}); const m2=await ask(t); t.be.expire(m2); await clickLink(t,m2); if(process.env.RM_SHOTS) await t.page.screenshot({path:process.env.RM_SHOTS+'/recovery_invalid_390.png'}); }
  }
  await b.close(); stopServer(); console.log(`\nRECUPERAÇÃO DE SENHA: ${n-fails}/${n} verificações OK`+(fails?` — ${fails} FALHAS`:'')); process.exit(fails?1:0);
})();
