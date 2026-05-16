/**
 * VocabCard.jsx
 * Флэш-карточка слова/фразы для vocab-сессии.
 *
 * Errorful generation: перевод изначально скрыт — студент пытается
 * вспомнить его сам, затем открывает кнопкой «Показать перевод».
 *
 * Два режима:
 *   - image-first (тип A): если card.sign_images не пуст — изображение знака сверху
 *   - phrase-first (тип C): если нет изображения — текстовая карточка
 *
 * Кнопки оценки: [Знаю] [Сложно] [Не знаю] — появляются после раскрытия перевода.
 * После оценки показывает обратную связь и блокирует кнопки.
 *
 * Props:
 *   card    — объект vocab-записи из topic_N_vocab.json
 *   onRate  — fn('know' | 'hard' | 'dontknow')
 */

import { useState, useEffect } from 'react';
import { loadQuestionText } from '../../services/questionsService.js';

var SIGN_IMAGE_BASE =
  'https://quizpatentelng.s3.eu-central-1.amazonaws.com/imgquiz/';

export default function VocabCard(_a) {
  var card = _a.card;
  var topicId = _a.topicId;
  var onRate = _a.onRate;

  var _b = useState(null);
  var rated = _b[0];
  var setRated = _b[1];

  var _c = useState(false);
  var revealed = _c[0];
  var setRevealed = _c[1];

  var _d = useState(null);
  var exampleText = _d[0];
  var setExampleText = _d[1];

  // Сброс состояния при смене карточки + загрузка примера из вопроса
  useEffect(function () {
    setRated(null);
    setRevealed(false);
    setExampleText(null);

    if (card && card.example_question_id && topicId) {
      var cancelled = false;
      loadQuestionText(topicId, card.example_question_id).then(function (text) {
        if (!cancelled) setExampleText(text);
      });
      return function () { cancelled = true; };
    }
  }, [card && card.id, topicId]);

  if (!card) return null;

  var hasImage = card.sign_images && card.sign_images.length > 0;
  var hasSynonyms = card.synonyms && card.synonyms.length > 0;
  var isPhrase = card.is_phrase === true;
  var isTrap = card.trap_word === true;
  var disabled = rated !== null;

  var signImageUrl = hasImage
    ? SIGN_IMAGE_BASE + card.sign_images[0]
    : null;

  var cardClass = 'vocab-card';
  if (rated) {
    cardClass += ' vocab-card--rated vocab-card--' + rated;
  }

  function handleRate(rating) {
    if (disabled) return;
    setRated(rating);
    if (onRate) onRate(rating);
  }

  return (
    <div className={cardClass}>
      {/* Изображение знака (Тип A — image-first) */}
      {signImageUrl && (
        <div className="vocab-card__image-container">
          <img
            className="vocab-card__image"
            src={signImageUrl}
            alt=""
            loading="lazy"
          />
        </div>
      )}

      <div className="vocab-card__body">
        {/* Метка типа карточки */}
        {isPhrase && (
          <span className="vocab-card__type-badge">Выражение</span>
        )}

        {/* Основное слово/фраза на итальянском */}
        <h2 className="vocab-card__word">{card.word}</h2>

        {/* Перевод — скрыт до нажатия «Показать перевод» (errorful generation) */}
        {revealed && card.translation_ru && (
          <p className="vocab-card__translation">{card.translation_ru}</p>
        )}

        {/* Пример из реального вопроса */}
        {revealed && exampleText && (
          <blockquote className="vocab-card__example">
            <p className="vocab-card__example-text">{exampleText}</p>
          </blockquote>
        )}

        {/* Кнопка раскрытия перевода */}
        {!revealed && card.translation_ru && (
          <button
            className="vocab-card__reveal-btn"
            onClick={function () { setRevealed(true); }}
          >
            Показать перевод
          </button>
        )}

        {/* Семантическая группа */}
        {card.semantic_group && card.semantic_group !== 'generale' && (
          <span className="vocab-card__group">{card.semantic_group}</span>
        )}

        {/* Ловушка — слово, которое часто путают */}
        {isTrap && !hasSynonyms && (
          <div className="vocab-card__trap-notice">
            Внимание: легко перепутать
          </div>
        )}

        {/* Синонимы / альтернативные формулировки */}
        {hasSynonyms && (
          <div className="vocab-card__synonyms">
            <span className="vocab-card__synonyms-label">
              Также в вопросах:
            </span>
            {card.synonyms.map(function (syn, i) {
              return (
                <span key={i} className="vocab-card__synonym-item">
                  {syn}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Кнопки оценки — после раскрытия перевода, или сразу если перевода нет */}
      {(revealed || !card.translation_ru) && (
        <div className="vocab-card__actions">
          <button
            className={
              'vocab-card__rate-btn vocab-card__rate-btn--dontknow' +
              (rated === 'dontknow' ? ' vocab-card__rate-btn--active' : '')
            }
            onClick={function () { handleRate('dontknow'); }}
            disabled={disabled}
          >
            Не знаю
          </button>

          <button
            className={
              'vocab-card__rate-btn vocab-card__rate-btn--hard' +
              (rated === 'hard' ? ' vocab-card__rate-btn--active' : '')
            }
            onClick={function () { handleRate('hard'); }}
            disabled={disabled}
          >
            Сложно
          </button>

          <button
            className={
              'vocab-card__rate-btn vocab-card__rate-btn--know' +
              (rated === 'know' ? ' vocab-card__rate-btn--active' : '')
            }
            onClick={function () { handleRate('know'); }}
            disabled={disabled}
          >
            Знаю
          </button>
        </div>
      )}

      {/* Обратная связь после оценки */}
      {rated && (
        <div className={'vocab-card__feedback vocab-card__feedback--' + rated}>
          {rated === 'know' && 'Отлично! Карточка переходит в следующий ящик'}
          {rated === 'hard' && 'Повторим позже'}
          {rated === 'dontknow' && 'Возвращается в ящик 0 для повторения'}
        </div>
      )}
    </div>
  );
}
