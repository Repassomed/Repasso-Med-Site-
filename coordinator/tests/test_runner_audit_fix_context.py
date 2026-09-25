"""Canário PR #286 (Issues #296/#297): contexto da CORREÇÃO PÓS-AUDITORIA
em arquivo grande.

Caso real: o Guard reprovou a #286 por ``block_id de seção removido:
histo00``. O Worker Bridge tentou corrigir duas vezes (claude-worker-1,
run 36194282216; claude-worker-2, run 36194337578) e as duas terminaram
BLOCKED: os 17 trechos enviados não continham a região onde a seção ficava.

Causa raiz (reproduzida com o arquivo real, HEAD ``3bb6857``):

1. a instrução da correção é o objetivo ORIGINAL + o Cartão; as palavras
   do objetivo ocupavam as 24 vagas de ``_palavras_chave`` e ``histo00``
   nunca virava chave;
2. mais fundo: ``histo00`` NÃO EXISTE no HEAD (a PR removeu) — nenhuma
   chave literal do parecer pode ser achada no arquivo atual, então
   aumentar limite nunca resolveria.

Correção: ids objetivos do parecer viram chaves de RECUPERAÇÃO com
prioridade; o que foi removido é localizado na versão anterior à PR
(merge-base, somente leitura) e mapeado para o arquivo atual por linhas
literais únicas nas duas versões. Nenhuma chamada paga nestes testes.
"""

from __future__ import annotations

import inspect
import os
import subprocess
import sys
import tempfile

from . import _pathsetup  # noqa: F401
from coordinator import runner_generate as rg
from coordinator import worker_bridge
from coordinator.budget import UsageLedger
from coordinator.runner_dispatch import ler_arquivo_no_merge_base
from coordinator.tests.test_runner_generate import (
    _CountingTransport,
    _config,
    _resposta_edits,
    _task,
)

ARQ = "materia.html"
OBJETIVO = (
    "Tarefa: P1 ALTA — Histologia I: remover bloco metadidático “Como estudar”.\n"
    "Objetivo: Remover somente o bloco/seção metadidática 'Como estudar', 'Cómo estudiar' ou "
    "equivalente desta matéria. Preservar todo conteúdo médico/disciplinar real; se houver "
    "conteúdo substantivo misturado no bloco, mover esse conteúdo para a primeira seção útil em "
    "vez de apagá-lo. Ajustar apenas referências locais de índice/âncora que ficariam órfãs."
)
CARTAO_286 = (
    "<!-- repasso-coordinator -->\n## 🟣 CARTÃO DE MERGE — Coordinator V3\n\n"
    "**HEAD auditado:** `3bb68573f95d280bf5141bd23f3896100af8ddcf`\n\n"
    "**Decisão da auditoria semântica (STANDARD, independente do worker):** NEEDS-FIX\n"
    "**Motivo:** Guard determinístico encontrou HARD FAIL: histologia-i.html: block_id de seção "
    "removido: {ids}. As marcações do aluno são ancoradas por block_id.; histologia-i.html: 1 id(s) "
    "desapareceram. Isso quebra âncoras e marcações de aluno (Lei 1 e Lei 7).\n"
)


def _instrucao_correcao(ids: str = "histo00") -> str:
    # Mesmo texto que worker_bridge.executar_correcao_de_auditoria monta.
    return (
        OBJETIVO + "\n\nCORREÇÃO PÓS-AUDITORIA — contexto obrigatório, sem ampliar escopo\n"
        "A auditoria independente reprovou o HEAD anterior desta mesma PR. Corrija SOMENTE os "
        "problemas apontados abaixo.\n\n" + CARTAO_286.format(ids=ids)
    )


