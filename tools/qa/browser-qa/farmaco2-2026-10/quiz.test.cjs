const OUT=n=>require('path').join(process.env.RM_OUT||require('os').tmpdir(),n);
/* Teste REAL (Chromium + app-core.js do site) do quiz e dos flashcards de Farmacología II. Uso: node quiz.test.cjs <orig|new> */
const {chromium}=require(process.env.RM_PLAYWRIGHT||'playwright'); const {start}=require('./server.cjs');
const V=process.argv[2]||'new';
const norm=s=>s.replace(/\s+/g,' ').replace(/^[a-d]\)\s*/i,'').replace(/[\s.。]+$/,'').trim();
(async()=>{const {s,base}=await start();
 const b=await chromium.launch({...(process.env.RM_CHROMIUM?{executablePath:process.env.RM_CHROMIUM}:{})});
 const R={versao:V,falhas:[],avisos:[]}; const F=(t,d)=>R.falhas.push({t,d}); const AV=(t,d)=>R.avisos.push({t,d});
 async function open(){const p=await b.newPage({viewport:{width:1280,height:900}}); p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
   await p.goto(base+'/qa.html?v='+V,{waitUntil:'domcontentloaded'}); await p.waitForFunction('window.__ready===true',{timeout:60000}); return p;}
 /* A · consistência interna (DOM real após enhanceAll) */
 let p=await open();
 const A=await p.evaluate(()=>{
  const items=[...document.querySelectorAll('.quiz-item')];
  const sec=e=>e.closest('section')?.id; const res=[];
  const n=s=>s.replace(/\s+/g,' ').replace(/^[a-d]\)\s*/i,'').replace(/[\s.]+$/,'').trim();
  items.forEach((it,i)=>{
    const stem=it.querySelector('.quiz-question').textContent.replace(/\s+/g,' ').trim();
    const ans=it.querySelector('.answer'); const r={i,sec:sec(it),stem:stem.slice(0,70),kind:it.classList.contains('interactive')?'mcq':(it.querySelector('.tf-buttons')?'tf':'abierta')};
    if(r.kind==='mcq'){
      const lis=[...it.querySelectorAll('.interactive-options li')]; r.opts=lis.map(l=>n(l.textContent.replace(/^[A-D]\)\s*/,'')));
      r.correct=it.dataset.correct; r.nOpts=lis.length; r.letters=lis.map(l=>l.dataset.option).join('');
      const st=[...ans.querySelectorAll('strong')].find(x=>/^\s*[a-d]\)/i.test(x.textContent));
      r.strongLetter=st?st.textContent.trim()[0].toLowerCase():null; r.strongText=st?n(st.textContent):null;
      const k='abcd'.indexOf(r.correct); r.optAtCorrect=r.opts[k];
      r.strongMatchesOpt=(r.strongText===r.optAtCorrect)||(r.optAtCorrect&&r.strongText&&(r.optAtCorrect.startsWith(r.strongText)||r.strongText.startsWith(r.optAtCorrect)));
      const t=ans.textContent.replace(/\s+/g,' '); const m=/Las otras:(.*)$/.exec(t);
      r.otrasRef=m?[...m[1].matchAll(/\(([a-d])\)/g)].map(x=>x[1]):null;
    }
    res.push(r);
  });
  return res;});
 R.total=A.length; R.mcq=A.filter(x=>x.kind==='mcq').length;
 for(const x of A.filter(x=>x.kind==='mcq')){
   if(x.nOpts!==4||x.letters!=='abcd') F('opciones',x);
   if(x.correct!==x.strongLetter) F('data-correct≠strong',x);
   if(!x.strongMatchesOpt) AV('encabezado de la explicación parafrasea la opción',{i:x.i,sec:x.sec,stem:x.stem,strong:x.strongText,opt:x.optAtCorrect,correct:x.correct});
   if(x.otrasRef&&x.otrasRef.includes(x.correct)) AV('«Las otras» menciona la letra correcta (revisar a mano)',{i:x.i,sec:x.sec,stem:x.stem,correct:x.correct,ref:x.otrasRef});
 }
 R.otrasSinParentesis=A.filter(x=>x.kind==='mcq'&&!x.otrasRef).length;
 R.otrasNoCubrenTres=A.filter(x=>x.kind==='mcq'&&x.otrasRef&&new Set(x.otrasRef).size<3).length;
 R.items=A.map(x=>({i:x.i,sec:x.sec,kind:x.kind,correct:x.correct,opts:x.opts,stem:x.stem}));
 /* espejos bloque↔banco */
 const bank=A.filter(x=>x.sec==='f2b15'), body=A.filter(x=>x.sec!=='f2b15');
 R.pares={cuerpo:body.length,banco:bank.length};
 let pd=0; const pool={}; bank.forEach(x=>{(pool[x.stem]=pool[x.stem]||[]).push(x)});
 for(const x of body){const y=(pool[x.stem]||[]).shift(); if(!y){pd++;F('sin gemelo',x.stem);continue;} if(x.kind==='mcq'&&(x.correct!==y.correct||JSON.stringify(x.opts)!==JSON.stringify(y.opts))){pd++;F('gemelo difiere',x.stem);}}
 R.pares.divergencias=pd;
 await p.close();
 /* B · comportamiento: clic en incorrecta / correcta en TODAS las MCQ */
 for(const modo of ['incorrecta','correcta']){
  p=await open();
  const out=await p.evaluate(async(modo)=>{
   const bad=[]; const items=[...document.querySelectorAll('.quiz-item.interactive')];
   for(const it of items){
     const c=it.dataset.correct; const lis=[...it.querySelectorAll('.interactive-options li')];
     const pick=modo==='correcta'?lis.find(l=>l.dataset.option===c):lis.find(l=>l.dataset.option!==c);
     pick.click();
     const fb=it.querySelector('.quiz-feedback'); const corr=it.querySelectorAll('.interactive-options li.correct'); const wr=it.querySelectorAll('.interactive-options li.wrong');
     const okfb=fb&&fb.classList.contains(modo==='correcta'?'correct':'wrong');
     const okCorr=corr.length===1&&corr[0].dataset.option===c;
     const okWrong=modo==='correcta'?wr.length===0:(wr.length===1&&wr[0]===pick);
     const msg=modo==='incorrecta'?(fb&&fb.textContent.includes('la opción '+c.toUpperCase())):true;
     // segundo clic no debe cambiar nada
     const other=lis.find(l=>l!==pick); other.click(); const fbs=it.querySelectorAll('.quiz-feedback').length;
     if(!(okfb&&okCorr&&okWrong&&msg&&fbs===1)) bad.push({stem:it.querySelector('.quiz-question').textContent.slice(0,60),okfb,okCorr,okWrong,msg,fbs});
   }
   await new Promise(r=>setTimeout(r,900));
   const hidden=items.filter(it=>!it.querySelector('.answer').classList.contains('show')).length;
   // verdadero/falso y abiertas
   const tf=[...document.querySelectorAll('.quiz-item .tf-buttons')]; let tfBad=0;
   tf.forEach(t=>{const it=t.closest('.quiz-item'); const exp=/^\s*VERDADERO/i.test(it.querySelector('.answer strong').textContent); const btn=[...t.querySelectorAll('.tf-btn')].find(b=>(b.dataset.tf==='V')===exp); btn.click(); const fb=it.querySelector('.quiz-feedback'); if(!(fb&&fb.classList.contains('correct'))) tfBad++;});
   const ab=[...document.querySelectorAll('.quiz-item .reveal-btn')]; let abBad=0; ab.forEach(btn=>{btn.click(); if(!btn.nextElementSibling.classList.contains('show')) abBad++;});
   return {n:items.length,bad,hidden,tf:tf.length,tfBad,ab:ab.length,abBad};
  },modo);
  R['clic_'+modo]=out; out.bad.forEach(x=>F('clic '+modo,x)); if(out.hidden) F('respuesta no se muestra',out.hidden); if(out.tfBad) F('V/F',out.tfBad); if(out.abBad) F('abierta',out.abBad);
  if(p.errs.length) F('pageerror',p.errs); await p.close();
 }
 /* C · flashcards: todos los mazos */
 p=await open();
 const gridsInfo=await p.evaluate(()=>[...document.querySelectorAll('.fc-grid')].map((g,i)=>({i,n:g.querySelectorAll('.flashcard').length,title:g.dataset.deckTitle,sec:g.closest('section')?.id,fronts:[...g.querySelectorAll('.flashcard')].map(f=>f.querySelector('.fc-front').textContent.replace(/\s+/g,' ').trim().slice(0,80)),backs:[...g.querySelectorAll('.flashcard')].map(f=>f.querySelector('.fc-back').textContent.replace(/\s+/g,' ').trim().length)})));
 R.mazos=gridsInfo.map(g=>({i:g.i,sec:g.sec,n:g.n,title:g.title})); R.tarjetas=gridsInfo.reduce((a,g)=>a+g.n,0);
 for(const g of gridsInfo){
  const r=await p.evaluate(async(gi)=>{
   const grid=document.querySelectorAll('.fc-grid')[gi]; const wrap=grid.previousElementSibling; wrap.querySelector('.rmfc-play').click();
   const ov=document.querySelector('.rmfc-overlay'); const out={abre:ov.classList.contains('show'),prog:ov.querySelector('.rmfc-prog').textContent,orden:[],flip:false,sig:false,mezcla:false,cierra:false};
   const n=grid.querySelectorAll('.flashcard').length; const cards=[...grid.querySelectorAll('.flashcard')];
   const grid_shuffle=!!grid.dataset.shuffle;
   // recorrer en orden y comparar frente/dorso con la fuente
   ov.querySelector('[data-a=restart]').click(); let mism=0;
   for(let k=0;k<n;k++){
     const f=ov.querySelector('.rmfc-front').innerHTML, b=ov.querySelector('.rmfc-back').innerHTML;
     if(f!==cards[k].querySelector('.fc-front').innerHTML||b!==cards[k].querySelector('.fc-back').innerHTML) mism++;
     if(k===0){ ov.querySelector('[data-a=flip]').click(); out.flip=ov.querySelector('.rmfc-inner').classList.contains('flipped'); }
     ov.querySelector('[data-a=next]').click();
   }
   out.mism=mism; out.finRonda=ov.querySelector('.rmfc-done').classList.contains('show');
   // barajar conserva el conjunto
   ov.querySelector('[data-a=shuffle]').click(); const seen=[]; for(let k=0;k<n;k++){seen.push(ov.querySelector('.rmfc-front').innerHTML); ov.querySelector('[data-a=next]').click();}
   const src=cards.map(c=>c.querySelector('.fc-front').innerHTML).sort(); out.mezclaConserva=JSON.stringify(seen.slice().sort())===JSON.stringify(src);
   ov.querySelector('[data-a=close]').click(); out.cierra=!ov.classList.contains('show'); return out;
  },g.i);
  if(!(r.abre&&r.mism===0&&r.flip&&r.mezclaConserva&&r.cierra&&r.finRonda)) F('mazo',{g,r});
 }
 R.erroresPagina=p.errs; if(p.errs.length) F('pageerror flashcards',p.errs); await p.close();
 R.nFallas=R.falhas.length; require('fs').writeFileSync(OUT(`result-${V}.json`),JSON.stringify(R,null,1));
 console.log(V,'items',R.total,'mcq',R.mcq,'pares',JSON.stringify(R.pares),'tarjetas',R.tarjetas,'mazos',R.mazos.length,'FALLAS',R.nFallas,'otrasSinParentesis',R.otrasSinParentesis,'otrasNoCubrenTres',R.otrasNoCubrenTres);
 const by={}; R.falhas.forEach(f=>by[f.t]=(by[f.t]||0)+1); console.log('FALLAS DURAS',by,'| avisos',R.avisos.length); if(R.nFallas) process.exitCode=1;
 await b.close(); s.close();})();
