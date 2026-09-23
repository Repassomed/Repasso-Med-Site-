"""Geração de ``StructuredPatch`` via Claude/Anthropic — Issue #105 Fase D,
correção B2 da auditoria independente do PR #114.

Antes desta correção, ``runner_dispatch.py`` (o executor determinístico)
só sabia APLICAR um ``StructuredPatch`` já pronto (``.patch.json`` no
disco) — não havia nenhuma conexão real entre uma ``RunnerTask``
autorizada e uma chamada de verdade a um modelo para PRODUZIR esse patch.
Este módulo fecha exatamente essa lacuna, e SÓ ela:

    RunnerTask autorizada -> Claude/Anthropic API -> StructuredPatch validado

nunca mais do que isso. Este módulo NUNCA aplica, comita ou publica nada —
``executar_tarefa`` (``runner_dispatch.py``) continua sendo o único lugar
que toca git/disco de verdade, exatamente como antes desta correção.

**Reaproveitamento deliberado (a Issue #105/#114 exige "NÃO duplicar
cliente/API se já existe"):**

- ``coordinator.anthropic_client.build_request``/``call`` — o MESMO ponto
  único de chamada que ``coordinator/observe.py`` já usa; nenhuma segunda
  implementação de "como chamar a Anthropic" existe neste módulo;
- ``coordinator.anthropic_transport.AnthropicTransport`` — o MESMO
  transporte real (SDK oficial, chave só de ``ANTHROPIC_API_KEY`` no
  ambiente, nunca hardcoded);
- ``coordinator.budget.CallLimiter``/``check_budget``/``priority_allowed``
  — o MESMO mecanismo de custo/token/orçamento mensal que já governa o
  Coordinator OBSERVE; o ledger em si (``usage_ledger``, recebido por
  parâmetro) é ``coordinator.git_state.GitUsageLedger`` em produção —
  correção B2-B, ver abaixo — nunca um ledger paralelo;
- ``coordinator.redact.redact`` — a MESMA sanitização de segredo antes de
  qualquer log/reason;
- ``coordinator.models.resolve``/``ModelTier`` — os MESMOS níveis lógicos
  FAST/STANDARD/DEEP (DEEP continua desabilitado por padrão);
- ``coordinator.runner_dispatch.RunnerDispatchConfig``/``StructuredPatch``/
  ``validar_patch_contra_allowed_files`` — o MESMO portão de 3 camadas e a
  MESMA validação de allowed_files que ``executar_tarefa`` já usa; este
  módulo confirma tudo de novo aqui (defesa em profundidade), mas nunca
  reimplementa a lógica.

**Invariantes desta correção (B2, auditoria independente do PR #114):**

1. só chama a API depois que ``RunnerDispatchConfig.gate()`` E
   ``task_autorizada(task.task_id, canonical_task_id=...)`` já abriram —
   gate fechado ou tarefa fora do canário = zero chamada externa,
   devolvido direto (mesma filosofia de ``executar_tarefa``; o achado G3
   da Fase G só acrescentou o canônico EXPLÍCITO para continuações,
   nunca afrouxou a comparação estrita);
2. orçamento mensal checado ANTES da chamada (``check_budget``/
   ``priority_allowed``, usando ``task.priority`` — já um
   ``coordinator.classify.Priority`` no contrato canônico) — sem
   orçamento, zero chamada;
3. contexto MÍNIMO enviado ao modelo: só ``task.instructions`` e o
   conteúdo ATUAL dos próprios ``task.allowed_files`` (nunca o
   repositório inteiro, nunca outros arquivos);
4. o modelo é instruído a devolver SOMENTE um objeto JSON
   ``{"files": [{"path", "content"}]}`` — nunca shell, nunca comando,
   nunca diff unificado, nunca markdown/texto fora do JSON;
5. a resposta é validada em cadeia — JSON bem formado -> dict com "files"
   -> ``StructuredPatch.from_dict`` (sintaxe de caminho, não-vazio, sem
   duplicado) -> caminhos ⊆ ``task.allowed_files``
   (``validar_patch_contra_allowed_files``) — qualquer elo que falhar
   devolve ``FAILED``/``BLOCKED``, NUNCA um patch parcial/aproximado;
6. uma tentativa só — ``anthropic_client.call`` já garante "sem retry
   automático" (erro de transporte é UMA tentativa); este módulo não
   adiciona nenhum laço de nova tentativa;
7. custo/tokens só entram no MESMO mecanismo de ledger já existente —
   nunca um arquivo/mecanismo paralelo; falha ao PERSISTIR o ledger
   (depois de uma chamada que teve êxito) é uma nota, nunca reverte o
   patch já validado (mesmo tratamento de ``observe.py``);
8. ``REPASSO_RUNNER_ENABLED``/``REPASSO_RUNNER_MODE=canary``/
   ``REPASSO_RUNNER_CANARY_TASK_ID`` continuam sendo os MESMOS 3 portões —
   este módulo nunca define um portão paralelo nem mais permissivo.

**Correções da 2ª auditoria independente do PR #114 (B2-A/B2-B/B2-C) —
só isto, o resto do módulo continua igual:**

- **B2-A** (ligar ao workflow real): este módulo em si não muda para essa
  correção — quem liga é ``.github/workflows/coordinator-runner.yml``, que
  agora chama ``runner_dispatch`` com ``--generate-via-claude`` (nunca
  mais ``--patch-file``) no caminho real do canário, com
  ``ANTHROPIC_API_KEY`` só no passo já gated pelos 3+1 portões (ENABLED +
  MODE + CANARY_TASK_ID + ref). Nenhum input livre de prompt/patch — a
  instrução vem só de ``RunnerTask.instructions``, lida do
  ``.task.json`` no checkout confiável da branch padrão.
- **B2-B** (custo persistente): ``usage_ledger`` deixou de ser
  necessariamente um ``coordinator.budget.UsageLedger`` (arquivo local,
  que não sobrevive entre execuções efêmeras do GitHub Actions) — agora
  aceita qualquer objeto com a MESMA superfície (``_UsageLedgerLike``
  abaixo), e a CLI real (``runner_dispatch.py``, ``--usage-git-remote``/
  ``--usage-git-branch``) sempre passa ``coordinator.git_state.
  GitUsageLedger`` numa branch de estado dedicada do próprio repositório
  — o MESMO mecanismo que já persiste dedup/orçamento do Coordinator
  OBSERVE, nunca um sistema paralelo. Os testes deste módulo continuam
  usando ``UsageLedger`` de arquivo local só porque é mais simples de
  isolar num diretório temporário — a interface é idêntica, então o
  comportamento provado vale para as duas implementações.
- **B2-C** (arquivos grandes): antes daquela correção, um ``allowed_file``
  maior que ``MAX_FILE_CHARS_SENT`` era simplesmente CORTADO ao montar o
  prompt (``_clip``, removida) — mas o system prompt pede o conteúdo
  COMPLETO de volta, então o modelo devolveria um "arquivo completo" que
  na verdade só viu uma fatia, e ``FileWrite`` substituiria o arquivo
  inteiro por essa fatia: truncamento silencioso e destrutivo. Por isso
  ``_arquivos_grandes_demais`` passou a bloquear a tarefa inteira ANTES
  de montar o prompt ou chamar o modelo.

**Issue #144 (edição segura por trecho/âncora em arquivos grandes):**

O bloqueio puro do B2-C era seguro mas inviabilizava as matérias reais —
na primeira execução em ``active-supervised`` a task
``fisiopatologia-ii-issue101`` bloqueou exatamente aí (Error Registry
#142). Esta rodada NÃO amplia o limite de 20k e NÃO passa a mandar HTML
gigante ao modelo. Ela acrescenta um segundo caminho, tipado:

- ``FileWrite`` continua sendo o ÚNICO caminho para arquivo pequeno,
  inalterado — conteúdo completo enviado, conteúdo completo de volta;
- para um ``allowed_file`` acima de ``MAX_FILE_CHARS_SENT``, só TRECHOS
  literais vão ao prompt (``extrair_trechos_ancorados``, ancorada nas
  estruturas naturais do HTML — headings, ids, blocos — e nos termos da
  própria instrução da tarefa), com teto conservador por arquivo e no
  total; o arquivo INTEIRO nunca é enviado, em nenhuma circunstância;
- a resposta para esse arquivo só pode ser ``AnchoredEdit``
  (``{path, old_text, new_text}``): ``old_text`` precisa existir
  EXATAMENTE uma vez no conteúdo atual — 0 ocorrência (âncora inventada)
  ou 2+ (ambígua) é ``BLOCKED``, zero escrita;
- ``FileWrite`` para um arquivo GRANDE continua recusado — é exatamente a
  garantia anti-truncamento do B2-C, preservada literalmente;
- as edições são resolvidas EM MEMÓRIA, todas contra o MESMO conteúdo
  original (regiões casadas precisam ser disjuntas, então o resultado não
  depende da ordem), e só então viram ``FileWrite`` com o conteúdo final
  COMPLETO. Uma edição inválida entre várias invalida a resolução inteira
  — nenhum ``FileWrite`` chega a existir;
- daí para a frente nada muda: o mesmo ``StructuredPatch``, a mesma
  ``validar_patch_contra_allowed_files``, o mesmo ``aplicar_patch`` e o
  mesmo diff real conferido contra ``allowed_files`` em
  ``runner_dispatch.executar_tarefa``, o mesmo ledger global, o mesmo
  Guard, o mesmo ``NEEDS-AUDIT``, o mesmo "nunca merge/deploy";
- se não for possível localizar contexto confiável para o arquivo grande,
  a tarefa BLOQUEIA antes de qualquer chamada — o Runner nunca adivinha
  onde editar.

**O que este módulo deliberadamente NÃO faz:** não aplica patch em disco;
não comita/publica nada; não decide merge/publicação; não roda nenhum
comando de shell nem inicia processo externo algum (busca só ``os.path``/
leitura de arquivo local); não faz retry automático; não liga nenhuma flag
(``REPASSO_RUNNER_ENABLED`` continua exigido, exatamente como antes desta
correção); não trunca/corta conteúdo de arquivo para enviar ao modelo
(correção B2-C — um arquivo grande vai por TRECHOS explicitamente
marcados como tais, nunca como se fosse o arquivo todo, e "conteúdo
completo" de arquivo grande continua recusado na volta; Issue #144).
"""

