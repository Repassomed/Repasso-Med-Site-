#!/usr/bin/env python3
"""Extrai pares (texto antigo -> texto novo) de um diff real de matéria.

Uso:
    git diff <base> <head> -- <arquivo.html> | python3 extract_pairs.py > pairs.json

Lê um diff unificado pelo stdin, isola as trocas 1-para-1 de linha (uma
linha removida, a linha seguinte adicionada, sem contexto entre elas —
o padrão de uma frase reescrita numa linha HTML longa), tira as tags e
filtra lixo (CSS, trechos curtos demais para ter sentido como "frase").
"""
import re
import sys
import json


def parse_diff(lines):
    hunks = []
    cur_old, cur_new = [], []
    in_hunk = False
    for line in lines:
        if line.startswith('@@'):
            if in_hunk and (cur_old or cur_new):
                hunks.append((cur_old, cur_new))
            cur_old, cur_new = [], []
            in_hunk = True
            continue
        if not in_hunk:
            continue
        if line.startswith('-') and not line.startswith('---'):
            cur_old.append(line[1:].rstrip('\n'))
        elif line.startswith('+') and not line.startswith('+++'):
            cur_new.append(line[1:].rstrip('\n'))
        elif line.startswith(' '):
            if cur_old or cur_new:
                hunks.append((cur_old, cur_new))
            cur_old, cur_new = [], []
    if cur_old or cur_new:
        hunks.append((cur_old, cur_new))
    return hunks


ENTITIES = {
    '&amp;': '&', '&oacute;': 'ó', '&aacute;': 'á', '&eacute;': 'é',
    '&iacute;': 'í', '&uacute;': 'ú', '&ntilde;': 'ñ',
}


def strip_tags(s):
    s = re.sub(r'<[^>]+>', '', s)
    for k, v in ENTITIES.items():
        s = s.replace(k, v)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def is_prose(s):
    if '{' in s or '}' in s or 'font-family' in s or s.count(';') > 3:
        return False
    words = re.findall(r"[A-Za-zÀ-ÿ]{2,}", s)
    return len(words) >= 6


def main(min_len=40):
    hunks = parse_diff(sys.stdin.readlines())
    pairs = []
    for old_lines, new_lines in hunks:
        if len(old_lines) == 1 and len(new_lines) == 1:
            o, n = strip_tags(old_lines[0]), strip_tags(new_lines[0])
            if len(o) >= min_len and len(n) >= min_len and o != n and is_prose(o) and is_prose(n):
                pairs.append({'old': o, 'new': n})
    json.dump(pairs, sys.stdout, ensure_ascii=False, indent=2)
    print(f'\n# {len(hunks)} hunks totais, {len(pairs)} pares de prosa 1:1 extraídos', file=sys.stderr)


if __name__ == '__main__':
    main()
