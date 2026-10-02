/* 01 · RLS com DUAS identidades (A e B). As políticas são as da migration real, avaliadas pelo Postgres real.
   Dois níveis: (1) SQL direto com SET LOCAL ROLE authenticated + request.jwt.claims (o mecanismo do PostgREST);
   (2) REST com JWTs de sessões reais de A e de B. service_role/superuser só OBSERVA o estado; nunca é a prova. */
const L=require('./lib.cjs'); const {ok,info}=L;
(async()=>{
  const st=await L.startStack();
  const A=await L.mkUser(st,'a'), B=await L.mkUser(st,'b');
  const tok=async(u)=>{ const r=await fetch(st.url+'/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:u.email,password:u.password})}); return (await r.json()).access_token; };
  const tA=await tok(A), tB=await tok(B);
  const api=(t,m,p,body,h={})=>fetch(st.url+'/rest/v1/'+p,{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+(t||'anon-de-teste'),prefer:'return=representation',...h},body:body?JSON.stringify(body):undefined});
  const stroke=(uid,extra={})=>({user_id:uid,subject_slug:'semiologia-ii',anchor_id:'s2-x>1',color:'black',width:'medium',points:[[0.1,0.2],[0.3,0.4]],...extra});

  console.log('== 1 · SQL direto (Postgres real): papel authenticated + claims');
  const asUser=async(uid,q,params)=>{ const c=await st.pool.connect(); try{ await c.query('begin'); await c.query('set local role authenticated'); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:uid,role:'authenticated'})]); const r=await c.query(q,params); await c.query('rollback'); return r; }catch(e){ try{await c.query('rollback')}catch(_){} return {err:e}; } finally{ c.release(); } };
  // A grava; observação por superuser (só para saber o que existe)
  const sA=await L.sql(st,"insert into public.user_ink_strokes(user_id,subject_slug,anchor_id,points) values($1,'semiologia-ii','s2-x>1','[[0.1,0.2],[0.3,0.4]]') returning id",[A.id]); const idA=sA[0].id;
  let r=await asUser(A.id,'select count(*)::int c from public.user_ink_strokes'); ok(r.rows&&r.rows[0].c===1,'A lê o próprio traço (SQL, role authenticated, sub=A)');
  r=await asUser(B.id,'select count(*)::int c from public.user_ink_strokes'); ok(r.rows&&r.rows[0].c===0,'B NÃO lê o traço de A (SQL, sub=B → 0 linhas)');
  r=await asUser(B.id,'select count(*)::int c from public.user_ink_strokes where id=$1',[idA]); ok(r.rows&&r.rows[0].c===0,'B consultando o id exato do traço de A: 0 linhas');
  r=await asUser(B.id,'delete from public.user_ink_strokes where id=$1 returning id',[idA]); ok(r.rows&&r.rows.length===0,'B NÃO apaga o traço de A (DELETE afeta 0 linhas)');
  r=await asUser(B.id,"update public.user_ink_strokes set color='red' where id=$1 returning id",[idA]); ok(r.rows&&r.rows.length===0,'B NÃO altera o traço de A (UPDATE afeta 0 linhas)');
  r=await asUser(B.id,"insert into public.user_ink_strokes(user_id,subject_slug,anchor_id,points) values($1,'semiologia-ii','s2-x>1','[[0,0],[1,1]]')",[A.id]); ok(r.err&&r.err.code==='42501','B NÃO insere traço em nome de A (RLS WITH CHECK → 42501)');
  r=await asUser(A.id,"update public.user_ink_strokes set user_id=$1 where id=$2 returning id",[B.id,idA]); ok((r.err&&r.err.code==='42501')||(r.rows&&r.rows.length===0),'A NÃO «doa» o traço a B (UPDATE user_id → bloqueado)');
  c:{ const c=await st.pool.connect(); try{ await c.query('begin'); await c.query('set local role anon'); const q=await c.query('select count(*)::int c from public.user_ink_strokes'); ok(q.rows[0].c===0,'anon (sem login) lê 0 traços (não há policy para anon, apesar do GRANT padrão do Supabase)'); try{ await c.query("insert into public.user_ink_strokes(user_id,subject_slug,anchor_id,points) values($1,'x','y','[[0,0],[1,1]]')",[A.id]); ok(false,'anon insere'); }catch(e){ ok(e.code==='42501'||e.code==='42501','anon NÃO insere ('+e.code+')'); } await c.query('rollback'); } finally { c.release(); } }

  console.log('== 2 · REST com sessões reais de A e B');
  let x=await api(tA,'POST','user_ink_strokes?select=id',stroke(A.id),{accept:'application/vnd.pgrst.object+json'}); const jA=await x.json(); ok(x.status===201&&jA.id,'A insere o próprio traço via REST → 201 com id');
  x=await api(tB,'GET','user_ink_strokes?select=id&subject_slug=eq.semiologia-ii'); let j=await x.json(); ok(x.status===200&&j.length===0,'B lista traços da matéria: 0 (os de A são invisíveis)');
  x=await api(tB,'GET','user_ink_strokes?select=id&id=eq.'+jA.id); j=await x.json(); ok(j.length===0,'B pede o id de A diretamente: 0');
  x=await api(tB,'GET','user_ink_strokes?select=id&user_id=eq.'+A.id); j=await x.json(); ok(j.length===0,'B filtra por user_id=A: 0');
  x=await api(tB,'DELETE','user_ink_strokes?id=eq.'+jA.id); ok([200,204].includes(x.status)&&(await L.sql(st,'select count(*)::int c from public.user_ink_strokes where id=$1',[jA.id]))[0].c===1,'B tenta DELETE do traço de A: sem efeito (o traço continua existindo)');
  x=await api(tB,'POST','user_ink_strokes?select=id',stroke(A.id)); ok(x.status===403,'B tenta INSERT com user_id=A via REST → 403');
  x=await api(tA,'POST','user_ink_strokes?select=id',stroke(B.id)); ok(x.status===403,'A tenta INSERT com user_id=B via REST → 403');
  x=await api(null,'GET','user_ink_strokes?select=id'); j=await x.json(); ok(j.length===0,'sem token (anon): 0 traços');
  const bad=tA.slice(0,-3)+'xxx'; x=await api(bad,'GET','user_ink_strokes?select=id'); j=await x.json(); ok(j.length===0,'JWT adulterado → tratado como anon: 0 traços (assinatura verificada pelo gateway emulado)');
  x=await api(tA,'GET','user_ink_strokes?select=id'); j=await x.json(); ok(j.length===2,'A continua vendo os seus 2 traços ('+j.length+')');
  console.log('== 3 · mesma política nas tabelas vizinhas (user_notes, user_highlights) e na lista da beta');
  x=await api(tA,'POST','user_notes?select=id',{user_id:A.id,subject_slug:'semiologia-ii',title:'nota de A',body:'x'}); ok(x.status===201,'A cria nota');
  x=await api(tB,'GET','user_notes?select=id'); j=await x.json(); ok(j.length===0,'B não vê a nota de A');
  x=await api(tB,'POST','study_tools_beta?select=user_id',{user_id:B.id}); ok(x.status===403,'B NÃO se auto-habilita na beta (sem policy de INSERT → 403)');
  x=await api(tB,'GET','study_tools_beta?select=user_id'); j=await x.json(); ok(j.length===1&&j[0].user_id===B.id,'B lê somente a própria linha da beta');
  console.log('== 4 · constraints (rede de segurança do banco) — executadas como o próprio A');
  const ins=async(o)=>{ const q=await api(tA,'POST','user_ink_strokes?select=id',stroke(A.id,o)); return q.status; };
  ok(await ins({points:[]})===400,'points vazio → rejeitado (400 / check 1..1200)');
  ok(await ins({points:Array.from({length:1201},(_,i)=>[i/2000,0.5])})===400,'1201 pontos → rejeitado (teto do banco = 1200)');
  ok(await ins({points:Array.from({length:1200},(_,i)=>[i/2000,0.5])})===201,'1200 pontos → aceito');
  ok(await ins({color:'rosa'})===400,'cor fora da lista → rejeitada');
  ok(await ins({width:'gigante'})===400,'espessura fora da lista → rejeitada');
  ok(await ins({anchor_id:'x'.repeat(201)})===400,'anchor_id > 200 → rejeitado');
  ok(await ins({points:{a:1}})===400,'points não-array → rejeitado');
  ok(await ins({points:[[1e308,-1e308],[0,0]]})===201,'valores numéricos extremos NÃO são validados (por desenho: o cliente limita -1.5..2.5) → aceito');
  const big=await fetch(st.url+'/__test/sql',{method:'POST',body:JSON.stringify({sql:"select pg_column_size(points) b from public.user_ink_strokes where jsonb_array_length(points)=1200 limit 1"})}).then(r=>r.json()); info('tamanho de um traço de 1200 pontos no banco: ~'+(big.rows[0]?big.rows[0].b:'?')+' bytes (jsonb)');
  await st.close(); process.exit(L.finish('RLS')?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