from __future__ import annotations

import json
import os
import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

from . import anthropic_client
from .anthropic_transport import AnthropicTransport
from .budget import BudgetStatus, CallLimiter, UsageRecord, check_budget, estimate_cost_usd, priority_allowed
from .models import ModelTier, resolve as resolve_model
from .redact import redact
from .runner_contract import RunnerTask
from .runner_dispatch import (
    FileWrite,
    RunnerDispatchConfig,
    StructuredPatch,
    validar_patch_contra_allowed_files,
)

# Contexto mínimo (invariante 3): nunca envia o repositório inteiro, só o
# conteúdo ATUAL dos próprios allowed_files, com o mesmo espírito de corte
# de ``coordinator/context.py`` (MAX_CHARS_PER_FIELD) — aqui um pouco maior
# porque é conteúdo de ARQUIVO completo, não um campo de evento.
#
# Correção B2-C (auditoria independente do PR #114, 2ª rodada): este limite
# NUNCA trunca conteúdo enviado ao modelo. O system prompt de ``FileWrite``
# pede o conteúdo COMPLETO do arquivo; enviar uma versão cortada e ainda
# assim aceitar de volta um "conteúdo completo" arriscaria truncamento
# silencioso e destrutivo ao aplicar o patch.
#
# Issue #144: este limite continua EXATAMENTE o mesmo (nunca foi ampliado)
# e continua decidindo quem pode ser enviado INTEGRALMENTE ao modelo — o
# que mudou é só o que acontece com quem excede: em vez de bloquear a
# tarefa inteira pelo tamanho, o arquivo grande passa a ser tratado pelo
# caminho ANCORADO (``AnchoredEdit``), em que só TRECHOS relevantes são
# enviados e a resposta só pode substituir âncoras literais tiradas desses
# trechos. ``FileWrite`` para um arquivo grande continua BLOQUEADO — o
# modelo nunca viu o arquivo inteiro, então "conteúdo completo" vindo dele
# continua sendo truncamento em potencial.
MAX_FILE_CHARS_SENT = 20_000

# ---------------------------------------------------------------------
# Issue #144 — edição segura por trecho/âncora em arquivos grandes.
#
# O total enviado ao modelo continua conservador: por arquivo grande e no
# somatório de todos eles. Estes tetos NUNCA são "o arquivo inteiro" —
# são um orçamento de TRECHOS, e estourar o orçamento corta janelas (nunca
# corta um trecho pelo meio, nunca envia o arquivo por completo).
# ---------------------------------------------------------------------

MAX_ANCHOR_CONTEXT_CHARS_PER_FILE = 12_000
MAX_ANCHOR_CONTEXT_CHARS_TOTAL = 24_000
MAX_ANCHOR_WINDOWS_PER_FILE = 8
ANCHOR_WINDOW_CHARS_BEFORE = 700
ANCHOR_WINDOW_CHARS_AFTER = 900

# Um termo que aparece dezenas de vezes num HTML grande não LOCALIZA nada —
# usá-lo como âncora de contexto produziria janelas espalhadas e sem
# relação com a tarefa. Termos assim são descartados (e, se nenhum termo
# sobrar, a tarefa BLOQUEIA: nunca adivinhar onde editar).
MAX_KEYWORD_OCCURRENCES = 40
MIN_KEYWORD_LEN = 4
MAX_KEYWORDS = 24

# Palavras genéricas de instrução (pt/es) que nunca localizam um trecho
# específico dentro do HTML — só produziriam ruído.
_STOPWORDS = frozenset(
    """
    para pelo pela pelos pelas como cada onde quando porque sobre entre desde ainda
    todo toda todos todas esse essa esses essas este esta estes estas isso isto
    aquele aquela aqueles aquelas mais menos muito muita muitos muitas deve devem
    precisa precisam necessario necessaria favor seguir usar usando manter mantenha
    fazer faca facam criar crie adicionar adicione incluir inclua inserir insira
    remover remova alterar altere modificar modifique atualizar atualize corrigir
    corrija melhorar melhore revisar revise reescrever garantir garanta arquivo
    arquivos conteudo texto textos parte partes atual atuais tarefa instrucao
    instrucoes pagina paginas site html sempre nunca apenas somente tambem depois
    antes dentro fora sendo pode podem devera deveria caso qualquer outro outra
    outros outras seja sejam estar estao mesmo mesma mesmos mesmas
    """.split()
)

_TOKEN_RE = re.compile(r"[0-9A-Za-zÀ-ÿ_-]+")
_ASPAS_RE = re.compile("[\"'«»“”]([^\"'«»“”\n]{4,120})[\"'«»“”]")
_HEADING_RE = re.compile(r"<h[1-6]\b[^>]*>.*?</h[1-6]>", re.IGNORECASE | re.DOTALL)
_ID_RE = re.compile(r"\bid\s*=\s*[\"'][^\"']{1,120}[\"']", re.IGNORECASE)
_BLOCO_RE = re.compile(r"<(?:section|article|main|details|summary)\b[^>]*>", re.IGNORECASE)

