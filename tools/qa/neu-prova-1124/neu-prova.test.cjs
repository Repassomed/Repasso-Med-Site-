// Neurología · 6 perguntas da prova de 18/11: nada removido; só adições; bloco = banco; sem negrito/pista.
const fs=require('fs'),cp=require('child_process');
const F='Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/neurologia.html';
const base=process.argv[2]||'1dfb7442' /* #687 antes de a #715 ser incorporada */;
const FIGS=/  <figure class="rmc-fig"><div class="rmc-zoom"><img class="rmc-photo" src="\/assets\/img\/neuro\/neuro-b2\d-0\d-[^"]*"[\s\S]*?<\/figure>\n/g; /* #682: os 13 infográficos não são pergunta nem ensino; verificados em neu-infograficos */
const now=fs.readFileSync(F,'utf8').replace(FIGS,''),old=cp.execSync(`git show ${base}:"${F}"`,{maxBuffer:1<<29}).toString();
let ok=0,bad=0;const t=(n,c)=>{c?ok++:(bad++,console.log('FALHA:',n))};
const IDS=[291,292,293,294,295,296,297];
let r=now;
for(const i of IDS){for(const p of ['q','bq']){const re=new RegExp('<div class="quiz-item" id="'+p+'-neu'+i+'">[\\s\\S]*?</div></div>\\n');t(p+'-neu'+i+' existe 1x',(r.match(new RegExp('id="'+p+'-neu'+i+'"','g'))||[]).length===1);r=r.replace(re,'');}}
const fix=[['<h3>Las 297 preguntas','<h3>Las 290 preguntas'],['<div><b>297</b><span>Preguntas','<div><b>290</b><span>Preguntas'],['<div><b>197</b><span>MCQ','<div><b>193</b><span>MCQ'],['<div><b>69</b><span>Verdadero','<div><b>68</b><span>Verdadero'],['<span>297 preguntas</span>','<span>290 preguntas</span>'],['Bloque 20 · Exámenes complementarios <small>11','Bloque 20 · Exámenes complementarios <small>10'],['Bloque 22 · Epilepsia <small>12','Bloque 22 · Epilepsia <small>9'],['Enfermedades cerebrovasculares <small>19','Enfermedades cerebrovasculares <small>18'],['Traumatismo encefalocraneano (TEC) <small>17','Traumatismo encefalocraneano (TEC) <small>15']];
for(const [a,b] of fix)r=r.replace(a,b);
r=r.replace(/(Preguntas del bloque 20<\/h3>\s*<p>)11 preguntas: 4/,'$110 preguntas: 3').replace(/(Preguntas del bloque 22<\/h3>\s*<p>)12 preguntas: 5/,'$19 preguntas: 2').replace(/(Preguntas del bloque 27<\/h3>\s*<p>)17 preguntas: 9/,'$115 preguntas: 7').replace(/(Preguntas del bloque 21<\/h3>\s*<p>)19 preguntas: 10/,'$118 preguntas: 9');
t('arquivo final menos as 6 perguntas (bloco+banco) e contagens == #687 (byte a byte)',r===old);
if(r!==old){let i=0;while(i<r.length&&r[i]===old[i])i++;console.log('primeira diferença em',i,JSON.stringify(r.slice(i-40,i+80)),'|',JSON.stringify(old.slice(i-40,i+80)));}
for(const i of IDS){const a=now.match(new RegExp('<div class="quiz-item" id="q-neu'+i+'">[\\s\\S]*?</div></div>\\n'))[0],b=now.match(new RegExp('<div class="quiz-item" id="bq-neu'+i+'">[\\s\\S]*?</div></div>\\n'))[0];
 t('bloco=banco '+i,a.replace('id="q-','id="bq-')===b);
 const pre=a.split('<div class="answer">')[0];t('sem negrito/cor antes da resposta '+i,!/<b>|<strong>|<em>|style=|color/.test(pre.replace(/<span class="quiz-tag[^>]*>[^<]*<\/span>/g,'')));
 t('rótulo de exame, nunca «Pregunta oficial» '+i,/Basada en preguntas de examen|basada en examen/.test(a)&&!/Pregunta oficial/.test(a));
 t('nota de reconstrução '+i,/Reconstruida/.test(a));}
const mc=['291','292','293','297'].map(i=>now.match(new RegExp('id="q-neu'+i+'">[\\s\\S]*?</ul>'))[0].match(/<li>[a-d]\) [^<]*<\/li>/g));
mc.forEach((o,k)=>{const ans=now.match(new RegExp('id="q-neu'+['291','292','293','297'][k]+'">[\\s\\S]*?<strong>([a-d])\\)'))[1];const L=o.map(x=>x.length),c=L['abcd'.indexOf(ans)],others=L.filter((_,j)=>j!=='abcd'.indexOf(ans));const mean=others.reduce((a,b)=>a+b)/3;t('viés de tamanho 29'+(k+1)+' (certa '+c+' × média '+mean.toFixed(0)+')',c<=mean*1.25);});
for(const [n,tot] of [[20,11],[21,19],[22,12],[27,17]]){const i=now.indexOf('Preguntas del bloque '+n+'</h3>'),j=now.indexOf('<!-- /quiz-section -->',i),seg=now.slice(i,j);const its=seg.match(/<div class="quiz-item"[^>]*>\s*<p class="quiz-question">.{0,160}/g)||[];const ex=its.filter(x=>/quiz-tag oficial/.test(x)).length,co=its.length-ex;const h=seg.match(/<p>(\d+) preguntas: (\d+) tomadas[^<]*y (\d+) complementarias/);t('bloco '+n+': cabeçalho '+h.slice(1).join('/')+' = real '+its.length+'/'+ex+'/'+co,+h[1]===its.length&&+h[2]===ex&&+h[3]===co&&its.length===tot&&ex+co===tot);}
t('291: Pandy explicado sem generalizar',/Pandy<\/b> busca globulinas/.test(now)&&!/no tiene globulinas/.test(now));
t('292: slide sem período; estado epiléptico sem generalizar',/no precisa el período/.test(now)&&/no detalla cómo se aplica ese tiempo/.test(now));
console.log(`neu-prova: ${ok}/${ok+bad}`);process.exit(bad?1:0);
