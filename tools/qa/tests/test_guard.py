"""Testes mínimos do Repasso Guard.

Não usa pytest nem nenhuma dependência: o Guard é biblioteca padrão e os
testes seguem a mesma regra. Executar com:

    python3 -m tools.qa.tests.test_guard

Constrói o ``Context`` manualmente a partir dos fixtures em
tools/qa/fixtures/, sem precisar de um repositório git de mentira — os
fixtures já simulam «antes» (materia-base.html) e «depois» (materia-valida.html
ou materia-quebrada.html) de um PR.

Prova as duas coisas mínimas exigidas pela Issue #81:

    1. o Guard passa num exemplo válido (nenhum HARD FAIL);
    2. o Guard reprova um fixture quebrado, e reprova pelos motivos certos —
       não só «algo deu HARD FAIL em algum lugar».

Depois da auditoria independente do PR #94, este arquivo ganhou também os
dois testes adversariais do bloqueador de ESCOPO (Lei 2 endurecida — ver
``test_scope_lock_*`` abaixo). O teste do bloqueador de INTEGRIDADE DO
GUARD (um PR não pode se autocertificar) precisa de um git de verdade e
mora em ``tools/qa/tests/test_trusted_execution.py``, separado.
"""

from __future__ import annotations

import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(os.path.dirname(_HERE))  # .../tools/qa -> raiz do repo é dois acima
_REPO_ROOT = os.path.dirname(_ROOT)
sys.path.insert(0, _REPO_ROOT)

from tools.qa.guard import checks
from tools.qa.guard.checks import HARD_FAIL, INFO, Context

FIXTURES = os.path.join(_REPO_ROOT, "tools", "qa", "fixtures")
# Caminho de mentira, mas dentro de MATERIA_DIR — é isso que faz _is_materia
# reconhecer o fixture como arquivo de matéria.
CAMINHO_FIXTURE = checks.MATERIA_DIR + "materia-fixture.html"


def _ler(nome: str) -> str:
    with open(os.path.join(FIXTURES, nome), encoding="utf-8") as fh:
        return fh.read()


def _added_lines(base: str, head: str) -> list[str]:
    """Aproximação simples de ``git diff -U0 --added``: linhas do head que não
    estão, literalmente, no base. Suficiente para os fixtures dos testes —
    o CLI real usa ``git diff`` de verdade (tools/qa/guard/__main__.py)."""
    base_linhas = set(base.splitlines())
    return [l for l in head.splitlines() if l not in base_linhas]


def _contexto(base_raw: str | None, head_raw: str, scope: dict | None = None) -> Context:
    added = {CAMINHO_FIXTURE: _added_lines(base_raw or "", head_raw)}
    return Context(
        repo_root=_REPO_ROOT,
        changed=[CAMINHO_FIXTURE],
        base_blob=lambda p: base_raw if p == CAMINHO_FIXTURE else None,
        head_blob=lambda p: head_raw if p == CAMINHO_FIXTURE else None,
        added_lines=added,
        scope=scope or {"arquivos": [checks.MATERIA_DIR + "**"]},
        tasks=None,
        file_exists=lambda p: False,  # fixtures não têm assets reais no repo
    )


def _rodar_tudo(ctx: Context) -> list[checks.Finding]:
    out: list[checks.Finding] = []
    out.extend(checks.check_scope(ctx))
    out.extend(checks.check_critical_files(ctx))
    out.extend(checks.check_secrets(ctx))
    out.extend(checks.check_paid_api(ctx))
    out.extend(checks.check_materias(ctx))
    out.extend(checks.check_nomenclature(ctx))
    return out


def test_valid_passes() -> None:
    base = _ler("materia-base.html")
    head = _ler("materia-valida.html")
    ctx = _contexto(base, head)
    achados = _rodar_tudo(ctx)
    duros = [f for f in achados if f.severity == HARD_FAIL]
    assert not duros, (
        "o fixture VÁLIDO não devia reprovar, mas deu HARD FAIL em: "
        + "; ".join(f"{f.check}: {f.message}" for f in duros)
    )
    # a questão nova (fxq03) tem que aparecer só como acréscimo, não como perda
    achados_por_check = {f.check for f in achados}
    assert "questoes-removidas" not in achados_por_check
    assert "ids-duplicados" not in {f.check for f in duros}
    print("OK  test_valid_passes — nenhum HARD FAIL no fixture válido.")