# Achado F8-C (Issue #105, Fase F, 7ª rodada): mesmo princípio de
# ``coordinator.openai_budget.conservative_input_tokens_ceiling`` — contagem
# de BYTES UTF-8 (nunca de caracteres) é uma cota superior MATEMÁTICA sobre
# o número de tokens que QUALQUER tokenizador BPE byte-level produz (nunca
# menos de 1 token por byte). ``STRUCTURAL_OVERHEAD_TOKENS_CONSERVATIVE``
# cobre a folga de formatação da API (roles, delimitadores) que não aparece
# no texto puro de system/prompt.
_STRUCTURAL_OVERHEAD_TOKENS_CONSERVATIVE = 64


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _conservative_input_tokens_ceiling(system: str, prompt: str) -> int:
    """Teto de tokens de entrada comprovadamente NÃO-subestimador para
    ``system + prompt`` — nunca menor que a contagem real de tokens que a
    API vai processar (mesma técnica/justificativa de
    ``openai_budget.conservative_input_tokens_ceiling``, aplicada aqui
    para a Anthropic; nenhuma lógica de lá é reimportada/duplicada, só o
    mesmo PRINCÍPIO)."""
    payload_bytes = len((system + prompt).encode("utf-8"))
    return payload_bytes + _STRUCTURAL_OVERHEAD_TOKENS_CONSERVATIVE


def _conservative_call_cost_usd(*, system: str, prompt: str, max_output_tokens: int) -> float:
    """Teto CONSERVADOR (pior caso) do custo de UMA chamada, calculado
    ANTES de qualquer chamada acontecer — usa o teto de tokens de entrada
    comprovadamente não-subestimador acima e o limite MÁXIMO de tokens de
    saída permitidos por chamada (nunca os tokens reais de resposta, que
    só a API sabe depois). Sempre nível STANDARD — o único usado por este
    módulo (``resolve_model(ModelTier.STANDARD)`` mais abaixo)."""
    tokens_entrada = _conservative_input_tokens_ceiling(system, prompt)
    return estimate_cost_usd(ModelTier.STANDARD, tokens_entrada, max_output_tokens)


class _UsageLedgerLike(Protocol):
    """Correção B2-B (auditoria independente do PR #114, 2ª rodada): o
    ledger de custo real do Runner precisa ser ``coordinator.git_state.
    GitUsageLedger`` (persistente entre execuções efêmeras do GitHub
    Actions), nunca ``coordinator.budget.UsageLedger`` (arquivo local, que
    esta função só recebia antes desta correção). As duas classes já
    compartilham a MESMA superfície pública por design (ver o docstring de
    ``GitUsageLedger``) — este ``Protocol`` só documenta essa superfície
    aqui, sem importar nenhuma das duas implementações, então o mecanismo
    de geração continua funcionando com qualquer uma (produção sempre usa
    ``GitUsageLedger``; os testes usam ``UsageLedger`` de arquivo local só
    porque é mais simples de isolar em `tempfile.TemporaryDirectory`).

    Achado F8-C (7ª rodada): ganhou ``reserve_if_within_budget`` — o MESMO
    método atômico (compare-and-set via lock em processo único;
    compare-and-set via git em produção) que o OpenAI Auditor já usa
    (``coordinator/openai_client.py``) para fechar a corrida de orçamento
    "check_budget → chamada → append" (achado F8-C: duas execuções
    concorrentes liam o mesmo saldo ANTES de qualquer uma publicar, então
    as duas podiam passar juntas)."""

    def append(self, record: UsageRecord) -> None: ...
    def month_to_date_usd(self, *, now=None) -> float: ...
    def reserve_if_within_budget(self, candidate, *, budget_usd: float, now=None) -> bool: ...

_SYSTEM_PROMPT = (
    "Você é um gerador determinístico de patch estruturado para o Repasso Med "
    "(Issue #105, Fase D). Devolva SOMENTE um objeto JSON válido, sem nenhum texto "
    "antes ou depois, sem markdown, no formato EXATO:\n"
    '{"files": [{"path": "<caminho>", "content": "<conteúdo COMPLETO do arquivo>"}]}\n'
    "Cada 'path' precisa ser EXATAMENTE um dos caminhos permitidos informados no "
    "prompt do usuário — nunca um caminho novo, nunca um caminho fora dessa lista. "
    "'content' é sempre o CONTEÚDO COMPLETO do arquivo final, nunca um diff/patch "
    "unificado, nunca um comando de shell. Nunca inclua explicação, comentário ou "
    "qualquer texto fora do JSON. Se não for possível cumprir a instrução com "
    'segurança dentro dos caminhos permitidos, devolva exatamente {"files": []}.'
)

# Issue #144: usado SÓ quando algum allowed_file é grande demais para ser
# enviado por inteiro. O contrato fica explicitamente com DUAS operações
# tipadas — ``files``/FileWrite para arquivo pequeno (conteúdo completo,
# exatamente como antes) e ``edits``/AnchoredEdit para arquivo grande
# (substituição literal de uma âncora única). Continua sendo resposta
# estruturada e tipada: nunca diff unificado, nunca shell, nunca texto
# fora do JSON.
_SYSTEM_PROMPT_ANCORADO = (
    "Você é um gerador determinístico de patch estruturado para o Repasso Med "
    "(Issue #105, Fase D; Issue #144). Devolva SOMENTE um objeto JSON válido, sem "
    "nenhum texto antes ou depois, sem markdown, no formato EXATO:\n"
    '{"files": [{"path": "<caminho>", "content": "<conteúdo COMPLETO do arquivo>"}], '
    '"edits": [{"path": "<caminho>", "old_text": "<texto atual literal>", '
    '"new_text": "<texto novo>"}]}\n'
    "Os dois campos são opcionais, mas pelo menos um precisa vir preenchido, e um mesmo "
    "'path' NUNCA pode aparecer nos dois.\n"
    "- 'files' (FileWrite) é SÓ para os caminhos cujo conteúdo ATUAL foi enviado por "
    "INTEIRO no prompt do usuário; 'content' é o conteúdo COMPLETO do arquivo final.\n"
    "- 'edits' (AnchoredEdit) é OBRIGATÓRIO para os caminhos marcados como ARQUIVO "
    "GRANDE, de que você recebeu apenas TRECHOS. Para esses, devolver 'files' é sempre "
    "recusado, porque você não viu o arquivo inteiro.\n"
    "- Todo 'old_text' precisa ser copiado LITERALMENTE de um dos trechos fornecidos, "
    "caractere por caractere, e precisa ser longo/específico o bastante para existir "
    "UMA ÚNICA vez no arquivo. Nunca invente uma âncora, nunca escreva de memória, "
    "nunca use '...' nem abreviação dentro de 'old_text'.\n"
    "Cada 'path' precisa ser EXATAMENTE um dos caminhos permitidos informados no prompt "
    "do usuário — nunca um caminho novo, nunca um caminho fora dessa lista. Nunca um "
    "diff/patch unificado, nunca um comando de shell, nunca explicação ou comentário "
    "fora do JSON. Se não for possível cumprir a instrução com segurança dentro dos "
    'caminhos e trechos permitidos, devolva exatamente {"files": [], "edits": []}.'
)

_REGRAS_ARQUIVO_GRANDE = (
    "ATENÇÃO — há arquivo(s) GRANDE(S) nesta tarefa:\n"
    "- o conteúdo integral desses arquivos NÃO foi enviado, e não será;\n"
    "- só os trechos literais abaixo podem ser editados;\n"
    "- a resposta para esses arquivos precisa usar 'edits' (AnchoredEdit), nunca 'files';\n"
    "- 'old_text' precisa vir LITERALMENTE de um dos trechos fornecidos;\n"
    "- nenhuma invenção de âncora: se o trecho necessário não estiver abaixo, não edite "
    "esse arquivo."
)


