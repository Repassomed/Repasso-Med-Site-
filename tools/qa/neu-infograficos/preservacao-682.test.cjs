// #682 integrada sobre a main com #687+#715: as 13 figuras são a ÚNICA diferença; 297 perguntas, flashcards, glosas, Cierre e ids intactos.
const fs=require('fs'),cp=require('child_process');
const F='Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/neurologia.html';
const base=process.argv[2]||'origin/main';
const now=fs.readFileSync(F,'utf8'),old=cp.execSync(`git show ${base}:"${F}"`,{maxBuffer:1<<29}).toString();
let ok=0,bad=0;const t=(n,c)=>{c?ok++:(bad++,console.log('FALHA:',n))};
const FIG=/  <figure class="rmc-fig"><div class="rmc-zoom"><img class="rmc-photo" src="\/assets\/img\/neuro\/neuro-b2\d-0\d-[^"]*"[\s\S]*?<\/figure>\n/g;
const figs=now.match(FIG)||[];t('13 infográficos presentes ('+figs.length+')',figs.length===13);
t('arquivo integrado menos as 13 figuras == base (byte a byte)',now.replace(FIG,'')===old);
const sec=(h,i)=>{const a=h.indexOf('id="'+i+'"');return h.slice(a,h.indexOf('</section>',a));};
t('seção do Cierre (revisaoneu) idêntica à base',sec(now,'revisaoneu')===sec(old,'revisaoneu'));
t('marcador neuAZ presente 1x como na base',(now.match(/id="neuAZ"/g)||[]).length===(old.match(/id="neuAZ"/g)||[]).length&&(now.match(/id="neuAZ"/g)||[]).length===1);
const b=now.indexOf('id="banconeu"');const cnt=(h,re)=>(h.match(re)||[]).length;
t('297 perguntas no bloco e 297 no banco',cnt(now.slice(0,b),/class="quiz-item"/g)===297&&cnt(now.slice(b),/class="quiz-item"/g)===297);
t('774 flashcards como na base',cnt(now,/class="flashcard"/g)===774&&cnt(old,/class="flashcard"/g)===774);
const ids=h=>[...h.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);const A=new Set(ids(old)),B=new Set(ids(now));t('nenhum id da base sumiu',[...A].every(x=>B.has(x)));
t('figuras sem negrito/pista dentro de alternativas',!/<ul class="options">[^]*?<\/ul>/.test(figs.join('')));
console.log(`preservacao-682: ${ok}/${ok+bad}`);process.exit(bad?1:0);