def test_broken_fails() -> None:
    base = _ler("materia-base.html")
    head = _ler("materia-quebrada.html")
    ctx = _contexto(base, head)
    achados = _rodar_tudo(ctx)
    duros = {f.check for f in achados if f.severity == HARD_FAIL}

    esperados = {
        "questoes-removidas",      # fxq02 e fxq02-bk sumiram
        "ids-removidos",           # os ids delas sumiram também
        "ids-duplicados",          # fxq01 repetido — NOVO, criado por este PR
        "gabarito-invalido",       # alternativa "e)" que não existe na lista
        "alternativas-duplicadas", # duas alternativas com texto idêntico
        "flashcards-removidos",    # um flashcard a menos
        "html",                    # <em> sem fechar
        "nomenclatura",            # «CAYÓ EN EXAMEN»
        "assets",                  # imagem que não existe
    }
    faltando = esperados - duros
    assert not faltando, (
        f"o fixture QUEBRADO devia reprovar por {sorted(faltando)}, mas o Guard não "
        f"sinalizou. Achados HARD FAIL obtidos: {sorted(duros)}"
    )

    # a duplicata PREEXISTENTE (fx-dup, já no base) não pode ser tratada como
    # nova: prova o princípio do delta.
    ids_dup_finding = [f for f in achados if f.check == "ids-duplicados"]
    ids_apontados = set()
    for f in ids_dup_finding:
        ids_apontados.update(f.detail.get("ids", []))
    assert "fx-dup" not in ids_apontados, (
        "fx-dup já existia no base e não foi introduzido por este PR; "
        "não devia aparecer como id duplicado NOVO."
    )
    assert "fxq01" in ids_apontados, "fxq01 é a duplicata nova e tem que aparecer."

    print(f"OK  test_broken_fails — {len(duros)} HARD FAIL, todos os {len(esperados)} esperados presentes.")
    print(f"    (fx-dup preexistente corretamente tratado como INFO, não repetido aqui.)")


def test_assets_preexistentes_nao_bloqueiam_delta() -> None:
    """Asset ausente já referenciado na base é dívida histórica, não regressão."""
    from types import SimpleNamespace

    asset = "/assets/img/legacy-ausente.webp"
    base = SimpleNamespace(assets=[asset])
    head = SimpleNamespace(assets=[asset])
    ctx = Context(
        repo_root=_REPO_ROOT,
        changed=[CAMINHO_FIXTURE],
        base_blob=lambda p: None,
        head_blob=lambda p: None,
        added_lines={},
        scope={"arquivos": [CAMINHO_FIXTURE]},
        tasks=None,
        file_exists=lambda p: False,
    )
    achados = checks._check_assets(ctx, "materia-fixture.html", base, head)
    assert not any(f.severity == HARD_FAIL for f in achados), achados
    infos = [f for f in achados if f.check == "assets"]
    assert infos and "já estavam referenciados" in infos[0].message, infos
    print("OK  test_assets_preexistentes_nao_bloqueiam_delta — dívida histórica ficou INFO.")


def test_asset_novo_ausente_continua_hard_fail() -> None:
    """Referência nova ausente continua sendo regressão objetiva e bloqueia."""
    from types import SimpleNamespace

    asset = "/assets/img/novo-ausente.webp"
    base = SimpleNamespace(assets=[])
    head = SimpleNamespace(assets=[asset])
    ctx = Context(
        repo_root=_REPO_ROOT,
        changed=[CAMINHO_FIXTURE],
        base_blob=lambda p: None,
        head_blob=lambda p: None,
        added_lines={},
        scope={"arquivos": [CAMINHO_FIXTURE]},
        tasks=None,
        file_exists=lambda p: False,
    )
    achados = checks._check_assets(ctx, "materia-fixture.html", base, head)
    duros = [f for f in achados if f.check == "assets" and f.severity == HARD_FAIL]
    assert len(duros) == 1 and asset in duros[0].detail.get("assets", []), achados
    print("OK  test_asset_novo_ausente_continua_hard_fail — regressão nova continua bloqueada.")


def test_asset_removido_pelo_pr_continua_hard_fail() -> None:
    """Se o PR toca/remove o caminho do asset, não pode alegar dívida histórica."""
    from types import SimpleNamespace

    asset = "/assets/img/removido.webp"
    caminho = "Repasso-Med-Site--main/Atual - Copia/assets/img/removido.webp"
    base = SimpleNamespace(assets=[asset])
    head = SimpleNamespace(assets=[asset])
    ctx = Context(
        repo_root=_REPO_ROOT,
        changed=[CAMINHO_FIXTURE, caminho],
        base_blob=lambda p: "existia" if p == caminho else None,
        head_blob=lambda p: None,
        added_lines={},
        scope={"arquivos": [CAMINHO_FIXTURE, caminho]},
        tasks=None,
        file_exists=lambda p: False,
    )
    achados = checks._check_assets(ctx, "materia-fixture.html", base, head)
    assert any(f.check == "assets" and f.severity == HARD_FAIL for f in achados), achados
    print("OK  test_asset_removido_pelo_pr_continua_hard_fail — remoção continua bloqueada.")