CSS = "".join(f".hi-regra-{i} {{ color: #{i:03d}; margin: {i}px; }}\n" for i in range(60))
SEC00_BASE = (
    '<section class="container hi-intro" id="histo00">\n'
    '  <div class="section-marker"><span class="section-marker-num">— CÓMO ESTUDIAR ESTA MATERIA</span></div>\n'
    '  <h1 style="font-family:var(--font-display)">🔬 Histología I · Tejidos fundamentales</h1>\n'
    "  <p>Toda la materia gira alrededor de una pregunta práctica sobre la lámina.</p>\n"
    '  <div class="hi-postit"><h5>🎨 La clave de todo: H&amp;E</h5><p>Hematoxilina tiñe núcleos.</p></div>\n'
    '  <div class="hi-inblock"><b>Recorrido de la materia</b><span>01 Introducción</span></div>\n'
    '</section><section class="container" id="histo01">\n'
    '  <div class="section-marker"><span class="section-marker-num">— BLOQUE 01 · LAS REGLAS DEL JUEGO</span></div>\n'
    "  <h2>📘 Introducción a la Histología</h2>\n"
)
# O que a PR #286 fez: tirou a seção histo00 e fundiu o conteúdo em histo01.
SEC00_HEAD = (
    '<section class="container" id="histo01">\n'
    '  <h1 style="font-family:var(--font-display)">🔬 Histología I · Tejidos fundamentales</h1>\n'
    '  <div class="section-marker"><span class="section-marker-num">— BLOQUE 01 · LAS REGLAS DEL JUEGO</span></div>\n'
    "  <h2>📘 Introducción a la Histología</h2>\n"
    '  <div class="hi-postit"><h5>🎨 La clave de todo: H&amp;E</h5><p>Hematoxilina tiñe núcleos.</p></div>\n'
)
RESTO = "  <p>Epitelio de revestimiento: células unidas, poca matriz.</p>\n</section>\n" + "".join(
    f'<section class="container" id="histo{n:02d}">\n  <h2>Bloque {n:02d} de Histología</h2>\n'
    + "".join(f"  <p>Histología de la materia, lámina {n}-{k}: tinción y reconocimiento.</p>\n" for k in range(30))
    # Como no arquivo real: palavras do objetivo genérico casam LONGE da
    # região certa (foi isso que produziu os 17 trechos inúteis).
    + ("  <p>Objetivo real del bloque: reconocer el tejido equivalente y mover la lámina.</p>\n"
       if n in (9, 11) else "")
    + "</section>\n"
    for n in range(2, 13)
)


def _arquivos(*, extra_head: str = "", extra_base: str = "") -> tuple[str, str]:
    topo = "<style>\n" + CSS + "</style>\n\n"
    base = topo + SEC00_BASE + RESTO + extra_base
    head = topo + SEC00_HEAD + RESTO + extra_head
    assert len(head) > rg.MAX_FILE_CHARS_SENT and 'id="histo00"' not in head
    return base, head


def _alvo(head: str) -> int:
    return head.index('<section class="container" id="histo01">')


def _cobre(trechos, pos: int) -> bool:
    return any(t.inicio <= pos < t.fim for t in trechos)


# ---------------------------------------------------------------------------
# Reprodução do caso real: antes × depois
# ---------------------------------------------------------------------------

def test_caso_286_antes_contexto_nao_contem_a_regiao() -> None:
    base, head = _arquivos()
    instr = _instrucao_correcao()
    assert "histo00" not in rg._palavras_chave(instr), "a chave do parecer nunca entrava"
    trechos = rg.extrair_trechos_ancorados(head, instr)
    assert trechos, "o caminho genérico ainda encontra algo (como os 17 trechos reais)"
    assert not _cobre(trechos, _alvo(head)), "reprodução: a região da seção removida fica de fora"
    assert not any("histo00" in t.texto for t in trechos)
    print("OK  test_caso_286_antes_contexto_nao_contem_a_regiao")


