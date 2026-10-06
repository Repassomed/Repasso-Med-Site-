#!/usr/bin/env python3
"""Gera o PACOTE DE SCRIPTS para rodar o processamento fora do checkout (ZIP pequeno).

  python3 tools/audio/empacotar_pacote.py --saida ~/repasso-audiobooks-local.zip

Contém: scripts necessários, requirements.txt e LEIAME.md (o «Fluxo do José» do README). NÃO contém: áudios, credenciais, modelo de transcrição, a matéria (privada), testes nem as
etapas posteriores (montar_manifesto / verificar_upload, que dependem do site e ficam no checkout). Recusa gerar se: um arquivo da lista faltar, algum script importar um módulo local que não
foi incluído (pacote incompleto), ou algum texto lembrar credencial. Imprime tamanho REAL e SHA-256 do ZIP. O ZIP não pode ficar dentro de um repositório git.
"""
import argparse, ast, hashlib, os, re, sys, zipfile

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import preparar_audiobooks as P

RAIZ_ZIP = 'repasso-audiobooks-local'
ARQUIVOS = ['processar_masters.py', 'preparar_audiobooks.py', 'transcrever.py', 'empacotar_retorno.py', 'rodar_local.ps1', 'rodar_local.sh', 'requirements.txt', 'requirements-transcricao.txt']
PROIBIDOS = ('.m4a', '.mp3', '.wav', '.onnx', '.html', '.env', '.pem', '.key')
SEGREDO = re.compile(r'(eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}|sb_secret_[A-Za-z0-9_-]{10,}|service_role\s*[:=]\s*[\'"]?[A-Za-z0-9._-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,})')


def leiame():
    with open(os.path.join(AQUI, 'README.md'), encoding='utf-8') as f:
        t = f.read()
    m = re.search(r'<!-- FLUXO-JOSE:INICIO -->\n(.*?)<!-- FLUXO-JOSE:FIM -->', t, flags=re.S)
    if not m:
        sys.exit('ERRO: README.md sem o bloco FLUXO-JOSE (marcadores).')
    cab = ('# Audiobooks Semiología II — processamento local (pacote de scripts)\n\n'
           '**Este pacote NÃO contém áudios, credenciais, o modelo de transcrição nem a matéria (privada).** Para vincular por conteúdo ele precisa do arquivo `semiologia-ii.html`: '
           'use o checkout do repositório ou copie só esse arquivo e passe `-Materia "C:\\caminho\\semiologia-ii.html"`. No pacote, os scripts ficam em `tools\\audio\\` (rode da pasta raiz do pacote).\n\n')
    return cab + m.group(1)


def modulos_locais_faltando(nome, conteudo, incluidos):
    if not nome.endswith('.py'):
        return []
    existentes = {f[:-3] for f in os.listdir(AQUI) if f.endswith('.py') and not f.startswith('test_')}
    falta = []
    for n in ast.walk(ast.parse(conteudo)):
        mods = [a.name.split('.')[0] for a in n.names] if isinstance(n, ast.Import) else ([n.module.split('.')[0]] if isinstance(n, ast.ImportFrom) and n.module else [])
        for m in mods:
            if m in existentes and (m + '.py') not in incluidos:
                falta.append(m)
    return falta


def montar(saida):
    if P.dentro_do_repo(saida):
        sys.exit('RECUSADO: o pacote não pode ser gerado dentro de um repositório git.')
    if os.path.exists(saida):
        sys.exit(f'ERRO: já existe {saida}; não sobrescrevo.')
    conteudos = {}
    for n in ARQUIVOS:
        p = os.path.join(AQUI, n)
        if not os.path.isfile(p):
            sys.exit(f'ERRO: arquivo do pacote ausente: {n}')
        with open(p, 'rb') as f:
            conteudos['tools/audio/' + n] = f.read()
    conteudos['LEIAME.md'] = leiame().encode('utf-8')
    incluidos = set(ARQUIVOS)
    for n, b in conteudos.items():
        if n.lower().endswith(PROIBIDOS):
            sys.exit(f'RECUSADO: tipo proibido no pacote: {n}')
        txt = b.decode('utf-8', errors='replace')
        if SEGREDO.search(txt):
            sys.exit(f'RECUSADO: {n} contém algo que parece credencial.')
        falta = modulos_locais_faltando(os.path.basename(n), txt, incluidos) if n.endswith('.py') else []
        if falta:
            sys.exit(f'ERRO: pacote incompleto: {n} importa {falta}, que não estão no pacote.')
    with zipfile.ZipFile(saida, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, b in sorted(conteudos.items()):
            zi = zipfile.ZipInfo(RAIZ_ZIP + '/' + n, date_time=(2026, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED
            zi.external_attr = (0o755 if n.endswith(('.sh', '.py')) else 0o644) << 16
            z.writestr(zi, b)
    return sorted(conteudos)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--saida', required=True, help='caminho do ZIP (fora do repositório)')
    a = ap.parse_args(argv)
    saida = os.path.abspath(os.path.expanduser(a.saida))
    nomes = montar(saida)
    tam = os.path.getsize(saida)
    with open(saida, 'rb') as f: h = hashlib.sha256(f.read()).hexdigest()
    print(f'Pacote: {saida}\n  {len(nomes)} arquivos: {", ".join(nomes)}\n  {tam} B ({tam / 1024:.1f} KB) · SHA-256 {h}\n  Sem áudios, credenciais, modelo ou matéria. Precisa do semiologia-ii.html (checkout ou -Materia).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
