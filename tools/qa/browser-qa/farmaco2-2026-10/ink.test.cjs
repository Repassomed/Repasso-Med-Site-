const OUT=n=>require('path').join(process.env.RM_OUT||require('os').tmpdir(),n);
/* Alineación REAL de la tinta: misma matemática de rm-tools-v2.js (anchorDe + caja del ancla; puntos normalizados u,v).
   Para cada elemento H de la versión original simula un trazo en su centro, lo "guarda" (anchor_id,u,v) y lo
   vuelve a pintar en la versión nueva con elDeAnchor+caja; mide a cuántos px del mismo contenido cae. */
const {chromium}=require(process.env.RM_PLAYWRIGHT||'playwright'); const {start}=require('./server.cjs'); const fs=require('fs');
const SUB='p,li,h2,h3,h4,h5,table,figure,blockquote';
const W=(process.env.W||'390,768,1024,1440').split(',').map(Number);
const COLLECT=`(SUB)=>{
  const norm=s=>s.replace(/\\s+/g,' ').trim();
  document.querySelectorAll('img').forEach(i=>{i.loading='eager';});
  const out={secs:{},els:[]}; const T={anchorDe:(e)=>{const sec=e.closest('section[id]'); if(!sec||!sec.id) return null; const sub=e.closest(SUB); if(sub&&sec.contains(sub)&&sub.getBoundingClientRect().height>=36){const l=sec.querySelectorAll(SUB); for(let i=0;i<l.length;i++) if(l[i]===sub) return {el:sub,id:sec.id+'>'+i};} return {el:sec,id:sec.id};}};
  const caja=e=>{const r=e.getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,w:Math.max(1,r.width),h:Math.max(1,r.height)};};
  document.querySelectorAll('section[id]').forEach(sec=>{
    out.secs[sec.id]=caja(sec); const cnt={}; const subs=[...sec.querySelectorAll(SUB)];
    sec.querySelectorAll('*').forEach(e=>{
      if(e.closest('svg')&&e.tagName.toLowerCase()!=='svg') return;
      const b=caja(e); if(b.h<12||b.w<12) return;
      const fp=e.tagName+'|'+(e.getAttribute('src')||e.getAttribute('aria-label')||'').slice(0,60)+'|'+norm(e.textContent).slice(0,80);
      cnt[fp]=(cnt[fp]||0)+1; const key=sec.id+'#'+fp+'#'+cnt[fp];
      const a=T.anchorDe(e); if(!a) return;
      const ab=caja(a.el);
      out.els.push({cls:(e.className&&e.className.baseVal===undefined?String(e.className):'')+'|'+e.tagName,key,sec:sec.id,aid:a.id,txt:norm(e.textContent).length+':'+norm(e.textContent).slice(0,200),
        cx:b.x+b.w/2,cy:b.y+b.h/2,w:b.w,h:b.h,u:(b.x+b.w/2-ab.x)/ab.w,v:(b.y+b.h/2-ab.y)/ab.h,aTxt:norm(a.el.textContent).slice(0,300)});
    });
  });
  return out;}`;
