"""Empacotamento do diff REAL da PR para os auditores (caso real PR #305).

A PR #305 (Neurologia, 1 arquivo, 9 hunks, 21.905 caracteres de diff)
recebeu NEEDS-FIX dos dois auditores porque ``preparar_diff`` cortava o
diff nos primeiros 8.000 caracteres: Q2, Q4, os espelhos no Banco General
e as contagens ficavam depois do corte. O auditor recebia só o começo da
mudança.

Regra deste módulo (função PURA, sem rede, sem modelo, sem resumo):

- o diff é dividido em unidades na ordem original: preâmbulo, cabeçalho de
  cada arquivo e cada hunk ``@@``;
- as unidades são agrupadas, sem reordenar, em partes de no máximo
  ``MAX_DIFF_CHARS_POR_PARTE`` caracteres. Um hunk maior que isso é
  dividido por linhas, e cada pedaço seguinte recebe um cabeçalho ``@@``
  sintético com os números de linha corretos;
- quando um arquivo continua numa parte seguinte, o cabeçalho dele é
  repetido e marcado como repetido;
- a cobertura é PROVADA, não presumida: concatenar os trechos originais de
  todas as partes precisa reproduzir o diff byte a byte; senão o pacote
  é ``completo=False``;
- cada parte leva um rótulo explícito (``DIFF COMPLETO: sim`` ou
  ``DIFF EM N PARTES — todas as linhas alteradas cobertas``), o manifesto
  de todos os hunks e uma linha final sentinela. Quem monta o prompt
  confere que a sentinela chegou inteira; se não chegou, nenhuma chamada
  paga é feita.

Nada aqui lê o repositório ou outro arquivo: só o texto do diff da própria
PR entra nas partes.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# Orçamento de diff por CHAMADA de auditor. PR pequena/moderada (a #305
# tem 21.905) vai inteira numa chamada só. Não é "um limite gigante": o
# prompt inteiro continua limitado (ver audit.MAX_AUDIT_PROMPT_CHARS).
MAX_DIFF_CHARS_POR_PARTE = 40_000
# Acima disto, a auditoria em partes custaria chamadas demais; recusa
# fail-closed ANTES de qualquer chamada paga (divida a tarefa).
MAX_PARTES_DIFF = 3
# Folga para o cabeçalho, o manifesto e a sentinela de cada parte.
_FOLGA_CABECALHO = 3_000
_MAX_CABECALHO_GRUDADO = 2_000
# Espaço guardado no fim do prompt para o marcador de corpo encurtado.
_RESERVA_FINAL = 600

_HUNK_RE = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$")
_ARQUIVO_B_RE = re.compile(r"^\+\+\+ (?:b/)?(.*)$")
_DIFF_GIT_RE = re.compile(r"^diff --git a/(.*?) b/(.*)$")


@dataclass(frozen=True)
class _Unidade:
    tipo: str  # "preambulo" | "arquivo" | "hunk"
    arquivo: str | None
    texto: str
    hunk: int | None = None  # número global do hunk (1..H)
    cabecalho_hunk: str | None = None


@dataclass(frozen=True)
class _Pedaco:
    """Trecho ORIGINAL do diff que vai numa parte (a concatenação de todos
    os pedaços, na ordem, reproduz o diff)."""
    unidade: _Unidade
    texto: str
    sintetico: str = ""  # cabeçalho sintético prefixado (não faz parte do original)
    continuacao: tuple[int, int] | None = None  # (k, m) quando o hunk foi dividido


@dataclass(frozen=True)
class ParteDiff:
    indice: int
    total: int
    texto: str
    hunks: tuple[int, ...]
    sentinela: str


@dataclass(frozen=True)
class DiffEmpacotado:
    disponivel: bool
    completo: bool
    partes: tuple[ParteDiff, ...]
    arquivos: tuple[str, ...]
    total_hunks: int
    linhas_alteradas: int
    tamanho: int
    motivo: str | None = None

    @property
    def n_partes(self) -> int:
        return len(self.partes)

    @property
    def auditavel(self) -> bool:
        """Pode ir para auditoria paga: cobertura provada e partes dentro do teto."""
        return self.disponivel and self.completo and 0 < self.n_partes <= MAX_PARTES_DIFF

    @property
    def rotulo(self) -> str:
        if not self.disponivel:
            return "DIFF: indisponível"
        if not self.completo:
            return f"DIFF INCOMPLETO — {self.motivo}"
        base = (f"{len(self.arquivos)} arquivo(s), {self.total_hunks} hunk(s), "
                f"{self.linhas_alteradas} linha(s) alterada(s), {self.tamanho} caracteres")
        if self.n_partes == 1:
            return f"DIFF COMPLETO: sim — {base}"
        return f"DIFF EM {self.n_partes} PARTES — todas as linhas alteradas cobertas — {base}"


def _unidades(pr_diff: str) -> list[_Unidade]:
    unidades: list[_Unidade] = []
    atual: list[str] = []
    tipo = "preambulo"
    arquivo: str | None = None
    hunk_n = 0
    cabecalho: str | None = None

    def fechar() -> None:
        if atual:
            unidades.append(_Unidade(tipo, arquivo, "".join(atual),
                                     hunk_n if tipo == "hunk" else None, cabecalho if tipo == "hunk" else None))

    for linha in pr_diff.splitlines(keepends=True):
        corpo = linha.rstrip("\r\n")
        if corpo.startswith("diff --git "):
            fechar()
            atual = [linha]
            tipo = "arquivo"
            m = _DIFF_GIT_RE.match(corpo)
            arquivo = (m.group(2) if m else corpo[len("diff --git "):]).rstrip()
            cabecalho = None
            continue
        if corpo.startswith("@@ ") and _HUNK_RE.match(corpo):
            fechar()
            atual = [linha]
            tipo = "hunk"
            hunk_n += 1
            cabecalho = corpo
            continue
        if tipo == "arquivo" and corpo.startswith("+++ "):
            m = _ARQUIVO_B_RE.match(corpo)
            if m and m.group(1).rstrip() != "/dev/null":
                arquivo = m.group(1).rstrip()
        atual.append(linha)
    fechar()
    return unidades


def _dividir_unidade(u: _Unidade, limite: int) -> list[_Pedaco]:
    """Divide uma unidade grande por linhas. Num hunk, cada pedaço seguinte
    recebe um cabeçalho ``@@`` sintético com a numeração correta do arquivo."""
    linhas = u.texto.splitlines(keepends=True)
    m = _HUNK_RE.match(linhas[0].rstrip("\r\n")) if u.tipo == "hunk" else None
    velho, novo = (int(m.group(1)), int(m.group(3))) if m else (0, 0)
    blocos: list[list[str]] = [[linhas[0]]]
    inicios: list[tuple[int, int]] = [(velho, novo)]
    tamanho = len(linhas[0])
    for linha in linhas[1:]:
        if tamanho + len(linha) > limite and blocos[-1]:
            blocos.append([])
            inicios.append((velho, novo))
            tamanho = 0
        blocos[-1].append(linha)
        tamanho += len(linha)
        c = linha[:1]
        if c == " ":
            velho, novo = velho + 1, novo + 1
        elif c == "-":
            velho += 1
        elif c == "+":
            novo += 1
    total = len(blocos)
    pedacos = []
    for k, (bloco, (v, n)) in enumerate(zip(blocos, inicios), start=1):
        if k == 1:
            sintetico = ""
        elif m:
            sintetico = f"@@ -{v} +{n} @@ [continuação {k}/{total} do hunk {u.hunk} — mesmas linhas do arquivo]\n"
        else:
            sintetico = f"[continuação {k}/{total} do mesmo trecho do diff]\n"
        pedacos.append(_Pedaco(u, "".join(bloco), sintetico, (k, total)))
    return pedacos


def _linhas_alteradas(pr_diff: str) -> int:
    n = 0
    for linha in pr_diff.splitlines():
        if (linha.startswith("+") and not linha.startswith("+++ ")) or \
                (linha.startswith("-") and not linha.startswith("--- ")):
            n += 1
    return n


def empacotar_diff(pr_diff: str | None, *,
                   max_chars_por_parte: int = MAX_DIFF_CHARS_POR_PARTE) -> DiffEmpacotado:
    if not pr_diff:
        return DiffEmpacotado(False, False, (), (), 0, 0, 0, "nenhum diff real fornecido")
    unidades = _unidades(pr_diff)
    limite = max(1_000, max_chars_por_parte - _FOLGA_CABECALHO)

    pedacos: list[_Pedaco] = []
    for u in unidades:
        if len(u.texto) > limite:
            pedacos.extend(_dividir_unidade(u, limite))
        else:
            pedacos.append(_Pedaco(u, u.texto))

    # Agrupa na ordem original. Um cabeçalho de arquivo nunca fica sozinho
    # no fim de uma parte: o pedaço seguinte vai sempre junto dele.
    grupos: list[list[_Pedaco]] = [[]]
    tamanho = 0
    grudar = False
    for p in pedacos:
        custo = len(p.sintetico) + len(p.texto)
        if grupos[-1] and not grudar and tamanho + custo > limite:
            grupos.append([])
            tamanho = 0
        grupos[-1].append(p)
        tamanho += custo
        # Só um cabeçalho normal (pequeno e inteiro) puxa o pedaço seguinte.
        grudar = (p.unidade.tipo == "arquivo" and p.continuacao is None
                  and len(p.texto) <= _MAX_CABECALHO_GRUDADO)

    arquivos = tuple(dict.fromkeys(u.arquivo for u in unidades if u.arquivo))
    total_hunks = sum(1 for u in unidades if u.tipo == "hunk")
    alteradas = _linhas_alteradas(pr_diff)

    # Prova de cobertura: os trechos originais, na ordem, refazem o diff.
    reconstruido = "".join(p.texto for g in grupos for p in g)
    completo = reconstruido == pr_diff
    motivo = None if completo else "a reconstrução das partes não reproduz o diff original"

    total = len(grupos)
    manifesto = _manifesto(grupos, unidades)
    partes: list[ParteDiff] = []
    for idx, grupo in enumerate(grupos, start=1):
        partes.append(_montar_parte(idx, total, grupo, unidades, manifesto,
                                    arquivos, total_hunks, alteradas, len(pr_diff)))
    return DiffEmpacotado(True, completo, tuple(partes), arquivos, total_hunks, alteradas,
                          len(pr_diff), motivo)


def _manifesto(grupos: list[list[_Pedaco]], unidades: list[_Unidade]) -> str:
    linhas = []
    for idx, grupo in enumerate(grupos, start=1):
        for p in grupo:
            u = p.unidade
            if u.tipo != "hunk" or (p.continuacao and p.continuacao[0] > 1):
                continue
            extra = f" (dividido em {p.continuacao[1]} pedaços)" if p.continuacao else ""
            nome = (u.arquivo or "").rsplit("/", 1)[-1]
            linhas.append(f"- parte {idx}: hunk {u.hunk} · {nome} · {u.cabecalho_hunk[:90]}{extra}")
    return "\n".join(linhas)


def _montar_parte(idx: int, total: int, grupo: list[_Pedaco], unidades: list[_Unidade],
                  manifesto: str, arquivos: tuple[str, ...], total_hunks: int,
                  alteradas: int, tamanho: int) -> ParteDiff:
    hunks = tuple(sorted({p.unidade.hunk for p in grupo if p.unidade.hunk}))
    corpo: list[str] = []
    # Arquivo que continua de uma parte anterior: repete o cabeçalho dele.
    primeiro = grupo[0].unidade
    if primeiro.tipo == "hunk":
        cab = next((u for u in unidades if u.tipo == "arquivo" and u.arquivo == primeiro.arquivo), None)
        if cab is not None:
            corpo.append("[cabeçalho do arquivo repetido — o arquivo começou numa parte anterior]\n" + cab.texto)
    for p in grupo:
        corpo.append(p.sintetico + p.texto)
    texto_diff = "".join(corpo)
    if not texto_diff.endswith("\n"):
        texto_diff += "\n"

    resumo = (f"{len(arquivos)} arquivo(s), {total_hunks} hunk(s), {alteradas} linha(s) alterada(s), "
              f"{tamanho} caracteres")
    faixa = f"hunks {hunks[0]}–{hunks[-1]}" if hunks else "sem hunk"
    if total == 1:
        topo = (f"=== DIFF COMPLETO: sim — {resumo}. Todas as linhas alteradas estão abaixo, na ordem "
                f"original; nada foi cortado nem resumido. ===\n")
        sentinela = "=== FIM DO DIFF COMPLETO (parte 1/1) ==="
    else:
        topo = (f"=== DIFF EM {total} PARTES — todas as linhas alteradas cobertas — {resumo}. "
                f"Esta é a PARTE {idx}/{total} ({faixa}). ===\n"
                f"As outras partes são auditadas em chamadas separadas, sobre o MESMO HEAD; a "
                f"decisão final só é MERGE-READY se TODAS as partes forem MERGE-READY. Avalie o que "
                f"está nesta parte; não reprove só porque um hunk listado no manifesto está em outra "
                f"parte.\nManifesto de todos os hunks:\n{manifesto}\n")
        sentinela = f"=== FIM DA PARTE {idx}/{total} DO DIFF ==="
    return ParteDiff(idx, total, topo + texto_diff + sentinela, hunks, sentinela)


def prompt_contem_parte(prompt: str, parte: ParteDiff | None) -> bool:
    """A parte do diff chegou INTEIRA ao prompt (inclusive a sentinela)?"""
    return parte is None or (parte.texto in prompt and parte.sentinela in prompt)


def encaixar_corpo_no_prompt(partes: list[str], pr_body: str | None, rotulo: str, limite: int) -> str:
    """Junta as partes e põe o corpo da PR no fim, encurtando SÓ o corpo
    quando o total passaria do limite — o diff nunca é cortado aqui."""
    base = "\n\n".join(partes)
    if not pr_body:
        return base
    cabecalho = f"\n\n{rotulo}\n"
    restante = limite - len(base) - len(cabecalho) - _RESERVA_FINAL
    corpo = pr_body
    if len(corpo) > max(restante, 0):
        corpo = corpo[:max(restante, 0)] + (
            "\n… [corpo da PR encurtado aqui por limite de tamanho — é a declaração do worker, "
            "NÃO o diff; o diff acima está completo]"
        )
    return base + cabecalho + corpo
