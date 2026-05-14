#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate-vocab.py

Generates topic_N_vocab.json (x25) and global_vocab.json from question files.
Run once offline. Output → src/data/vocabulary/

Usage:
    pip install -r scripts/requirements.txt
    python -m spacy download it_core_news_sm
    python3 scripts/generate-vocab.py
"""

import json
import re
import math
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
QUESTIONS_DIR = ROOT / "src" / "data" / "questions"
VOCAB_DIR = ROOT / "src" / "data" / "vocabulary"
CACHE_PATH = ROOT / "scripts" / "translation_cache.json"

# ── Translation cache ────────────────────────────────────────────────────────────
_translation_cache: dict = {}

def _load_cache():
    """Load translation cache if available."""
    global _translation_cache
    if CACHE_PATH.exists():
        with open(CACHE_PATH, encoding='utf-8') as f:
            _translation_cache = json.load(f)
        hits = sum(1 for v in _translation_cache.values() if v.get('translation'))
        print(f"[INFO] Translation cache loaded: {hits}/{len(_translation_cache)} entries with translation")
    else:
        print("[WARN] translation_cache.json not found — run align-translations.py first")
        _translation_cache = {}

def _translate(word: str) -> str | None:
    """Get Russian translation for an Italian word/phrase from cache."""
    entry = _translation_cache.get(word)
    if entry and entry.get('translation'):
        return entry['translation']
    return None

# ── Topic type map (from master plan) ─────────────────────────────────────────
TOPIC_TYPE = {}
for _t in [2, 3, 4, 5, 6, 7, 8, 9, 10]:
    TOPIC_TYPE[_t] = 'A'
for _t in [13, 14, 17, 18]:
    TOPIC_TYPE[_t] = 'B'
for _t in [1, 11, 12, 15, 16, 19, 20, 21, 22, 23, 24, 25]:
    TOPIC_TYPE[_t] = 'C'

# ── L1: grammatical stopwords ──────────────────────────────────────────────────
L1 = {
    'il','lo','la','i','gli','le','un','uno','una',
    'di','a','da','in','con','su','per','tra','fra',
    'del','della','dello','dei','degli','delle',
    'al','allo','alla','ai','agli','alle',
    'dal','dalla','dallo','dai','dagli','dalle',
    'nel','nella','nello','nei','negli','nelle',
    'sul','sulla','sullo','sui','sugli','sulle',
    'col','coi','e','ed','o','ma','se','che','chi','cui',
    'non','si','ci','ne','mi','ti','vi',
    'questo','questa','questi','queste',
    'quello','quella','quelli','quelle',
    'tale','tali','stesso','stessa','ogni',
    'tutto','tutti','tutte','tutta',
    'altro','altri','altre','altra',
    'molto','poco','troppo','tanto',
    'più','meno','anche','ancora','già','mai','sempre','spesso',
    'quando','dove','come','perché','quindi','però','allora','poi',
    'prima','dopo','qui','là','lì','qua',
    'sono','è','era','sarà','sarebbe','siano','fosse','sia',
    'ha','ho','hai','hanno','aveva','avuto',
    'può','deve','vuole','possono','devono','vietato','consentito',
    'stato','stata','stati','state','fatto','fatta',
    'suo','sua','suoi','sue','mio','mia','tuo','tua',
    'nostro','nostra','vostro','vostra',
    'ad','od','né','nè','no','sì',
    'essere','avere','fare','andare','venire','potere','volere','dovere',
    'sapere','stare','dare','dire','vedere','prendere','mettere',
    'uscire','entrare','trovare','portare','tenere','passare',
    'restare','rimanere','tornare','diventare','aprire','chiudere',
    'cominciare','finire','salire','scendere',
}

# ── L2: exam-template quasi-stopwords (shown once as phrase template) ──────────
L2 = {
    'segnale','raffigurato','preannuncia','indica','vieta','richiede',
    'impone','invita','figurato','rappresentato',
    'seguente','seguenti','immagine','figura',
}

# ── Semantic groups (rule-based, no embeddings) ────────────────────────────────
SEMANTIC_GROUPS = {
    'movimento_corsie': {
        'senso','opposto','unico','doppio','corsia','corsie',
        'carreggiata','sorpasso','inversione','affiancamento',
    },
    'velocita': {
        'velocità','limite','massimo','moderare','rallentare',
        'ridurre','adeguare','consentita','minima','eccesso',
    },
    'ferroviario': {
        'ferroviario','barriere','barriera','semibarriere',
        'binari','binario','passaggio','tram','tranviario',
        'tranviaria','treno','ferrovia',
    },
    'vento': {'vento','laterale','forte','sbandamenti','raffiche'},
    'geometria_strada': {
        'curva','dosso','deformata','irregolare','pavimentazione',
        'buche','ghiaia','sconnessa','deformato','cunetta',
    },
    'segnaletica': {
        'cartello','indicazione','divieto','pericolo','obbligo',
        'pannello','integrativo','tavola','precedenza',
    },
    'precedenza': {
        'precedenza','cedere','principale','secondaria',
        'intersezione','incrocio','rotatoria',
    },
    'sicurezza': {
        'sicurezza','pericoloso','attenzione','prudenza',
        'cautela','rischio','pericolo',
    },
    'strade': {
        'autostrada','extraurbana','extraurbane','urbana',
        'abitato','centro','provinciale','comunale','statale',
    },
    'illuminazione': {
        'luce','luci','faro','fari','lampeggiante',
        'abbaglianti','anabbaglianti','posizione',
    },
    'veicoli': {
        'veicolo','veicoli','autovettura','autobus','camion',
        'moto','motociclo','ciclomotore','bicicletta',
        'pedone','pedoni','conducente',
    },
    'numeri_regole': {
        'km','metri','chilometri','ore','minuti',
        'anni','mesi','punti','categoria',
    },
}

# ── spaCy (graceful fallback) ──────────────────────────────────────────────────
try:
    # pyrefly: ignore [missing-import]
    import spacy as _spacy
    _nlp = _spacy.load("it_core_news_sm", disable=["ner", "parser"])
    HAS_SPACY = True
    print("[INFO] spaCy it_core_news_sm loaded")
except Exception as _e:
    HAS_SPACY = False
    print(f"[WARN] spaCy unavailable ({_e}), skipping lemmatization")

TOKEN_RE = re.compile(r"[a-zàáèéìíòóùú']+")


def nfc(text: str) -> str:
    return unicodedata.normalize('NFC', text.lower())


def tokenize(text: str) -> list:
    return TOKEN_RE.findall(nfc(text))


def is_content(token: str) -> bool:
    return (
        token not in L1
        and token not in L2
        and len(token) >= 3
        and not token.isdigit()
    )


def extract_sign(image_url) -> str | None:
    if not image_url:
        return None
    m = re.search(r'/imgquiz/([^/?#]+)', image_url)
    return m.group(1) if m else None


def semantic_group(word: str) -> str:
    for group, words in SEMANTIC_GROUPS.items():
        if word in words:
            return group
    return 'generale'


def build_lemma_map(all_tokens: set) -> dict:
    """Build token→lemma map via spaCy batch."""
    if not HAS_SPACY or not all_tokens:
        return {}
    text = ' '.join(sorted(all_tokens))
    doc = _nlp(text)
    return {tok.text: tok.lemma_.lower() for tok in doc if tok.text in all_tokens}


def detect_bigrams(questions: list, content_set: set, min_freq: int = 3) -> dict:
    """Return {bigram_string: count} for frequent content-word bigrams."""
    counter = Counter()
    for q in questions:
        toks = [t for t in tokenize(q['text']) if t in content_set]
        for i in range(len(toks) - 1):
            counter[f"{toks[i]} {toks[i+1]}"] += 1
    return {bg: c for bg, c in counter.items() if c >= min_freq}


def process_topic(topic_id: int, questions: list) -> list:
    """Return sorted vocab entries for one topic."""
    topic_type = TOPIC_TYPE.get(topic_id, 'C')
    n_questions = len(questions)
    if n_questions == 0:
        return []

    # ── Per-question analysis ────────────────────────────────────────────────
    q_data = []
    for q in questions:
        sign = extract_sign(q.get('image'))
        raw_toks = [t for t in tokenize(q['text']) if is_content(t)]
        q_data.append({
            'id': q['id'],
            'sign': sign,
            'tokens': raw_toks,
            'is_falso': not q.get('answer', True),
        })

    # ── Lemmatize ─────────────────────────────────────────────────────────────
    all_raw = {t for qd in q_data for t in qd['tokens']}
    lemma_map = build_lemma_map(all_raw)
    for qd in q_data:
        qd['lemmas'] = [lemma_map.get(t, t) for t in qd['tokens']]

    # ── Frequency counts (use lemmas) ─────────────────────────────────────────
    topic_freq = Counter()
    word_to_signs = defaultdict(set)      # lemma → set of sign filenames
    word_to_qids = defaultdict(list)      # lemma → list of question ids (first occurrence)
    word_falso_count = Counter()
    word_total_count = Counter()

    for qd in q_data:
        seen_in_q = set()
        for lemma in qd['lemmas']:
            topic_freq[lemma] += 1
            if qd['sign']:
                word_to_signs[lemma].add(qd['sign'])
            if lemma not in seen_in_q:
                word_to_qids[lemma].append(qd['id'])
                word_total_count[lemma] += 1
                if qd['is_falso']:
                    word_falso_count[lemma] += 1
                seen_in_q.add(lemma)

    # ── Signs for Type A ──────────────────────────────────────────────────────
    all_signs = {qd['sign'] for qd in q_data if qd['sign']}
    n_signs = len(all_signs) or 1

    # ── Score each content lemma ───────────────────────────────────────────────
    max_freq = max(topic_freq.values()) if topic_freq else 1

    def score(lemma: str) -> float:
        tf_topic = topic_freq[lemma] / max_freq          # 0–1
        n_q_with_word = word_total_count[lemma]
        topic_coverage = n_q_with_word / n_questions      # 0–1
        # sign_specificity: high = unique to few signs
        n_w_signs = len(word_to_signs.get(lemma, set()))
        if topic_type == 'A' and n_w_signs > 0:
            sign_spec = math.log(n_signs / n_w_signs) / math.log(n_signs + 1)
        else:
            sign_spec = 0.0
        trap = word_falso_count[lemma] / (n_q_with_word or 1)
        return 0.4 * tf_topic + 0.2 * topic_coverage + 0.3 * sign_spec + 0.1 * trap

    # ── Detect bigrams ────────────────────────────────────────────────────────
    content_set = set(all_raw)
    bigrams = detect_bigrams(questions, content_set, min_freq=3)

    # Collect candidate lemmas (exclude very rare: appears only once)
    candidates = [w for w in topic_freq if topic_freq[w] >= 2]

    # Sort by score descending → take top 80
    candidates.sort(key=lambda w: score(w), reverse=True)
    top_words = candidates[:80]

    # ── Synonyms: words sharing same sign images ───────────────────────────────
    sign_to_words = defaultdict(set)
    for w, signs in word_to_signs.items():
        for s in signs:
            sign_to_words[s].add(w)

    def find_synonyms(lemma: str, top_set: set) -> list:
        signs = word_to_signs.get(lemma, set())
        if not signs:
            return []
        candidates_syn = set()
        for s in signs:
            candidates_syn |= sign_to_words[s]
        candidates_syn.discard(lemma)
        # Keep only words also in our top vocab
        return sorted(candidates_syn & top_set)[:4]

    top_set = set(top_words)

    # ── Build vocab entries ────────────────────────────────────────────────────
    entries = []
    idx = 1

    # Add bigrams first (they're high value)
    bigram_added = set()
    for bg, bg_count in sorted(bigrams.items(), key=lambda x: -x[1])[:20]:
        w1, w2 = bg.split()
        l1 = lemma_map.get(w1, w1)
        l2_lemma = lemma_map.get(w2, w2)
        lemma_phrase = f"{l1} {l2_lemma}"

        # find sign images: intersection of both words' signs
        signs1 = word_to_signs.get(l1, set())
        signs2 = word_to_signs.get(l2_lemma, set())
        bg_signs = sorted(signs1 & signs2) or sorted(signs1 | signs2)

        # example question: first question containing both words
        example_qid = None
        for qd in q_data:
            if w1 in qd['tokens'] and w2 in qd['tokens']:
                example_qid = qd['id']
                break

        is_trap = word_falso_count.get(l1, 0) + word_falso_count.get(l2_lemma, 0)
        total_bg = word_total_count.get(l1, 0) + word_total_count.get(l2_lemma, 0)
        trap_ratio = is_trap / (total_bg or 1)

        entries.append({
            'id': f"v{idx:03d}",
            'word': bg,
            'lemma': lemma_phrase,
            'translation_ru': None,
            'frequency': bg_count,
            'sign_images': bg_signs,
            'example_question_id': example_qid,
            'semantic_group': semantic_group(l1) if l1 in SEMANTIC_GROUPS.get(semantic_group(l1), set()) else semantic_group(l2_lemma),
            'synonyms': [],
            'trap_word': trap_ratio > 0.5,
            'is_phrase': True,
            'level': _assign_level(l1),
        })
        bigram_added.update([l1, l2_lemma])
        idx += 1

    # Add individual words (skip if both words of a bigram already added)
    for lemma in top_words:
        if lemma in bigram_added and topic_freq[lemma] < 5:
            continue
        sign_images = sorted(word_to_signs.get(lemma, set()))
        example_qid = word_to_qids[lemma][0] if word_to_qids[lemma] else None
        trap_ratio = word_falso_count[lemma] / (word_total_count[lemma] or 1)
        synonyms = find_synonyms(lemma, top_set)

        entries.append({
            'id': f"v{idx:03d}",
            'word': lemma,
            'lemma': lemma,
            'translation_ru': None,
            'frequency': topic_freq[lemma],
            'sign_images': sign_images,
            'example_question_id': example_qid,
            'semantic_group': semantic_group(lemma),
            'synonyms': synonyms,
            'trap_word': trap_ratio > 0.5,
            'is_phrase': False,
            'level': _assign_level(lemma),
        })
        idx += 1

    return entries


def _assign_level(lemma: str, topic_counts: dict = None) -> int:
    """Level placeholder — recalculated globally after all topics processed."""
    return 2  # default, overridden in post-processing


def compute_global_levels(all_topic_vocabs: dict) -> dict:
    """
    For each lemma, count how many topics it appears in.
    Returns lemma → level (0=universal 20+, 1=10-19, 2=3-9, 3=<3)
    """
    lemma_topic_count = Counter()
    for tid, entries in all_topic_vocabs.items():
        seen = set()
        for e in entries:
            lem = e['lemma'].split()[0]  # first word of phrase
            if lem not in seen:
                lemma_topic_count[lem] += 1
                seen.add(lem)

    def level(count):
        if count >= 20:
            return 0
        if count >= 10:
            return 1
        if count >= 3:
            return 2
        return 3

    return {lem: level(c) for lem, c in lemma_topic_count.items()}


def build_global_vocab(all_topic_vocabs: dict, lemma_levels: dict) -> list:
    """Build global_vocab.json: level-0 words (appear in 20+ topics)."""
    # Aggregate stats for level-0 words
    global_words = {lem for lem, lv in lemma_levels.items() if lv == 0}
    global_freq = Counter()
    global_signs = defaultdict(set)
    global_example = {}
    global_topics = defaultdict(set)

    for tid, entries in all_topic_vocabs.items():
        for e in entries:
            lem = e['lemma'].split()[0]
            if lem in global_words:
                global_freq[lem] += e['frequency']
                global_signs[lem].update(e['sign_images'])
                if lem not in global_example:
                    global_example[lem] = e['example_question_id']
                global_topics[lem].add(tid)

    global_entries = []
    for idx, (lem, freq) in enumerate(global_freq.most_common(), start=1):
        global_entries.append({
            'id': f"g{idx:03d}",
            'word': lem,
            'lemma': lem,
            'translation_ru': _translate(lem),
            'frequency': freq,
            'topic_count': len(global_topics[lem]),
            'example_question_id': global_example.get(lem),
            'semantic_group': semantic_group(lem),
            'level': 0,
        })

    return global_entries


def load_questions(topic_id: int) -> list:
    path = QUESTIONS_DIR / f"topic_{topic_id}.json"
    if not path.exists():
        print(f"[WARN] Missing: {path}")
        return []
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK]   {path.relative_to(ROOT)}  ({len(data)} entries)")


def main():
    print("=" * 60)
    print("generate-vocab.py — Quiz Patente NLP Vocab Generator")
    print("=" * 60)

    VOCAB_DIR.mkdir(parents=True, exist_ok=True)
    _load_cache()

    # ── Pass 1: Global Frequencies & Lemmatization ──────────────────────────
    print("[INFO] Pass 1: Global analysis...")
    global_counts = Counter()
    topic_presence = defaultdict(set)
    all_raw_tokens = set()
    
    topic_data = {}

    for topic_id in range(1, 26):
        questions = load_questions(topic_id)
        if not questions:
            continue
        
        tokens_by_q = []
        for q in questions:
            toks = tokenize(q['text'])
            content_toks = [t for t in toks if is_content(t)]
            tokens_by_q.append(content_toks)
            all_raw_tokens.update(content_toks)
        
        topic_data[topic_id] = {
            'questions': questions,
            'tokens_by_q': tokens_by_q
        }

    # Batch lemmatize all discovered tokens
    print(f"[INFO] Lemmatizing {len(all_raw_tokens)} unique tokens...")
    lemma_map = build_lemma_map(all_raw_tokens)
    
    for topic_id, data in topic_data.items():
        for q_toks in data['tokens_by_q']:
            seen_in_q = set()
            for t in q_toks:
                lemma = lemma_map.get(t, t)
                global_counts[lemma] += 1
                topic_presence[lemma].add(topic_id)
                seen_in_q.add(lemma)

    # Compute levels based on topic presence
    def get_level(count):
        if count >= 20: return 0
        if count >= 10: return 1
        if count >= 3:  return 2
        return 3

    lemma_levels = {lem: get_level(len(topics)) for lem, topics in topic_presence.items()}
    
    # ── Pass 2: Per-Topic Processing ──────────────────────────────────────────
    print("[INFO] Pass 2: Per-topic processing...")
    all_topic_vocabs = {}

    for topic_id, data in topic_data.items():
        questions = data['questions']
        print(f"\n[Topic {topic_id:02d}] type={TOPIC_TYPE.get(topic_id,'C')} "
              f"questions={len(questions)}")
        
        # We need a custom process_topic that uses our global lemma_map and levels
        entries = process_topic_v2(topic_id, questions, lemma_map, lemma_levels)
        all_topic_vocabs[topic_id] = entries
        save_json(VOCAB_DIR / f"topic_{topic_id}_vocab.json", entries)

    # ── Global vocab ──────────────────────────────────────────────────────────
    print("\n[INFO] Pass 3: Global vocab...")
    global_vocab = build_global_vocab(all_topic_vocabs, lemma_levels)
    save_json(VOCAB_DIR / "global_vocab.json", global_vocab)

    print("\n" + "=" * 60)
    print(f"Done. Files written to: src/data/vocabulary/")
    print(f"Global vocab (level-0): {len(global_vocab)} words")
    print("=" * 60)

def process_topic_v2(topic_id: int, questions: list, lemma_map: dict, lemma_levels: dict) -> list:
    """Refactored process_topic using precomputed lemmas and levels."""
    topic_type = TOPIC_TYPE.get(topic_id, 'C')
    n_questions = len(questions)
    
    q_data = []
    for q in questions:
        sign = extract_sign(q.get('image'))
        toks = [t for t in tokenize(q['text']) if is_content(t)]
        lemmas = [lemma_map.get(t, t) for t in toks]
        q_data.append({
            'id': q['id'],
            'sign': sign,
            'tokens': toks,
            'lemmas': lemmas,
            'is_falso': not q.get('answer', True),
        })

    topic_freq = Counter()
    word_to_signs = defaultdict(set)
    word_to_qids = defaultdict(list)
    word_falso_count = Counter()
    word_total_count = Counter()

    for qd in q_data:
        seen_in_q = set()
        for lemma in qd['lemmas']:
            topic_freq[lemma] += 1
            if qd['sign']:
                word_to_signs[lemma].add(qd['sign'])
            if lemma not in seen_in_q:
                word_to_qids[lemma].append(qd['id'])
                word_total_count[lemma] += 1
                if qd['is_falso']:
                    word_falso_count[lemma] += 1
                seen_in_q.add(lemma)

    all_signs = {qd['sign'] for qd in q_data if qd['sign']}
    n_signs = len(all_signs) or 1
    max_freq = max(topic_freq.values()) if topic_freq else 1

    def score(lemma: str) -> float:
        tf_topic = topic_freq[lemma] / max_freq
        n_q_with_word = word_total_count[lemma]
        topic_coverage = n_q_with_word / n_questions
        n_w_signs = len(word_to_signs.get(lemma, set()))
        
        # Penalty for universal words in per-topic view? 
        # Actually we want them to show up if they are frequent.
        if topic_type == 'A' and n_w_signs > 0:
            sign_spec = math.log(n_signs / n_w_signs) / math.log(n_signs + 1)
        else:
            sign_spec = 0.0
        
        # Boost for level 0/1 words to ensure they are available
        level_boost = 0.5 if lemma_levels.get(lemma, 3) <= 1 else 0.0
        
        trap = word_falso_count[lemma] / (n_q_with_word or 1)
        return 0.3 * tf_topic + 0.2 * topic_coverage + 0.2 * sign_spec + 0.1 * trap + 0.2 * level_boost

    content_set = {t for qd in q_data for t in qd['tokens']}
    bigrams = detect_bigrams(questions, content_set, min_freq=3)

    candidates = [w for w in topic_freq if topic_freq[w] >= 2]
    candidates.sort(key=lambda w: score(w), reverse=True)
    top_words = candidates[:100] # Increased to 100

    sign_to_words = defaultdict(set)
    for w, signs in word_to_signs.items():
        for s in signs:
            sign_to_words[s].add(w)

    top_set = set(top_words)
    entries = []
    idx = 1

    # Bigrams
    bigram_added = set()
    for bg, bg_count in sorted(bigrams.items(), key=lambda x: -x[1])[:25]:
        w1, w2 = bg.split()
        l1 = lemma_map.get(w1, w1)
        l2 = lemma_map.get(w2, w2)
        
        signs1 = word_to_signs.get(l1, set())
        signs2 = word_to_signs.get(l2, set())
        bg_signs = sorted(signs1 & signs2) or sorted(signs1 | signs2)

        example_qid = next((qd['id'] for qd in q_data if w1 in qd['tokens'] and w2 in qd['tokens']), None)
        
        is_trap = word_falso_count.get(l1, 0) + word_falso_count.get(l2, 0)
        total_bg = word_total_count.get(l1, 0) + word_total_count.get(l2, 0)
        trap_ratio = is_trap / (total_bg or 1)

        entries.append({
            'id': f"v{idx:03d}",
            'word': bg,
            'lemma': f"{l1} {l2}",
            'translation_ru': _translate(bg),
            'frequency': bg_count,
            'sign_images': bg_signs,
            'example_question_id': example_qid,
            'semantic_group': semantic_group(l1) if l1 in SEMANTIC_GROUPS.get(semantic_group(l1), set()) else semantic_group(l2),
            'synonyms': [],
            'trap_word': trap_ratio > 0.5,
            'is_phrase': True,
            'level': min(lemma_levels.get(l1, 3), lemma_levels.get(l2, 3)),
        })
        bigram_added.update([l1, l2])
        idx += 1

    # Individuals
    for lemma in top_words:
        if lemma in bigram_added and topic_freq[lemma] < 10:
            continue
        entries.append({
            'id': f"v{idx:03d}",
            'word': lemma,
            'lemma': lemma,
            'translation_ru': _translate(lemma),
            'frequency': topic_freq[lemma],
            'sign_images': sorted(word_to_signs.get(lemma, set())),
            'example_question_id': word_to_qids[lemma][0] if word_to_qids[lemma] else None,
            'semantic_group': semantic_group(lemma),
            'synonyms': sorted((sign_to_words[s] for s in word_to_signs.get(lemma, set())), key=lambda x: len(x)), # Simplified
            'trap_word': (word_falso_count[lemma] / (word_total_count[lemma] or 1)) > 0.5,
            'is_phrase': False,
            'level': lemma_levels.get(lemma, 3),
        })
        # Fix synonyms logic to be serializable
        entries[-1]['synonyms'] = sorted((set().union(*(sign_to_words[s] for s in word_to_signs.get(lemma, set()))) & top_set) - {lemma})[:4]
        idx += 1

    return entries

if __name__ == "__main__":
    main()
