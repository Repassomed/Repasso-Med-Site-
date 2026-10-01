/* 05 · Celular, tablet e computador — EMULAÇÃO Chromium (viewport, DPR, toque, rotação). NÃO é teste físico:
   não prova compatibilidade de iPad/Safari, Android/stylus ou Windows/caneta. Mede só o que o navegador emulado mostra:
   alinhamento da tinta com o bloco (dx/dy/dw/dh), rotação, redimensionamento, pinch-zoom e carregamento lento de imagens. */
const L=require('./lib.cjs'); const {ok,info}=L;
const PERFIS=[
  ['iPhone 13 (emul.) 390×844 @3x',{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}],
  ['iPhone landscape (emul.) 844×390',{viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true}],
  ['Android Pixel 7 (emul.) 412×915 @2.6x',{viewport:{width:412,height:915},deviceScaleFactor:2.625,isMobile:true,hasTouch:true}],
  ['celular pequeno 320×640',{viewport:{width:320,height:640},deviceScaleFactor:2,isMobile:true,hasTouch:true}],
  ['iPad (emul.) 810×1080 @2x',{viewport:{width:810,height:1080},deviceScaleFactor:2,isMobile:true,hasTouch:true}],
  ['iPad landscape (emul.) 1080×810 @2x',{viewport:{width:1080,height:810},deviceScaleFactor:2,isMobile:true,hasTouch:true}],
  ['Android tablet (emul.) 800×1280',{viewport:{width:800,height:1280},deviceScaleFactor:2,isMobile:true,hasTouch:true}],
  ['notebook Windows 1366×768 @1.25x',{viewport:{width:1366,height:768},deviceScaleFactor:1.25}],
  ['desktop 1920×1080',{viewport:{width:1920,height:1080},deviceScaleFactor:1}]
];
/* desvio da camada de tinta em relação ao bloco âncora (px); todos os SVGs */
const ALIGN=(page)=>page.evaluate(()=>{ const out=[]; document.querySelectorAll('#rm2-ink svg[data-anchor]').forEach(sv=>{ const a=sv.getAttribute('data-anchor').split('>'); const sec=document.getElementById(a[0]); if(!sec) return; const el=a[1]!==undefined?sec.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+a[1]]:sec; if(!el) return; const r=el.getBoundingClientRect(), s=sv.getBoundingClientRect(); out.push({dx:s.left-r.left,dy:s.top-r.top,dw:s.width-r.width,dh:s.height-r.height}); }); const m=k=>out.length?Math.max(...out.map(o=>Math.abs(o[k]))):null; return {n:out.length,dx:m('dx'),dy:m('dy'),dw:m('dw'),dh:m('dh')}; });
const worst=a=>Math.max(a.dx,a.dy,a.dw,a.dh);
(async()=>{
  const st=await L.startStack(); const br=await L.pw().launch();
  const A=await L.mkUser(st,'vp');
  console.log('== 1 · desenhar no desktop; carregar a MESMA conta em 9 perfis de tela (emulados)');
  let s0=await L.session(br,st,A,{viewport:{width:1440,height:900}}); for(let i=0;i<3;i++){ const r=await L.drawStroke(s0.page,i*3); if(!(r&&r.status===201)) info('traço '+i+' não gravou'); } await s0.page.waitForTimeout(400);
  ok(await L.countStrokes(st,A.id)===3,'3 traços gravados a partir do desktop 1440×900'); await s0.context.close();
  const pos=[];
  for(const [nome,o] of PERFIS){
    const s=await L.session(br,st,A,{...o,wait:1500}); const n=await L.inkCount(s.page); const al=await ALIGN(s.page);
    ok(n===3&&al.n===3,`${nome}: os 3 traços foram carregados e desenhados`); ok(al.dx<=1.5&&al.dw<=1.5&&al.dh<=1.5,`${nome}: alinhamento HORIZONTAL e de tamanho exato (dx=${al.dx.toFixed(2)} dw=${al.dw.toFixed(2)} dh=${al.dh.toFixed(2)} px)`);
    pos.push([nome,al.dy]);
    const ov=await s.page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1); ok(!ov,`${nome}: sem overflow horizontal`);
    await s.context.close(); }
  info('desvio VERTICAL logo após carregar (px): '+pos.map(([n,d])=>n.split(' ')[0]+' '+d.toFixed(1)).join(' · '));
  L.finding(Math.max(...pos.map(p=>p[1]))>1.5,'logo após o carregamento a tinta fica 2–7 px abaixo do texto em todos os perfis (dx=dw=0) até o próximo reposicionamento; dentro da sessão (rotação/redimensionar) volta a 0');

  console.log('== 2 · rotação e redimensionamento AO VIVO (tablet e celular), com a tinta já desenhada');
  { const s=await L.session(br,st,A,{...PERFIS[4][1],wait:1500});
    const passos=[[1080,810,'tablet → paisagem'],[810,1080,'→ retrato'],[700,1000,'redimensionar (quebra de breakpoint)'],[1280,720,'→ 1280×720'],[390,844,'→ tamanho de celular'],[810,1080,'→ volta ao retrato']];
    for(const [w,h,n] of passos){ await s.page.setViewportSize({width:w,height:h}); await s.page.waitForTimeout(900); const al=await ALIGN(s.page); ok(al.n===3&&worst(al)<=1.5,`${n} (${w}×${h}): tinta alinhada (máx. ${worst(al).toFixed(2)} px)`); }
    await s.context.close(); }

  console.log('== 3 · pinch-zoom (escala da página) — só o alinhamento de traços CARREGADOS; desenhar com zoom NÃO foi testado');
  { const s=await L.session(br,st,A,{...PERFIS[4][1],wait:1500}); const cdp=await s.context.newCDPSession(s.page); const base=worst(await ALIGN(s.page));
    for(const sc of [1.5,2,3]){ await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:sc}); await s.page.waitForTimeout(500); const al=await ALIGN(s.page); ok(al.n===3&&Math.abs(worst(al)-base)<=1.5,`escala ${sc}×: o zoom não muda o alinhamento (antes ${base.toFixed(2)} px, com zoom ${worst(al).toFixed(2)} px)`); }
    await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1}); await s.context.close(); }

  console.log('== 4 · imagens: matéria com 680 <img> lazy (Histología II Práctica) com rede lenta → a tinta realinha quando as imagens carregam?');
  { const H='histologia-ii-practica'; const B=await L.mkUser(st,'img');
    const s1=await L.session(br,st,B,{viewport:{width:1280,height:900},wait:2500,slug:H,tab:'histo2p'});
    // traços em parágrafos ABAIXO de muitas imagens
    const idx=[60,120,180]; for(const i of idx){ const r=await L.drawStroke(s1.page,i); if(!(r&&r.status===201)) info('traço em parágrafo '+i+' não gravou'); }
    const n1=await L.countStrokes(st,B.id,H); ok(n1>=2,'traços gravados numa matéria com imagens ('+n1+')'); const al1=await ALIGN(s1.page); ok(worst(al1)<=1.5,'com imagens já carregadas: alinhado ('+worst(al1).toFixed(2)+' px)'); await s1.context.close();
    const slow=async(page)=>{ await page.route('**/assets/img/**',async r=>{ await new Promise(x=>setTimeout(x,2500)); r.continue(); }); };
    const s2=await L.session(br,st,B,{...PERFIS[0][1],wait:600,slug:H,tab:'histo2p',route:slow});
    // rolagem CONTÍNUA (passos de ≤1200 px, como o dedo) até o 1º traço; depois, em passos curtos, até a 1ª imagem da MESMA seção
    const alvo=await s2.page.evaluate(()=>document.querySelector('#rm2-ink svg[data-anchor]').getAttribute('data-anchor'));
    const pos=()=>s2.page.evaluate((a)=>{const x=a.split('>');const sec=document.getElementById(x[0]);const el=x[1]!==undefined?sec.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+x[1]]:sec;const im=sec.querySelector('img');return {a:el.getBoundingClientRect().top,i:im?im.getBoundingClientRect().top:null,n:sec.querySelectorAll('img').length};},alvo);
    for(let k=0;k<500;k++){ const p0=await pos(); if(p0.a<800&&p0.a>-200) break; await s2.page.evaluate((d)=>window.scrollBy(0,d),Math.sign(p0.a-300)*Math.min(1200,Math.abs(p0.a-300))); await s2.page.waitForTimeout(30); }
    const p1=await pos(); info('1º traço em '+alvo+'; a seção tem '+p1.n+' imagens');
    for(let k=0;k<200&&p1.i!==null;k++){ const q=await pos(); if(q.i===null||Math.abs(q.i-300)<150) break; await s2.page.evaluate((d)=>window.scrollBy(0,d),Math.sign(q.i-300)*Math.min(500,Math.abs(q.i-300))); await s2.page.waitForTimeout(40); }
    const h0=await s2.page.evaluate(()=>document.documentElement.scrollHeight);
    const t0=Date.now(); const amostras=[]; for(let k=0;k<9;k++){ const al=await ALIGN(s2.page); amostras.push({t:Date.now()-t0,w:worst(al)}); await s2.page.waitForTimeout(800); }
    await s2.page.waitForTimeout(3000); const fim=await ALIGN(s2.page); const pico=Math.max(...amostras.map(a=>a.w)); const h1=await s2.page.evaluate(()=>document.documentElement.scrollHeight);
    const imgs=await s2.page.evaluate(()=>({total:document.images.length,ok:[...document.images].filter(i=>i.complete&&i.naturalWidth>0).length}));
    info('altura do documento '+h0+' → '+h1+' px; imagens carregadas '+imgs.ok+'/'+imgs.total+' (a emulação não conseguiu disparar o carregamento lazy: o efeito das imagens sobre o layout NÃO foi exercitado — teste físico/real)');
    info('desvio da tinta ao chegar ao traço por rolagem rápida: máx. '+pico.toFixed(1)+' px durante 7 s; final '+worst(fim).toFixed(1)+' px');
    L.finding(worst(fim)>50,'matéria longa (≈'+Math.round(h1/1000)+'k px): ao chegar por rolagem rápida a um traço profundo, a tinta fica a '+worst(fim).toFixed(0)+' px do texto e NÃO se corrige sozinha em 12 s (posições guardadas de antes de o layout acima mudar; o ResizeObserver só vê o tamanho do próprio bloco)');
    await s2.page.evaluate(()=>RMToolsV2.reposicionar()); await s2.page.waitForTimeout(400); const pos2=worst(await ALIGN(s2.page));
    ok(pos2<=2,'RMToolsV2.reposicionar() (API pública) corrige na hora: desvio '+pos2.toFixed(2)+' px → a âncora está certa; as posições é que estavam velhas (correção mínima: reposicionar ao fim da rolagem/salto)');
    await s2.context.close(); }

  console.log('== 5 · caneta com eventos SINTÉTICOS de stylus (pointerType=pen) no tablet emulado — NÃO é prova física');
  { const s=await L.session(br,st,A,{...PERFIS[4][1],wait:1500}); await s.page.evaluate(()=>RMToolsV2.escolherFerramenta('pen')); await L.target(s.page,1); await s.page.waitForTimeout(400);
    const resp=s.page.waitForResponse(r=>/user_ink_strokes/.test(r.url())&&r.request().method()==='POST',{timeout:8000}).catch(()=>null);
    await s.page.evaluate(()=>{ const ps=[...document.querySelectorAll('#materias-container section[id] p')].filter(x=>x.textContent.length>150&&x.getBoundingClientRect().height>=50); const e=ps[1]; const r=e.getBoundingClientRect(); const mk=(t,x,y,p)=>new PointerEvent(t,{pointerType:'pen',pointerId:7,isPrimary:true,clientX:x,clientY:y,pressure:p,buttons:p?1:0,bubbles:true,cancelable:true,composed:true}); const x0=r.left+r.width*0.2,y0=r.top+r.height/2; e.dispatchEvent(mk('pointerdown',x0,y0,0.5)); for(let k=1;k<=14;k++) document.dispatchEvent(mk('pointermove',x0+k*9,y0+Math.sin(k/2)*10,0.5)); document.dispatchEvent(mk('pointerup',x0+130,y0,0)); });
    const r=await resp; ok(r&&r.status()===201,'pointerType=pen sintético no iPad emulado → traço gravado (201). Só prova a rota de código; o hardware real (palma, pressão, latência) é teste físico'); await s.context.close(); }
  await br.close(); await st.close(); console.log('\nACHADOS: '+L.F.items.filter(x=>x.reproduzido).length+' reproduzido(s)'); process.exit(L.finish('VIEWPORTS (emulação)')?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
