import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useBlocks from '../hooks/useBlocks';
import useTopics from '../hooks/useTopics';
import useVocab from '../hooks/useVocab';
import { navigateToBlock } from '../services/blockService';
import { SIGN_IMAGE_BASE } from '../constants.js';
import Spinner from '../components/ui/Spinner';
import AppHeader from '../components/layout/AppHeader';
import VocabSession from '../components/vocab/VocabSession';

var TOPIC_TYPE_LABELS = { A: 'Знаки', B: 'Смешанная', C: 'Правила' };
var TOPIC_TYPE_COLORS = { A: '#2563eb', B: '#7c3aed', C: '#059669' };

/**
 * BlockSelectPage — список блоков внутри темы.
 * Маршрут: /topic/:topicId
 *
 * Состояния:
 *   - loading: спиннер
 *   - error:   сообщение об ошибке
 *   - empty:   «Блоки не найдены»
 *   - active:  список блоков с прогрессом
 *   - vocab:   инлайн VocabSession для текущего блока
 */
var BlockSelectPage = function () {
  var topicId = parseInt(useParams().topicId, 10);
  var navigate = useNavigate();

  var topics = useTopics().topics;

  var _a = useBlocks(topicId);
  var blocks = _a.blocks;
  var currentBlockId = _a.currentBlockId;
  var completedBlockIds = _a.completedBlockIds;
  var vocabPhaseDone = _a.vocabPhaseDone;
  var completeVocabPhase = _a.completeVocabPhase;
  var loadingBlocks = _a.loading;
  var errorBlocks = _a.error;

  var _b = useState(false);
  var showVocab = _b[0];
  var setShowVocab = _b[1];

  var _c = useState(0);
  var vocabSessionKey = _c[0];
  var setVocabSessionKey = _c[1];

  // Метаданные темы
  var topicMeta = null;
  for (var i = 0; i < topics.length; i++) {
    if (topics[i].topic_id === topicId) { topicMeta = topics[i]; break; }
  }

  var topicType = blocks.length > 0 ? blocks[0].topic_type : null;

  // Блоки: сначала разблокированные, потом заблокированные
  var sortedBlocks = useMemo(function () {
    var sorted = blocks.slice();
    sorted.sort(function (a, b) {
      var aUnlocked = a.block_id === 1 || completedBlockIds.indexOf(a.block_id - 1) !== -1;
      var bUnlocked = b.block_id === 1 || completedBlockIds.indexOf(b.block_id - 1) !== -1;
      if (aUnlocked && !bUnlocked) return -1;
      if (!aUnlocked && bUnlocked) return 1;
      return a.block_id - b.block_id;
    });
    return sorted;
  }, [blocks, completedBlockIds]);

  var handleStartVocab = function (blockId) {
    if (blockId !== currentBlockId) {
      navigateToBlock(topicId, blockId);
    }
    setVocabSessionKey(function (prev) { return prev + 1; });
    setShowVocab(true);
  };

  var handleVocabDone = function () {
    completeVocabPhase();
    setShowVocab(false);
  };

  var handleStartQuiz = function (blockId) {
    navigate('/quiz/' + topicId, { state: { blockId: blockId } });
  };

  var handleBack = function () { navigate('/'); };

  // --- Состояние: загрузка ---
  if (loadingBlocks) {
    return (
      <div className="page block-select-page">
        <AppHeader title={topicMeta ? topicMeta.title : 'Тема ' + topicId} showBack={true} onBackOverride={handleBack} />
        <div className="block-select-loading">
          <Spinner />
          <p className="block-select-loading__text">Загружаем блоки...</p>
        </div>
      </div>
    );
  }

  // --- Состояние: ошибка ---
  if (errorBlocks) {
    return (
      <div className="page block-select-page">
        <AppHeader title={topicMeta ? topicMeta.title : 'Тема ' + topicId} showBack={true} onBackOverride={handleBack} />
        <div className="block-select-error">
          <p className="block-select-error__text">{errorBlocks}</p>
          <button className="btn btn-primary" onClick={function () { navigate('/'); }}>
            На главную
          </button>
        </div>
      </div>
    );
  }

  // --- Состояние: пусто ---
  if (!blocks.length) {
    return (
      <div className="page block-select-page">
        <AppHeader title={topicMeta ? topicMeta.title : 'Тема ' + topicId} showBack={true} onBackOverride={handleBack} />
        <div className="block-select-empty">
          <p className="block-select-empty__text">Блоки не найдены для этой темы</p>
        </div>
      </div>
    );
  }

  // --- Состояние: инлайн VocabSession ---
  if (showVocab) {
    return (
      <div className="page block-select-page">
        <AppHeader
          title={topicMeta ? topicMeta.title : 'Тема ' + topicId}
          showBack={true}
          onBackOverride={function () { setShowVocab(false); }}
        />
        <VocabSessionWrapper
          key={vocabSessionKey}
          topicId={topicId}
          onDone={handleVocabDone}
        />
      </div>
    );
  }

  // --- Состояние: список блоков ---
  return (
    <div className="page block-select-page">
      <AppHeader title={topicMeta ? topicMeta.title : 'Тема ' + topicId} showBack={true} onBackOverride={handleBack} />

      <div className="container block-select-container">
        <div className="block-select-meta">
          {topicType && (
            <span
              className="block-select-meta__type"
              style={{ backgroundColor: TOPIC_TYPE_COLORS[topicType] || '#6b7280' }}
            >
              {TOPIC_TYPE_LABELS[topicType] || topicType}
            </span>
          )}
          <span className="block-select-meta__count">{blocks.length} блоков</span>
          {topicMeta && (
            <span className="block-select-meta__questions">{topicMeta.questions_count} вопросов</span>
          )}
        </div>

        <div className="block-select-actions">
          {!vocabPhaseDone ? (
            <button className="btn btn-primary block-select-actions__btn" onClick={function () { handleStartVocab(currentBlockId); }}>
              Учить слова
            </button>
          ) : (
            <button className="btn btn-primary block-select-actions__btn" onClick={function () { handleStartQuiz(currentBlockId); }}>
              Начать тест
            </button>
          )}
        </div>

        <h2 className="block-select-title">Блоки</h2>
        <div className="block-list">
          {sortedBlocks.map(function (block) {
            var isCompleted = completedBlockIds.indexOf(block.block_id) !== -1;
            var isCurrent = block.block_id === currentBlockId;
            var isUnlocked = block.block_id === 1 || completedBlockIds.indexOf(block.block_id - 1) !== -1;

            return (
              <BlockCard
                key={block.block_id}
                block={block}
                topicType={topicType}
                isCurrent={isCurrent}
                isCompleted={isCompleted}
                isUnlocked={isUnlocked}
                vocabDone={isCurrent ? vocabPhaseDone : completedBlockIds.indexOf(block.block_id) !== -1}
                onStartQuiz={function () { handleStartQuiz(block.block_id); }}
                onStartVocab={function () { handleStartVocab(block.block_id); }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// BlockCard — карточка одного блока
// ---------------------------------------------------------------------------

var BlockCard = function (props) {
  var block = props.block;
  var topicType = props.topicType;
  var isCurrent = props.isCurrent;
  var isCompleted = props.isCompleted;
  var isUnlocked = props.isUnlocked;
  var vocabDone = props.vocabDone;
  var onStartQuiz = props.onStartQuiz;
  var onStartVocab = props.onStartVocab;

  var statusClass = isCompleted ? 'block-card--completed' :
    isCurrent ? 'block-card--current' :
    !isUnlocked ? 'block-card--locked' : '';

  var questionCount = block.question_ids ? block.question_ids.length : 0;
  var newVocabCount = block.new_vocab_ids ? block.new_vocab_ids.length : 0;
  var signImages = block.sign_images || [];
  var templatePhrases = block.template_phrases || [];
  var numberRules = block.number_rules || [];
  var overlapScore = block.overlap_score;

  return (
    <div className={'block-card ' + statusClass}>
      {/* Заголовок */}
      <div className="block-card__header">
        <div className="block-card__status">
          {isCompleted
            ? <span className="block-card__status-icon block-card__status-icon--done">✓</span>
            : isCurrent
            ? <span className="block-card__status-icon block-card__status-icon--current">●</span>
            : !isUnlocked
            ? <span className="block-card__status-icon block-card__status-icon--locked">🔒</span>
            : <span className="block-card__status-icon block-card__status-icon--open">○</span>
          }
          <span className="block-card__number">Блок {block.block_id}</span>
        </div>
        {topicType === 'A' && overlapScore !== undefined && (
          <span className="block-card__overlap" title="Словарное перекрытие">
            {Math.round(overlapScore * 100)}%
          </span>
        )}
      </div>

      {/* Мета */}
      <div className="block-card__meta">
        <span className="block-card__meta-item">{questionCount} вопросов</span>
        {newVocabCount > 0 && (
          <span className="block-card__meta-item block-card__meta-item--new">+{newVocabCount} слов</span>
        )}
      </div>

      {/* Тип A: знаки */}
      {topicType === 'A' && signImages.length > 0 && (
        <div className="block-card__signs">
          {signImages.slice(0, 4).map(function (img, idx) {
            return (
              <div key={idx} className="block-card__sign-thumb">
                <img src={SIGN_IMAGE_BASE + img} alt="" loading="lazy" className="block-card__sign-img" />
              </div>
            );
          })}
          {signImages.length > 4 && (
            <span className="block-card__sign-more">+{signImages.length - 4}</span>
          )}
        </div>
      )}

      {/* Тип B/C: шаблонные фразы */}
      {(topicType === 'B' || topicType === 'C') && templatePhrases.length > 0 && (
        <div className="block-card__phrases">
          {templatePhrases.slice(0, 2).map(function (phrase, idx) {
            return <span key={idx} className="block-card__phrase">{phrase}</span>;
          })}
        </div>
      )}

      {/* Тип C: числовые правила */}
      {topicType === 'C' && numberRules.length > 0 && (
        <div className="block-card__numbers">
          {numberRules.slice(0, 3).map(function (rule, idx) {
            return <span key={idx} className="block-card__number-rule">{rule}</span>;
          })}
        </div>
      )}

      {/* Кнопки */}
      {isUnlocked && (
        <div className="block-card__actions">
          {isCurrent && !isCompleted ? (
            <>
              {!vocabDone && (
                <button className="block-card__action-btn block-card__action-btn--vocab" onClick={onStartVocab}>
                  Слова
                </button>
              )}
              <button
                className={'block-card__action-btn block-card__action-btn--quiz' + (!vocabDone ? ' block-card__action-btn--disabled' : '')}
                onClick={onStartQuiz}
                disabled={!vocabDone}
              >
                Тест
              </button>
              {!vocabDone && (
                <p className="block-card__hint">Сначала изучите слова этого блока</p>
              )}
            </>
          ) : (
            <button className="block-card__action-btn block-card__action-btn--review" onClick={onStartQuiz}>
              Повторить
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// VocabSessionWrapper — useVocab + VocabSession для инлайн-режима
// ---------------------------------------------------------------------------

var VocabSessionWrapper = function (props) {
  var topicId = props.topicId;
  var onDone = props.onDone;

  var vocab = useVocab(topicId, { mode: 'block' });
  // Деструктурируем для удобства
  var cards = vocab.cards;
  var currentCard = vocab.currentCard;
  var currentIndex = vocab.currentIndex;
  var total = vocab.total;
  var rate = vocab.rate;
  var goTo = vocab.goTo;
  var isFinished = vocab.isFinished;
  var reset = vocab.reset;
  var boxStats = vocab.boxStats;
  var loading = vocab.loading;
  var error = vocab.error;

  var sessionProps = {
    cards: cards,
    currentCard: currentCard,
    currentIndex: currentIndex,
    total: total,
    rate: rate,
    goTo: goTo,
    isFinished: isFinished,
    reset: reset,
    boxStats: boxStats,
    loading: loading,
    error: error,
    topicId: topicId,
  };

  if (isFinished) {
    return (
      <div className="vocab-session-page">
        <VocabSession {...sessionProps} />
        <div className="vocab-session-page__footer">
          <button className="btn btn-primary" onClick={onDone}>
            Продолжить
          </button>
          <button
            className="btn btn-secondary"
            style={{ marginTop: '12px' }}
            onClick={function () { reset(); }}
          >
            Повторить слова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vocab-session-page">
      <VocabSession {...sessionProps} />
    </div>
  );
};

export default BlockSelectPage;
