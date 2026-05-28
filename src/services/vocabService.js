/**
 * vocabService.js
 * Leitner-4 система интервального повторения для vocab-карточек.
 *
 * localStorage key: qp_vocab
 *
 * Схема qp_vocab:
 * {
 *   "{topicId}_{vocabId}": { box, seen, last_seen_block }
 * }
 *
 * Ключи составные ({topicId}_{vocabId}), т.к. vocab ID (v001…v125) не уникальны
 * глобально — Python-скрипт генерировал их независимо для каждой темы.
 *
 * Leitner интервалы (в блоках):
 *   Ящик 0 (новые)   → показывать всегда (интервал 0)
 *   Ящик 1 (видел)   → интервал 1 блок
 *   Ящик 2 (знаю)    → интервал 3 блока
 *   Ящик 3 (уверен)  → интервал 7 блоков
 *   Ящик 4 (освоено) → интервал 30 блоков
 *
 * Оценка карточки:
 *   'know'      → box + 1 (max 4)
 *   'hard'      → box не меняется
 *   'dontknow'  → box - 1 (min 0)
 */

const STORAGE_KEY = 'qp_vocab';

const vocabCache = import.meta.glob('../data/vocabulary/topic_*_vocab.json');
const globalVocabCache = import.meta.glob('../data/vocabulary/global_vocab.json');

// Интервал показа в блоках для каждого ящика (индекс = номер ящика)
const LEITNER_INTERVALS = [0, 1, 3, 7, 30];

const MAX_BOX = 4;

// ---------------------------------------------------------------------------
// Внутренние хелперы
// ---------------------------------------------------------------------------

/**
 * Составной ключ карточки в localStorage.
 * @param {number|string} topicId
 * @param {string} vocabId
 * @returns {string}
 */
function _cardKey(topicId, vocabId) {
  return String(topicId) + '_' + vocabId;
}

/**
 * Сохранить объект прогресса в localStorage.
 * @param {Object} progress
 */
function _save(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('vocabService: не удалось сохранить прогресс', e);
  }
}

// ---------------------------------------------------------------------------
// Публичные функции
// ---------------------------------------------------------------------------

/**
 * Получить весь vocab-прогресс из localStorage.
 * @returns {Object}
 */
export function getVocabProgress() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Получить состояние конкретной карточки.
 * @param {number|string} topicId
 * @param {string} vocabId
 * @returns {{ box: number, seen: number, last_seen_block: number|null }}
 */
export function getCardState(topicId, vocabId) {
  var progress = getVocabProgress();
  var key = _cardKey(topicId, vocabId);
  return progress[key] || { box: 0, seen: 0, last_seen_block: null };
}

/**
 * Проверить, нужно ли показывать карточку в текущем блоке.
 * Box 0 и карточки без last_seen_block показываются всегда.
 * @param {number|string} topicId
 * @param {string} vocabId
 * @param {number} currentBlock — номер текущего блока темы (1-based)
 * @returns {boolean}
 */
export function isCardDue(topicId, vocabId, currentBlock) {
  var state = getCardState(topicId, vocabId);
  if (state.last_seen_block === null) return true;
  var interval = LEITNER_INTERVALS[state.box] !== undefined
    ? LEITNER_INTERVALS[state.box]
    : 0;
  return (currentBlock - state.last_seen_block) >= interval;
}

/**
 * Сохранить результат оценки карточки и обновить ящик Leitner.
 * @param {number|string} topicId
 * @param {string} vocabId
 * @param {'know'|'hard'|'dontknow'} rating
 * @param {number} currentBlock — номер блока в котором показывалась карточка
 */
export function saveCardResult(topicId, vocabId, rating, currentBlock) {
  var progress = getVocabProgress();
  var key = _cardKey(topicId, vocabId);
  var state = progress[key] || { box: 0, seen: 0, last_seen_block: null };

  var newBox = state.box;
  if (rating === 'know') {
    newBox = Math.min(state.box + 1, MAX_BOX);
  } else if (rating === 'dontknow') {
    newBox = Math.max(state.box - 1, 0);
  }
  // 'hard' → ящик не меняется

  progress[key] = {
    box: newBox,
    seen: state.seen + 1,
    last_seen_block: currentBlock,
  };

  _save(progress);
}

/**
 * Получить список vocab ID, которые нужно показать в текущей сессии.
 * Фильтрует переданный список по принципу Leitner due.
 * @param {number|string} topicId
 * @param {string[]} vocabIds — все vocab_ids блока (или new_vocab_ids)
 * @param {number} currentBlock
 * @returns {string[]}
 */
export function getCardsForSession(topicId, vocabIds, currentBlock) {
  return vocabIds.filter(function (id) {
    return isCardDue(topicId, id, currentBlock);
  });
}

/**
 * Получить распределение карточек темы по ящикам Leitner.
 * Используется для статистики и индикаторов прогресса.
 * @param {number|string} topicId
 * @param {string[]} vocabIds — все vocab_ids темы
 * @returns {{ 0: number, 1: number, 2: number, 3: number, 4: number }}
 */