def test_asset_regressao_mascarada_como_divida_preexistente_continua_hard_fail() -> None:
    """Achado da auditoria independente (Claude 3, PR #247).

    Uma tag que ANTES apontava para um asset que existia não pode virar
    dívida antiga só por passar a apontar para o MESMO caminho já quebrado
    usado por outra tag no mesmo arquivo. O caminho aparecia 1x na base e
    passa a aparecer 2x no HEAD — a ocorrência extra é regressão nova, não
    dívida histórica, mesmo que o texto do caminho já existisse em outro
    lugar do arquivo (comparação por `set` deixava isso passar como INFO).
    """
    from types import SimpleNamespace

    quebrado_antigo = "/assets/img/broken-old.webp"  # já ausente na base
    base = SimpleNamespace(assets=[quebrado_antigo, "/assets/img/working.webp"])
    # O PR reescreve a tag que apontava pra "working.webp" (existia) para
    # apontar para o MESMO caminho já quebrado da outra tag. O arquivo
    # "working.webp" em si nunca é tocado/removido — só deixa de ser
    # referenciado, então não aparece em `ctx.changed`.
    head = SimpleNamespace(assets=[quebrado_antigo, quebrado_antigo])
    ctx = Context(
        repo_root=_REPO_ROOT,
        changed=[CAMINHO_FIXTURE],
        base_blob=lambda p: None,
        head_blob=lambda p: None,
        added_lines={},
        scope={"arquivos": [CAMINHO_FIXTURE]},
        tasks=None,
        file_exists=lambda p: False,
    )
    achados = checks._check_assets(ctx, "materia-fixture.html", base, head)
    duros = [f for f in achados if f.check == "assets" and f.severity == HARD_FAIL]
    assert duros, (
        "a ocorrência EXTRA de um caminho já quebrado na base é uma regressão nova "
        "(uma referência que funcionava foi quebrada) e tem que continuar HARD FAIL, "
        f"mas o Guard só reportou: {achados}"
    )
    assert quebrado_antigo in duros[0].detail.get("assets", []), duros
    # A primeira ocorrência (a que já existia na base) continua contabilizada
    # como dívida pré-existente — só a ocorrência a mais é que não cabe mais
    # no orçamento de dívida antiga.
    infos = [f for f in achados if f.check == "assets" and f.severity == INFO]
    assert infos and quebrado_antigo in infos[0].detail.get("assets", []), achados
    print(
        "OK  test_asset_regressao_mascarada_como_divida_preexistente_continua_hard_fail — "
        "regressão disfarçada de dívida antiga continua bloqueada."
    )


def test_scope_lock_body_cannot_widen() -> None:
    """Bloqueador 2, cenário 1 da auditoria do PR #94.

    Tarefa já registrada ANTES deste PR reserva só um arquivo. O corpo do
    PR declara também um segundo arquivo como «permitido» — e o PR de fato
    toca os dois. A reserva original tem que vencer: HARD FAIL tanto por
    «o corpo tentou ampliar» quanto por «arquivo fora do escopo», mesmo o
    corpo dizendo que está tudo bem.
    """
    reserva_original = ["semiologia-ii.html"]
    tasks_base = {"tarefas": [{"id": "t-exemplo", "arquivos": reserva_original}]}
    tasks_head = tasks_base  # a tarefa em si não mudou — só o corpo do PR mente

    ctx = Context(
        repo_root=_REPO_ROOT,
        changed=["semiologia-ii.html", "assets/app-core.js"],
        base_blob=lambda p: None,
        head_blob=lambda p: None,
        added_lines={},
        scope={"tarefa": "t-exemplo", "arquivos": ["semiologia-ii.html", "assets/app-core.js"]},
        tasks=tasks_head,
        tasks_base=tasks_base,
        file_exists=lambda p: False,
    )
    achados = checks.check_scope(ctx)
    duros = [f for f in achados if f.severity == HARD_FAIL]
    checks_duros = {f.check for f in duros}

    assert "escopo-ampliado" in checks_duros, (
        "o corpo do PR declarou assets/app-core.js fora da reserva original de "
        f"t-exemplo e isso não foi barrado. Achados: {[(f.check, f.message) for f in achados]}"
    )
    assert "escopo" in checks_duros, (
        "assets/app-core.js foi de fato alterado fora da reserva e isso também "
        "precisa aparecer como «arquivo fora do escopo declarado», não só como "
        "«escopo-ampliado»."
    )
    print("OK  test_scope_lock_body_cannot_widen — corpo do PR não conseguiu ampliar a reserva.")


