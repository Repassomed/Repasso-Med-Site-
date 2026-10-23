const OUT=n=>require('path').join(process.env.RM_OUT||require('os').tmpdir(),n);
/* Recuperación REAL de marcas (rm-tools.js: indexar/escolher/resolverAncora) — original → nuevo */
const {chromium}=require(process.env.RM_PLAYWRIGHT||'playwright'); const {start}=require('./server.cjs'); const fs=require('fs');
const SUB='p,li,h2,h3,h4,h5,table,figure,blockquote';
(async()=>{const {s,base}=await start();
 const b=await chromium.launch({...(process.env.RM_CHROMIUM?{executablePath:process.env.RM_CHROMIUM}:{})});
 async function open(v){const p=await b.newPage({viewport:{width:1280,height:900}}); await p.goto(base+'/qa.html?v='+v,{waitUntil:'domcontentloaded'}); await p.waitForFunction('window.__ready===true',{timeout:60000}); return p;}
 const LIST=`(SUB)=>{const out={};document.querySelectorAll('section[id]').forEach(sec=>{out[sec.id]=[...sec.querySelectorAll(SUB)].map(e=>e.textContent.replace(/\\s+/g,' ').trim());});return out;}`;
 const po=await open('orig'), pn=await open('new');
 const Lo=await po.evaluate(eval(LIST),SUB), Ln=await pn.evaluate(eval(LIST),SUB);
 let touched=[],control=[],seq=0;
 for(const sec of Object.keys(Lo)){ const a=Lo[sec],bb=Ln[sec]; if(!bb||a.length!==bb.length){console.log('SECUENCIA DIFERENTE',sec);continue;}
   a.forEach((t,i)=>{ if(t!==bb[i]) touched.push([sec,i]); else if(t.length>60 && (seq++%23===0)) control.push([sec,i]); }); }
 console.log('elementos tocados',touched.length,'control',control.length);
 /* generar registros en la página original */
 const recs=await po.evaluate(({touched,control,SUB})=>{
   const RT=window.RMTools, out=[];
   const secs={};
   const getS=id=>{ if(secs[id]) return secs[id]; const sec=document.getElementById(id); const idx=RT.indexar(sec); const pos=new Map(); idx.map.forEach((m,k)=>{let mm=pos.get(m.node); if(!mm){mm=new Map();pos.set(m.node,mm);} mm.set(m.off,k);}); return secs[id]={sec,idx,pos,list:[...sec.querySelectorAll(SUB)]}; };
   function recsFor(id,i,kind){
     const S=getS(id), el=S.list[i]; const ie=RT.indexar(el); if(!ie.norm||ie.norm.length<25) return;
     const segs=[]; const parts=ie.norm.split(/(?<=[.;:?!])\s+/); let off=0;
     parts.forEach(p=>{const at=ie.norm.indexOf(p,off); off=at+p.length; if(p.length>=25&&p.length<=260) segs.push([at,p,'frase']);});
     if(!segs.length) segs.push([0,ie.norm.slice(0,Math.min(120,ie.norm.length)).trim(),'inicio']);
     const w=ie.norm.split(' '); if(w.length>14){ const a=ie.norm.indexOf(w.slice(5,12).join(' ')); if(a>=0) segs.push([a,w.slice(5,12).join(' '),'medio']); }
     segs.slice(0,5).forEach(([at,seg,tipo])=>{
       const m=ie.map[at]; const mm=S.pos.get(m.node); const real=mm&&mm.get(m.off); if(real==null) return;
       if(S.idx.norm.substr(real,seg.length)!==seg) return;
       const node=S.idx.map[real].node; const inner=node.parentElement.closest(SUB); const elIdx=S.list.indexOf(inner);
       out.push({kind,tipo,block_id:id,elIdx,origEl:i,exact_text:seg,prefix:S.idx.norm.slice(Math.max(0,real-40),real),suffix:S.idx.norm.slice(real+seg.length,real+seg.length+40),occurrence:RT.ocorrencias(S.idx.norm,seg).indexOf(real),n_occ:RT.ocorrencias(S.idx.norm,seg).length});
     });
   }
   touched.forEach(([id,i])=>recsFor(id,i,'tocado')); control.forEach(([id,i])=>recsFor(id,i,'control'));
   return out;},{touched,control,SUB});
 console.log('registros',recs.length,recs.filter(r=>r.kind==='tocado').length,'tocados');
 /* resolver en la página nueva */
 const res=[]; const CH=200;
 for(let k=0;k<recs.length;k+=CH){
   const part=await pn.evaluate(({part,SUB})=>{const RT=window.RMTools; const lists={}; const out=[];
     for(const h of part){ const bloco=document.getElementById(h.block_id); lists[h.block_id]=lists[h.block_id]||[...bloco.querySelectorAll(SUB)];
       const a=RT.resolverAncora(bloco,h); if(!a){out.push({nivel:0});continue;}
       const r=RT.rangeDe(a.idx,a.ini,a.fim); if(!r){out.push({nivel:0,rangeNull:true});continue;}
       const inner=r.startContainer.parentElement.closest(SUB); out.push({nivel:a.nivel,elIdx:lists[h.block_id].indexOf(inner),texto:a.idx.norm.slice(a.ini,a.fin||a.fim)===h.exact_text}); }
     return out;},{part:recs.slice(k,k+CH),SUB});
   res.push(...part); process.stdout.write('.');
 }
 console.log();
 /* ¿el texto exacto sigue presente en el elemento nuevo? */
 const present=await pn.evaluate(({recs,SUB})=>{const RT=window.RMTools; const cache={}; return recs.map(h=>{const sec=document.getElementById(h.block_id); const k=h.block_id; cache[k]=cache[k]||RT.indexar(sec).norm; return cache[k].includes(h.exact_text);});},{recs,SUB});
 const stat={}; const bad=[];
 recs.forEach((h,i)=>{ const r=res[i], pres=present[i]; const key=`${h.kind}|${pres?'texto_intacto':'texto_reescrito'}`; stat[key]=stat[key]||{n:0,nivel1:0,nivel2:0,nivel3:0,no_recuperada:0,mal_colocada:0,texto_distinto:0};
   const t=stat[key]; t.n++; if(!r.nivel){t.no_recuperada++; if(pres) bad.push({h:{...h,prefix:undefined,suffix:undefined},r});} else { t['nivel'+r.nivel]++; if(r.elIdx!==h.elIdx){t.mal_colocada++; bad.push({tipo:'mal_colocada',h:{...h,prefix:undefined,suffix:undefined},r});} if(!r.texto) t.texto_distinto++; } });
 console.log(JSON.stringify(stat,null,1)); console.log('casos a revisar',bad.length);
 fs.writeFileSync(OUT('hl-result.json'),JSON.stringify({stat,bad:bad.slice(0,60),tocados:touched.length,control:control.length,registros:recs.length},null,1));
 await b.close(); s.close();})();