def _ler_conteudo_atual(repo_dir: str, allowed_files: tuple[str, ...]) -> dict[str, str]:
    """Só lê os próprios ``allowed_files`` (invariante 3: nunca o
    repositório inteiro, nunca outro caminho). Lê o arquivo INTEIRO,
    mesmo quando maior que ``MAX_FILE_CHARS_SENT`` — é `gerar_patch_via_
    claude` (via `_arquivos_grandes_demais`) quem decide, ANTES de montar
    qualquer prompt, se algo aqui é grande demais para enviar com
    segurança; esta função nunca corta nada silenciosamente (correção
    B2-C)."""
    conteudos: dict[str, str] = {}
    for caminho in allowed_files:
        alvo = os.path.join(repo_dir, caminho)
        if os.path.isfile(alvo):
            with open(alvo, encoding="utf-8", errors="replace") as fh:
                conteudos[caminho] = fh.read()
    return conteudos


def _arquivos_grandes_demais(current_contents: dict[str, str], *, limite: int = MAX_FILE_CHARS_SENT) -> list[str]:
    """Correção B2-C: quais ``allowed_files`` EXISTENTES excedem o limite
    que pode ser enviado INTEGRALMENTE ao modelo.

    Issue #144: continua sendo exatamente esta a fronteira — o que muda é
    o tratamento. Um arquivo listado aqui NUNCA é enviado por inteiro e
    NUNCA aceita ``FileWrite`` de volta; ele segue pelo caminho ANCORADO
    (trechos + ``AnchoredEdit``), e só bloqueia a tarefa se nem contexto
    confiável for possível extrair."""
    return sorted(c for c, texto in current_contents.items() if len(texto) > limite)


# ---------------------------------------------------------------------
# Issue #144 — extração de contexto LOCAL para arquivo grande.
#
# Nunca manda o arquivo inteiro: localiza, pelas próprias estruturas do
# HTML (headings, ids, blocos) e pelos termos da instrução da tarefa, as
# regiões plausivelmente relevantes e envia só JANELAS literais ao redor
# delas. Se nada confiável for localizado, quem chama BLOQUEIA — nunca
# "manda um pedaço qualquer e torce".
# ---------------------------------------------------------------------


def _normalizar(texto: str) -> str:
    """Minúsculas e sem acento PRESERVANDO os índices — o resultado tem
    exatamente o mesmo comprimento do original, caractere a caractere,
    então toda posição encontrada na versão normalizada vale diretamente
    como posição no texto ORIGINAL (é do original que as janelas são
    recortadas, literalmente, nunca da versão normalizada)."""
    saida: list[str] = []
    for ch in texto:
        decomposto = unicodedata.normalize("NFD", ch)
        base = decomposto[0] if decomposto else ch
        minusculo = base.lower()
        saida.append(minusculo if len(minusculo) == 1 else ch)
    return "".join(saida)


def _palavras_chave(instructions: str) -> list[str]:
    """Termos da INSTRUÇÃO que podem localizar um trecho — nunca texto
    livre do modelo, nunca conteúdo do arquivo."""
    escolhidas: list[str] = []
    for bruto in _TOKEN_RE.findall(_normalizar(instructions)):
        palavra = bruto.strip("-_")
        if len(palavra) < MIN_KEYWORD_LEN or palavra in _STOPWORDS:
            continue
        if palavra not in escolhidas:
            escolhidas.append(palavra)
        if len(escolhidas) >= MAX_KEYWORDS:
            break
    return escolhidas


def _frases_ancora(instructions: str) -> list[str]:
    """Trechos entre aspas na instrução ("o título X", 'bloco Y') são a
    âncora mais forte que existe: quem escreveu a tarefa apontou o texto
    literal. Valem mais que uma palavra solta na pontuação."""
    frases: list[str] = []
    for m in _ASPAS_RE.finditer(_normalizar(instructions)):
        frase = m.group(1).strip()
        if len(frase) >= MIN_KEYWORD_LEN and frase not in frases:
            frases.append(frase)
    return frases


def _regioes_estruturais(conteudo_norm: str) -> list[tuple[int, int]]:
    """As estruturas NATURAIS do HTML (headings, ids, blocos) — uma
    ocorrência dentro de uma delas vale mais como âncora do que a mesma
    palavra no meio de um parágrafo qualquer."""
    regioes: list[tuple[int, int]] = []
    for padrao in (_HEADING_RE, _ID_RE, _BLOCO_RE):
        regioes.extend((m.start(), m.end()) for m in padrao.finditer(conteudo_norm))
    return regioes


def _dentro_de_estrutura(pos: int, regioes: list[tuple[int, int]]) -> bool:
    return any(inicio <= pos < fim for inicio, fim in regioes)


def _ocorrencias(
    conteudo_norm: str, agulha: str, regioes: list[tuple[int, int]], *, base: int
) -> list[tuple[int, int, int]]:
    """``(score, posição, tamanho)`` de cada ocorrência. Um termo que
    aparece demais não localiza nada: descartado por inteiro (lista
    vazia), nunca usado "só nas primeiras ocorrências" — isso seria
    escolher um trecho arbitrário."""
    achados: list[tuple[int, int, int]] = []
    inicio = 0
    while True:
        pos = conteudo_norm.find(agulha, inicio)
        if pos < 0:
            break
        if len(achados) >= MAX_KEYWORD_OCCURRENCES:
            return []
        achados.append((base + (3 if _dentro_de_estrutura(pos, regioes) else 0), pos, len(agulha)))
        inicio = pos + len(agulha)
    return achados


def _janela(conteudo: str, pos: int, tamanho: int) -> tuple[int, int]:
    """Janela ao redor de uma âncora, alinhada a quebras de linha quando
    isso não a faz crescer demais (HTML minificado, sem quebras, cairia
    no arquivo inteiro se o alinhamento fosse incondicional)."""
    inicio = max(0, pos - ANCHOR_WINDOW_CHARS_BEFORE)
    fim = min(len(conteudo), pos + tamanho + ANCHOR_WINDOW_CHARS_AFTER)
    bruto = fim - inicio

    quebra_antes = conteudo.rfind("\n", 0, inicio)
    inicio_alinhado = 0 if quebra_antes < 0 else quebra_antes + 1
    quebra_depois = conteudo.find("\n", fim)
    fim_alinhado = len(conteudo) if quebra_depois < 0 else quebra_depois

    if (fim_alinhado - inicio_alinhado) <= bruto + 400:
        return inicio_alinhado, fim_alinhado
    return inicio, fim


@dataclass(frozen=True)
class TrechoAncorado:
    """Um recorte LITERAL do arquivo atual, com a posição de onde saiu —
    é exatamente isto (e só isto) que o modelo vê de um arquivo grande."""

    inicio: int
    fim: int
    texto: str


