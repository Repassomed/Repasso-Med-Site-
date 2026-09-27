// Issue #275 — contexto do HEAD enviado aos auditores ANCORADO NA REGIÃO
// DO DIFF, nunca na primeira ocorrência global de uma palavra.
//
// Caso real (PR #266, semiologia-ii.html, ~710 KB): a versão anterior
// extraía palavras das linhas removidas e usava `lower.indexOf(term)` no
// arquivo inteiro. Termos como "verdadero"/"respuesta" aparecem centenas
// de vezes; a primeira ocorrência caía em outro bloco, o auditor recebia
// o trecho errado e reprovava por "evidência ausente", embora o resumo
// correto (B08 · "Clasificación según cifras de PA") existisse no MESMO
// HEAD, no MESMO bloco, antes da questão alterada.
//
// Estratégia determinística, em camadas de prioridade (o teto de
// caracteres corta sempre pela camada menos importante):
//   1. REGIÃO DO DIFF — para cada hunk (posição real no arquivo do HEAD,
//      lida do cabeçalho `@@ -a,b +c,d @@`), a seção ancestral
//      (`<section ...>` que contém o hunk, com seu primeiro heading) e uma
//      janela curta em volta das linhas alteradas.
//   2. MESMA SEÇÃO — subseções (delimitadas por h1–h4) da seção ancestral
//      que mais compartilham termos RAROS com o hunk (peso inverso à
//      frequência no arquivo inteiro: "respuesta" pesa ~0, "consultorio"
//      ou "120-139" pesam muito). Empate → a mais próxima do hunk.
//   3. PRESERVAÇÃO FORA DA SEÇÃO — só quando o hunk REMOVE texto: a
//      subseção do arquivo inteiro com mais termos raros do texto
//      removido (caso #208: confirmar que algo apagado já existe em outra
//      seção útil). Nunca por primeira ocorrência.
//
// Fail-closed: arquivo sem hunk identificável no diff não recebe NENHUM
// trecho inventado (nem "o começo do arquivo") — só uma nota explícita.
//
// Issue #305 (achado real, Neurología P0): com MAIS DE `MAX_CLUSTERS_POR_
// ARQUIVO` blocos alterados no mesmo arquivo (aqui: 4 hunks — Q1/neub02,
// Q3/neub03, Q2+Q4/neub05 — + os espelhos no Banco General), a camada 1/2
// acima NUNCA CHEGA a processar os últimos blocos: a busca "mesma seção"
// só roda para os primeiros `MAX_CLUSTERS_POR_ARQUIVO` clusters do diff,
// na ORDEM em que aparecem — não na ordem de importância. O OpenAI
// Auditor reprovou #305 porque os trechos que ensinam Wernicke (Brodmann
// 22), V par/trigémino, marcha en tijeras e o signo vestibular
// simplesmente não chegaram a ser buscados para alguns blocos, mesmo
// existindo, intocados, no HEAD.
//
// CAMADA 0 (nova, PRIORITÁRIA): EVIDÊNCIA DIDÁTICA DA LEI 8-A —
// independente do agrupamento/corte por cluster acima. Para cada questão
// nova/reformulada, o `question_report` (Lei 8-A.11, ``coordinator/
// question_report.py::render_question_report``, já embutido no corpo da
// PR pelo Runner) declara a coluna "Destino no site" — o BLOCO/SEÇÃO
// (``<section id="...">``) onde a questão foi inserida. Pela Lei 8-A.3
// ("inserir no fim do bloco que ensina o assunto"), esse MESMO bloco é,
// por construção da política, o bloco que precisa ensinar o conceito.
// Esta camada:
//   1. lê a "Matriz por fonte" (Markdown determinístico, nunca prosa
//      livre) do corpo da PR e extrai a coluna "Destino no site" de cada
//      fonte com Novas/Reformuladas > 0;
//   2. cruza cada token dessa coluna com os ids REAIS de ``<section
//      id="...">`` existentes no HEAD auditado — nunca inventa nem
//      adivinha um bloco que o relatório não citou;
//   3. dentro do bloco (a seção INTEIRA, não só perto do hunk), busca as
//      subseções que mais compartilham termos raros com a questão
//      adicionada (mesma função de peso por raridade da camada 1/2), sem
//      o corte de `MAX_CLUSTERS_POR_ARQUIVO`;
//   4. fail-closed em dois níveis, sempre como NOTA visível ao auditor
//      (nunca um trecho inventado): bloco citado que não existe no HEAD,
//      ou bloco que existe mas nenhuma subseção sua compartilha termos
//      suficientes com a questão — nos dois casos, a resposta é "pedir
//      correção do relatório", nunca escolher um trecho no escuro.
// PRs sem relatório 8-A (ex.: infraestrutura) não acionam esta camada —
// ``extrairDestinosDoRelatorio8A`` devolve lista vazia e o comportamento
// fica byte a byte o mesmo de antes desta correção.
//
// Função pura: recebe o diff, o corpo da PR e o conteúdo JÁ lido pela API
// (texto do HEAD exato validado); nunca faz rede, nunca executa nada da PR.