def test_scope_lock_task_cannot_widen_itself() -> None:
    """Bloqueador 2, cenário 2 da auditoria do PR #94.

    O mesmo PR que usa a tarefa também edita a própria entrada dela em
    coordination/tasks.json, acrescentando um arquivo à lista de
    «arquivos» — tentando ampliar a própria reserva dentro do mesmo diff.
    Isso tem que ser HARD FAIL mesmo que o corpo do PR nem declare nada
    de novo.
    """
    reserva_original = ["semiologia-ii.html"]
    tasks_base = {"tarefas": [{"id": "t-exemplo", "arquivos": reserva_original}]}
    tasks_head = {"tarefas": [{"id": "t-exemplo",
                               "arquivos": ["semiologia-ii.html", "assets/app-core.js"]}]}

    ctx = Context(
        repo_root=_REPO_ROOT,
        changed=["semiologia-ii.html", "assets/app-core.js", "coordination/tasks.json"],
        base_blob=lambda p: None,
        head_blob=lambda p: None,
        added_lines={},
        scope={"tarefa": "t-exemplo"},  # corpo nem declara nada extra
        tasks=tasks_head,
        tasks_base=tasks_base,
        file_exists=lambda p: False,
    )
    achados = checks.check_scope(ctx)
    duros = [f for f in achados if f.severity == HARD_FAIL]
    checks_duros = {f.check for f in duros}

    assert "escopo-ampliado" in checks_duros, (
        "a tarefa t-exemplo ampliou a própria lista de arquivos dentro do mesmo "
        f"diff e isso não foi barrado. Achados: {[(f.check, f.message) for f in achados]}"
    )
    # a reserva usada para permitir/reprovar tem que continuar sendo a da base
    achado_ampliado = next(f for f in duros if f.check == "escopo-ampliado")
    assert achado_ampliado.detail.get("reserva_original") == reserva_original or \
        any(f.check == "escopo" for f in duros), (
        "mesmo com a tarefa ampliada no head, assets/app-core.js não devia "
        "virar permitido — a reserva da base é quem decide."
    )
    print("OK  test_scope_lock_task_cannot_widen_itself — tarefa não conseguiu se autoampliar no mesmo diff.")


def test_gabarito_enunciado_repetido_sem_falso_aviso() -> None:
    """Duas cópias sem id do mesmo enunciado já tinham letras diferentes."""
    from types import SimpleNamespace
    from tools.qa.guard.materia import Question

    def pergunta(indice: int, letra: str) -> Question:
        return Question(
            index=indice, qid=None, section="b01", is_bank=False,
            stem="Qual das frases está mal?", options=["a) primeira", "b) segunda", "d) quarta"],
            answer_letter=letra,
        )

    base = SimpleNamespace(questions=[pergunta(1, "a"), pergunta(2, "d")])
    head_inalterado = SimpleNamespace(questions=[pergunta(1, "a"), pergunta(2, "d")])
    achados = checks._check_answers("guarani.html", base, head_inalterado)
    assert not any(f.check == "gabarito-alterado" for f in achados), achados

    head_trocado = SimpleNamespace(questions=[pergunta(1, "d"), pergunta(2, "a")])
    achados = checks._check_answers("guarani.html", base, head_trocado)
    assert len([f for f in achados if f.check == "gabarito-alterado"]) == 1, achados

    head_alterado = SimpleNamespace(questions=[pergunta(1, "a"), pergunta(2, "b")])
    achados = checks._check_answers("guarani.html", base, head_alterado)
    mudancas = [f for f in achados if f.check == "gabarito-alterado"]
    assert len(mudancas) == 1, achados
    assert mudancas[0].detail["mudancas"] == [
        {"questao": "Qual das frases está mal?", "de": ["a", "d"], "para": ["a", "b"]}
    ], mudancas[0].detail
    print("OK  test_gabarito_enunciado_repetido_sem_falso_aviso — comparação por ordem das ocorrências.")


def main() -> int:
    testes = [
        test_valid_passes,
        test_broken_fails,
        test_assets_preexistentes_nao_bloqueiam_delta,
        test_asset_novo_ausente_continua_hard_fail,
        test_asset_removido_pelo_pr_continua_hard_fail,
        test_asset_regressao_mascarada_como_divida_preexistente_continua_hard_fail,
        test_scope_lock_body_cannot_widen,
        test_scope_lock_task_cannot_widen_itself,
        test_gabarito_enunciado_repetido_sem_falso_aviso,
    ]
    falhas = 0
    for t in testes:
        try:
            t()
        except AssertionError as e:
            falhas += 1
            print(f"FALHOU  {t.__name__}: {e}")
    if falhas:
        print(f"\n{falhas}/{len(testes)} teste(s) falharam.")
        return 1
    print(f"\n{len(testes)}/{len(testes)} testes passaram.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