def extrair_trechos_ancorados(
    conteudo: str,
    instructions: str,
    *,
    limite_chars: int = MAX_ANCHOR_CONTEXT_CHARS_PER_FILE,
    max_janelas: int = MAX_ANCHOR_WINDOWS_PER_FILE,
) -> tuple[TrechoAncorado, ...]:
    """Trechos relevantes do arquivo para esta instrução. Tupla VAZIA
    significa "não foi possível localizar contexto confiável" — quem
    chama precisa BLOQUEAR, nunca enviar um pedaço arbitrário."""
    conteudo_norm = _normalizar(conteudo)
    regioes = _regioes_estruturais(conteudo_norm)

    candidatos: list[tuple[int, int, int]] = []
    for frase in _frases_ancora(instructions):
        candidatos.extend(_ocorrencias(conteudo_norm, frase, regioes, base=5))
    for palavra in _palavras_chave(instructions):
        candidatos.extend(_ocorrencias(conteudo_norm, palavra, regioes, base=1))
    if not candidatos:
        return ()

    selecionadas: list[tuple[int, int]] = []
    total = 0
    for _score, pos, tamanho in sorted(candidatos, key=lambda c: (-c[0], c[1])):
        if any(inicio <= pos < fim for inicio, fim in selecionadas):
            continue
        if len(selecionadas) >= max_janelas:
            break
        inicio, fim = _janela(conteudo, pos, tamanho)
        if total + (fim - inicio) > limite_chars:
            break
        selecionadas.append((inicio, fim))
        total += fim - inicio

    if not selecionadas:
        return ()

    selecionadas.sort()
    unidas: list[list[int]] = []
    for inicio, fim in selecionadas:
        if unidas and inicio <= unidas[-1][1]:
            unidas[-1][1] = max(unidas[-1][1], fim)
        else:
            unidas.append([inicio, fim])
    return tuple(TrechoAncorado(inicio=i, fim=f, texto=conteudo[i:f]) for i, f in unidas)


# ---------------------------------------------------------------------
# Issue #144 — a operação tipada de edição localizada.
# ---------------------------------------------------------------------


@dataclass(frozen=True)
class AnchoredEdit:
    """Substituir ``old_text`` por ``new_text`` num arquivo permitido.

    Deliberadamente NÃO é um diff unificado nem um comando de shell (as
    mesmas razões de ``FileWrite``): é uma substituição literal, sem
    contexto ambíguo, sem metacaractere, sem interpretação. A segurança
    vem da UNICIDADE exigida de ``old_text`` no conteúdo atual — 0 ou mais
    de 1 ocorrência é BLOCKED, nunca "a primeira que aparecer"."""

    path: str
    old_text: str
    new_text: str

    def __post_init__(self) -> None:
        caminho = (self.path or "").strip()
        if not caminho:
            raise ValueError("AnchoredEdit.path não pode ser vazio.")
        if caminho.startswith("/"):
            raise ValueError(f"AnchoredEdit.path {caminho!r} não pode ser absoluto.")
        if ".." in caminho.split("/"):
            raise ValueError(f"AnchoredEdit.path {caminho!r} contém '..' — possível escape de diretório.")
        if not isinstance(self.old_text, str) or not self.old_text:
            raise ValueError("AnchoredEdit.old_text precisa ser texto não vazio — âncora vazia casaria em tudo.")
        if not isinstance(self.new_text, str):
            raise ValueError(
                "AnchoredEdit.new_text precisa ser texto — patch estruturado nunca carrega shell/binário opaco."
            )

    def to_dict(self) -> dict:
        return {"path": self.path, "old_text": self.old_text, "new_text": self.new_text}


def anchored_edits_de_resposta(d: dict) -> tuple[AnchoredEdit, ...]:
    """Lê o campo ``edits`` da resposta do modelo. Ausente/vazio = tupla
    vazia (a resposta só usou ``files``); qualquer coisa malformada é
    ``ValueError`` — nunca uma edição "interpretada"."""
    brutos = d.get("edits")
    if brutos is None:
        return ()
    if not isinstance(brutos, list):
        raise ValueError(f"'edits' precisa ser uma lista, recebido {type(brutos).__name__}.")
    edits: list[AnchoredEdit] = []
    for item in brutos:
        if not isinstance(item, dict):
            raise ValueError(f"cada item de 'edits' precisa ser um objeto, recebido {type(item).__name__}.")
        faltando = sorted({"path", "old_text", "new_text"} - set(item))
        if faltando:
            raise ValueError(f"AnchoredEdit sem campo(s) obrigatório(s): {faltando}")
        edits.append(AnchoredEdit(path=item["path"], old_text=item["old_text"], new_text=item["new_text"]))
    return tuple(edits)


@dataclass(frozen=True)
class ResolucaoAncorada:
    """Tudo ou nada: ``ok=False`` significa ZERO ``FileWrite`` produzido —
    uma edição inválida entre várias invalida a resolução inteira, para
    todos os arquivos, antes de qualquer escrita existir."""

    ok: bool
    reason: str
    files: tuple[FileWrite, ...] = ()


def resolver_anchored_edits(
    edits: tuple[AnchoredEdit, ...], *, task: RunnerTask, current_contents: dict[str, str]
) -> ResolucaoAncorada:
    """Aplica as edições EM MEMÓRIA sobre o conteúdo atual e devolve o
    conteúdo FINAL COMPLETO de cada arquivo tocado, como ``FileWrite`` —
    quem grava continua sendo só ``runner_dispatch.aplicar_patch``, depois
    da mesma validação de allowed_files e do mesmo diff real de sempre.

    Regras (Issue #144), todas fail-closed:

    1. ``path`` precisa estar EXATAMENTE em ``task.allowed_files``;
    2. o arquivo precisa existir (não se ancora no que não existe);
    3. ``old_text`` precisa existir EXATAMENTE UMA vez no conteúdo atual —
       0 ocorrência BLOQUEIA (âncora inventada), 2+ BLOQUEIAM (ambígua);
    4. várias edições no mesmo arquivo só passam se as regiões casadas
       forem DISJUNTAS — todas resolvidas contra o MESMO conteúdo
       original, então o resultado não depende da ordem de aplicação;
    5. nada é produzido até que TODAS as edições de TODOS os arquivos
       tenham validado."""
    if not edits:
        return ResolucaoAncorada(ok=True, reason="nenhuma AnchoredEdit na resposta.")

    permitidos = set(task.allowed_files)
    fora = sorted({e.path for e in edits if e.path not in permitidos})
    if fora:
        return ResolucaoAncorada(
            ok=False,
            reason=(
                f"AnchoredEdit declara caminho(s) fora de allowed_files: {fora} — rejeitado antes de "
                "qualquer resolução; zero escrita."
            ),
        )

    ausentes = sorted({e.path for e in edits if e.path not in current_contents})
    if ausentes:
        return ResolucaoAncorada(
            ok=False,
            reason=(
                f"AnchoredEdit em arquivo(s) que não existe(m) no checkout atual: {ausentes} — não há "
                "conteúdo onde ancorar; use FileWrite para criar arquivo novo. Zero escrita."
            ),
        )

    por_arquivo: dict[str, list[AnchoredEdit]] = {}
    for edit in edits:
        por_arquivo.setdefault(edit.path, []).append(edit)

    resultados: list[FileWrite] = []
    for caminho in sorted(por_arquivo):
        original = current_contents[caminho]
        spans: list[tuple[int, int, str]] = []
        for indice, edit in enumerate(por_arquivo[caminho], 1):
            ocorrencias = original.count(edit.old_text)
            if ocorrencias == 0:
                return ResolucaoAncorada(
                    ok=False,
                    reason=(
                        f"AnchoredEdit #{indice} de {caminho!r}: 'old_text' não existe no conteúdo atual "
                        "(âncora inventada ou o arquivo mudou) — BLOCKED, zero escrita em qualquer arquivo."
                    ),
                )
            if ocorrencias > 1:
                return ResolucaoAncorada(
                    ok=False,
                    reason=(
                        f"AnchoredEdit #{indice} de {caminho!r}: 'old_text' aparece {ocorrencias} vezes no "
                        "conteúdo atual — substituição ambígua, BLOCKED, zero escrita em qualquer arquivo."
                    ),
                )
            inicio = original.index(edit.old_text)
            spans.append((inicio, inicio + len(edit.old_text), edit.new_text))

        spans.sort()
        for anterior, seguinte in zip(spans, spans[1:]):
            if seguinte[0] < anterior[1]:
                return ResolucaoAncorada(
                    ok=False,
                    reason=(
                        f"{caminho!r}: duas AnchoredEdit casam regiões que se sobrepõem — o resultado "
                        "dependeria da ordem de aplicação, o que não é determinístico. BLOCKED, zero escrita."
                    ),
                )

        final = original
        for inicio, fim, novo in reversed(spans):
            final = final[:inicio] + novo + final[fim:]
        resultados.append(FileWrite(path=caminho, content=final))

    return ResolucaoAncorada(
        ok=True,
        reason=f"{len(edits)} AnchoredEdit resolvida(s) em memória sobre {len(resultados)} arquivo(s).",
        files=tuple(resultados),
    )


