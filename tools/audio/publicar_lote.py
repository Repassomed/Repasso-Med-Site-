#!/usr/bin/env python3
"""Depois de OUVIR e aprovar (aprovar_vinculos.py): monta o manifesto, confere os derivados e (só com --enviar) sobe ao bucket privado `audiobooks`. Reaproveita montar_manifesto.py,
verificar_upload.py e enviar_storage.py — nenhum pipeline paralelo.

  python tools/audio/publicar_lote.py --execucao <pasta execucao-…> --url https://<ref>.supabase.co            # DRY-RUN: monta e confere, não envia
  (defina RM_SUPABASE_SERVICE_KEY no terminal)  python tools/audio/publicar_lote.py --execucao <…> --url <…> --enviar

Falha FECHADA: só entra no manifesto o áudio com vínculo confirmado e escuta aprovada por você. Enviar ao Storage NÃO publica: o áudio só aparece para o José depois que as variáveis
`RM_AUDIO_MANIFEST` (conteúdo de `manifesto/manifesto.json`) e `RM_PILOT_AUDIO_UIDS` forem definidas no Netlify — passo separado, seu."""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import montar_manifesto as M
import enviar_storage as E


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--execucao', required=True); ap.add_argument('--url', required=True)
    ap.add_argument('--enviar', action='store_true'); ap.add_argument('--substituir', action='store_true')
    a = ap.parse_args(argv)
    ex = os.path.abspath(os.path.expanduser(a.execucao))
    rel, vinc, tratados, man = os.path.join(ex, 'tratados', 'relatorio.json'), os.path.join(ex, 'vinculos.json'), os.path.join(ex, 'tratados'), os.path.join(ex, 'manifesto')
    for f in (rel, vinc):
        if not os.path.isfile(f):
            print(f'ERRO: falta {f}. Rode antes o processamento (rodar_local) e a aprovação (aprovar_vinculos).'); return 2
    print('== 1/2 manifesto (só entra o que você aprovou) ==')
    if M.main(['--relatorio', rel, '--vinculos', vinc, '--saida', man]) != 0:
        print('Nada foi enviado. Aprove os áudios que faltam com aprovar_vinculos.py (cada um depois de ouvir as amostras) e rode de novo.'); return 1
    print('== 2/2 conferência dos arquivos' + (' e envio ao bucket privado ==' if a.enviar else ' (dry-run) =='))
    args = ['--manifesto', os.path.join(man, 'manifesto.json'), '--plano', os.path.join(man, 'plano-upload.md'), '--pasta', tratados, '--url', a.url]
    if a.enviar: args.append('--enviar')
    if a.substituir: args.append('--substituir')
    rc = E.main(args)
    if rc == 0:
        print(f"\nManifesto candidato: {os.path.join(man, 'manifesto.json')}\n" + ('Próximo (seu, no Netlify): definir RM_AUDIO_MANIFEST com o conteúdo desse arquivo e RM_PILOT_AUDIO_UIDS com o seu UID; novo deploy; depois o teste real no navegador.'
              if a.enviar else 'Dry-run ok. Para enviar: defina RM_SUPABASE_SERVICE_KEY e rode de novo com --enviar.'))
    return rc


if __name__ == '__main__':
    sys.exit(main())