export const LIMITE_PADRAO = 12000;
const MAX_ARQUIVOS = 3;
const MAX_CLUSTERS_POR_ARQUIVO = 3;
const JANELA_HUNK_CHARS = 1600;
const TRECHO_SUBSECAO_CHARS = 1800;
const MAX_SUBSECOES_RELACIONADAS = 2;
const MAX_SUBSECOES_8A = 1;
const MIN_TERMOS_SEGMENTO_8A = 4;
const MARGEM_LINHAS_HUNK = 3;
const CABECALHO_MATRIZ_8A =
  '| Fonte | Página/imagem | Legibilidade | Detectadas | Aproveitadas | Novas | Reformuladas | ' +
  'Duplicadas/canônicas | Reconstruídas | Pendentes | Destino no site |';

const STOP = new Set([
  'para', 'como', 'esta', 'este', 'essa', 'esse', 'isso', 'isto', 'uma', 'uno', 'unos', 'unas',
  'com', 'con', 'sem', 'sin', 'que', 'por', 'los', 'las', 'del', 'das', 'dos', 'the', 'and',
  'cada', 'sobre', 'entre', 'debe', 'deben', 'materia', 'bloque', 'estudiar', 'estudo',
  'class', 'style', 'span', 'strong', 'button', 'onclick', 'margin', 'color', 'font',
  'size', 'true', 'false', 'data',
]);

const RE_HEADING = /<h[1-4]\b/i;
const RE_SECTION_ABRE = /<section\b/i;
const RE_SECTION_FECHA = /<\/section>/i;

