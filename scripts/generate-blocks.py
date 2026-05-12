#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate-blocks.py

Generates topic_N_blocks.json (x25) from question files + vocab files.
Must run AFTER generate-vocab.py.

Usage:
    python3 scripts/generate-blocks.py

Type A (signs):   greedy block building via sign-vocab overlap graph (networkx)
Type B (mixed):   hybrid — image blocks + phrase blocks
Type C (rules):   template phrases + number extraction
"""

import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
QUESTIONS_DIR = ROOT / "src" / "data" / "questions"
VOCAB_DIR = ROOT / "src" / "data" / "vocabulary"
BLOCKS_DIR = ROOT / "src" / "data" / "blocks"

# ── Topic type map ─────────────────────────────────────────────────────────────
TOPIC_TYPE = {}
for _t in [2, 3, 4, 5, 6, 7, 8, 9, 10]:
    TOPIC_TYPE[_t] = 'A'
for _t in [13, 14, 17, 18]:
    TOPIC_TYPE[_t] = 'B'
for _t in [1, 11, 12, 15, 16, 19, 20, 21, 22, 23, 24, 25]:
    TOPIC_TYPE[_t] = 'C'

# Topics with numeric rules (special number extraction)
NUMERIC_TOPICS = {11, 12, 20}

BLOCK_SIZE = 30       # target questions per block
MIN_BLOCK_SIZE = 15   # minimum to form a standalone block

TOKEN_RE = re.compile(r"[a-zàáèéìíòóùú']+")
NUMBER_RE = re.compile(r'\b\d+(?:[,\.]\d+)?\s*(?:km(?:/h)?|m(?:etri)?|anni?|mesi|giorni|punti|ore|g(?:iorni)?|l(?:itri)?)?\b', re.IGNORECASE)


# ── Helpers ────────────────────────────────────────────────────────────────────

def nfc(text: str) -> str:
    return unicodedata.normalize('NFC', text.lower())


def tokenize(text: str) -> list:
    return TOKEN_RE.findall(nfc(text))


def extract_sign(image_url) -> str | None:
    if not image_url:
        return None
    m = re.search(r'/imgquiz/([^/?#]+)', image_url)
    return m.group(1) if m else None


def load_json(path: Path):
    if not path.exists():
        return None
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK]   {path.relative_to(ROOT)}  ({len(data)} blocks)")


# ── Vocab helpers ──────────────────────────────────────────────────────────────

def vocab_index_by_word(vocab_entries: list) -> dict:
    """Return {word/lemma: entry_id}."""
    idx = {}
    for e in vocab_entries:
        idx[e['word']] = e['id']
        if e['lemma'] != e['word']:
            idx[e['lemma']] = e['id']
    return idx


def vocab_set_for_questions(q_ids: set, q_tokens: dict, vocab_idx: dict) -> set:
    """Return set of vocab_ids that appear in given question ids."""
    result = set()
    for qid in q_ids:
        for tok in q_tokens.get(qid, []):
            if tok in vocab_idx:
                result.add(vocab_idx[tok])
    return result


def overlap_coefficient(set_a: set, set_b: set) -> float:
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / min(len(set_a), len(set_b))


# ── Type A: Sign-based blocks ──────────────────────────────────────────────────

def build_type_a_blocks(topic_id: int, questions: list, vocab_entries: list) -> list:
    """Greedy blocks grouped by sign image, ordered by vocab overlap."""
    try:
        import networkx as nx
        HAS_NX = True
    except ImportError:
        HAS_NX = False
        print("[WARN] networkx not installed, using linear sign ordering")

    # Group questions by sign
    sign_to_qids = defaultdict(list)
    for q in questions:
        sign = extract_sign(q.get('image'))
        key = sign if sign else '__no_image__'
        sign_to_qids[key].append(q['id'])

    signs = [s for s in sign_to_qids if s != '__no_image__']

    # Build token set per question
    q_tokens = {q['id']: tokenize(q['text']) for q in questions}

    vocab_idx = vocab_index_by_word(vocab_entries)

    # Vocab set per sign
    sign_vocab = {}
    for sign in signs:
        qids = set(sign_to_qids[sign])
        sign_vocab[sign] = vocab_set_for_questions(qids, q_tokens, vocab_idx)

    if not signs:
        return []

    # Order signs: BFS from sign with most vocab overlap with global common words
    # Simplification: start from sign with most vocab words (richest), then greedily
    if HAS_NX:
        import networkx as nx
        G = nx.Graph()
        G.add_nodes_from(signs)
        for i, s1 in enumerate(signs):
            for s2 in signs[i+1:]:
                w = overlap_coefficient(sign_vocab[s1], sign_vocab[s2])
                if w > 0:
                    G.add_edge(s1, s2, weight=w)

        # Start from sign with highest total vocab (most questions)
        start = max(signs, key=lambda s: len(sign_to_qids[s]))
        # BFS order
        try:
            ordered_signs = list(nx.bfs_tree(G, start).nodes())
            # Add any disconnected signs
            missing = [s for s in signs if s not in ordered_signs]
            ordered_signs.extend(missing)
        except Exception:
            ordered_signs = signs
    else:
        # Fallback: sort by number of questions descending
        ordered_signs = sorted(signs, key=lambda s: -len(sign_to_qids[s]))

    # ── Greedy block building ─────────────────────────────────────────────────
    blocks = []
    used_signs = set()
    block_id = 1

    i = 0
    while i < len(ordered_signs):
        if ordered_signs[i] in used_signs:
            i += 1
            continue

        block_signs = [ordered_signs[i]]
        block_qids = list(sign_to_qids[ordered_signs[i]])
        block_vocab = set(sign_vocab[ordered_signs[i]])
        used_signs.add(ordered_signs[i])

        # Greedily add signs with best overlap until block_size reached
        while len(block_qids) < BLOCK_SIZE:
            best_sign = None
            best_overlap = -1
            for s in ordered_signs:
                if s in used_signs:
                    continue
                ov = overlap_coefficient(sign_vocab[s], block_vocab)
                if ov > best_overlap:
                    best_overlap = ov
                    best_sign = s
            if best_sign is None:
                break
            block_signs.append(best_sign)
            block_qids.extend(sign_to_qids[best_sign])
            block_vocab |= sign_vocab[best_sign]
            used_signs.add(best_sign)

        # Interleave questions across signs (not all from one sign first)
        interleaved = _interleave([sign_to_qids[s] for s in block_signs])
        final_qids = interleaved[:BLOCK_SIZE]

        # Vocab IDs for this block
        block_vocab_ids = sorted(vocab_set_for_questions(
            set(final_qids), q_tokens, vocab_idx
        ))

        # "new" vocab = vocab not in previous blocks
        prev_vocab = set()
        for b in blocks:
            prev_vocab.update(b['vocab_ids'])
        new_vocab_ids = sorted(set(block_vocab_ids) - prev_vocab)

        # Overlap score: average pairwise overlap between signs in block
        ov_score = 0.0
        pairs = [(block_signs[a], block_signs[b])
                 for a in range(len(block_signs))
                 for b in range(a+1, len(block_signs))]
        if pairs:
            ov_score = sum(
                overlap_coefficient(sign_vocab[a], sign_vocab[b])
                for a, b in pairs
            ) / len(pairs)

        blocks.append({
            'block_id': block_id,
            'topic_id': topic_id,
            'topic_type': 'A',
            'sign_images': block_signs,
            'question_ids': final_qids,
            'vocab_ids': block_vocab_ids,
            'new_vocab_ids': new_vocab_ids,
            'overlap_score': round(ov_score, 3),
            'template_phrases': [],
            'number_rules': [],
        })
        block_id += 1
        i += 1

    # Handle leftover questions from no-image group
    leftover = sign_to_qids.get('__no_image__', [])
    if leftover:
        for chunk_start in range(0, len(leftover), BLOCK_SIZE):
            chunk = leftover[chunk_start:chunk_start + BLOCK_SIZE]
            if len(chunk) < MIN_BLOCK_SIZE and blocks:
                blocks[-1]['question_ids'].extend(chunk)
                continue
            chunk_vocab = sorted(vocab_set_for_questions(
                set(chunk), q_tokens, vocab_idx
            ))
            prev_vocab = set()
            for b in blocks:
                prev_vocab.update(b['vocab_ids'])
            blocks.append({
                'block_id': block_id,
                'topic_id': topic_id,
                'topic_type': 'A',
                'sign_images': [],
                'question_ids': chunk,
                'vocab_ids': chunk_vocab,
                'new_vocab_ids': sorted(set(chunk_vocab) - prev_vocab),
                'overlap_score': 0.0,
                'template_phrases': [],
                'number_rules': [],
            })
            block_id += 1

    return blocks


def _interleave(lists: list) -> list:
    """Round-robin interleave multiple lists."""
    result = []
    max_len = max((len(l) for l in lists), default=0)
    for i in range(max_len):
        for lst in lists:
            if i < len(lst):
                result.append(lst[i])
    return result


# ── Type C: Rule/phrase-based blocks ──────────────────────────────────────────

def extract_template_phrases(questions: list, top_n: int = 8) -> list:
    """Extract most common sentence-opening templates (first 5 words)."""
    counter = Counter()
    for q in questions:
        words = q['text'].split()
        if len(words) >= 3:
            phrase = ' '.join(words[:5])
            counter[phrase] += 1
    return [phrase for phrase, _ in counter.most_common(top_n) if counter[phrase] >= 3]


def extract_number_rules(questions: list) -> list:
    """Extract numeric values + their context from question texts."""
    rules = []
    seen = set()
    for q in questions:
        for m in NUMBER_RE.finditer(q['text']):
            val = m.group(0).strip()
            if val in seen or len(val) < 2:
                continue
            # Get surrounding context (5 words around number)
            words = q['text'].split()
            for i, w in enumerate(words):
                if val in w or val.split()[0] in w:
                    start = max(0, i - 3)
                    end = min(len(words), i + 4)
                    context = ' '.join(words[start:end])
                    rules.append({
                        'value': val,
                        'context': context,
                        'question_id': q['id'],
                    })
                    seen.add(val)
                    break
    return rules[:20]  # cap at 20 rules


def build_type_c_blocks(topic_id: int, questions: list, vocab_entries: list) -> list:
    """Phrase-first blocks for rule-based topics."""
    q_tokens = {q['id']: tokenize(q['text']) for q in questions}
    vocab_idx = vocab_index_by_word(vocab_entries)
    template_phrases = extract_template_phrases(questions)
    number_rules = extract_number_rules(questions) if topic_id in NUMERIC_TOPICS else []

    blocks = []
    block_id = 1
    prev_vocab: set = set()

    # Split questions into chunks of BLOCK_SIZE
    # Sort by text length ascending (simpler first)
    sorted_qs = sorted(questions, key=lambda q: len(q['text']))

    for chunk_start in range(0, len(sorted_qs), BLOCK_SIZE):
        chunk = sorted_qs[chunk_start:chunk_start + BLOCK_SIZE]
        if len(chunk) < MIN_BLOCK_SIZE and blocks:
            # Append small tail to last block
            blocks[-1]['question_ids'].extend(q['id'] for q in chunk)
            continue

        chunk_qids = [q['id'] for q in chunk]
        chunk_vocab = sorted(vocab_set_for_questions(
            set(chunk_qids), q_tokens, vocab_idx
        ))
        new_vocab = sorted(set(chunk_vocab) - prev_vocab)

        # Template phrases for this specific chunk
        chunk_templates = extract_template_phrases(chunk, top_n=5)

        blocks.append({
            'block_id': block_id,
            'topic_id': topic_id,
            'topic_type': 'C',
            'sign_images': [],
            'question_ids': chunk_qids,
            'vocab_ids': chunk_vocab,
            'new_vocab_ids': new_vocab,
            'overlap_score': 0.0,
            'template_phrases': chunk_templates,
            'number_rules': number_rules if block_id == 1 else [],
        })
        prev_vocab.update(chunk_vocab)
        block_id += 1

    return blocks


# ── Type B: Hybrid blocks ──────────────────────────────────────────────────────

def build_type_b_blocks(topic_id: int, questions: list, vocab_entries: list) -> list:
    """Hybrid: questions with images → Type A logic; without → Type C logic."""
    with_image = [q for q in questions if q.get('image')]
    without_image = [q for q in questions if not q.get('image')]

    blocks = []

    if with_image:
        img_blocks = build_type_a_blocks(topic_id, with_image, vocab_entries)
        for b in img_blocks:
            b['topic_type'] = 'B'
        blocks.extend(img_blocks)

    if without_image:
        text_blocks = build_type_c_blocks(topic_id, without_image, vocab_entries)
        offset = len(blocks)
        for b in text_blocks:
            b['block_id'] += offset
            b['topic_type'] = 'B'
        blocks.extend(text_blocks)

    # Re-number block_ids sequentially
    for i, b in enumerate(blocks, start=1):
        b['block_id'] = i

    return blocks


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("generate-blocks.py — Quiz Patente Block Generator")
    print("=" * 60)

    BLOCKS_DIR.mkdir(parents=True, exist_ok=True)

    for topic_id in range(1, 26):
        q_path = QUESTIONS_DIR / f"topic_{topic_id}.json"
        v_path = VOCAB_DIR / f"topic_{topic_id}_vocab.json"

        if not q_path.exists():
            print(f"[SKIP] topic_{topic_id}.json not found")
            continue

        questions = load_json(q_path)
        vocab_entries = load_json(v_path) or []
        topic_type = TOPIC_TYPE.get(topic_id, 'C')

        print(f"\n[Topic {topic_id:02d}] type={topic_type}  "
              f"q={len(questions)}  vocab={len(vocab_entries)}")

        if topic_type == 'A':
            blocks = build_type_a_blocks(topic_id, questions, vocab_entries)
        elif topic_type == 'B':
            blocks = build_type_b_blocks(topic_id, questions, vocab_entries)
        else:
            blocks = build_type_c_blocks(topic_id, questions, vocab_entries)

        save_json(BLOCKS_DIR / f"topic_{topic_id}_blocks.json", blocks)

    print("\n" + "=" * 60)
    print("Done. Files written to: src/data/blocks/")
    print("=" * 60)


if __name__ == "__main__":
    main()