def build_prompt(
    task: RunnerTask,
    current_contents: dict[str, str],
    trechos_por_arquivo: dict[str, tuple[TrechoAncorado, ...]] | None = None,
) -> str:
    """Monta o prompt com o conteúdo COMPLETO de cada allowed_file pequeno
    — nunca cortado — e, para cada arquivo listado em
    ``trechos_por_arquivo``, SOMENTE os trechos literais já extraídos
    (Issue #144): o arquivo grande nunca entra por inteiro, em nenhuma
    circunstância. Esta função nunca corta um conteúdo por conta própria:
    ou o arquivo veio inteiro em ``current_contents`` e é pequeno, ou veio
    como trechos, decididos antes por ``gerar_patch_via_claude``."""
    trechos_por_arquivo = trechos_por_arquivo or {}
    partes = [
        f"Instrução da tarefa (task_id={task.task_id}):",
        task.instructions.strip(),
        "",
        "Caminhos permitidos (allowed_files) — a resposta só pode usar EXATAMENTE estes:",
    ]
    partes.extend(f"- {c}" for c in task.allowed_files)
    partes.append("")
    if trechos_por_arquivo:
        partes.append(_REGRAS_ARQUIVO_GRANDE)
        partes.append("")
    partes.append("Conteúdo ATUAL de cada caminho ('(arquivo não existe ainda)' se vazio):")
    for caminho in task.allowed_files:
        trechos = trechos_por_arquivo.get(caminho)
        if trechos:
            tamanho = len(current_contents.get(caminho, ""))
            partes.append(
                f"--- {caminho} (ARQUIVO GRANDE: {tamanho} caracteres — NÃO enviado por inteiro; "
                f"{len(trechos)} trecho(s) literal(is) abaixo, use AnchoredEdit) ---"
            )
            for indice, trecho in enumerate(trechos, 1):
                partes.append(
                    f"[trecho {indice} — caracteres {trecho.inicio}..{trecho.fim} do arquivo, cópia literal]"
                )
                partes.append(trecho.texto)
            continue
        partes.append(f"--- {caminho} ---")
        conteudo = current_contents.get(caminho, "")
        partes.append(conteudo if conteudo else "(arquivo não existe ainda)")
    return "\n".join(partes)


@dataclass(frozen=True)
class GenerateOutcome:
    status: str  # "ok" | "blocked" | "failed"
    reason: str
    patch: StructuredPatch | None = None
    usage: UsageRecord | None = None
    external_call_made: bool = False
    # Achado F8-C (7ª rodada): True só quando a chamada TEVE êxito mas a
    # correção da reserva conservadora para o custo real e/ou o registro
    # de uso real não puderam ser persistidos no ledger — sinal EXPLÍCITO
    # (nunca um `except Exception: pass` silencioso, mesmo espírito da
    # correção B3/B9 do OpenAI Auditor). Nunca reverte ``status``/
    # ``patch`` — um patch já gerado/validado continua válido mesmo que o
    # ledger fique temporariamente impreciso (a reserva conservadora, na
    # pior das hipóteses, permanece contada — nunca um valor menor/
    # ausente).
    ledger_correction_failed: bool = False

    def to_dict(self) -> dict:
        d = {
            "status": self.status,
            "reason": redact(self.reason),
            "external_call_made": self.external_call_made,
            "patch": self.patch.to_dict() if self.patch else None,
            "ledger_correction_failed": self.ledger_correction_failed,
        }
        if self.usage:
            d["usage"] = self.usage.to_dict()
        return d


def _outcome_bloqueado(motivo: str) -> GenerateOutcome:
    return GenerateOutcome(status="blocked", reason=motivo, external_call_made=False)


def _tentar_gravar(usage_ledger: _UsageLedgerLike, record: UsageRecord) -> tuple[bool, str | None]:
    """Nunca lança — devolve (persistiu, erro_sanitizado). Mesmo helper
    (mesmo nome/contrato) de ``coordinator/openai_client.py::_tentar_
    gravar`` — usado para a correção e para o registro de uso, para que
    uma falha de persistência vire sinal EXPLÍCITO (``GenerateOutcome.
    ledger_correction_failed``) em vez de uma exceção não tratada ou um
    `except Exception: pass` silencioso (achado F8-C)."""
    try:
        usage_ledger.append(record)
        return True, None
    except Exception as exc:  # noqa: BLE001 — ponto de borda deliberado, mesma filosofia do resto do pacote
        return False, redact(f"{type(exc).__name__}: {exc}")