def test_caso_286_depois_contexto_contem_a_regiao_literal() -> None:
    base, head = _arquivos()
    instr = _instrucao_correcao()
    chaves = rg.chaves_objetivas_da_auditoria(instr)
    assert chaves == ("histo00",)
    achadas = rg.localizar_chaves_da_auditoria(head, chaves, base)
    assert achadas.localizadas == ("histo00",) and not achadas.nao_localizadas
    trechos = rg.extrair_trechos_ancorados(head, instr, janelas_prioritarias=achadas.janelas)
    alvo = _alvo(head)
    assert _cobre(trechos, alvo)
    regiao = next(t for t in trechos if t.inicio <= alvo < t.fim)
    assert regiao.texto == head[regiao.inicio:regiao.fim], "trecho é cópia literal do arquivo atual"
    assert "Tejidos fundamentales" in regiao.texto and "La clave de todo" in regiao.texto
    [ref] = achadas.referencias_base
    assert 'id="histo00"' in ref.texto and "CÓMO ESTUDIAR" in ref.texto
    assert ref.texto == base[ref.inicio:ref.fim]
    enviado = sum(t.fim - t.inicio for t in trechos) + (ref.fim - ref.inicio)
    assert enviado < len(head) // 2, "nunca o arquivo inteiro"
    print("OK  test_caso_286_depois_contexto_contem_a_regiao_literal")


# ---------------------------------------------------------------------------
# Ponta a ponta com git real (merge-base) e resolução do AnchoredEdit
# ---------------------------------------------------------------------------

def _git(repo: str, *args: str) -> str:
    return subprocess.run(["git", "-C", repo, *args], check=True, capture_output=True, text=True).stdout


def _repo_com_pr(tmp: str, base: str, head: str) -> str:
    repo = os.path.join(tmp, "repo")
    os.makedirs(repo)
    _git(repo, "init", "-q")
    _git(repo, "config", "user.email", "x@example.com")
    _git(repo, "config", "user.name", "X")
    _git(repo, "checkout", "-q", "-b", "bootstrap")
    with open(os.path.join(repo, ARQ), "w", encoding="utf-8") as fh:
        fh.write(base)
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m", "base")
    _git(repo, "checkout", "-q", "-b", "runner/cleanup-teste")
    with open(os.path.join(repo, ARQ), "w", encoding="utf-8") as fh:
        fh.write(head)
    _git(repo, "commit", "-q", "-am", "PR remove histo00")
    return repo


def _gerar(repo: str, transporte, instr: str, *, com_base: bool = True):
    task = _task(allowed_files=(ARQ,), instructions=instr, branch="runner/cleanup-teste")
    ler = (lambda c: ler_arquivo_no_merge_base(repo, c, base_ref="bootstrap")) if com_base else None
    outcome = rg.gerar_patch_via_claude(
        task, config=_config(), repo_dir=repo,
        usage_ledger=UsageLedger(os.path.join(repo, "..", "ledger.json")), budget_usd=20.0,
        transport=transporte, ler_conteudo_base=ler,
    )
    return task, outcome


def test_gerar_patch_envia_regiao_e_referencia_e_resolve_edicao_no_head() -> None:
    base, head = _arquivos()
    with tempfile.TemporaryDirectory() as tmp:
        repo = _repo_com_pr(tmp, base, head)
        assert ler_arquivo_no_merge_base(repo, ARQ, base_ref="bootstrap") == base
        antigo = '<section class="container" id="histo01">\n  <h1 style="font-family:var(--font-display)">'
        novo = ('<section class="container hi-intro" id="histo00">\n'
                '  <h1 style="font-family:var(--font-display)">')
        t = _CountingTransport(response=_resposta_edits([{"path": ARQ, "old_text": antigo, "new_text": novo}]))
        task, outcome = _gerar(repo, t, _instrucao_correcao())
        assert t.calls == 1
        prompt = t.last_request.prompt
        assert "REFERÊNCIA 1 DA VERSÃO ANTERIOR A ESTA PR" in prompt
        assert 'id="histo00"' in prompt and antigo in prompt
        assert head not in prompt and len(prompt) < len(head), "arquivo grande nunca vai inteiro"
        assert outcome.status == "ok", outcome.reason
        assert [f.path for f in outcome.patch.files] == [ARQ]
        assert task.allowed_files == (ARQ,), "allowed_files inalterado"
        assert 'id="histo00"' in outcome.patch.files[0].content
    print("OK  test_gerar_patch_envia_regiao_e_referencia_e_resolve_edicao_no_head")


