// Farmacología II · completar teofilina (nova) + relabel 11β-HSD2: só adições/rótulo; nada removido.
const fs=require('fs'),cp=require('child_process');
const F='Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/farmacologia-ii.html';
const base=process.argv[2]||'origin/main';
const now=fs.readFileSync(F,'utf8'),old=cp.execSync(`git show ${base}:"${F}"`,{maxBuffer:1<<29}).toString();
let ok=0,bad=0;const t=(n,c)=>{c?ok++:(bad++,console.log('FALHA:',n))};
let r=now;
const item=/    <div class="quiz-item">\n      <div class="quiz-question"><span class="quiz-tag oficial">Basada en preguntas de examen · completar<\/span>\n      ☕ Un efecto adverso común de la teofilina[\s\S]*?\n    <\/div>\n/g;
t('teofilina completar: 2 cópias (bloco + banco)',(now.match(item)||[]).length===2);
r=r.replace(item,'');
const lab='<span class="quiz-tag oficial">Basada en preguntas de examen</span>',orig='<span class="quiz-tag variante">Pregunta complementaria</span>';
for(const id of ['q-f2-hsd2-renal','bq-f2-hsd2-renal']){const i=r.indexOf('id="'+id+'"');const j=r.indexOf(lab,i);t('relabel '+id,i>0&&j>0&&j-i<220);r=r.slice(0,j)+orig+r.slice(j+lab.length);}
for(const [a,b] of [['Las 253 preguntas','Las 252 preguntas'],['<b>253</b><span>Preguntas','<b>252</b><span>Preguntas'],['<b>151</b><span>Basadas','<b>149</b><span>Basadas'],['<b>102</b><span>Complementarias','<b>103</b><span>Complementarias'],['19 basadas en exámenes · 14 compl','18 basadas en exámenes · 14 compl'],['13 basadas en exámenes · 9 compl','12 basadas en exámenes · 10 compl']])r=r.replace(a,b);
t('final menos adições/rótulo/contagens == main (byte a byte)',r===old);
if(r!==old){let i=0;while(i<r.length&&r[i]===old[i])i++;console.log(i,JSON.stringify(r.slice(i-30,i+60)),'|',JSON.stringify(old.slice(i-30,i+60)));}
const bank=now.slice(now.indexOf('id="f2b15"'));const nb=(bank.match(/class="quiz-item"/g)||[]).length,nbl=(now.slice(0,now.indexOf('id="f2b15"')).match(/class="quiz-item"/g)||[]).length;
t('bloco = banco = 253 ('+nbl+'/'+nb+')',nb===253&&nbl===253);
console.log(`f2-completar: ${ok}/${ok+bad}`);process.exit(bad?1:0);
