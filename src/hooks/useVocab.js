/**
 * useVocab.js
 * Хук управления vocab-сессией: загрузка слов, Leitner-фильтрация,
 * показ карточек, сохранение оценок.
 *
 * Режимы:
 *   'block'  (default) — карточки текущего блока темы
 *   'global' — нулевой урок (22 универсальных слова)
 *   'free'   — произвольный набор слов (для DictionaryPage)
 *
 * Контракт:
 * { cards, currentCard, currentIndex, total, rated, rate, goTo, isFinished, reset, boxStats, loading, error }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadTopicVocab,
  loadGlobalVocab,
  getCardsForSession,
  saveCardResult,
  getBoxStats,
  filterMasteredWords,
  getCardState,
  isCardDue,
} from '../services/vocabService.js';
import { loadBlocks, getBlockProgress } from '../services/blockService.js';

const GLOBAL_TOPIC_ID = 'global';

/**
 * Преобразует number_rules из блока в карточки-шаблоны.
 * Контекст с пропуском числа: «Il limite è di ___ km/h»
 */
function buildNumberCards(numberRules) {
  return numberRules.map(function (rule, idx) {
    var context = rule.context || '';
    var value = rule.value || '';
    // Заменяем число в контексте на ___
    var blanked = context.replace(value, '___');
    // Если замена не сработала (число в другом формате), ставим ___ в конец
    if (blanked === context) {
      blanked = context + ' ___';
    }
    return {
      id: 'n' + (idx + 1),
      word: blanked,
      lemma: blanked,
      translation_ru: value,
      frequency: 1,
      sign_images: [],
      example_question_id: rule.question_id || null,
      semantic_group: 'numeri_regole',
      synonyms: [],
      trap_word: false,
      is_phrase: true,
      isNumberCard: true,
      level: 2,
    };
  });
}