def test_texto_da_referencia_base_nunca_vira_old_text() -> None:
    base, head = _arquivos()
    with tempfile.TemporaryDirectory() as tmp:
        repo = _repo_com_pr(tmp, base, head)
        so_na_base = '<section class="container hi-intro" id="histo00">'
        t = _CountingTransport(response=_resposta_edits([{"path": ARQ, "old_text": so_na_base, "new_text": "x"}]))
        _task_, outcome = _gerar(repo, t, _instrucao_correcao())
        assert outcome.status != "ok" and outcome.patch is None, outcome.reason
    print("OK  test_texto_da_referencia_base_nunca_vira_old_text")


# ---------------------------------------------------------------------------
# Fail-closed e conservadorismo
# ---------------------------------------------------------------------------

def test_id_inexistente_fail_closed_sem_chamada() -> None:
    base, head = _arquivos()
    with tempfile.TemporaryDirectory() as tmp:
        repo = _repo_com_pr(tmp, base, head)
        t = _CountingTransport(response=_resposta_edits([]))
        _task_, outcome = _gerar(repo, t, _instrucao_correcao("naoexiste99"))
        assert t.calls == 0, "chamada paga não pode acontecer sem localizar a chave"
        assert outcome.status == "blocked" and "naoexiste99" in outcome.reason
        # Sem acesso à versão anterior também não adivinha.
        t2 = _CountingTransport(response=_resposta_edits([]))
        _task_, outcome2 = _gerar(repo, t2, _instrucao_correcao(), com_base=False)
        assert t2.calls == 0 and outcome2.status == "blocked"
    print("OK  test_id_inexistente_fail_closed_sem_chamada")


def test_id_duplicado_nunca_escolhe_regiao_arbitraria() -> None:
    dup = '<div id="dup01">a</div>\n<div id="dup01">b</div>\n'
    base, head = _arquivos(extra_head=dup, extra_base=dup)
    achadas = rg.localizar_chaves_da_auditoria(head, ("dup01",), base)
    assert achadas.janelas == () and achadas.localizadas == ()
    assert "ambígua no arquivo atual" in achadas.nao_localizadas[0][1]
    # Removido do HEAD mas duplicado na base: também não escolhe.
    base2, head2 = _arquivos(extra_base=dup)
    achadas2 = rg.localizar_chaves_da_auditoria(head2, ("dup01",), base2)
    assert achadas2.janelas == () and "ambígua na versão anterior" in achadas2.nao_localizadas[0][1]
    with tempfile.TemporaryDirectory() as tmp:
        repo = _repo_com_pr(tmp, base, head)
        t = _CountingTransport(response=_resposta_edits([]))
        _task_, outcome = _gerar(repo, t, _instrucao_correcao("dup01"))
        assert t.calls == 0 and outcome.status == "blocked"
    print("OK  test_id_duplicado_nunca_escolhe_regiao_arbitraria")


def test_texto_generico_do_auditor_continua_conservador() -> None:
    """Achado em texto livre (sem id objetivo) não cria chave nova: o
    caminho continua exatamente o de antes. Texto fora da seção de
    correção também nunca vira chave."""
    base, head = _arquivos()
    generico = (OBJETIVO + "\n\nCORREÇÃO PÓS-AUDITORIA — contexto obrigatório\n"
                "**Achados (OpenAI):** revisar 'la materia' e textos sobre histología em geral.\n")
    assert rg.chaves_objetivas_da_auditoria(generico) == ()
    fora = 'Preserve id="histo00" e block_id="histo01" sempre.\n' + OBJETIVO
    assert rg.chaves_objetivas_da_auditoria(fora) == (), "só o parecer da correção gera chave"
    assert rg.extrair_trechos_ancorados(head, generico) == rg.extrair_trechos_ancorados(
        head, generico, janelas_prioritarias=())
    with tempfile.TemporaryDirectory() as tmp:
        repo = _repo_com_pr(tmp, base, head)
        t = _CountingTransport(response=_resposta_edits([]))
        _gerar(repo, t, generico)
        assert t.calls == 1 and "REFERÊNCIA 1 DA VERSÃO ANTERIOR" not in t.last_request.prompt
    print("OK  test_texto_generico_do_auditor_continua_conservador")


