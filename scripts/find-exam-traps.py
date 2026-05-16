#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
find-exam-traps.py

Finds question pairs with high text similarity but different answers —
these are "exam traps" that cause many test-takers to fail.

Uses TF-IDF + cosine similarity on Italian question texts.
Output: src/data/exam_traps.json

Usage:
    python3 scripts/find-exam-traps.py
"""

import json
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent.parent
QUESTIONS_DIR = ROOT / "src" / "data" / "questions"
OUT_PATH = ROOT / "src" / "data" / "exam_traps.json"

SIMILARITY_THRESHOLD = 0.85
MIN_WORDS = 5  # ignore very short questions

# ---------------------------------------------------------------------------
# TF-IDF implementation (no sklearn dependency needed for this scale)
# ---------------------------------------------------------------------------

import math


def nfc(text: str) -> str:
    return unicodedata.normalize("NFC", text.lower())


def tokenize(text: str) -> list[str]:
    """Simple word tokenization for Italian."""
    import re
    return re.findall(r"[a-zàáèéìíòóùú']{2,}", nfc(text))


def build_tfidf(texts: list[str]) -> tuple[dict, dict, list]:
    """Build TF-IDF vectors for a list of texts.
    Returns (idf, vocab, tfidf_vectors).
    """
    # Document frequency
    df = defaultdict(int)
    tokenized = [set(tokenize(t)) for t in texts]

    for tokens in tokenized:
        for t in tokens:
            df[t] += 1

    n_docs = len(texts)
    idf = {t: math.log(n_docs / (df[t] + 1)) + 1 for t in df}

    # TF-IDF vectors
    vectors = []
    for tokens in tokenized:
        vec = {}
        tf = defaultdict(int)
        for t in tokenize(texts[len(vectors)]):
            if t in idf:
                tf[t] += 1
        max_tf = max(tf.values()) if tf else 1
        for t, count in tf.items():
            vec[t] = (count / max_tf) * idf[t]
        vectors.append(vec)

    return idf, df, vectors


def cosine_similarity(vec_a: dict, vec_b: dict) -> float:
    """Cosine similarity between two sparse vectors."""
    if not vec_a or not vec_b:
        return 0.0

    dot = 0.0
    norm_a = 0.0
    norm_b = 0.0

    for k, v in vec_a.items():
        norm_a += v * v
        if k in vec_b:
            dot += v * vec_b[k]

    for v in vec_b.values():
        norm_b += v * v

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot / (math.sqrt(norm_a) * math.sqrt(norm_b))


def find_traps_in_topic(topic_id: int, questions: list) -> list:
    """Find trap pairs within a single topic."""
    # Filter very short questions
    valid = [(i, q) for i, q in enumerate(questions)
             if len(q.get('text', '').split()) >= MIN_WORDS]
    if len(valid) < 2:
        return []

    indices, valid_qs = zip(*valid)
    texts = [q['text'] for q in valid_qs]

    _, _, vectors = build_tfidf(texts)

    traps = []
    seen_pairs = set()

    for a in range(len(valid_qs)):
        for b in range(a + 1, len(valid_qs)):
            qa, qb = valid_qs[a], valid_qs[b]
            # Must have different answers
            if qa.get('answer') == qb.get('answer'):
                continue

            sim = cosine_similarity(vectors[a], vectors[b])
            if sim >= SIMILARITY_THRESHOLD:
                pair = tuple(sorted([qa['id'], qb['id']]))
                if pair not in seen_pairs:
                    seen_pairs.add(pair)
                    traps.append({
                        'question_a': {
                            'id': qa['id'],
                            'text': qa['text'],
                            'answer': qa.get('answer'),
                            'text_ru': qa.get('text_ru', ''),
                        },
                        'question_b': {
                            'id': qb['id'],
                            'text': qb['text'],
                            'answer': qb.get('answer'),
                            'text_ru': qb.get('text_ru', ''),
                        },
                        'similarity': round(sim, 4),
                        'topic_id': topic_id,
                    })

    return traps


def main():
    print("=" * 60)
    print("find-exam-traps.py — Exam Trap Pair Detector")
    print(f"Similarity threshold: {SIMILARITY_THRESHOLD}")
    print("=" * 60)

    all_traps = []
    topic_stats = {}

    for topic_id in range(1, 26):
        path = QUESTIONS_DIR / f"topic_{topic_id}.json"
        if not path.exists():
            continue

        with open(path, encoding='utf-8') as f:
            questions = json.load(f)

        traps = find_traps_in_topic(topic_id, questions)
        all_traps.extend(traps)
        topic_stats[topic_id] = len(traps)

        if traps:
            print(f"  Topic {topic_id:02d}: {len(traps)} trap pairs found")
        else:
            print(f"  Topic {topic_id:02d}: none")

    # Sort by similarity descending
    all_traps.sort(key=lambda t: -t['similarity'])

    # Save
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_traps, f, ensure_ascii=False, indent=2)

    total_topics_with_traps = sum(1 for v in topic_stats.values() if v > 0)
    print(f"\n{'=' * 60}")
    print(f"Total: {len(all_traps)} trap pairs in {total_topics_with_traps} topics")
    print(f"Output: {OUT_PATH.relative_to(ROOT)}")
    print(f"Size: {OUT_PATH.stat().st_size} bytes")

    if all_traps:
        print(f"\nTop 5 most similar trap pairs:")
        for i, trap in enumerate(all_traps[:5]):
            print(f"  [{trap['similarity']:.4f}] Topic {trap['topic_id']}")
            print(f"    A (True={trap['question_a']['answer']}):  {trap['question_a']['text'][:100]}")
            print(f"    B (True={trap['question_b']['answer']}):  {trap['question_b']['text'][:100]}")
            print()


if __name__ == "__main__":
    main()
