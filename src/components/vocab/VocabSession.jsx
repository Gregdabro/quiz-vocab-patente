/**
 * VocabSession.jsx
 * Компонент полного цикла vocab-сессии: загрузка → карточки → завершение.
 *
 * Принимает все значения от useVocab() хука.
 *
 * Состояния:
 *   - loading:  спиннер
 *   - error:    сообщение об ошибке
 *   - empty:    «Все слова изучены» (total === 0)
 *   - active:   карточка + прогресс + счётчик
 *   - finished: сводка (распределение по ящикам Leitner)
 *
 * Props (контракт useVocab):
 *   cards, currentCard, currentIndex, total, rated,
 *   rate, goTo, isFinished, reset, boxStats, loading, error
 */

import { useState, useEffect, useCallback } from 'react';
import VocabCard from './VocabCard.jsx';
import VocabProgress from './VocabProgress.jsx';
import Spinner from '../ui/Spinner.jsx';

var BOX_LABELS = {
  '0': 'Новые',
  '1': 'Видел',
  '2': 'Знаю',
  '3': 'Уверен',
  '4': 'Освоено',
};

var BOX_COLORS = {
  '0': '#9ca3af',
  '1': '#f59e0b',
  '2': '#3b82f6',
  '3': '#22c55e',
  '4': '#15803d',
};

export default function VocabSession(_a) {
  var cards = _a.cards;
  var currentCard = _a.currentCard;
  var currentIndex = _a.currentIndex;
  var total = _a.total;
  var rate = _a.rate;
  var goTo = _a.goTo;
  var isFinished = _a.isFinished;
  var reset = _a.reset;
  var boxStats = _a.boxStats;
  var loading = _a.loading;
  var error = _a.error;

  // Локальный трекинг рейтингов: { [cardId]: 'know' | 'hard' | 'dontknow' }
  var _b = useState({});
  var ratings = _b[0];
  var setRatings = _b[1];

  // Сброс локальных рейтингов при (пере)загрузке сессии
  // useVocab устанавливает loading=true при старте/рестарте загрузки
  useEffect(function () {
    if (loading) {
      setRatings({});
    }
  }, [loading]);

  // Построить Set рейтингнутых индексов для VocabProgress
  var ratedIndices = new Set();
  for (var i = 0; i < cards.length; i++) {
    if (ratings[cards[i].id] !== undefined) {
      ratedIndices.add(i);
    }
  }

  /**
   * Оценить текущую карточку и перейти к следующей.
   */
  var handleRate = useCallback(function (rating) {
    if (!currentCard) return;

    // Сохранить локально
    setRatings(function (prev) {
      var next = {};
      var key;
      for (key in prev) {
        if (prev.hasOwnProperty(key)) next[key] = prev[key];
      }
      next[currentCard.id] = rating;
      return next;
    });

    // Сохранить в localStorage через хук
    rate(rating);

    // Автопереход к следующей неоценённой
    autoAdvance(cards, currentIndex, ratings, goTo, currentCard.id, rating);
  }, [currentCard, rate, cards, currentIndex, ratings, goTo]);

  // Состояние: загрузка
  if (loading) {
    return (
      <div className="vocab-session vocab-session--loading">
        <Spinner />
        <p className="vocab-session__status-text">Загружаем слова...</p>
      </div>
    );
  }

  // Состояние: ошибка
  if (error) {
    return (
      <div className="vocab-session vocab-session--error">
        <p className="vocab-session__error-text">{error}</p>
      </div>
    );
  }

  // Состояние: нет карточек
  if (total === 0) {
    return (
      <div className="vocab-session vocab-session--empty">
        <div className="vocab-session__empty-icon">✓</div>
        <h3 className="vocab-session__empty-title">Все слова изучены</h3>
        <p className="vocab-session__empty-text">
          В этом блоке нет новых или требующих повторения слов.
          Можно переходить к тесту.
        </p>
      </div>
    );
  }

  // Состояние: сессия завершена
  if (isFinished) {
    return (
      <div className="vocab-session vocab-session--complete">
        <div className="vocab-complete">
          <h3 className="vocab-complete__title">Сессия завершена</h3>
          <p className="vocab-complete__subtitle">
            Оценено {Object.keys(ratings).length} из {total} карточек
          </p>

          <div className="vocab-complete__boxes">
            {Object.keys(BOX_LABELS).map(function (boxNum) {
              var count = (boxStats && boxStats[boxNum]) || 0;
              var pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={boxNum} className="vocab-complete__box-row">
                  <div className="vocab-complete__box-header">
                    <span
                      className="vocab-complete__box-dot"
                      style={{ backgroundColor: BOX_COLORS[boxNum] }}
                    />
                    <span className="vocab-complete__box-label">
                      {BOX_LABELS[boxNum]}
                    </span>
                    <span className="vocab-complete__box-count">{count}</span>
                  </div>
                  <div className="vocab-complete__box-bar">
                    <div
                      className="vocab-complete__box-fill"
                      style={{
                        width: pct + '%',
                        backgroundColor: BOX_COLORS[boxNum],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button className="btn btn-primary" onClick={reset}>
            Повторить
          </button>
        </div>
      </div>
    );
  }

  // Состояние: активная сессия
  return (
    <div className="vocab-session vocab-session--active">
      <VocabProgress
        total={total}
        currentIndex={currentIndex}
        ratedIndices={ratedIndices}
        onGoTo={goTo}
      />

      <div className="vocab-session__counter">
        {currentIndex + 1} из {total}
      </div>

      {currentCard && (
        <VocabCard
          key={currentCard.id}
          card={currentCard}
          onRate={handleRate}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Автопереход к следующей неоценённой карточке
// ---------------------------------------------------------------------------

function autoAdvance(cards, currentIndex, ratings, goTo, justRatedId, rating) {
  // Объединяем существующие рейтинги с только что поставленным
  var allRated = {};
  var key;
  for (key in ratings) {
    if (ratings.hasOwnProperty(key)) allRated[key] = ratings[key];
  }
  allRated[justRatedId] = rating;

  // Ищем следующую неоценённую после текущей
  for (var i = currentIndex + 1; i < cards.length; i++) {
    if (allRated[cards[i].id] === undefined) {
      goTo(i);
      return;
    }
  }
  // Если все после оценены — ищем с начала
  for (var j = 0; j < currentIndex; j++) {
    if (allRated[cards[j].id] === undefined) {
      goTo(j);
      return;
    }
  }
  // Все оценены — isFinished станет true при следующем рендере
}
