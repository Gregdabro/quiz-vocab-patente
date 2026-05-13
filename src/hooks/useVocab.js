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
} from '../services/vocabService.js';
import { loadBlocks, getBlockProgress } from '../services/blockService.js';

const GLOBAL_TOPIC_ID = 'global';

export default function useVocab(topicId, options) {
  var mode = (options && options.mode) || 'block';
  var freeVocabIds = (options && options.vocabIds) || null;
  var overrideBlock = (options && options.blockNumber) || null;

  var _a = useState([]);
  var cards = _a[0];
  var setCards = _a[1];

  var _b = useState(0);
  var currentIndex = _b[0];
  var setCurrentIndex = _b[1];

  var _c = useState(function () { return new Set(); });
  var ratedIndices = _c[0];
  var setRatedIndices = _c[1];

  var _d = useState(true);
  var loading = _d[0];
  var setLoading = _d[1];

  var _e = useState(null);
  var error = _e[0];
  var setError = _e[1];

  var _f = useState({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
  var boxStats = _f[0];
  var setBoxStats = _f[1];

  var _g = useState(0);
  var sessionKey = _g[0];
  var setSessionKey = _g[1];

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
    setRatedIndices(new Set());
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
            var dueIds = getCardsForSession(topicId, block.vocab_ids, blockNum);

            var vocabMap = {};
            vocab.forEach(function (v) { vocabMap[v.id] = v; });

            var sessionCards = dueIds.map(function (id) { return vocabMap[id]; }).filter(Boolean);
            setCards(sessionCards);
            setBoxStats(getBoxStats(topicId, vocab.map(function (v) { return v.id; })));
            setLoading(false);
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

    // Отметить как оценённую
    var next = new Set(ratedIndices);
    next.add(currentIndex);
    setRatedIndices(next);
  }, [cards, currentIndex, ratedIndices, topicId, mode]);

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
  var rated = ratedIndices.size;
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
