#!/usr/bin/env python3
"""Confere a configuração da conexão MCP de LEITURA do Supabase (supabase_leitura).

Verifica, sem rede e sem Supabase:
  1. .mcp.json declara só o servidor supabase_leitura, HTTP, do projeto certo,
     com read_only=true e features=database;
  2. .claude/settings.json permite EXATAMENTE execute_sql e list_tables desse
     servidor — nada de servidor inteiro, curinga, outro servidor, modo irrestrito;
  3. nenhuma ferramenta de escrita está em allow.
Uso: python3 tools/qa/check_mcp_leitura.py [--self-test]
--self-test prova que o verificador REPROVA configurações largas demais.
"""
import json, sys, urllib.parse, pathlib, copy

RAIZ = pathlib.Path(__file__).resolve().parents[2]
SERVIDOR = "supabase_leitura"
PROJETO = "ltizbamvskcgigmqobfo"
PERMITIDAS = {f"mcp__{SERVIDOR}__execute_sql", f"mcp__{SERVIDOR}__list_tables"}
ESCRITA = ("apply_migration", "deploy_edge_function", "create_", "delete_", "merge_", "reset_", "rebase_",
           "restore_", "pause_", "update_", "create_edge_function_secret")


def problemas(mcp: dict, settings: dict) -> list[str]:
    out = []
    servers = mcp.get("mcpServers", {})
    if set(servers) != {SERVIDOR}:
        out.append(f".mcp.json deve declarar só {SERVIDOR}; achou {sorted(servers)}")
    s = servers.get(SERVIDOR, {})
    if s.get("type") != "http":
        out.append("o servidor deve ser type=http")
    u = urllib.parse.urlparse(s.get("url", ""))
    q = urllib.parse.parse_qs(u.query)
    if (u.scheme, u.netloc, u.path) != ("https", "mcp.supabase.com", "/mcp"):
        out.append(f"URL base inesperada: {u.scheme}://{u.netloc}{u.path}")
    if q.get("project_ref") != [PROJETO]:
        out.append("project_ref ausente ou de outro projeto")
    if q.get("read_only") != ["true"]:
        out.append("read_only=true é obrigatório")
    if q.get("features") != ["database"]:
        out.append("features deve ser exatamente database")
    if s.get("headers") or s.get("env"):
        out.append("não pode haver headers/env (segredos) na configuração")
    perm = settings.get("permissions", {})
    allow = perm.get("allow", [])
    if set(allow) != PERMITIDAS or len(allow) != len(PERMITIDAS):
        out.append(f"allow deve ser exatamente {sorted(PERMITIDAS)}; achou {allow}")
    for a in allow:
        if "*" in a or a in (f"mcp__{SERVIDOR}", "mcp__Supabase") or a.startswith("mcp__Supabase__"):
            out.append(f"permissão larga demais ou na conexão de escrita: {a}")
        if any(w in a for w in ESCRITA):
            out.append(f"ferramenta de escrita em allow: {a}")
    if settings.get("defaultMode") in ("bypassPermissions", "dontAsk") or perm.get("defaultMode") in ("bypassPermissions", "dontAsk"):
        out.append("modo irrestrito não é permitido")
    for k in ("enableAllProjectMcpServers", "enabledMcpjsonServers"):
        if k in settings:
            out.append(f"{k} pré-aprova servidores e contorna a aprovação humana: não usar")
    if any(a.startswith("Bash") for a in allow):
        out.append("nenhuma permissão de Bash nesta configuração")
    return out


def main() -> int:
    mcp = json.loads((RAIZ / ".mcp.json").read_text(encoding="utf-8"))
    settings = json.loads((RAIZ / ".claude" / "settings.json").read_text(encoding="utf-8"))
    ps = problemas(mcp, settings)
    if "--self-test" in sys.argv:
        casos = {
            "servidor inteiro": lambda m, s: s["permissions"]["allow"].append(f"mcp__{SERVIDOR}"),
            "curinga": lambda m, s: s["permissions"]["allow"].append(f"mcp__{SERVIDOR}__*"),
            "escrita": lambda m, s: s["permissions"]["allow"].append(f"mcp__{SERVIDOR}__apply_migration"),
            "conexão de escrita": lambda m, s: s["permissions"]["allow"].append("mcp__Supabase__execute_sql"),
            "sem read_only": lambda m, s: m["mcpServers"][SERVIDOR].update(url=m["mcpServers"][SERVIDOR]["url"].replace("read_only=true", "read_only=false")),
            "modo irrestrito": lambda m, s: s.update(defaultMode="bypassPermissions"),
            "pré-aprova servidor": lambda m, s: s.update(enableAllProjectMcpServers=True),
            "token em header": lambda m, s: m["mcpServers"][SERVIDOR].update(headers={"Authorization": "Bearer x"}),
        }
        falhou = 0
        for nome, mut in casos.items():
            m2, s2 = copy.deepcopy(mcp), copy.deepcopy(settings)
            mut(m2, s2)
            achou = problemas(m2, s2)
            print(("OK   reprova" if achou else "FALHA aceita") + f": {nome}")
            falhou += 0 if achou else 1
        if ps:
            print("configuração real com problemas:", ps)
        return 1 if (falhou or ps) else 0
    for p in ps:
        print("PROBLEMA:", p)
    print("OK: só execute_sql e list_tables de", SERVIDOR, "(read_only=true, features=database)" if not ps else "")
    return 1 if ps else 0


if __name__ == "__main__":
    sys.exit(main())
