// Farmacología II · 3 questões de COMPLETAR: teofilina (nova) + 11β-HSD2 e diurese das xantinas (existentes, adaptadas, ids preservados).
const fs=require('fs'),cp=require('child_process');
const F='Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/farmacologia-ii.html';
const base=process.argv[2]||'origin/main';
const now=fs.readFileSync(F,'utf8'),old=cp.execSync(`git show ${base}:"${F}"`,{maxBuffer:1<<29}).toString();
let ok=0,bad=0;const t=(n,c)=>{c?ok++:(bad++,console.log('FALHA:',n))};
const items=h=>{const out=[];const re=/<div class="quiz-item"[^>]*>/g;let m;while((m=re.exec(h))){const q=h.indexOf('<div class="quiz-question">',m.index);const qi=q-(h.lastIndexOf('\n',q)+1);const an=h.indexOf('class="answer"',q);const tok='\n'+' '.repeat(qi-2)+'</div>\n';const e=h.indexOf(tok,an)+tok.length;out.push([h.lastIndexOf("\n",m.index)+1,e]);}return out;};
const txt=(h,[a,b])=>h.slice(a,b);
const KEYS=[/id="b?q-f2-hsd2-renal"/,/(efecto|acción) diurétic[ao] de la aminofilina/,/Un efecto adverso común de la teofilina/];
const strip=h=>{let r='',last=0;for(const it of items(h)){const x=txt(h,it);if(KEYS.some(k=>k.test(x.slice(0,900)))){r+=h.slice(last,it[0]);last=it[1];}}return r+h.slice(last);};
const bi=now.indexOf('id="f2b15"');
for(const [nm,h] of [['bloco',now.slice(0,bi)],['banco',now.slice(bi)]]){
  const its=items(h).map(i=>txt(h,i));
  KEYS.forEach((k,j)=>{const m=its.filter(x=>k.test(x.slice(0,900)));t(nm+' item '+j+' existe 1x',m.length===1);const x=m[0]||'';
    t(nm+' item '+j+' é completar rotulado de exame, sem alternativas',/Basada en preguntas de examen · completar/.test(x)&&!/<ul class="options">/.test(x)&&/_{6,}/.test(x)&&/answer-tag expl">Respuesta/.test(x));});
}
t('ids q-f2-hsd2-renal e bq- preservados',/id="q-f2-hsd2-renal"/.test(now)&&/id="bq-f2-hsd2-renal"/.test(now));
t('rótulo «Pregunta complementaria» não aparece nas 3',!items(now).filter(i=>KEYS.some(k=>k.test(txt(now,i).slice(0,900)))).some(i=>/Pregunta complementaria/.test(txt(now,i))));
const D=h=>{let i=0;return h};const norm=h=>strip(h).replace(/Las 25[23] preguntas/,'Las N preguntas').replace(/<b>25[23]<\/b><span>Preguntas/,'<b>N</b><span>Preguntas').replace(/<b>1[45][19]<\/b><span>Basadas/,'<b>B</b><span>Basadas').replace(/<b>10[23]<\/b><span>Complementarias/,'<b>C</b><span>Complementarias').replace(/<i>\d+ basadas en exámenes · \d+ complementarias<\/i>/g,'<i>X</i>');
{const A=norm(now),B=norm(old);t('resto do arquivo (sem as 3 questões e sem contagens) == main (byte a byte)',A===B);if(A!==B){let i=0;while(A[i]===B[i])i++;console.log(i,JSON.stringify(A.slice(i-60,i+80)),'|',JSON.stringify(B.slice(i-60,i+80)));}}
const cnt=h=>(h.match(/class="quiz-item"/g)||[]).length;
t('bloco = banco = 253 ('+cnt(now.slice(0,bi))+'/'+cnt(now.slice(bi))+')',cnt(now.slice(0,bi))===253&&cnt(now.slice(bi))===253);
t('cabeçalho do banco 253/151/102',/Las 253 preguntas/.test(now)&&/<b>151<\/b><span>Basadas/.test(now)&&/<b>102<\/b><span>Complementarias/.test(now));
const dv=(h,k)=>(h.match(new RegExp('<'+k+'[\\s>]','g'))||[]).length-(h.match(new RegExp('</'+k+'>','g'))||[]).length;
['div','p','ul','li'].forEach(k=>t('balanço '+k+' igual ao da main ('+dv(old,k)+')',dv(now,k)===dv(old,k)));
console.log(`f2-completar: ${ok}/${ok+bad}`);process.exit(bad?1:0);
