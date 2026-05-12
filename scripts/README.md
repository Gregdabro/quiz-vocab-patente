# Quiz Patente — Python NLP Scripts

Офлайн-генераторы статических JSON-данных.  
Запускаются **один раз**. Результат — статические файлы в `src/data/`.

## Требования

Python 3.11+

```bash
cd scripts/
pip install -r requirements.txt
python -m spacy download it_core_news_sm
```

> **Если spaCy недоступна** — скрипты работают в fallback-режиме (без лемматизации).  
> Качество vocab будет немного ниже, но структура корректна.

## Порядок запуска

```bash
# Шаг 1: Сгенерировать словари (vocab) для всех 25 тем
python3 scripts/generate-vocab.py

# Шаг 2: Сгенерировать блоки на основе vocab
python3 scripts/generate-blocks.py
```

### generate-vocab.py

**Входные данные:** `src/data/questions/topic_N.json` (25 файлов)  
**Выходные данные:**
- `src/data/vocabulary/topic_N_vocab.json` — словарь для каждой темы (×25)
- `src/data/vocabulary/global_vocab.json` — 22+ универсальных слова (Уровень 0)

**NLP pipeline:**
1. Lowercase + Unicode NFC нормализация
2. Regex-токенизация: `[a-zàáèéìíòóùú']+`
3. Лемматизация: spaCy `it_core_news_sm`
4. Двухуровневая фильтрация стоп-слов (L1 грамматические, L2 квази-стопы)
5. Гибридный скоринг: `0.4×TF_topic + 0.2×coverage + 0.3×sign_specificity + 0.1×trap_bonus`
6. Детекция биграм (частые словосочетания ≥3 раз)
7. Семантическая группировка (rule-based)

### generate-blocks.py

**Входные данные:** `topic_N.json` + `topic_N_vocab.json`  
**Выходные данные:** `src/data/blocks/topic_N_blocks.json` (×25)

**Стратегии по типу темы:**

| Тип | Темы | Стратегия |
|-----|------|-----------|
| A (знаковые) | 2–10 | Группировка по знаку → граф networkx → жадный алгоритм → interleaving |
| B (смешанные) | 13, 14, 17, 18 | С картинкой → Type A; без картинки → Type C |
| C (правила) | 1, 11, 12, 15–16, 19–25 | Фраза-шаблоны + числовой экстрактор (темы 11, 12, 20) |

## Структура выходных файлов

### topic_N_vocab.json

```json
[
  {
    "id": "v001",
    "word": "strada deformata",
    "lemma": "strada deformato",
    "translation_ru": null,
    "frequency": 7,
    "sign_images": ["001.jpg"],
    "example_question_id": 531,
    "semantic_group": "geometria_strada",
    "synonyms": ["pavimentazione", "irregolare"],
    "trap_word": false,
    "is_phrase": true,
    "level": 2
  }
]
```

**Уровни (`level`):**
- `0` — универсальный (встречается в 20+ темах)
- `1` — частый (10–19 тем)
- `2` — тематический (3–9 тем)
- `3` — редкий/технический (<3 тем)

**Примечание:** `translation_ru: null` — переводы добавляются вручную.

### topic_N_blocks.json

```json
[
  {
    "block_id": 1,
    "topic_id": 2,
    "topic_type": "A",
    "sign_images": ["001.jpg", "002.jpg"],
    "question_ids": [531, 532, 534, 560, 561, 562],
    "vocab_ids": ["v001", "v003", "v007"],
    "new_vocab_ids": ["v001", "v003"],
    "overlap_score": 0.52,
    "template_phrases": [],
    "number_rules": []
  }
]
```

## Обновление данных

Если вопросы обновились:

```bash
python3 scripts/generate-vocab.py
python3 scripts/generate-blocks.py
```

Скрипты идемпотентны — перезаписывают файлы без побочных эффектов.

## Добавление переводов (translation_ru)

После генерации можно добавить переводы вручную напрямую в JSON или через патч-скрипт (Фаза 4).

Поле `translation_ru: null` — корректное состояние для frontend: компонент VocabCard обработает `null` через graceful fallback.
