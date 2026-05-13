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

  // Выбранная тема (null = ещё не выбрана)
  var _a = useState(null);
  var selectedTopicId = _a[0];
  var setSelectedTopicId = _a[1];

  // Словарь
  var _b = useState(null);
  var vocabData = _b[0];
  var setVocabData = _b[1];

  var _c = useState(true);
  var loadingVocab = _c[0];
  var setLoadingVocab = _c[1];

  var _d = useState(null);
  var errorVocab = _d[0];
  var setErrorVocab = _d[1];

  // Режим сессии
  var _e = useState(false);
  var showSession = _e[0];
  var setShowSession = _e[1];

  var _f = useState(0);
  var sessionKey = _f[0];
  var setSessionKey = _f[1];

  // Vocab-сессия (free mode)
  var allVocabIds = useMemo(function () {
    if (!vocabData) return [];
    return vocabData.map(function (v) { return v.id; });
  }, [vocabData]);

  var vocab = useVocab(selectedTopicId || 0, {
    mode: 'free',
    vocabIds: allVocabIds,
  });

  // Загрузка словаря при смене темы
  useEffect(function () {
    if (!selectedTopicId) return;
    var cancelled = false;

    setLoadingVocab(true);
    setErrorVocab(null);
    setVocabData(null);
    setShowSession(false);

    loadTopicVocab(selectedTopicId).then(function (data) {
      if (cancelled) return;
      setVocabData(data);
      setLoadingVocab(false);
    }).catch(function (err) {
      if (cancelled) return;
      setErrorVocab(err.message || 'Ошибка загрузки словаря');
      setLoadingVocab(false);
    });

    return function () { cancelled = true; };
  }, [selectedTopicId]);

  // Группировка слов по semantic_group
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

  // Прогресс Leitner для слов выбранной темы
  var leitnerProgress = useMemo(function () {
    if (!selectedTopicId || !vocabData) return {};
    var progress = getVocabProgress();
    var result = {};
    vocabData.forEach(function (word) {
      var key = String(selectedTopicId) + '_' + word.id;
      var state = progress[key];
      result[word.id] = state ? state.box : 0;
    });
    return result;
  }, [selectedTopicId, vocabData]);

  var handleSelectTopic = function (topicId) {
    setSelectedTopicId(topicId);
  };

  var handleStartSession = function () {
    setSessionKey(function (prev) { return prev + 1; });
    setShowSession(true);
  };

  var handleBackFromSession = function () {
    setShowSession(false);
  };

  var handleBackToPick = function () {
    setSelectedTopicId(null);
    setVocabData(null);
    setShowSession(false);
  };

  // Состояние: активная сессия
  if (showSession && selectedTopicId !== null) {
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
                  onClick={function () { handleSelectTopic(topic.topic_id); }}
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

  // Состояние: загрузка словаря
  if (loadingVocab) {
    return (
      <div className="page dictionary-page">
        <AppHeader title="Словарь" showBack={true} onBackOverride={handleBackToPick} />
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
        <AppHeader title="Словарь" showBack={true} onBackOverride={handleBackToPick} />
        <div className="dictionary-error">
          <p className="dictionary-error__text">{errorVocab}</p>
          <button className="btn btn-primary" onClick={handleBackToPick}>
            Выбрать другую тему
          </button>
        </div>
      </div>
    );
  }

  // Состояние: просмотр словаря
  var topicMeta = null;
  for (var i = 0; i < topics.length; i++) {
    if (topics[i].topic_id === selectedTopicId) { topicMeta = topics[i]; break; }
  }
  var groupNames = Object.keys(groupedWords).sort();
  var totalWords = vocabData ? vocabData.length : 0;

  // Статистика по ящикам
  var boxCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  groupNames.forEach(function (group) {
    groupedWords[group].forEach(function (word) {
      var box = leitnerProgress[word.id] !== undefined ? leitnerProgress[word.id] : 0;
      boxCounts[String(box)] = (boxCounts[String(box)] || 0) + 1;
    });
  });

  return (
    <div className="page dictionary-page">
      <AppHeader title={topicMeta ? topicMeta.title : 'Словарь'} showBack={true} onBackOverride={handleBackToPick} />

      <div className="container dictionary-container">
        {/* Статистика */}
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

        {/* Кнопка сессии */}
        <div className="dictionary-actions">
          <button className="btn btn-primary" onClick={handleStartSession}>
            Тренировать все слова
          </button>
        </div>

        {/* Группы слов */}
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
