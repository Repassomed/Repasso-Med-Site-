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
// Função pura: recebe o diff e o conteúdo JÁ lido pela API (texto do HEAD
// exato validado); nunca faz rede, nunca executa nada da PR.

export const LIMITE_PADRAO = 7000;
const MAX_ARQUIVOS = 3;
const MAX_CLUSTERS_POR_ARQUIVO = 3;
const JANELA_HUNK_CHARS = 1600;
const TRECHO_SUBSECAO_CHARS = 1800;
const MAX_SUBSECOES_RELACIONADAS = 2;
const MARGEM_LINHAS_HUNK = 3;

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
 * @param {object} opts
 * @param {string} opts.diffTexto - diff unificado real da PR (API).
 * @param {Array<{filename:string, content:string}>} opts.arquivos - conteúdo
 *   do HEAD exato, na ordem de prioridade (no máximo 3 são usados).
 * @param {string} opts.sha - HEAD auditado (só para o rótulo).
 * @param {number} [opts.limite]
 * @returns {string} contexto com teto rígido de `limite` caracteres.
 */
export function montarContextoHead({ diffTexto, arquivos, sha, limite = LIMITE_PADRAO }) {
  const hunksPorArquivo = parseHunks(diffTexto);
  const camadas = [[], [], []];
  const notas = [];

  for (const { filename, content } of (arquivos || []).slice(0, MAX_ARQUIVOS)) {
    const titulo = `### HEAD CONTEXT · ${filename} @ ${sha}`;
    const hunks = hunksPorArquivo.get(filename) || [];
    if (!hunks.length || typeof content !== 'string' || !content) {
      notas.push(`${titulo}\n(sem hunk identificável no diff para ancorar o contexto — nenhum trecho enviado; fail-closed)`);
      continue;
    }
    const linhas = content.split('\n');
    const linhasNorm = linhas.map(normalizar);

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
      // Lei 8-A (RESUMO ENSINA → QUESTÃO COBRA): o ensino que sustenta a
      // alteração fica ANTES dela na seção. Subseções anteriores ao hunk
      // têm prioridade; as posteriores só completam as vagas que sobrarem.
      const ordenar = (a, b) => b.score - a.score || a.dist - b.dist || a.s.inicio - b.s.inicio;
      const pontuadas = subsecoes(linhas, c.secao.inicio, c.secao.fim)
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
  for (const bloco of [...camadas[0], ...camadas[1], ...camadas[2], ...notas]) {
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