export default function useVocab(topicId, options) {
  var mode = (options && options.mode) || 'block';
  var freeVocabIds = (options && options.vocabIds) || null;
  var overrideBlock = (options && options.blockNumber) || null;

  var [cards, setCards] = useState([]);
  var [currentIndex, setCurrentIndex] = useState(0);
  var ratedIndicesRef = useRef(new Set());
  var [ratedCount, setRatedCount] = useState(0);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [boxStats, setBoxStats] = useState({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
  var [sessionKey, setSessionKey] = useState(0);

  var currentBlockRef = useRef(1);

  // ---------------------------------------------------------------------------
  // Загрузка данных сессии
  // ---------------------------------------------------------------------------

  useEffect(function () {
    var cancelled = false;

    setLoading(true);
    setError(null);
    setCards([]);
    setCurrentIndex(0);
    ratedIndicesRef.current = new Set();
    setRatedCount(0);
    setBoxStats({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });

    function resolve() {
      try {
        if (mode === 'global') {
          return loadGlobalVocab().then(function (vocab) {
            if (cancelled) return;
            var allIds = vocab.map(function (v) { return v.id; });
            var dueIds = getCardsForSession(GLOBAL_TOPIC_ID, allIds, 0);
            var sessionCards = vocab.filter(function (v) {
              return dueIds.indexOf(v.id) !== -1;
            });
            setCards(sessionCards);
            setBoxStats(getBoxStats(GLOBAL_TOPIC_ID, allIds));
            setLoading(false);
          });
        }

        if (mode === 'free') {
          // null = ещё не готово (ждём загрузки vocabData)
          if (freeVocabIds === null) {
            setLoading(true);
            return Promise.resolve();
          }
          var ids = freeVocabIds || [];
          if (!ids.length) {
            setCards([]);
            setLoading(false);
            return Promise.resolve();
          }
          return loadTopicVocab(topicId).then(function (vocab) {
            if (cancelled) return;
            var vocabMap = {};
            vocab.forEach(function (v) { vocabMap[v.id] = v; });
            var sessionCards = ids.map(function (id) { return vocabMap[id]; }).filter(Boolean);
            setCards(sessionCards);
            setBoxStats(getBoxStats(topicId, vocab.map(function (v) { return v.id; })));
            setLoading(false);
          });
        }

        // mode === 'block'
        return loadBlocks(topicId).then(function (blocks) {
          if (cancelled) return;
          if (!blocks || !blocks.length) {
            setCards([]);
            setLoading(false);
            return;
          }

          var progress = getBlockProgress(topicId);
          var blockNum = overrideBlock || progress.current_block;
          currentBlockRef.current = blockNum;

          var block = null;
          for (var i = 0; i < blocks.length; i++) {
            if (blocks[i].block_id === blockNum) { block = blocks[i]; break; }
          }
          if (!block) { block = blocks[0]; }

          return loadTopicVocab(topicId).then(function (vocab) {
            if (cancelled) return;
            // New words for this block (limited to new_vocab_ids)
            var newIds = block.new_vocab_ids || block.vocab_ids;
            var newDueIds = getCardsForSession(topicId, newIds, blockNum);
            // Review candidates: already-seen cards from full vocab that are due
            var reviewIds = [];
            for (var j = 0; j < block.vocab_ids.length; j++) {
              var vid = block.vocab_ids[j];
              if (newIds.indexOf(vid) === -1) {
                var state = getCardState(topicId, vid);
                if (state.last_seen_block !== null && isCardDue(topicId, vid, blockNum)) {
                  reviewIds.push(vid);
                }
              }
            }
            var dueIds = newDueIds.concat(reviewIds);

            var vocabMap = {};
            vocab.forEach(function (v) { vocabMap[v.id] = v; });

            var sessionCards = dueIds.map(function (id) { return vocabMap[id]; }).filter(Boolean);

            // Number cards for Type C topics (number_rules из блока)
            if (block.number_rules && block.number_rules.length > 0) {
              var numberCards = buildNumberCards(block.number_rules);
              sessionCards = numberCards.concat(sessionCards);
            }

            // Cross-topic filtering: убрать слова, освоенные в других темах
            return filterMasteredWords(topicId, sessionCards).then(function (result) {
              if (cancelled) return;
              setCards(result.filtered);
              setBoxStats(getBoxStats(topicId, vocab.map(function (v) { return v.id; })));
              setLoading(false);
            });
          });
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Ошибка загрузки слов');
          setLoading(false);
        }
      }
    }

    resolve().catch(function (err) {
      if (!cancelled) {
        setError(err.message || 'Ошибка загрузки слов');
        setLoading(false);
      }
    });

    return function () { cancelled = true; };
  }, [topicId, mode, freeVocabIds, overrideBlock, sessionKey]);

  // ---------------------------------------------------------------------------
  // Действия
  // ---------------------------------------------------------------------------

  /**
   * Оценить текущую карточку.
   * @param {'know'|'hard'|'dontknow'} rating
   */
  var rate = useCallback(function (rating) {
    var card = cards[currentIndex];
    if (!card) return;

    // Сохранить результат в Leitner
    saveCardResult(
      mode === 'global' ? GLOBAL_TOPIC_ID : topicId,
      card.id,
      rating,
      currentBlockRef.current
    );

    // Отметить как оценённую (ref не триггерит пересоздание callback)
    var next = new Set(ratedIndicesRef.current);
    next.add(currentIndex);
    ratedIndicesRef.current = next;
    setRatedCount(next.size);
  }, [cards, currentIndex, topicId, mode]);

  /**
   * Перейти к карточке по индексу.
   * @param {number} index
   */
  var goTo = useCallback(function (index) {
    if (index >= 0 && index < cards.length) {
      setCurrentIndex(index);
    }
  }, [cards.length]);

  /**
   * Перезапустить сессию.
   */
  var reset = useCallback(function () {
    setSessionKey(function (prev) { return prev + 1; });
  }, []);

  // ---------------------------------------------------------------------------
  // Производные значения
  // ---------------------------------------------------------------------------

  var currentCard = cards[currentIndex] || null;
  var total = cards.length;
  var rated = ratedCount;
  var isFinished = total === 0 || rated >= total;

  return {
    cards: cards,
    currentCard: currentCard,
    currentIndex: currentIndex,
    total: total,
    rated: rated,
    rate: rate,
    goTo: goTo,
    isFinished: isFinished,
    reset: reset,
    boxStats: boxStats,
    loading: loading,
    error: error,
  };
}