(async()=>{const {s,base}=await start();
 const b=await chromium.launch({...(process.env.RM_CHROMIUM?{executablePath:process.env.RM_CHROMIUM}:{})});
 const R={};
 for(const w of W){
   const data={};
   for(const v of ['orig','new']){
     const p=await b.newPage({viewport:{width:w,height:900}});
     await p.goto(base+'/qa.html?v='+v,{waitUntil:'domcontentloaded'}); await p.waitForFunction('window.__ready===true',{timeout:60000});
     await p.addStyleTag({content:'#materias-container .rm-cuaderno > section.container, #materias-container section[id]{content-visibility:visible!important;contain-intrinsic-size:none!important;contain:none!important}'});
     await p.evaluate(async()=>{document.querySelectorAll('img').forEach(i=>{i.loading='eager';}); await Promise.all([...document.querySelectorAll('img')].map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r;}))); await document.fonts.ready;});
     await p.waitForTimeout(1500);
     data[v]=await p.evaluate(eval(COLLECT),SUB);
     /* cajas de las anclas en el nuevo: elDeAnchor equivalente */
     data[v+'_anch']=await p.evaluate((SUB)=>{const out={};document.querySelectorAll('section[id]').forEach(sec=>{const subs=[...sec.querySelectorAll(SUB)];const r=e=>{const q=e.getBoundingClientRect();return {x:q.left+scrollX,y:q.top+scrollY,w:q.width,h:q.height};};out[sec.id]={sec:r(sec),subs:subs.map(r),txt:subs.map(e=>e.textContent.replace(/\s+/g,' ').trim())};});return out;},SUB);
     await p.close();
   }
   const N=new Map(data.new.els.map(e=>[e.key,e]));
   const rows=[];
   for(const o of data.orig.els){
     const n=N.get(o.key); if(!n) continue;
     /* caja del ancla en el nuevo, por anchor_id VIEJO (así lo hace elDeAnchor) */
     const [sid,idx]=o.aid.split('>'); const A=data.new_anch[sid]; if(!A) continue;
     const ab=idx===undefined?A.sec:(A.subs[+idx]||A.sec);
     const px=ab.x+o.u*ab.w, py=ab.y+o.v*ab.h;
     const dx=px-n.cx, dy=py-n.cy; const textoIgual=o.txt===n.txt; const anclaIgual=o.aTxt===(data.new.els.find&&0,null);
     const aOld=idx===undefined?data.orig_anch[sid].sec:(data.orig_anch[sid].subs[+idx]||data.orig_anch[sid].sec); const aTxtIgual=o.aTxt===undefined?null:true; rows.push({cls:o.cls,key:o.key.slice(0,90),sec:o.sec,aid:o.aid,anclaSub:idx!==undefined,textoIgual,dx,dy,d:Math.hypot(dx,dy),dh:n.h-o.h,dw:n.w-o.w,aH_old:aOld.h,aH_new:ab.h,aW_old:aOld.w,aW_new:ab.w,cy_old:o.cy,cy_new:n.cy});
   }
   const q=(a,p)=>{if(!a.length)return null;a=a.slice().sort((x,y)=>x-y);return +a[Math.min(a.length-1,Math.floor(p*a.length))].toFixed(1);};
   const grp2=(g)=>{const d=g.map(r=>r.d);return {n:g.length,p50:q(d,.5),p90:q(d,.9),max:q(d,1)};};
   const grp=(f)=>{const g=rows.filter(f);const d=g.map(r=>r.d);return {n:g.length,p50:q(d,.5),p90:q(d,.9),p99:q(d,.99),max:q(d,1),sobre_2px:g.filter(r=>r.d>2).length,sobre_10px:g.filter(r=>r.d>10).length};};
   R[w]={emparejados:rows.length,
     sub_texto_igual:grp(r=>r.anclaSub&&r.textoIgual), sub_texto_cambiado:grp(r=>r.anclaSub&&!r.textoIgual),
     seccion_texto_igual:grp(r=>!r.anclaSub&&r.textoIgual), seccion_texto_cambiado:grp(r=>!r.anclaSub&&!r.textoIgual),
     alturas_seccion:Object.fromEntries(Object.keys(data.orig.secs).map(k=>[k,+(data.new.secs[k].h-data.orig.secs[k].h).toFixed(1)]))};
   const cat={exacta:0,texto_igual_caja_distinta:0,texto_cambiado:0}; const cd=[];
   let tot=0;
   for(const sid of Object.keys(data.orig_anch)){ const A=data.orig_anch[sid],B=data.new_anch[sid]; for(let i=0;i<A.subs.length;i++){ tot++; const same=A.txt[i]===B.txt[i]; const dh=B.subs[i].h-A.subs[i].h, dw=B.subs[i].w-A.subs[i].w;
       if(same&&Math.abs(dh)<=1&&Math.abs(dw)<=1) cat.exacta++; else if(same) {cat.texto_igual_caja_distinta++;} else {cat.texto_cambiado++; if(A.subs[i].h>=36||B.subs[i].h>=36) cd.push(Math.abs(dh));} } }
   R[w].por_seccion={}; for(const sid of Object.keys(data.orig_anch)){const A=data.orig_anch[sid],B=data.new_anch[sid]; let ch=0,mx=0,sum=0; for(let i=0;i<A.subs.length;i++){ if(A.txt[i]!==B.txt[i]){ch++; const d=Math.abs(B.subs[i].h-A.subs[i].h); mx=Math.max(mx,d);} } R[w].por_seccion[sid]={anclas:A.subs.length,reescritas:ch,max_dh:+mx.toFixed(0),dH_seccion:+(B.sec.h-A.sec.h).toFixed(0),H_old:+A.sec.h.toFixed(0)}; }
   R[w].anclas_sub={total:tot,...cat,texto_cambiado_dh_p50:q(cd,.5),texto_cambiado_dh_p90:q(cd,.9),texto_cambiado_dh_max:q(cd,1)};
   const stems=rows.filter(r=>/quiz-question/.test(r.cls)&&!r.anclaSub&&/DIV$/.test(r.cls)); R[w].stems_quiz=grp2(stems);
   const figs=rows.filter(r=>!r.anclaSub&&/(illustration|material-slide)/.test(r.cls)); R[w].figuras=grp2(figs);
   console.log('ancho',w,JSON.stringify({...R[w],alturas_seccion:undefined}));
   console.log('   Δaltura por sección (px):',JSON.stringify(R[w].alturas_seccion));
   if(process.env.RM_DUMP_ROWS) fs.writeFileSync(OUT(`ink-rows-${w}.json`),JSON.stringify(rows));
 }
 fs.writeFileSync(OUT('ink-result.json'),JSON.stringify(R,null,1));
 await b.close(); s.close();})();
