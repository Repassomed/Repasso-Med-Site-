#!/usr/bin/env node
// Internacionalización e Interculturalidad · estructura del resumen (archivo inerte, sin registrar en get-materia.js)
// Uso: node tools/qa/ici-estructura/ici.test.cjs
const fs=require('fs'),path=require('path');
const F=path.join(__dirname,'..','..','..','Repasso-Med-Site--main','Atual - Copia','netlify','functions','materias-privadas','internacionalizacion-interculturalidad.html');
const h=fs.readFileSync(F,'utf8');
let ok=0,bad=0;const t=(n,c,x)=>{if(c){ok++}else{bad++;console.log('FALLA:',n,x||'')}};
// 1 · etiquetas balanceadas
const VOID=new Set(['br','img','hr','input','meta','link']);
const stack=[];let err='';
for(const m of h.replace(/<!--[\s\S]*?-->/g,'').matchAll(/<(\/?)([a-zA-Z0-9]+)\b[^>]*?(\/?)>/g)){
  const [,close,tag,self]=m;const T=tag.toLowerCase();
  if(VOID.has(T)||self)continue;
  if(!close)stack.push(T);else{const top=stack.pop();if(top!==T){err='cierre '+T+' vs '+top;break}}
}
t('etiquetas balanceadas',!err&&stack.length===0,err+' pila='+stack.length);
// 2 · secciones y bloques
const secs=[...h.matchAll(/<section class="container" id="(ici\d+|iciportada)">([\s\S]*?)<\/section>/g)];
t('portada + 11 bloques',secs.length===12,secs.length);
const bloques=secs.filter(s=>s[1]!=='iciportada');
t('11 bloques',bloques.length===11);
bloques.forEach(([,id,b])=>{
  const nq=(b.match(/class="quiz-item"/g)||[]).length,nf=(b.match(/class="flashcard"/g)||[]).length;
  t(id+' ≥ 7 preguntas',nq>=7,nq);t(id+' ≥ 8 flashcards',nf>=8,nf);
  t(id+' tiene resumen y fuente',/rmc-hint/.test(b)&&/Si te acordás/.test(b));
});
// 3 · ids únicos y anclas
const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
t('ids únicos',new Set(ids).size===ids.length);
[...h.matchAll(/href="#([^"]+)"/g)].forEach(m=>t('ancla '+m[1],ids.includes(m[1])));
// 4 · preguntas
const items=[...h.matchAll(/<div class="quiz-item" id="(q-ici\d+)">([\s\S]*?)\n<\/div>\n/g)];
t('88 preguntas',items.length===88,items.length);
const cnt={a:0,b:0,c:0,d:0};let vT=0,vF=0;
items.forEach(([,id,b])=>{
  t(id+' etiqueta complementaria',/Pregunta complementaria/.test(b)&&!/Basada en preguntas de examen|Pregunta oficial/.test(b));
  if(/tf-buttons/.test(b)){
    const m=b.match(/<strong>(VERDADERO|FALSO)\.<\/strong>/);const c=b.match(/checkTF\(this, (true|false)\)/g)||[];
    t(id+' V/F coherente',!!m&&c.length===2&&c.every(x=>x.includes(m[1]==='VERDADERO'?'true':'false')));
    m&&(m[1]==='VERDADERO'?vT++:vF++);
  }else{
    const opts=[...b.matchAll(/<li>([a-d])\) ([\s\S]*?)<\/li>/g)];
    t(id+' 4 opciones',opts.length===4&&opts.map(o=>o[1]).join('')==='abcd');
    const a=b.match(/<strong>([a-d])\) ([\s\S]*?)<\/strong>/);
    t(id+' respuesta = opción',!!a&&opts.some(o=>o[1]===a[1]&&o[2]===a[2]));
    a&&cnt[a[1]]++;
    t(id+' opciones sin negrita',!opts.some(o=>/<b>/.test(o[2])));
    t(id+' opciones distintas',new Set(opts.map(o=>o[2])).size===4);
  }
});
const nm=cnt.a+cnt.b+cnt.c+cnt.d;
t('gabarito sin letra dominante (máx 35 %)',Math.max(...Object.values(cnt))/nm<=0.35,JSON.stringify(cnt));
t('V/F equilibrado (entre 35 y 65 % verdaderos)',vT/(vT+vF)>=0.35&&vT/(vT+vF)<=0.65,vT+'/'+vF);
// 5 · flashcards
const fcs=[...h.matchAll(/<div class="flashcard"><div class="fc-front">([\s\S]*?)<\/div><div class="fc-back">([\s\S]*?)<\/div><\/div>/g)];
t('96 flashcards',fcs.length===96,fcs.length);
t('flashcards con frente y dorso',fcs.every(f=>f[1].trim()&&f[2].trim()));
t('sin duplicados de frente',new Set(fcs.map(f=>f[1])).size===fcs.length);
// 6 · seguridad / inerte
t('sin scripts',!/<script/i.test(h));
t('sin imágenes externas',!/<img/i.test(h));
const gm=fs.readFileSync(path.join(__dirname,'..','..','..','Repasso-Med-Site--main','Atual - Copia','netlify','functions','get-materia.js'),'utf8');
t('NO registrada en get-materia.js (inerte)',!/internacionalizacion-interculturalidad/.test(gm));
console.log(`\n${ok} OK · ${bad} fallas`);process.exit(bad?1:0);