export function getBoxStats(topicId, vocabIds) {
  var stats = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  var progress = getVocabProgress();
  for (var i = 0; i < vocabIds.length; i++) {
    var key = _cardKey(topicId, vocabIds[i]);
    var state = progress[key] || { box: 0 };
    var box = String(state.box);
    stats[box] = (stats[box] || 0) + 1;
  }
  return stats;
}

/**
 * Получить процент карточек темы в ящиках 2+ (метрика retention).
 * @param {number|string} topicId
 * @param {string[]} vocabIds
 * @returns {number} 0–100
 */
export function getRetentionRate(topicId, vocabIds) {
  if (!vocabIds.length) return 0;
  var progress = getVocabProgress();
  var retained = 0;
  for (var i = 0; i < vocabIds.length; i++) {
    var key = _cardKey(topicId, vocabIds[i]);
    var state = progress[key] || { box: 0 };
    if (state.box >= 2) retained++;
  }
  return Math.round((retained / vocabIds.length) * 100);
}

/**
 * Очистить весь vocab-прогресс.
 */
export function clearVocab() {
  localStorage.removeItem(STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Cross-topic vocab tracking (лемматизация + Leitner-прогресс по всем темам)
// ---------------------------------------------------------------------------

var _lemmaTopicMap = null;

/**
 * Загрузить lemma → {topicId: vocabId} маппинг (лениво).
 * @returns {Promise<Object>}
 */
function _loadLemmaMap() {
  if (_lemmaTopicMap) return Promise.resolve(_lemmaTopicMap);
  return import('../data/lemma_topic_map.json').then(function (m) {
    _lemmaTopicMap = m.default || m;
    return _lemmaTopicMap;
  }).catch(function () {
    return {};
  });
}

/**
 * Проверить, освоено ли слово (box ≥ 3) в других темах.
 * Освоенные слова фильтруются чтобы не повторять изученное.
 * @param {string} lemma — лемма слова (первое слово фразы)
 * @param {number|string} currentTopicId
 * @param {Object} lemmaMap — предзагруженный маппинг
 * @returns {boolean}
 */
function _isMasteredElsewhere(lemma, currentTopicId, lemmaMap, progress) {
  var topics = lemmaMap[lemma];
  if (!topics) return false;
  var keys = Object.keys(topics);
  for (var i = 0; i < keys.length; i++) {
    var tid = keys[i];
    if (String(tid) === String(currentTopicId)) continue;
    var vocabId = topics[tid];
    var key = String(tid) + '_' + vocabId;
    var state = progress[key];
    if (state && state.box >= 3) return true;
  }
  return false;
}

/**
 * Отфильтровать карточки — убрать слова, освоенные в других темах.
 * Возвращает { filtered: [...], removedCount: number, allMastered: boolean }
 * @param {number|string} topicId
 * @param {Array} cards — массив vocab-карточек
 * @returns {Promise<Object>}
 */
export function filterMasteredWords(topicId, cards) {
  if (!cards || !cards.length) return Promise.resolve({ filtered: cards, removedCount: 0, allMastered: false });

  return _loadLemmaMap().then(function (lemmaMap) {
    var progress = getVocabProgress();
    var filtered = [];
    var removedCount = 0;

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      // Number cards always go through
      if (card.isNumberCard) {
        filtered.push(card);
        continue;
      }
      var lemma = card.lemma || card.word || '';
      if (_isMasteredElsewhere(lemma, topicId, lemmaMap, progress)) {
        removedCount++;
      } else {
        filtered.push(card);
      }
    }

    return {
      filtered: filtered,
      removedCount: removedCount,
      allMastered: filtered.length === 0 && removedCount > 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Онбординг — нулевой урок (22 универсальных слова)
// ---------------------------------------------------------------------------

const ONBOARDING_KEY = 'qp_onboarding_done';

/**
 * Проверить, пройден ли нулевой урок.
 * @returns {boolean}
 */
export function isOnboardingDone() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * Отметить нулевой урок как пройденный.
 */
export function completeOnboarding() {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch (e) {
    console.error('vocabService: не удалось сохранить флаг онбординга', e);
  }
}

// ---------------------------------------------------------------------------
// Загрузка статических JSON-файлов
// ---------------------------------------------------------------------------

/**
 * Загрузить словарь для конкретной темы из src/data/vocabulary/.
 * Использует import.meta.glob — Vite статически включает все matching файлы в сборку.
 * @param {number|string} topicId
 * @returns {Promise<Array>}
 */
export function loadTopicVocab(topicId) {
  var path = '../data/vocabulary/topic_' + topicId + '_vocab.json';
  if (!vocabCache[path]) {
    return Promise.resolve([]);
  }
  return vocabCache[path]().then(function (module) {
    return module.default;
  }).catch(function (e) {
    console.error('vocabService: не удалось загрузить словарь для темы ' + topicId, e);
    return [];
  });
}

/**
 * Загрузить глобальный словарь (22 универсальных слова, Уровень 0).
 * @returns {Promise<Array>}
 */
export function loadGlobalVocab() {
  var path = '../data/vocabulary/global_vocab.json';
  return globalVocabCache[path]().then(function (module) {
    return module.default;
  }).catch(function (e) {
    console.error('vocabService: не удалось загрузить глобальный словарь', e);
    return [];
  });
}