/** Texto visível normalizado: sem tags/entidades, minúsculo, traços unificados. */
export function normalizar(texto) {
  return String(texto || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ')
    .replace(/[‐-―−]/g, '-')
    .toLowerCase();
}

/** Termos significativos: palavras ≥5 letras fora do STOP e números/faixas. */
export function extrairTermos(texto) {
  const plano = normalizar(texto);
  const palavras = plano.match(/[a-záéíóúüñãõçâêô][a-záéíóúüñãõçâêô'’-]{4,}/g) || [];
  const numeros = plano.match(/\d+(?:[-/]\d+)+|\d{2,}/g) || [];
  const termos = new Set();
  for (const p of palavras) if (!STOP.has(p)) termos.add(p);
  for (const n of numeros) termos.add(n);
  return [...termos];
}

/**
 * Hunks do diff unificado por arquivo (lado NOVO = HEAD).
 * @returns {Map<string, Array<{inicio:number, fim:number, alteradas:number[], adicionado:string, removido:string, contexto:string}>>}
 */
export function parseHunks(diffTexto) {
  const porArquivo = new Map();
  let atual = null;
  let hunk = null;
  let linhaNova = 0;
  const fecharHunk = () => {
    if (hunk && atual) {
      if (!hunk.alteradas.length) hunk.alteradas.push(hunk.inicio);
      porArquivo.get(atual).push(hunk);
    }
    hunk = null;
  };
  for (const linha of String(diffTexto || '').split('\n')) {
    if (linha.startsWith('diff --git ')) {
      fecharHunk();
      atual = null;
      continue;
    }
    if (linha.startsWith('+++ ')) {
      fecharHunk();
      const alvo = linha.slice(4).replace(/\t.*$/, '').replace(/\s+$/, '');
      atual = alvo === '/dev/null' ? null : alvo.replace(/^b\//, '');
      if (atual && !porArquivo.has(atual)) porArquivo.set(atual, []);
      continue;
    }
    if (linha.startsWith('--- ')) continue;
    const cab = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(linha);
    if (cab) {
      fecharHunk();
      if (!atual) continue;
      linhaNova = Number(cab[1]);
      hunk = { inicio: linhaNova, fim: linhaNova, alteradas: [], adicionado: '', removido: '', contexto: '' };
      continue;
    }
    if (!hunk) continue;
    if (linha.startsWith('+')) {
      hunk.alteradas.push(linhaNova);
      hunk.adicionado += linha.slice(1) + '\n';
      hunk.fim = linhaNova;
      linhaNova += 1;
    } else if (linha.startsWith('-')) {
      hunk.alteradas.push(linhaNova);
      hunk.removido += linha.slice(1) + '\n';
    } else if (linha.startsWith(' ')) {
      hunk.contexto += linha.slice(1) + '\n';
      hunk.fim = linhaNova;
      linhaNova += 1;
    }
  }
  fecharHunk();
  return porArquivo;
}

/** Limites (1-based, inclusivo) da `<section id="ID">` — ou `null` se não existir. */
function limitesSecaoPorId(linhas, id) {
  const seguro = String(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const abreRe = new RegExp(`<section\\b[^>]*\\bid="${seguro}"`, 'i');
  let i0 = -1;
  for (let i = 0; i < linhas.length; i++) {
    if (abreRe.test(linhas[i])) { i0 = i; break; }
  }
  if (i0 < 0) return null;
  const inicio = i0 + 1;
  let fim = linhas.length;
  for (let i = inicio; i < linhas.length; i++) {
    if (RE_SECTION_FECHA.test(linhas[i]) || RE_SECTION_ABRE.test(linhas[i])) { fim = i + 1; break; }
  }
  return { inicio, fim };
}

/** ids de TODAS as `<section id="...">` do arquivo — nunca id de item/questão/flashcard. */
export function idsDeSecoes(content) {
  const ids = new Set();
  const re = /<section\b[^>]*\bid="([a-zA-Z][\w-]*)"/gi;
  let m;
  while ((m = re.exec(String(content || '')))) ids.add(m[1]);
  return ids;
}

/** Divide uma linha de tabela Markdown em células, sem quebrar em `\|` escapado. */
function celulasDeLinhaTabela(linha) {
  const partes = String(linha).split(/(?<!\\)\|/).map((c) => c.trim());
  if (partes.length && partes[0] === '') partes.shift();
  if (partes.length && partes[partes.length - 1] === '') partes.pop();
  return partes.map((c) => c.replace(/\\\|/g, '|'));
}

/**
 * Lê a "Matriz por fonte" da Lei 8-A.11 (Markdown determinístico produzido
 * por ``coordinator/question_report.py::render_question_report`` e embutido
 * pelo Runner no corpo da PR) e devolve, por fonte, os contadores
 * Novas/Reformuladas e o texto da coluna "Destino no site". Nunca lê prosa
 * livre fora dessa tabela — cabeçalho exato ou nada.
 * @returns {Array<{novas:number, reformuladas:number, destino:string}>}
 */
export function extrairDestinosDoRelatorio8A(prBody) {
  const linhas = String(prBody || '').split('\n');
  const idx = linhas.findIndex((l) => l.trim() === CABECALHO_MATRIZ_8A);
  if (idx < 0) return [];
  const destinos = [];
  for (let i = idx + 2; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l.trim().startsWith('|')) break;
    const cel = celulasDeLinhaTabela(l);
    if (cel.length < 11) continue;
    destinos.push({
      novas: parseInt(cel[5], 10) || 0,
      reformuladas: parseInt(cel[6], 10) || 0,
      destino: cel[10],
    });
  }
  return destinos;
}

/** ids de seção válidos (já existentes no HEAD) mencionados no texto. */
function blocosNoTexto(texto, idsValidos) {
  const tokens = String(texto || '').match(/[a-zA-Z][\w-]*/g) || [];
  const achados = new Set();
  for (const t of tokens) if (idsValidos.has(t)) achados.add(t);
  return achados;
}

/** Seção ancestral (1-based, inclusivo) da linha, ou o arquivo inteiro. */
function secaoAncestral(linhas, linha) {
  let inicio = 1;
  for (let i = Math.min(linha, linhas.length) - 1; i >= 0; i--) {
    if (RE_SECTION_ABRE.test(linhas[i])) { inicio = i + 1; break; }
    if (RE_SECTION_FECHA.test(linhas[i]) && i + 1 < linha) { inicio = i + 2; break; }
  }
  let fim = linhas.length;
  for (let i = Math.max(linha, 1); i < linhas.length; i++) {
    if (RE_SECTION_FECHA.test(linhas[i]) || RE_SECTION_ABRE.test(linhas[i])) { fim = i + 1; break; }
  }
  return { inicio, fim };
}

/** Subseções (heading h1–h4 até o próximo heading) dentro de [inicio, fim]. */
function subsecoes(linhas, inicio, fim) {
  const res = [];
  let atual = null;
  for (let n = inicio; n <= fim; n++) {
    if (RE_HEADING.test(linhas[n - 1] || '')) {
      if (atual) { atual.fim = n - 1; res.push(atual); }
      atual = { inicio: n, fim: n };
    }
  }
  if (atual) { atual.fim = fim; res.push(atual); }
  return res;
}

function compactar(linhas, de, ate) {
  return linhas.slice(de - 1, ate).map((l) => l.trim()).filter(Boolean).join('\n');
}

function recortar(texto, max) {
  return texto.length <= max ? texto : texto.slice(0, max) + '\n[… trecho cortado pelo limite]';
}

function rotuloSecao(linhas, secao) {
  const abre = (linhas[secao.inicio - 1] || '').trim();
  const id = /id="([^"]+)"/.exec(abre);
  let heading = '';
  for (let n = secao.inicio; n <= Math.min(secao.fim, secao.inicio + 40); n++) {
    if (RE_HEADING.test(linhas[n - 1] || '')) { heading = normalizar(linhas[n - 1]).replace(/\s+/g, ' ').trim(); break; }
  }
  return `${id ? `id="${id[1]}"` : 'sem id'}${heading ? ` · ${heading}` : ''}`;
}

/** Peso por raridade: termo presente em muitas linhas do arquivo ≈ 0. */
function pesosPorRaridade(linhasNorm, termos) {
  const total = linhasNorm.length || 1;
  const pesos = new Map();
  for (const t of termos) {
    let df = 0;
    for (const l of linhasNorm) if (l.includes(t)) df += 1;
    if (df === 0) continue;
    pesos.set(t, Math.log(1 + total / (df + 1)) / (df > 40 ? 4 : 1));
  }
  return pesos;
}

function pontuar(linhasNorm, sub, pesos) {
  const texto = linhasNorm.slice(sub.inicio - 1, sub.fim).join(' ');
  let score = 0;
  let distintos = 0;
  for (const [t, w] of pesos) if (texto.includes(t)) { score += w; distintos += 1; }
  return { score, distintos };
}

function trechoSubsecao(linhas, linhasNorm, sub, pesos) {
  const bruto = compactar(linhas, sub.inicio, sub.fim);
  if (bruto.length <= TRECHO_SUBSECAO_CHARS) return { de: sub.inicio, ate: sub.fim, texto: bruto };
  // Subseção longa: heading + janela em volta da linha mais relevante.
  let melhor = sub.inicio;
  let melhorScore = -1;
  for (let n = sub.inicio; n <= sub.fim; n++) {
    let s = 0;
    for (const [t, w] of pesos) if (linhasNorm[n - 1].includes(t)) s += w;
    if (s > melhorScore) { melhorScore = s; melhor = n; }
  }
  let de = Math.max(sub.inicio + 1, melhor - 6);
  let ate = Math.min(sub.fim, melhor + 12);
  const heading = (linhas[sub.inicio - 1] || '').trim();
  const corpo = compactar(linhas, de, ate);
  return { de: sub.inicio, ate, texto: recortar(`${heading}\n[…]\n${corpo}`, TRECHO_SUBSECAO_CHARS) };
}

/**
 * Igual a `trechoSubsecao`, mas para subseção longa usa o VÃO do primeiro
 * ao último ponto com score positivo (nunca só o pico isolado ± margem
 * fixa), crescendo simetricamente até o teto de caracteres.
 *
 * Achado real da Issue #305: em "3.3 · Rama vestibular" (neub05), a frase
 * que sustenta a questão ("su signo patognomónico es el nistagmo") ficava
 * ~33 linhas depois do PICO de pontuação da subseção (outro trecho com
 * mais termos raros concentrados) — a janela antiga (pico ± 6/12 linhas)
 * nunca alcançava a frase, mesmo com ela pontuando > 0 e a subseção
 * inteira (34 linhas) caber com folga no teto de caracteres.
 */
function trechoDidaticoAmplo(linhas, linhasNorm, sub, pesos, maxChars) {
  const bruto = compactar(linhas, sub.inicio, sub.fim);
  if (bruto.length <= maxChars) return { de: sub.inicio, ate: sub.fim, texto: bruto };
  const relevantes = [];
  for (let n = sub.inicio; n <= sub.fim; n++) {
    let s = 0;
    for (const [t, w] of pesos) if (linhasNorm[n - 1].includes(t)) s += w;
    if (s > 0) relevantes.push(n);
  }
  if (!relevantes.length) return trechoSubsecao(linhas, linhasNorm, sub, pesos);
  const heading = (linhas[sub.inicio - 1] || '').trim();
  const orcamentoCorpo = Math.max(200, maxChars - heading.length - 10);
  const cresce = (centro) => {
    let de = centro;
    let ate = centro;
    for (;;) {
      const novoDe = Math.max(sub.inicio + 1, de - 1);
      const novoAte = Math.min(sub.fim, ate + 1);
      if (novoDe === de && novoAte === ate) break;
      if (compactar(linhas, novoDe, novoAte).length > orcamentoCorpo) break;
      de = novoDe;
      ate = novoAte;
    }
    return { de, ate };
  };
  // Vão do 1º ao último ponto relevante — se coubesse no orçamento, seria
  // sempre a melhor janela. Quando NÃO cabe (achado real da Issue #305:
  // pontos relevantes espalhados por 50+ linhas de uma subseção longa —
  // "3.3 · Rama vestibular" tem "nistagmo" cedo e "su signo patognomónico
  // es el nistagmo" ~30 linhas depois), uma janela ± fixa a partir de UM
  // pico isolado corta a frase que sustenta a resposta antes de chegar
  // nela. Em vez disso, testa uma janela SIMÉTRICA crescida a partir de
  // CADA ponto relevante e fica com a que cobre MAIS pontos relevantes
  // (empate → a mais estreita) — cobre o maior número de trechos que
  // sustentam a questão dentro do mesmo orçamento de sempre.
  const vaoCompleto = cresce(relevantes[0]);
  let melhor = { ...vaoCompleto, cobertos: relevantes.filter((r) => r >= vaoCompleto.de && r <= vaoCompleto.ate).length };
  if (melhor.cobertos < relevantes.length) {
    for (const centro of relevantes) {
      const janela = cresce(centro);
      const cobertos = relevantes.filter((r) => r >= janela.de && r <= janela.ate).length;
      if (
        cobertos > melhor.cobertos ||
        (cobertos === melhor.cobertos && (janela.ate - janela.de) < (melhor.ate - melhor.de))
      ) {
        melhor = { ...janela, cobertos };
      }
    }
  }
  const corpo = compactar(linhas, melhor.de, melhor.ate);
  return { de: sub.inicio, ate: melhor.ate, texto: recortar(`${heading}\n[…]\n${corpo}`, maxChars) };
}

/**
 * Separa o texto ADICIONADO de um hunk em um segmento por questão nova
 * (cada `<div class="quiz-item" id="...">` inicia um segmento) — nunca por
 * `<h1-4>`/parágrafo, porque o padrão real de inserção é sempre esse `div`.
 * Sem nenhum marcador (ex.: hunk que só muda uma contagem), devolve o
 * bloco inteiro como UM segmento (o filtro de termos mínimos decide se
 * vale a pena pontuar).
 */
function segmentosDeQuestao(adicionado) {
  const partes = String(adicionado || '').split(/(?=<div class="quiz-item" id=")/);
  // Só o que É uma questão nova conta como segmento — descarta texto solto
  // antes do primeiro marcador (ex.: a linha "N preguntas: ... comentada"
  // que muda a cada nova questão em QUALQUER bloco: boilerplate repetido,
  // nunca evidência didática de verdade, mas com termos suficientes para
  // passar despercebido pelo filtro de raridade se fosse pontuado).
  return partes.filter((p) => p.trim().startsWith('<div class="quiz-item" id="'));
}

/**
 * Evidência didática (Lei 8-A) de UM bloco referenciado pelo question_report.
 * Busca na SEÇÃO INTEIRA (sem o corte de MAX_CLUSTERS_POR_ARQUIVO da camada
 * de diff), pontuando por termos raros da(s) questão(ões) que o diff inseriu
 * DENTRO deste mesmo bloco. Fail-closed: devolve `nota` (nunca um trecho
 * inventado) quando o bloco não existe ou nenhuma subseção sua se relaciona.
 */
function evidenciaLei8ADoBloco(linhas, linhasNorm, hunksDoArquivo, id) {
  const sec = limitesSecaoPorId(linhas, id);
  if (!sec) {
    return {
      trechos: [],
      nota: `bloco id="${id}" citado pelo relatório 8-A ("Destino no site") não existe como <section> ` +
        'no HEAD auditado — corrigir o relatório, não adivinhado.',
    };
  }
  const hunksNoBloco = hunksDoArquivo.filter((h) => h.alteradas.some((n) => n >= sec.inicio && n <= sec.fim));
  if (!hunksNoBloco.length) {
    return {
      trechos: [],
      nota: `bloco id="${id}" citado pelo relatório 8-A não tem nenhuma linha alterada dentro dele neste ` +
        'diff — a inserção declarada não está confirmada aqui; corrigir o relatório, não adivinhado.',
    };
  }
  const rotulo = rotuloSecao(linhas, sec);
  const ordenar = (a, b) => b.score - a.score || a.dist - b.dist || a.s.inicio - b.s.inicio;
  // Issue #305 (2ª rodada, achado real): PONTUAR POR QUESTÃO, nunca por
  // hunk nem pelo bloco inteiro combinados. Quando duas questões novas
  // caem no MESMO hunk do diff (ex.: neub05 = Q2 · V par + Q4 · vestibular,
  // inseridas uma logo após a outra, viram UM ÚNICO `@@ ... @@`), pontuar
  // o hunk inteiro junto deixa os termos de uma questão dominarem e a
  // outra fica sem nenhuma evidência — mesmo cabendo as duas no
  // orçamento. `segmentosDeQuestao` separa o texto adicionado do hunk por
  // `<div class="quiz-item" id="...">`; cada segmento substantivo (com
  // termos suficientes — um mero "6 preguntas" no lugar de "5" não conta)
  // garante a SUA própria melhor subseção, nunca repetida entre segmentos
  // do mesmo bloco.
  const vistas = new Set();
  const trechos = [];
  const notasSemEvidencia = [];
  for (const h of hunksNoBloco) {
    const primeira = Math.min(...h.alteradas);
    const ultima = Math.max(...h.alteradas);
    for (const segmento of segmentosDeQuestao(h.adicionado)) {
      const termosSegmento = extrairTermos(segmento + h.contexto);
      if (termosSegmento.length < MIN_TERMOS_SEGMENTO_8A) continue; // edição trivial (ex.: só a contagem)
      const pesos = pesosPorRaridade(linhasNorm, termosSegmento);
      const pontuadas = subsecoes(linhas, sec.inicio, sec.fim)
        .filter((s) => (s.fim < primeira || s.inicio > ultima) && !vistas.has(`${s.inicio}-${s.fim}`))
        .map((s) => ({ s, ...pontuar(linhasNorm, s, pesos), antes: s.fim < primeira, dist: s.fim < primeira ? primeira - s.fim : s.inicio - ultima }))
        .filter((x) => x.distintos >= 2 && x.score > 0);
      const candidatas = [
        ...pontuadas.filter((x) => x.antes).sort(ordenar),
        ...pontuadas.filter((x) => !x.antes).sort(ordenar),
      ].slice(0, MAX_SUBSECOES_8A);
      if (!candidatas.length) {
        notasSemEvidencia.push(`linhas ${h.inicio}–${h.fim}`);
        continue;
      }
      for (const { s } of candidatas) {
        vistas.add(`${s.inicio}-${s.fim}`);
        const t = trechoDidaticoAmplo(linhas, linhasNorm, s, pesos, TRECHO_SUBSECAO_CHARS);
        trechos.push(`#### Evidência didática (Lei 8-A · question_report) · bloco ${rotulo} · linhas ${t.de}–${t.ate}\n${t.texto}`);
      }
    }
  }
  if (!trechos.length) {
    return {
      trechos: [],
      nota: `bloco id="${id}": nenhuma subseção do bloco compartilha termos suficientes com a(s) questão(ões) ` +
        'adicionada(s) — sem trecho didático identificável automaticamente; corrigir o relatório com o ' +
        'trecho exato, não adivinhado.',
    };
  }
  const nota = notasSemEvidencia.length
    ? `bloco id="${id}": a alteração em ${notasSemEvidencia.join(', ')} não teve nenhuma subseção do bloco ` +
      'compartilhando termos suficientes com ela — evidência didática incompleta para essa parte; ' +
      'corrigir o relatório com o trecho exato, não adivinhado.'
    : null;
  return { trechos, nota };
}

/**
 * Orquestra a camada 0 (Lei 8-A) para um arquivo: lê os destinos do
 * relatório, resolve cada um contra os ids reais de `<section>` do HEAD, e
 * busca a evidência didática de cada bloco resolvido — uma vez por bloco,
 * mesmo que vários destinos apontem para o mesmo id.
 */
function evidenciasLei8A(linhas, linhasNorm, hunksDoArquivo, destinos, idsSecoes) {
  const blocosAlvo = new Set();
  const notas = [];
  for (const d of destinos) {
    if (d.novas <= 0 && d.reformuladas <= 0) continue;
    const achados = blocosNoTexto(d.destino, idsSecoes);
    if (!achados.size) {
      notas.push(
        `relatório 8-A: a coluna "Destino no site" ${JSON.stringify(d.destino)} não referencia nenhum ` +
        'bloco (<section id="...">) existente no HEAD auditado — corrigir o relatório, não adivinhado.'
      );
      continue;
    }
    for (const b of achados) blocosAlvo.add(b);
  }
  const porBloco = [];
  for (const id of blocosAlvo) {
    const r = evidenciaLei8ADoBloco(linhas, linhasNorm, hunksDoArquivo, id);
    if (r.trechos.length) porBloco.push(r.trechos);
    if (r.nota) notas.push(r.nota);
  }
  // Round-robin entre blocos (achado real #305): o corte por orçamento no
  // fim de `montarContextoHead` respeita a ORDEM de chegada — sem isto,
  // um bloco citado pelo relatório podia ficar com ZERO evidência só
  // porque veio depois de outro que já preencheu o orçamento inteiro
  // (ex.: neub03 · "marcha en tijeras" perdia para neub02+neub05 juntos).
  // Garante 1 trecho de CADA bloco antes de qualquer bloco emplacar um 2º.
  const trechos = [];
  for (let i = 0; porBloco.some((lista) => i < lista.length); i++) {
    for (const lista of porBloco) if (i < lista.length) trechos.push(lista[i]);
  }
  return { trechos, notas, blocosAlvo };
}

/**
 * @param {object} opts
 * @param {string} opts.diffTexto - diff unificado real da PR (API).
 * @param {Array<{filename:string, content:string}>} opts.arquivos - conteúdo
 *   do HEAD exato, na ordem de prioridade (no máximo 3 são usados).
 * @param {string} opts.sha - HEAD auditado (só para o rótulo).
 * @param {string} [opts.prBody] - corpo real da PR (para extrair a "Matriz
 *   por fonte" da Lei 8-A.11, se houver — Issue #305). Nunca é executado,
 *   só lido como texto/regex.
 * @param {number} [opts.limite]
 * @returns {string} contexto com teto rígido de `limite` caracteres.
 */
export function montarContextoHead({ diffTexto, arquivos, sha, prBody, limite = LIMITE_PADRAO }) {
  const hunksPorArquivo = parseHunks(diffTexto);
  const camadaEvidencia8A = [];
  const camadas = [[], [], []];
  const notas = [];
  const destinos8A = extrairDestinosDoRelatorio8A(prBody);

  for (const { filename, content } of (arquivos || []).slice(0, MAX_ARQUIVOS)) {
    const titulo = `### HEAD CONTEXT · ${filename} @ ${sha}`;
    const hunks = hunksPorArquivo.get(filename) || [];
    if (!hunks.length || typeof content !== 'string' || !content) {
      notas.push(`${titulo}\n(sem hunk identificável no diff para ancorar o contexto — nenhum trecho enviado; fail-closed)`);
      continue;
    }
    const linhas = content.split('\n');
    const linhasNorm = linhas.map(normalizar);

    // Camada 0 (Issue #305): evidência didática guiada pelo question_report
    // — independente do corte por MAX_CLUSTERS_POR_ARQUIVO abaixo, então
    // cobre blocos que a camada de diff nunca chega a processar.
    let blocosCobertosPor8A = new Set();
    if (destinos8A.length) {
      const idsSecoes = idsDeSecoes(content);
      const { trechos, notas: notas8A, blocosAlvo } = evidenciasLei8A(linhas, linhasNorm, hunks, destinos8A, idsSecoes);
      blocosCobertosPor8A = blocosAlvo;
      for (const t of trechos) camadaEvidencia8A.push(`${titulo}\n${t}`);
      for (const n of notas8A) notas.push(`${titulo}\n#### Evidência didática (Lei 8-A) — ${n}`);
    }

    // Agrupa hunks pela seção ancestral (hunks vizinhos da mesma seção
    // viram uma região só) e marca espelhos (mesmo texto adicionado em
    // outra seção — ex.: cópia do Banco General).
    const clusters = [];
    for (const h of hunks) {
      const secao = secaoAncestral(linhas, h.alteradas[0]);
      const existente = clusters.find((c) => c.secao.inicio === secao.inicio && c.secao.fim === secao.fim);
      if (existente) {
        existente.hunks.push(h);
      } else {
        clusters.push({ secao, hunks: [h] });
      }
    }
    const vistos = new Set();
    let usados = 0;
    for (const c of clusters) {
      if (usados >= MAX_CLUSTERS_POR_ARQUIVO) break;
      usados += 1;
      const alteradas = c.hunks.flatMap((h) => h.alteradas);
      const primeira = Math.min(...alteradas);
      const ultima = Math.max(...alteradas);
      const de = Math.max(c.secao.inicio, primeira - MARGEM_LINHAS_HUNK);
      const ate = Math.min(c.secao.fim, ultima + MARGEM_LINHAS_HUNK);
      const assinatura = normalizar(c.hunks.map((h) => h.adicionado + '|' + h.removido).join('')).replace(/\s+/g, ' ').trim();
      const espelho = assinatura && vistos.has(assinatura);
      vistos.add(assinatura);
      const rotulo = rotuloSecao(linhas, c.secao);
      camadas[0].push(
        `${titulo}\n#### Região do diff · linhas ${de}–${ate} · seção ${rotulo}${espelho ? ' · (espelho de alteração já mostrada)' : ''}\n` +
        recortar(compactar(linhas, de, ate), espelho ? 500 : JANELA_HUNK_CHARS)
      );
      if (espelho) continue;

      const textoHunk = c.hunks.map((h) => h.adicionado + h.removido + h.contexto).join('\n');
      const pesos = pesosPorRaridade(linhasNorm, extrairTermos(textoHunk));
      // Issue #305: o id desta seção já foi coberto pela camada 0 (Lei
      // 8-A) — a busca "mesma seção" abaixo ficaria redundante (mesmo
      // objetivo, evidência já garantida e priorizada), então economiza
      // orçamento de caracteres para outros blocos/arquivos.
      const idDestaSecao = (/<section\b[^>]*\bid="([a-zA-Z][\w-]*)"/i.exec(linhas[c.secao.inicio - 1] || '') || [])[1];
      const jaCobertoPor8A = idDestaSecao && blocosCobertosPor8A.has(idDestaSecao);
      // Lei 8-A (RESUMO ENSINA → QUESTÃO COBRA): o ensino que sustenta a
      // alteração fica ANTES dela na seção. Subseções anteriores ao hunk
      // têm prioridade; as posteriores só completam as vagas que sobrarem.
      const ordenar = (a, b) => b.score - a.score || a.dist - b.dist || a.s.inicio - b.s.inicio;
      const pontuadas = jaCobertoPor8A ? [] : subsecoes(linhas, c.secao.inicio, c.secao.fim)
        .filter((s) => s.fim < primeira || s.inicio > ultima)
        .map((s) => ({ s, ...pontuar(linhasNorm, s, pesos), antes: s.fim < primeira, dist: s.fim < primeira ? primeira - s.fim : s.inicio - ultima }))
        .filter((x) => x.distintos >= 2 && x.score > 0);
      const candidatas = [
        ...pontuadas.filter((x) => x.antes).sort(ordenar),
        ...pontuadas.filter((x) => !x.antes).sort(ordenar),
      ]
        .slice(0, MAX_SUBSECOES_RELACIONADAS)
        .sort((a, b) => a.s.inicio - b.s.inicio);
      for (const { s } of candidatas) {
        const t = trechoSubsecao(linhas, linhasNorm, s, pesos);
        camadas[1].push(`#### Mesma seção (${rotulo}) · linhas ${t.de}–${t.ate} · ${filename}\n${t.texto}`);
      }

      const removido = c.hunks.map((h) => h.removido).join('\n');
      const adicionado = normalizar(c.hunks.map((h) => h.adicionado).join('\n'));
      if (removido.trim()) {
        const termosRemovidos = extrairTermos(removido).filter((t) => !adicionado.includes(t));
        const pesosRem = pesosPorRaridade(linhasNorm, termosRemovidos);
        const fora = subsecoes(linhas, 1, linhas.length)
          .filter((s) => s.fim < c.secao.inicio || s.inicio > c.secao.fim)
          .map((s) => ({ s, ...pontuar(linhasNorm, s, pesosRem) }))
          .filter((x) => x.distintos >= 3)
          .sort((a, b) => b.score - a.score || a.s.inicio - b.s.inicio)[0];
        if (fora) {
          const t = trechoSubsecao(linhas, linhasNorm, fora.s, pesosRem);
          camadas[2].push(`#### Possível preservação do texto removido · linhas ${t.de}–${t.ate} · ${filename}\n${t.texto}`);
        }
      }
    }
  }

  const partes = [];
  let tamanho = 0;
  for (const bloco of [...camadaEvidencia8A, ...camadas[0], ...camadas[1], ...camadas[2], ...notas]) {
    const custo = bloco.length + (partes.length ? 2 : 0);
    if (tamanho + custo > limite) {
      if (!partes.length) partes.push(bloco.slice(0, limite));
      continue;
    }
    partes.push(bloco);
    tamanho += custo;
  }
  return partes.join('\n\n').slice(0, limite);
}
