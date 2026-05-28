import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useTopics from '../hooks/useTopics';
import useVocab from '../hooks/useVocab';
import { loadTopicVocab, getVocabProgress } from '../services/vocabService';
import AppHeader from '../components/layout/AppHeader';
import Spinner from '../components/ui/Spinner';
import VocabSession from '../components/vocab/VocabSession';

/**
 * DictionaryPage — справочник слов темы + запуск vocab-сессии.
 * Маршрут: /dictionary
 *
 * Состояния:
 *   - pick-topic: выбор темы (начальное состояние)
 *   - loading:    загрузка словаря
 *   - error:      ошибка загрузки
 *   - browse:     просмотр слов по группам
 *   - session:    активная vocab-сессия (инлайн)
 */
var DictionaryPage = function () {
  var navigate = useNavigate();
  var topics = useTopics().topics;

  var _a = useState(null);
  var selectedTopicId = _a[0];
  var setSelectedTopicId = _a[1];

  // Состояние: выбор темы
  if (selectedTopicId === null) {
    return (
      <div className="page dictionary-page">
        <AppHeader title="Словарь" />
        <div className="container dictionary-container">
          <p className="dictionary-intro">
            Выберите тему для просмотра словаря и тренировки слов.
          </p>
          <div className="dictionary-topic-list">
            {topics.map(function (topic) {
              return (
                <button
                  key={topic.topic_id}
                  className="dictionary-topic-item"
                  onClick={function () { setSelectedTopicId(topic.topic_id); }}
                >
                  <div className="dictionary-topic-item__image">
                    <img src={topic.image} alt="" loading="lazy" />
                  </div>
                  <div className="dictionary-topic-item__body">
                    <span className="dictionary-topic-item__title">{topic.title}</span>
                    <span className="dictionary-topic-item__count">{topic.questions_count} вопросов</span>
                  </div>
                  <span className="dictionary-topic-item__arrow">›</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DictionaryTopicView
      topicId={selectedTopicId}
      topics={topics}
      onBack={function () { setSelectedTopicId(null); }}
    />
  );
};

// ---------------------------------------------------------------------------
// DictionaryTopicView — просмотр словаря + сессия для выбранной темы
// Выделен в отдельный компонент чтобы useVocab вызывался только при
// валидном topicId (не 0 при selectedTopicId=null).
// ---------------------------------------------------------------------------

var DictionaryTopicView = function (props) {
  var topicId = props.topicId;
  var topics = props.topics;
  var onBack = props.onBack;

  var navigate = useNavigate();

  var _a = useState(null);
  var vocabData = _a[0];
  var setVocabData = _a[1];

  var _b = useState(true);
  var loadingVocab = _b[0];
  var setLoadingVocab = _b[1];

  var _c = useState(null);
  var errorVocab = _c[0];
  var setErrorVocab = _c[1];

  var _d = useState(false);
  var showSession = _d[0];
  var setShowSession = _d[1];

  var _e = useState(0);
  var sessionKey = _e[0];
  var setSessionKey = _e[1];

  // null пока vocabData не загружен — useVocab не инициализируется вхолостую
  var allVocabIds = vocabData ? vocabData.map(function (v) { return v.id; }) : null;

  var vocab = useVocab(topicId, { mode: 'free', vocabIds: allVocabIds });

  // Загрузка словаря при смене темы
  useEffect(function () {
    var cancelled = false;

    setLoadingVocab(true);
    setErrorVocab(null);
    setVocabData(null);
    setShowSession(false);

    loadTopicVocab(topicId).then(function (data) {
      if (cancelled) return;
      setVocabData(data);
      setLoadingVocab(false);
    }).catch(function (err) {
      if (cancelled) return;
      setErrorVocab(err.message || 'Ошибка загрузки словаря');
      setLoadingVocab(false);
    });

    return function () { cancelled = true; };
  }, [topicId]);

  var groupedWords = useMemo(function () {
    if (!vocabData) return {};
    var groups = {};
    vocabData.forEach(function (word) {
      var group = word.semantic_group || 'generale';
      if (!groups[group]) groups[group] = [];
      groups[group].push(word);
    });
    return groups;
  }, [vocabData]);

  var leitnerProgress = useMemo(function () {
    if (!vocabData) return {};
    var progress = getVocabProgress();
    var result = {};
    vocabData.forEach(function (word) {
      var key = String(topicId) + '_' + word.id;
      var state = progress[key];
      result[word.id] = state ? state.box : 0;
    });
    return result;
  }, [topicId, vocabData]);

  var handleStartSession = function () {
    setSessionKey(function (prev) { return prev + 1; });
    setShowSession(true);
  };

  var handleBackFromSession = function () {
    setShowSession(false);
  };

  // Состояние: активная сессия
  if (showSession) {
    var sessionDone = vocab.isFinished;
    return (
      <div className="page dictionary-page">
        <AppHeader
          title="Словарь"
          showBack={true}
          onBackOverride={handleBackFromSession}
        />
        <div className="vocab-session-page">
          <VocabSession
            cards={vocab.cards}
            currentCard={vocab.currentCard}
            currentIndex={vocab.currentIndex}
            total={vocab.total}
            rate={vocab.rate}
            goTo={vocab.goTo}
            isFinished={vocab.isFinished}
            reset={vocab.reset}
            boxStats={vocab.boxStats}
            loading={vocab.loading}
            error={vocab.error}
          />
          {sessionDone && (
            <div className="vocab-session-page__footer">
              <button className="btn btn-primary" onClick={handleBackFromSession}>
                К словарю
              </button>
              <button
                className="btn btn-secondary"
                style={{ marginTop: '12px' }}
                onClick={function () { vocab.reset(); }}
              >
                Повторить слова
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Состояние: загрузка словаря
  if (loadingVocab) {
    return (
      <div className="page dictionary-page">
        <AppHeader title="Словарь" showBack={true} onBackOverride={onBack} />
        <div className="dictionary-loading">
          <Spinner />
          <p className="dictionary-loading__text">Загружаем словарь...</p>
        </div>
      </div>
    );
  }

  // Состояние: ошибка
  if (errorVocab) {
    return (
      <div className="page dictionary-page">
        <AppHeader title="Словарь" showBack={true} onBackOverride={onBack} />
        <div className="dictionary-error">
          <p className="dictionary-error__text">{errorVocab}</p>
          <button className="btn btn-primary" onClick={onBack}>
            Выбрать другую тему
          </button>
        </div>
      </div>
    );
  }

  // Состояние: просмотр словаря
  var topicMeta = null;
  for (var i = 0; i < topics.length; i++) {
    if (topics[i].topic_id === topicId) { topicMeta = topics[i]; break; }
  }
  var groupNames = Object.keys(groupedWords).sort();
  var totalWords = vocabData ? vocabData.length : 0;

  var boxCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  groupNames.forEach(function (group) {
    groupedWords[group].forEach(function (word) {
      var box = leitnerProgress[word.id] !== undefined ? leitnerProgress[word.id] : 0;
      boxCounts[String(box)] = (boxCounts[String(box)] || 0) + 1;
    });
  });

  return (
    <div className="page dictionary-page">
      <AppHeader title={topicMeta ? topicMeta.title : 'Словарь'} showBack={true} onBackOverride={onBack} />

      <div className="container dictionary-container">
        <div className="dictionary-stats">
          <div className="dictionary-stats__item">
            <span className="dictionary-stats__value">{totalWords}</span>
            <span className="dictionary-stats__label">слов</span>
          </div>
          <div className="dictionary-stats__item">
            <span className="dictionary-stats__value">{groupNames.length}</span>
            <span className="dictionary-stats__label">групп</span>
          </div>
          <div className="dictionary-stats__item">
            <span className="dictionary-stats__value">{boxCounts['2'] + boxCounts['3'] + boxCounts['4']}</span>
            <span className="dictionary-stats__label">изучено</span>
          </div>
        </div>

        <div className="dictionary-actions">
          <button className="btn btn-primary" onClick={handleStartSession}>
            Тренировать все слова
          </button>
        </div>

        <div className="dictionary-groups">
          {groupNames.map(function (group) {
            var words = groupedWords[group];
            return (
              <div key={group} className="dictionary-group">
                <h3 className="dictionary-group__title">
                  {group === 'generale' ? 'Общие слова' : group}
                  <span className="dictionary-group__count">{words.length}</span>
                </h3>
                <div className="dictionary-group__words">
                  {words.map(function (word) {
                    var box = leitnerProgress[word.id] !== undefined ? leitnerProgress[word.id] : 0;
                    return (
                      <div key={word.id} className="dictionary-word">
                        <div className="dictionary-word__main">
                          <span className="dictionary-word__text">{word.word}</span>
                          {word.translation_ru && (
                            <span className="dictionary-word__translation">{word.translation_ru}</span>
                          )}
                        </div>
                        <div className="dictionary-word__meta">
                          {word.frequency > 0 && (
                            <span className="dictionary-word__freq">×{word.frequency}</span>
                          )}
                          {word.trap_word && (
                            <span className="dictionary-word__trap">ловушка</span>
                          )}
                          {word.is_phrase && (
                            <span className="dictionary-word__phrase-badge">фраза</span>
                          )}
                          <span
                            className={'dictionary-word__box dictionary-word__box--' + box}
                            title={'Ящик Leitner: ' + box}
                          >
                            {box > 0 ? 'L' + box : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DictionaryPage;
