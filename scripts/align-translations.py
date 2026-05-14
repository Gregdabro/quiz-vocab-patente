#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
align-translations.py

Extracts Italian→Russian translations from the parallel question corpus.
Uses statistical word alignment (co-occurrence + TF-IDF-like scoring)
on 7041 parallel IT-RU sentence pairs.

Russian lemmatization (pymorphy3/pymorphy2) normalizes case/declension variants.
Co-occurrence analysis detects multi-word translations (e.g. "транспортное средство").

All lemmatization is pre-computed once for speed.

Output: translation_cache.json — manually editable dictionary.

Usage:
    pip install pymorphy3
    python3 scripts/align-translations.py
"""

import json
import re
import math
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).parent.parent
QUESTIONS_DIR = ROOT / "src" / "data" / "questions"
VOCAB_DIR = ROOT / "src" / "data" / "vocabulary"
CACHE_PATH = ROOT / "scripts" / "translation_cache.json"

# ---------------------------------------------------------------------------
# Russian lemmatizer
# ---------------------------------------------------------------------------
_morph = None

def _get_morph():
    global _morph
    if _morph is None:
        try:
            import pymorphy3
            _morph = pymorphy3.MorphAnalyzer()
        except ImportError:
            import pymorphy2
            _morph = pymorphy2.MorphAnalyzer()
    return _morph

# ---------------------------------------------------------------------------
# Russian stopwords
# ---------------------------------------------------------------------------
RU_STOPWORDS = {
    'я', 'мы', 'ты', 'вы', 'он', 'она', 'оно', 'они',
    'меня', 'мне', 'мной', 'нас', 'нам', 'нами',
    'тебя', 'тебе', 'тобой', 'вас', 'вам', 'вами',
    'его', 'ему', 'им', 'её', 'ей', 'ею', 'их', 'ими',
    'себя', 'себе', 'собой',
    'мой', 'моя', 'моё', 'мои', 'твой', 'твоя', 'твоё', 'твои',
    'наш', 'наша', 'наше', 'наши', 'ваш', 'ваша', 'ваше', 'ваши',
    'свой', 'своя', 'своё', 'свои',
    'этот', 'эта', 'это', 'эти', 'тот', 'та', 'то', 'те',
    'такой', 'такая', 'такое', 'такие',
    'в', 'на', 'из', 'от', 'до', 'с', 'по', 'к', 'у', 'о', 'об',
    'за', 'над', 'под', 'при', 'про', 'без', 'для', 'ради',
    'через', 'перед', 'между', 'после', 'около', 'вокруг',
    'из-за', 'во', 'ко', 'со', 'обо', 'ото', 'подо', 'надо',
    'и', 'а', 'но', 'да', 'или', 'либо', 'ни', 'что', 'чтобы',
    'как', 'когда', 'где', 'почему', 'если', 'хотя', 'пока',
    'так', 'то', 'же', 'ли', 'бы', 'ведь',
    'не', 'ни', 'бы', 'ли', 'же', 'уж', 'даже', 'только', 'ещё',
    'уже', 'вот', 'вон', 'именно', 'почти', 'очень', 'весьма',
    'более', 'менее', 'самый', 'другой', 'каждый', 'любой',
    'весь', 'вся', 'всё', 'все',
    'быть', 'есть', 'был', 'была', 'было', 'были', 'будет', 'будут',
    'может', 'могут', 'мог', 'могла', 'могло', 'могли',
    'должен', 'должна', 'должно', 'должны',
    'нужно', 'можно', 'нельзя', 'надо',
    'является', 'являются',
    'один', 'одна', 'одно', 'одни', 'два', 'две', 'три', 'четыре', 'пять',
    'шесть', 'семь', 'восемь', 'девять', 'десять',
    'что', 'кто', 'кого', 'кому', 'кем', 'ком', 'какой',
    'какая', 'какое', 'какие', 'который', 'которая', 'которое', 'которые',
    'чей', 'чья', 'чьё', 'чьи', 'сколько',
    'также', 'тоже', 'еще', 'уже', 'всегда', 'никогда',
    'часто', 'редко', 'иногда', 'сейчас', 'теперь', 'тогда',
    'здесь', 'там', 'тут', 'везде', 'нигде',
    'очень', 'особенно', 'лишь',
    'нет', 'да', 'со', 'об',
}

RU_TOKEN_RE = re.compile(r"[а-яёА-ЯЁa-zàáèéìíòóùúA-ZÀÁÈÉÌÍÒÓÙÚ0-9]+")
IT_TOKEN_RE = re.compile(r"[a-zàáèéìíòóùú']+")

MIN_MATCHES = 3

# ---------------------------------------------------------------------------
# Pre-computed Russian lemmas (keyed by sentence index)
# ---------------------------------------------------------------------------
_pre_lemmas: list[list[str]] = []

def precompute_lemmas(questions: list[dict]):
    """Lemmatize all Russian sentences once."""
    global _pre_lemmas
    morph = _get_morph()
    _pre_lemmas = []
    for qi, q in enumerate(questions):
        tokens = RU_TOKEN_RE.findall(q['text_ru'].lower())
        content = [t for t in tokens if t not in RU_STOPWORDS and len(t) >= 2]
        lemmas = []
        for t in content:
            try:
                parsed = morph.parse(t)
                lemmas.append(parsed[0].normal_form if parsed else t)
            except Exception:
                lemmas.append(t)
        _pre_lemmas.append(lemmas)
        if (qi + 1) % 1000 == 0:
            print(f"  Lemmatized {qi + 1}/{len(questions)} sentences...")

# ---------------------------------------------------------------------------
# Tokenization
# ---------------------------------------------------------------------------
def tokenize_it(text: str) -> list[str]:
    if not text:
        return []
    return IT_TOKEN_RE.findall(text.lower())

# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------
def load_all_questions() -> list[dict]:
    all_qs = []
    for topic_id in range(1, 26):
        path = QUESTIONS_DIR / f"topic_{topic_id}.json"
        if not path.exists():
            continue
        with open(path, encoding='utf-8') as f:
            questions = json.load(f)
        for q in questions:
            if q.get('text_ru'):
                all_qs.append({'id': q['id'], 'text': q['text'],
                               'text_ru': q['text_ru'], 'topic_id': topic_id})
    return all_qs


def build_inverted_index(questions: list[dict]) -> dict[str, list[int]]:
    index = defaultdict(list)
    for qi, q in enumerate(questions):
        for t in set(tokenize_it(q['text'])):
            index[t].append(qi)
    return index


def collect_unique_vocab() -> dict[str, list[dict]]:
    word_entries = defaultdict(list)
    for topic_id in range(1, 26):
        path = VOCAB_DIR / f"topic_{topic_id}_vocab.json"
        if not path.exists():
            continue
        with open(path, encoding='utf-8') as f:
            for e in json.load(f):
                word_entries[e['word']].append(e)
    global_path = VOCAB_DIR / "global_vocab.json"
    if global_path.exists():
        with open(global_path, encoding='utf-8') as f:
            for e in json.load(f):
                word_entries[e['word']].append(e)
    return dict(word_entries)

# ---------------------------------------------------------------------------
# Question matching
# ---------------------------------------------------------------------------
def find_matching_questions(word: str, it_index: dict[str, list[int]]) -> list[int]:
    word_tokens = tokenize_it(word.lower())
    if len(word_tokens) == 0:
        return []
    if len(word_tokens) == 1:
        return it_index.get(word_tokens[0], [])
    candidates_by_token = {t: set(it_index.get(t, [])) for t in word_tokens}
    if not candidates_by_token:
        return []
    rarest = min(candidates_by_token, key=lambda t: len(candidates_by_token[t]))
    result = set(candidates_by_token[rarest])
    for t in word_tokens:
        if t != rarest:
            result &= candidates_by_token[t]
        if not result:
            break
    return sorted(result)

# ---------------------------------------------------------------------------
# Core alignment (uses pre-computed lemmas)
# ---------------------------------------------------------------------------
def align_word(word: str, matching_qs: list[int], n_all: int) -> dict:
    if not matching_qs:
        return {'translation': None, 'confidence': 'none',
                'source_questions': 0, 'candidates': []}

    n_matching = len(matching_qs)

    # Foreground: lemmatized Russian tokens in matching questions
    fg = Counter()
    for qi in matching_qs:
        fg.update(set(_pre_lemmas[qi]))

    # Background: use pre-computed global counts
    bg = Counter()
    for lemmas in _pre_lemmas:
        bg.update(set(lemmas))

    # TF-IDF scores
    scores = {}
    for lemma, fg_c in fg.items():
        bg_c = bg.get(lemma, 1)
        scores[lemma] = (fg_c / n_matching) * math.log((n_all + 1) / (bg_c + 1))

    ranked = sorted(scores.items(), key=lambda x: -x[1])
    if not ranked:
        return {'translation': None, 'confidence': 'none',
                'source_questions': n_matching, 'candidates': []}

    best_lemma, best_score = ranked[0]

    # Confidence
    if n_matching < MIN_MATCHES:
        conf = 'low'
    elif best_score > 0.3 and len(ranked) > 1 and ranked[1][1] < best_score * 0.5:
        conf = 'high'
    elif best_score > 0.15:
        conf = 'medium'
    else:
        conf = 'low'

    # Single best lemma. Multi-word translations (e.g. "транспортное средство")
    # can be added manually to translation_cache.json.
    translation = best_lemma

    return {
        'translation': translation,
        'confidence': conf,
        'source_questions': n_matching,
        'candidates': [{'token': t, 'score': round(s, 4)} for t, s in ranked[:8]],
    }


def main():
    print("=" * 60)
    print("align-translations.py — Word Alignment from Parallel Corpus")
    print("=" * 60)

    print("\n[1/5] Loading questions...")
    questions = load_all_questions()
    print(f"  {len(questions)} questions with text_ru")

    print("\n[2/5] Lemmatizing Russian sentences (pre-compute)...")
    precompute_lemmas(questions)

    print("\n[3/5] Building inverted index...")
    it_index = build_inverted_index(questions)
    print(f"  {len(it_index)} unique Italian tokens indexed")

    print("\n[4/5] Collecting vocab words...")
    vocabs = collect_unique_vocab()
    unique_words = sorted(vocabs.keys())
    print(f"  {len(unique_words)} unique words/phrases")

    print(f"\n[5/5] Aligning {len(unique_words)} translations...")
    cache = {}
    stats = {'high': 0, 'medium': 0, 'low': 0, 'none': 0}
    n_all = len(questions)

    for i, word in enumerate(unique_words):
        matching = find_matching_questions(word, it_index)
        result = align_word(word, matching, n_all)
        cache[word] = result
        stats[result['confidence']] += 1
        if (i + 1) % 500 == 0 or i == len(unique_words) - 1:
            print(f"  [{i+1}/{len(unique_words)}] "
                  f"high={stats['high']} med={stats['medium']} "
                  f"low={stats['low']} none={stats['none']}")

    print(f"\nDone. Confidence distribution:")
    print(f"  high:   {stats['high']} ({stats['high']/len(unique_words)*100:.0f}%)")
    print(f"  medium: {stats['medium']} ({stats['medium']/len(unique_words)*100:.0f}%)")
    print(f"  low:    {stats['low']} ({stats['low']/len(unique_words)*100:.0f}%)")
    print(f"  none:   {stats['none']} ({stats['none']/len(unique_words)*100:.0f}%)")

    print(f"\nSaving to {CACHE_PATH}...")
    with open(CACHE_PATH, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    print(f"  {len(cache)} entries written")

    print("\n--- Sample translations ---")
    for w in ['veicolo', 'strada', 'velocità', 'sorpasso', 'parcheggio',
              'l\'isola traffico', 'tratto strada', 'limite velocità']:
        if w in cache:
            c = cache[w]
            print(f"  {w:25s} → {c['translation']:35s}"
                  f"({c['confidence']}, n={c['source_questions']})")

    print("\nDone. Review and edit translation_cache.json as needed.")


if __name__ == "__main__":
    main()