def gerar_patch_via_claude(
    task: RunnerTask,
    *,
    config: RunnerDispatchConfig,
    repo_dir: str,
    usage_ledger: _UsageLedgerLike,
    budget_usd: float,
    transport: object | None = None,
    canonical_task_id: str | None = None,
) -> GenerateOutcome:
    """A camada de GERAÇÃO — nunca aplica nada. Devolve um
    ``StructuredPatch`` já validado contra ``task.allowed_files`` (pronto
    para ``executar_tarefa`` aplicar/validar/comitar), ou ``blocked``/
    ``failed`` com o motivo — nunca um patch parcial/inventado.

    ``canonical_task_id`` (achado G3, Issue #105 Fase G): mesma regra
    de ``RunnerDispatchConfig.task_autorizada`` usada por
    ``runner_dispatch.executar_tarefa`` — numa CONTINUAÇÃO/RETOMADA,
    ``task.task_id`` é um id de EXECUÇÃO derivado e quem autoriza é o id
    CANÔNICO explícito, passado pelo código confiável (nunca inferido de
    prefixo/sufixo, nunca lido do arquivo da tarefa). ``None`` (o padrão)
    mantém exatamente a regra anterior: ``task.task_id`` precisa ser o
    canário exato. Sem isto, o próprio GERADOR bloquearia uma continuação
    legitimamente autorizada, mesmo com o Runner Dispatch já a tendo
    aceitado.
    """
    # Camada 1+2: os MESMOS 3 portões de ``executar_tarefa`` — gate fechado
    # ou task_id fora do canário = zero chamada externa.
    gate = config.gate()
    if not gate.open:
        return _outcome_bloqueado(gate.reason)
    if not config.task_autorizada(task.task_id, canonical_task_id=canonical_task_id):
        return _outcome_bloqueado(
            f"task_id {task.task_id!r} (canonical_task_id {canonical_task_id!r}) não é o único "
            f"autorizado nesta fase canário ({config.canary_task_id!r})."
        )

    # Camada 3 (invariante 2): checagem GRADUADA por prioridade (50/75/90/
    # 100% do teto — Issue #84 §4), avaliada cedo, ANTES de montar prompt/
    # ler arquivos — nunca a checagem definitiva de orçamento (essa é a
    # reserva atômica mais abaixo, achado F8-C); só decide se esta
    # PRIORIDADE específica deve nem tentar, mais barato que montar o
    # prompt à toa quando o teto já está apertado.
    status_orcamento: BudgetStatus = check_budget(usage_ledger, budget_usd=budget_usd)
    if not priority_allowed(status_orcamento, task.priority):
        return _outcome_bloqueado(f"Orçamento: {status_orcamento.message}")

    contexto = _ler_conteudo_atual(repo_dir, task.allowed_files)

    # Camada 4 (correção B2-C + Issue #144): um allowed_file existente
    # maior do que pode ser enviado integralmente NUNCA é enviado
    # parcialmente/cortado como se fosse o arquivo todo. Em vez de
    # bloquear pelo tamanho, esses arquivos passam pelo caminho ANCORADO:
    # só TRECHOS literais, localizados pela instrução da tarefa e pelas
    # estruturas do próprio HTML, e a resposta para eles só pode ser
    # AnchoredEdit (o bloqueio de FileWrite em arquivo grande, mais
    # abaixo, é o que preserva a garantia anti-truncamento do B2-C).
    #
    # Se o contexto confiável não puder ser localizado, BLOQUEIA aqui
    # mesmo — zero chamada, zero patch, nunca um pedaço arbitrário.
    grandes_demais = _arquivos_grandes_demais(contexto)
    trechos_por_arquivo: dict[str, tuple[TrechoAncorado, ...]] = {}
    orcamento_restante = MAX_ANCHOR_CONTEXT_CHARS_TOTAL
    for caminho in grandes_demais:
        limite_deste = min(MAX_ANCHOR_CONTEXT_CHARS_PER_FILE, orcamento_restante)
        if limite_deste <= 0:
            return _outcome_bloqueado(
                f"o orçamento total de contexto ancorado ({MAX_ANCHOR_CONTEXT_CHARS_TOTAL} caracteres) "
                f"acabou antes de chegar em {caminho!r} — há arquivos grandes demais nesta tarefa para "
                "uma única chamada. Fail-closed (Issue #144): nenhuma chamada foi feita, zero escrita. "
                "Divida a tarefa em allowed_files menores."
            )
        trechos = extrair_trechos_ancorados(contexto[caminho], task.instructions, limite_chars=limite_deste)
        if not trechos:
            return _outcome_bloqueado(
                f"arquivo grande {caminho!r} ({len(contexto[caminho])} caracteres, acima de "
                f"{MAX_FILE_CHARS_SENT}): não foi possível localizar contexto suficientemente "
                "confiável para uma edição ancorada a partir da instrução desta tarefa. Fail-closed "
                "(Issue #144): nenhuma chamada foi feita, nenhum patch foi gerado, zero escrita — o "
                "Runner nunca adivinha onde editar nem envia o arquivo inteiro. Torne a instrução "
                "mais específica (cite o título, o id ou o texto literal do bloco a alterar)."
            )
        trechos_por_arquivo[caminho] = trechos
        orcamento_restante -= sum(t.fim - t.inicio for t in trechos)

    prompt = build_prompt(task, contexto, trechos_por_arquivo)
    system_prompt = _SYSTEM_PROMPT_ANCORADO if trechos_por_arquivo else _SYSTEM_PROMPT

    model_choice = resolve_model(ModelTier.STANDARD)
    limiter = CallLimiter()
    pedido = anthropic_client.build_request(model_choice, system=system_prompt, prompt=prompt, limiter=limiter)
    transporte_real = transport if transport is not None else AnthropicTransport()

    # Achado F8-C (Issue #105, Fase F, 7ª rodada, auditoria independente):
    # "check_budget -> chamada paga -> append" (o fluxo de antes desta
    # correção) tinha uma corrida real — duas execuções concorrentes podiam
    # ler o MESMO saldo do ledger ANTES de qualquer uma publicar seu custo,
    # e as duas passavam juntas no teto. Mesmo padrão já auditado do OpenAI
    # Auditor (``coordinator/openai_client.py::call``, achados B2/B7/B8/B9
    # da auditoria independente do PR #107): reserva CONSERVADORA (pior
    # caso de tokens de entrada/saída) ATÔMICA — checada E gravada como UMA
    # operação (``UsageLedger.reserve_if_within_budget``/
    # ``GitUsageLedger.reserve_if_within_budget``, o MESMO ledger GLOBAL
    # ``coordinator-state-usage``, nunca um segundo orçamento) — ANTES de
    # qualquer chamada. Uma segunda execução concorrente que leia o ledger
    # um instante depois já vê o gasto reservado por esta, então as duas
    # juntas nunca ultrapassam o teto.
    custo_reservado = _conservative_call_cost_usd(
        system=system_prompt, prompt=prompt, max_output_tokens=pedido.max_output_tokens,
    )
    registro_reserva = UsageRecord(
        timestamp=_now_iso(), event_key=f"runner-task:{task.task_id}", tier=model_choice.tier.value,
        model_id=model_choice.model_id, input_tokens=0, output_tokens=0,
        estimated_cost_usd=custo_reservado, kind="reservation",
    )
    try:
        reservou = usage_ledger.reserve_if_within_budget(registro_reserva, budget_usd=budget_usd)
    except Exception as exc:  # noqa: BLE001 — falha ao reservar = zero chamada, nunca uma exceção solta
        return _outcome_bloqueado(
            "Não foi possível reservar orçamento (falha ao persistir a reserva conservadora no "
            f"ledger Anthropic global) — nenhuma chamada foi tentada: {redact(f'{type(exc).__name__}: {exc}')}"
        )
    if not reservou:
        return _outcome_bloqueado(
            f"Orçamento: reservar US$ {custo_reservado:.6f} (teto conservador desta chamada) "
            f"ultrapassaria o limite de US$ {budget_usd:.2f}. Nenhuma chamada foi tentada — hard cap "
            "real, checado e gravado atomicamente ANTES do envio, sem janela de corrida entre a "
            "checagem e a reserva (achado F8-C)."
        )

    # Ponto único de chamada (invariante 6: uma tentativa só, sem retry
    # automático — já garantido por anthropic_client.call). `config` aqui é
    # RunnerDispatchConfig, compatível por duck typing com o `.gate()` que
    # anthropic_client.call() consulta de novo (defesa em profundidade —
    # mesmo padrão do workflow reconfirmar os portões em código).
    resultado_chamada = anthropic_client.call(
        config, pedido, transport=transporte_real, limiter=limiter,
        event_key=f"runner-task:{task.task_id}",
    )
    sanitizado = resultado_chamada.to_dict()

    if resultado_chamada.status in ("blocked", "limited"):
        # `transport.send()` nunca foi chamado — zero tokens consumidos de
        # verdade — a reserva conservadora pode ser liberada com segurança
        # (delta negativo = libera 100% dela). Na prática este ramo é
        # defensivo (os mesmos portões/limiter já foram checados antes da
        # reserva, poucas linhas acima) — nunca deixa a reserva presa à
        # toa quando se sabe com certeza que nada foi gasto.
        _tentar_gravar(usage_ledger, UsageRecord(
            timestamp=_now_iso(), event_key=f"runner-task:{task.task_id}", tier=model_choice.tier.value,
            model_id=model_choice.model_id, input_tokens=0, output_tokens=0,
            estimated_cost_usd=-custo_reservado, kind="correction",
        ))
        return _outcome_bloqueado(sanitizado["reason"])
    if resultado_chamada.status == "error":
        # Correção B8 do OpenAI Auditor, mesmo princípio aqui: um erro de
        # transporte (timeout, conexão perdida) pode ter acontecido DEPOIS
        # que a Anthropic já processou (e cobrou) a requisição — liberar a
        # reserva aqui poderia SUBESTIMAR o gasto real. A reserva
        # conservadora PERMANECE contada — nunca corrigida/liberada neste
        # ramo (achado F8-C: "erro de transporte mantém a reserva
        # conservadora").
        return GenerateOutcome(status="failed", reason=sanitizado["reason"], external_call_made=True)

    # A partir daqui a chamada teve êxito (status == "ok") — corrige a
    # reserva CONSERVADORA para o custo REAL (delta pode ser negativo — o
    # caso comum, já que o teto conservador quase sempre supera o real) e
    # grava um registro informativo de uso, mesmo que a resposta ainda
    # venha a ser rejeitada por validação abaixo: a chamada aconteceu e
    # custou, isso não pode desaparecer só porque o conteúdo devolvido era
    # inválido (invariante 7, inalterada).
    custo_real = resultado_chamada.usage.estimated_cost_usd if resultado_chamada.usage else 0.0
    tokens_entrada_reais = resultado_chamada.usage.input_tokens if resultado_chamada.usage else 0
    tokens_saida_reais = resultado_chamada.usage.output_tokens if resultado_chamada.usage else 0
    corrigiu, erro_correcao = _tentar_gravar(usage_ledger, UsageRecord(
        timestamp=_now_iso(), event_key=f"runner-task:{task.task_id}", tier=model_choice.tier.value,
        model_id=model_choice.model_id, input_tokens=0, output_tokens=0,
        estimated_cost_usd=(custo_real - custo_reservado), kind="correction",
    ))
    persistiu_uso, erro_uso = _tentar_gravar(usage_ledger, UsageRecord(
        timestamp=_now_iso(), event_key=f"runner-task:{task.task_id}", tier=model_choice.tier.value,
        model_id=model_choice.model_id, input_tokens=tokens_entrada_reais, output_tokens=tokens_saida_reais,
        estimated_cost_usd=0.0, kind="usage", informational_cost_usd=custo_real,
    ))
    # Achado F8-C: falha de correção/persistência depois da chamada precisa
    # aparecer EXPLICITAMENTE para quem chama — nunca um `except Exception:
    # pass` silencioso (a chamada paga já aconteceu; a reserva conservadora,
    # na pior das hipóteses, permanece contada — nunca desaparece nem
    # subestima). Nunca reverte status/patch: um patch já gerado/validado
    # continua válido mesmo com o ledger temporariamente impreciso.
    ledger_correction_failed = not (corrigiu and persistiu_uso)
    nota_ledger = ""
    if ledger_correction_failed:
        erro = erro_correcao or erro_uso
        nota_ledger = (
            " [AVISO: a chamada foi concluída com sucesso, mas o ledger não pôde ser totalmente "
            f"atualizado (correção de custo e/ou registro de uso real): {erro}]"
        )

    texto = resultado_chamada.text or ""
    try:
        dados = json.loads(texto)
    except (json.JSONDecodeError, ValueError):
        return GenerateOutcome(
            status="failed",
            reason="resposta do modelo não é um JSON válido — resposta malformada nunca é aplicada "
                   f"parcialmente.{nota_ledger}",
            usage=resultado_chamada.usage, external_call_made=True,
            ledger_correction_failed=ledger_correction_failed,
        )

    if not isinstance(dados, dict):
        return GenerateOutcome(
            status="failed",
            reason=f"resposta do modelo precisa ser um objeto JSON, recebido {type(dados).__name__}."
                   f"{nota_ledger}",
            usage=resultado_chamada.usage, external_call_made=True,
            ledger_correction_failed=ledger_correction_failed,
        )

    # Issue #144: a resposta pode trazer 'files' (FileWrite, arquivo
    # pequeno — o caminho de sempre, inalterado) e/ou 'edits'
    # (AnchoredEdit, arquivo grande). Sem 'edits', tudo abaixo se comporta
    # EXATAMENTE como antes desta rodada.
    try:
        edits = anchored_edits_de_resposta(dados)
    except ValueError as exc:
        return GenerateOutcome(
            status="failed",
            reason=f"campo 'edits' da resposta é inválido (fail-closed, nunca parcial): {exc}{nota_ledger}",
            usage=resultado_chamada.usage, external_call_made=True,
            ledger_correction_failed=ledger_correction_failed,
        )

    try:
        patch_de_arquivos = StructuredPatch.from_dict(dados) if dados.get("files") else None
    except (ValueError, KeyError, TypeError) as exc:
        return GenerateOutcome(
            status="failed",
            reason=f"patch estruturado da resposta é inválido (fail-closed, nunca parcial): {exc}{nota_ledger}",
            usage=resultado_chamada.usage, external_call_made=True,
            ledger_correction_failed=ledger_correction_failed,
        )

    escritas_completas = patch_de_arquivos.files if patch_de_arquivos else ()

    # Garantia anti-truncamento (correção B2-C, preservada): o modelo só
    # viu TRECHOS de um arquivo grande, então um "conteúdo completo" dele
    # é truncamento em potencial — recusado sempre, venha de onde vier.
    grandes_com_filewrite = sorted({fw.path for fw in escritas_completas if fw.path in trechos_por_arquivo})
    if grandes_com_filewrite:
        return GenerateOutcome(
            status="blocked",
            reason=(
                f"resposta devolveu FileWrite (conteúdo completo) para arquivo(s) grande(s) "
                f"{grandes_com_filewrite}, de que só trechos foram enviados — recusado para nunca "
                f"truncar o arquivo; esses caminhos só aceitam AnchoredEdit.{nota_ledger}"
            ),
            usage=resultado_chamada.usage, external_call_made=True,
            ledger_correction_failed=ledger_correction_failed,
        )

    caminhos_em_ambos = sorted({fw.path for fw in escritas_completas} & {e.path for e in edits})
    if caminhos_em_ambos:
        return GenerateOutcome(
            status="blocked",
            reason=(
                f"resposta declara o(s) mesmo(s) caminho(s) em 'files' e em 'edits': "
                f"{caminhos_em_ambos} — o resultado seria ambíguo. Rejeitado, zero escrita.{nota_ledger}"
            ),
            usage=resultado_chamada.usage, external_call_made=True,
            ledger_correction_failed=ledger_correction_failed,
        )

    # Resolução EM MEMÓRIA — tudo ou nada. Uma edição inválida entre
    # várias derruba a resolução inteira, e nenhum FileWrite chega a
    # existir (muito menos a ser gravado: quem grava é aplicar_patch, lá
    # no runner_dispatch, e só depois de todo este caminho).
    resolucao = resolver_anchored_edits(edits, task=task, current_contents=contexto)
    if not resolucao.ok:
        return GenerateOutcome(
            status="blocked",
            reason=f"{resolucao.reason}{nota_ledger}",
            usage=resultado_chamada.usage, external_call_made=True,
            ledger_correction_failed=ledger_correction_failed,
        )

    try:
        patch = StructuredPatch(files=tuple(escritas_completas) + resolucao.files)
    except ValueError as exc:
        return GenerateOutcome(
            status="failed",
            reason=f"patch estruturado da resposta é inválido (fail-closed, nunca parcial): {exc}{nota_ledger}",
            usage=resultado_chamada.usage, external_call_made=True,
            ledger_correction_failed=ledger_correction_failed,
        )

    ok_patch, fora = validar_patch_contra_allowed_files(patch, task)
    if not ok_patch:
        return GenerateOutcome(
            status="blocked",
            reason=f"patch gerado declara caminho(s) fora de allowed_files: {fora} — rejeitado, nunca "
                   f"aplicado.{nota_ledger}",
            usage=resultado_chamada.usage, external_call_made=True,
            ledger_correction_failed=ledger_correction_failed,
        )

    detalhe_ancoras = f" ({len(edits)} AnchoredEdit resolvida(s) em memória)" if edits else ""
    return GenerateOutcome(
        status="ok",
        reason=f"patch gerado via Claude e validado contra allowed_files{detalhe_ancoras}.{nota_ledger}",
        patch=patch, usage=resultado_chamada.usage, external_call_made=True,
        ledger_correction_failed=ledger_correction_failed,
    )
