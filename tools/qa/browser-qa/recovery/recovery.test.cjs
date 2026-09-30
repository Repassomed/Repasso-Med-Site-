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
  ok(o.flags.ss==='1'&&!!o.flags.pend,'marcas de recuperação (sem token) gravadas');

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
  console.log('== 12b · sessão de recuperação esquecida (outra aba / aba nova) NÃO vira login');
  const p2=await s.context.newPage(); await p2.goto(s.base); await p2.waitForTimeout(1800); let o2=await obs(p2);
  ok(o2.login&&!o2.loading&&rest0(s.be),'aba nova sem a marca: cai no login, plataforma não carrega, 0 consultas ('+o2.msg.slice(0,48)+'…)');
  ok(!o2.flags.tok&&!o2.flags.pend,'sessão de recuperação esquecida foi encerrada neste navegador');
  await p2.close();

  console.log('== 2 · nova senha válida → concluída → vai ao login (não entra sozinho)');
  // nova sessão de recuperação (a anterior foi encerrada pela aba nova)
  s=await setup(b); mail=await ask(s); await clickLink(s,mail);
  await s.page.fill('#np-pass','nova12345'); await s.page.fill('#np-pass2','nova12345'); await s.page.click('#np-save'); await s.page.waitForTimeout(1500); o=await obs(s.page);
  ok(s.be.puts===1&&s.be.pwChanged===1,'1 PUT /user e senha trocada no servidor');
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
  console.log('== 8b · 2.º clique no MESMO navegador (sessão legítima ainda existe) → retoma, não fica morto');
  const sC=await newSession(b,V,{be:s.be,ctx:s.context}); await sC.page.goto(s.be.click(mail)); await sC.page.waitForTimeout(1500); o=await obs(sC.page);
  ok(o.form&&o.state==='ready','mesmo navegador: retoma a tela de nova senha com a sessão de recuperação já aberta');

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

  console.log('== 14 · regressão: cadastro, login, logout');
  s=await setup(b); await s.page.goto(s.base); await s.page.waitForTimeout(500); o=await obs(s.page); ok(o.overlay&&o.login&&o.tabs&&o.state==='idle','acesso normal sem sessão: tela de login habitual');
  await s.page.click('#tab-signup'); await s.page.fill('#su-name','Novo Aluno'); await s.page.fill('#su-email','novo@ex.com'); await s.page.fill('#su-phone','981234567'); await s.page.fill('#su-pass','senha123'); await s.page.fill('#su-pass2','senha123'); await s.page.click('text=Crear cuenta'); await s.page.waitForTimeout(1200); o=await obs(s.page);
  ok(s.be.signups===1&&/Cuenta creada/.test(o.msg),'cadastro funciona («'+o.msg.slice(0,34)+'…»)');
  s=await setup(b); await s.page.goto(s.base); await s.page.waitForTimeout(400); await s.page.fill('#au-email','aluno@ex.com'); await s.page.fill('#au-pass','velha123'); await s.page.click('#pane-login >> text=Entrar'); await s.page.waitForTimeout(2200);
  ok(s.be.rest.some(x=>/my_active_subjects/.test(x)),'login normal → afterLogin');
  await s.page.reload(); await s.page.waitForTimeout(2200); ok(s.be.rest.filter(x=>/profiles/.test(x)).length>=2,'recarregar com sessão comum entra direto (init normal)');
  const lo=s.be.logouts.length; await s.page.evaluate(()=>{doLogout()}); await s.page.waitForTimeout(1800); o=await obs(s.page); ok(s.be.logouts.length>lo&&o.overlay&&o.login,'logout → sessão encerrada e volta ao login');

  console.log('== 13 · desktop / mobile');
  for(const [w,h] of [[1440,900],[390,844],[320,640]]){
    s=await setup(b,{viewport:{width:w,height:h}}); mail=await ask(s); await clickLink(s,mail);
    const lay=await s.page.evaluate(()=>{const r=e=>{const b=document.querySelector(e).getBoundingClientRect();return {t:b.top,b:b.bottom,l:b.left,r:b.right}};const ov=document.getElementById('auth-overlay');return {save:r('#np-save'),p2:r('#np-pass2'),vw:innerWidth,vh:innerHeight,hov:document.documentElement.scrollWidth>document.documentElement.clientWidth,scroll:getComputedStyle(ov).overflowY,oh:ov.scrollHeight,ch:ov.clientHeight}});
    ok(lay.save.l>=0&&lay.save.r<=lay.vw&&!lay.hov&&(lay.save.b<=lay.vh||lay.oh>lay.ch),`${w}×${h}: formulário dentro da tela, sem overflow horizontal, botão ${lay.save.b<=lay.vh?'visível':'alcançável por rolagem'}`);
    if(process.env.RM_SHOTS) await s.page.screenshot({path:`${process.env.RM_SHOTS}/recovery_ready_${w}.png`});
    if(w===390){ const t=await setup(b,{viewport:{width:w,height:h}}); const m2=await ask(t); t.be.expire(m2); await clickLink(t,m2); if(process.env.RM_SHOTS) await t.page.screenshot({path:process.env.RM_SHOTS+'/recovery_invalid_390.png'}); }
  }
  await b.close(); stopServer(); console.log(`\nRECUPERAÇÃO DE SENHA: ${n-fails}/${n} verificações OK`+(fails?` — ${fails} FALHAS`:'')); process.exit(fails?1:0);
})();