def test_limites_nao_foram_ampliados() -> None:
    assert rg.MAX_FILE_CHARS_SENT == 20_000
    assert rg.MAX_ANCHOR_CONTEXT_CHARS_PER_FILE == 200_000
    assert rg.MAX_ANCHOR_CONTEXT_CHARS_TOTAL == 240_000
    assert rg.MAX_ANCHOR_WINDOWS_PER_FILE == 24
    assert rg.MAX_REGIAO_MAPEADA_CHARS <= 24_000 and rg.MAX_REFERENCIA_BASE_CHARS <= 8_000
    print("OK  test_limites_nao_foram_ampliados")


def test_leitura_da_base_so_aceita_caminho_seguro() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        base, head = _arquivos()
        repo = _repo_com_pr(tmp, base, head)
        for ruim in ("../fora.html", "/etc/passwd", "-x", ""):
            assert ler_arquivo_no_merge_base(repo, ruim, base_ref="bootstrap") is None
        assert ler_arquivo_no_merge_base(repo, ARQ, base_ref="nao-existe") is None
        assert ler_arquivo_no_merge_base(repo, ARQ, base_ref="--help") is None
    print("OK  test_leitura_da_base_so_aceita_caminho_seguro")


def test_bridge_so_a_correcao_entrega_a_versao_anterior() -> None:
    capturado = []
    original = rg.gerar_patch_via_claude

    def _espiao(task, **kw):
        capturado.append(kw.get("ler_conteudo_base"))
        return rg.GenerateOutcome(status="blocked", reason="espião")

    rg.gerar_patch_via_claude = _espiao
    try:
        with tempfile.TemporaryDirectory() as tmp:
            comum = dict(runner_config=_config(), repo_dir=tmp, state_git_remote=tmp,
                         canonical_task_id="t", transport=None, budget_usd=1.0)
            worker_bridge._closure_de_geracao(_task(), **comum)()
            worker_bridge._closure_de_geracao(_task(), base_branch_da_correcao="main", **comum)()
    finally:
        rg.gerar_patch_via_claude = original
    assert capturado[0] is None, "execução normal não lê versão anterior"
    assert callable(capturado[1])
    fonte = inspect.getsource(worker_bridge.executar_correcao_de_auditoria)
    assert "base_branch_da_correcao=base_branch" in fonte
    assert rg.MARCADOR_CORRECAO_POS_AUDITORIA in fonte, "o marcador do Runner é o texto que o Bridge monta"
    print("OK  test_bridge_so_a_correcao_entrega_a_versao_anterior")


TESTS = [
    test_caso_286_antes_contexto_nao_contem_a_regiao,
    test_caso_286_depois_contexto_contem_a_regiao_literal,
    test_gerar_patch_envia_regiao_e_referencia_e_resolve_edicao_no_head,
    test_texto_da_referencia_base_nunca_vira_old_text,
    test_id_inexistente_fail_closed_sem_chamada,
    test_id_duplicado_nunca_escolhe_regiao_arbitraria,
    test_texto_generico_do_auditor_continua_conservador,
    test_limites_nao_foram_ampliados,
    test_leitura_da_base_so_aceita_caminho_seguro,
    test_bridge_so_a_correcao_entrega_a_versao_anterior,
]


def main() -> int:
    falhas = 0
    for t in TESTS:
        try:
            t()
        except Exception as exc:  # noqa: BLE001
            falhas += 1
            print(f"FALHOU  {t.__name__}: {type(exc).__name__}: {exc}")
    print(f"\n{len(TESTS) - falhas}/{len(TESTS)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
