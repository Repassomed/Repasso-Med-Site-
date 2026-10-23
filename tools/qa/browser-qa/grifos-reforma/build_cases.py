#!/usr/bin/env python3
"""Monta os casos de teste (near/far/adversarial) a partir dos pares
extraídos por extract_pairs.py.

Uso:
    python3 build_cases.py pairs.json cases.json
"""
import json
import re
import sys
import random
import difflib


def sim_ratio(a, b):
    return difflib.SequenceMatcher(None, a, b).ratio()


def word_align_left(s, i):
    while i > 0 and s[i - 1] not in ' \t':
        i -= 1
    return i


def word_align_right(s, i):
    while i < len(s) and s[i] not in ' \t':
        i += 1
    return i


def span_over_edit(old, new, min_len=20, max_len=120, pad_words=3):
    """Escolhe um trecho de `old` que INCLUI a região realmente editada
    (não um trecho aleatório que por acaso sobreviveu intacto) — é o que
    torna o teste honesto: o texto do destaque tem de mudar de verdade."""
    sm = difflib.SequenceMatcher(None, old, new)
    ops = [op for op in sm.get_opcodes() if op[0] != 'equal']
    if not ops:
        return None
    i1 = min(op[1] for op in ops)
    i2 = max(op[2] for op in ops)
    left = i1
    for _ in range(pad_words):
        left = word_align_left(old, left)
        if left > 0:
            left -= 1
            left = word_align_left(old, left)
    left = max(0, word_align_left(old, left))
    right = i2
    for _ in range(pad_words):
        right = word_align_right(old, right)
        if right < len(old):
            right += 1
            right = word_align_right(old, right)
    right = min(len(old), word_align_right(old, right))
    span = old[left:right].strip()
    if len(span) < min_len:
        left = max(0, left - 15)
        right = min(len(old), right + 15)
        left = word_align_left(old, left)
        right = word_align_right(old, right)
        span = old[left:right].strip()
    if len(span) < min_len or len(span) > max_len:
        return None
    idx = old.find(span)
    if idx < 0:
        return None
    return span, idx


def build(pairs, prefix_label):
    cases, skipped = [], 0
    cid = 0
    for p in pairs:
        res = span_over_edit(p['old'], p['new'])
        if not res:
            skipped += 1
            continue
        span, idx = res
        prefix = p['old'][max(0, idx - 40):idx]
        suffix = p['old'][idx + len(span):idx + len(span) + 40]
        cid += 1
        cases.append({
            'id': '%s-%03d' % (prefix_label, cid),
            'kind': prefix_label,
            'old_text': p['old'], 'new_text': p['new'],
            'exact_text': span, 'prefix': prefix, 'suffix': suffix,
            'ratio': round(sim_ratio(p['old'], p['new']), 3),
        })
    return cases, skipped


def build_adversarial(cases, n=50, seed=11):
    random.seed(seed)
    pool = list(cases)
    random.shuffle(pool)
    out = []
    for i, p in enumerate(pool[:n]):
        old, span = p['old_text'], p['exact_text']
        idx = old.find(span)
        if idx < 0:
            continue
        before, after = old[:idx], old[idx + len(span):]
        decoy = 'Nota aparte, sin relación directa: ' + before + span + after
        out.append({
            'id': 'advB-%03d' % (i + 1), 'kind': 'adversarial-within-block',
            'old_text': old, 'new_text': p['new_text'], 'decoy_text': decoy,
            'exact_text': span, 'prefix': p['prefix'], 'suffix': p['suffix'],
        })
    return out


def main():
    with open(sys.argv[1], encoding='utf-8') as f:
        pairs = json.load(f)
    near = [p for p in pairs if sim_ratio(p['old'], p['new']) >= 0.85]
    far = [p for p in pairs if sim_ratio(p['old'], p['new']) < 0.85]
    near_cases, near_skip = build(near, 'near')
    far_cases, far_skip = build(far, 'far')
    cases = near_cases + far_cases
    adversarial = build_adversarial(cases)
    print(f'near: {len(near_cases)} built, {near_skip} skipped', file=sys.stderr)
    print(f'far: {len(far_cases)} built, {far_skip} skipped', file=sys.stderr)
    print(f'adversarial-within-block: {len(adversarial)}', file=sys.stderr)
    with open(sys.argv[2], 'w', encoding='utf-8') as f:
        json.dump({'cases': cases, 'adversarial': adversarial}, f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main()
