import React, { useState, useEffect, useMemo } from 'react';
import useTopics from '../hooks/useTopics';
import Spinner from '../components/ui/Spinner';
import AppHeader from '../components/layout/AppHeader';

/**
 * TrapsPage — страница просмотра экзаменационных ловушек.
 * Маршрут: /traps
 *
 * Показывает пары почти идентичных вопросов с разными ответами
 * (cosine similarity > 0.85). Студент видит разницу и учится не попадаться.
 */
var TrapsPage = function () {
  var topics = useTopics().topics;

  var _a = useState(null);
  var traps = _a[0];
  var setTraps = _a[1];

  var _b = useState(true);
  var loading = _b[0];
  var setLoading = _b[1];

  var _c = useState(null);
  var error = _c[0];
  var setError = _c[1];

  var _d = useState(null);
  var selectedTopic = _d[0];
  var setSelectedTopic = _d[1];

  useEffect(function () {
    var cancelled = false;
    setLoading(true);
    import('../data/exam_traps.json')
      .then(function (m) {
        if (cancelled) return;
        setTraps(m.default || m);
        setLoading(false);
      })
      .catch(function (e) {
        if (cancelled) return;
        setError('Не удалось загрузить ловушки: ' + (e.message || ''));
        setLoading(false);
      });
    return function () { cancelled = true; };
  }, []);

  // Группировка по темам
  var trapsByTopic = useMemo(function () {
    if (!traps) return {};
    var groups = {};
    traps.forEach(function (t) {
      var tid = String(t.topic_id);
      if (!groups[tid]) groups[tid] = [];
      groups[tid].push(t);
    });
    return groups;
  }, [traps]);

  // Список тем с ловушками
  var trapTopics = useMemo(function () {
    return Object.keys(trapsByTopic).sort(function (a, b) {
      return parseInt(a, 10) - parseInt(b, 10);
    });
  }, [trapsByTopic]);

  if (loading) return <div className="page"><AppHeader title="Ловушки" /><Spinner /></div>;
  if (error) return <div className="page"><AppHeader title="Ловушки" /><div className="container error-container">{error}</div></div>;
  if (!traps || !traps.length) return <div className="page"><AppHeader title="Ловушки" /><div className="container"><p>Ловушки не найдены</p></div></div>;

  // Выбор темы
  if (selectedTopic === null) {
    return (
      <div className="page traps-page">
        <AppHeader title="Ловушки" />
        <div className="container">
          <p className="traps-intro">
            Вопросы-ловушки — почти идентичные вопросы с разными ответами.
            Изучите их чтобы не попасться на экзамене.
          </p>
          <p className="traps-summary">
            Найдено {traps.length} пар в {trapTopics.length} темах
          </p>
          <div className="traps-topic-list">
            {trapTopics.map(function (tid) {
              var topicMeta = null;
              for (var i = 0; i < topics.length; i++) {
                if (String(topics[i].topic_id) === tid) { topicMeta = topics[i]; break; }
              }
              var count = trapsByTopic[tid].length;
              return (
                <button
                  key={tid}
                  className="traps-topic-item"
                  onClick={function () { setSelectedTopic(tid); }}
                >
                  <span className="traps-topic-item__title">
                    {topicMeta ? topicMeta.title : 'Тема ' + tid}
                  </span>
                  <span className="traps-topic-item__count">{count} пар</span>
                  <span className="traps-topic-item__arrow">›</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Просмотр пар по выбранной теме
  var topicMeta = null;
  for (var j = 0; j < topics.length; j++) {
    if (String(topics[j].topic_id) === selectedTopic) { topicMeta = topics[j]; break; }
  }
  var pairs = trapsByTopic[selectedTopic] || [];

  return (
    <div className="page traps-page">
      <AppHeader
        title={topicMeta ? topicMeta.title : 'Тема ' + selectedTopic}
        showBack={true}
        onBackOverride={function () { setSelectedTopic(null); }}
      />

      <div className="container traps-container">
        <p className="traps-count">{pairs.length} пар-ловушек</p>

        {pairs.map(function (trap, idx) {
          var qa = trap.question_a;
          var qb = trap.question_b;
          return (
            <div key={idx} className="trap-card">
              <div className="trap-card__header">
                <span className="trap-card__similarity">
                  Сходство: {(trap.similarity * 100).toFixed(1)}%
                </span>
              </div>

              <div className="trap-card__questions">
                <div className="trap-card__question trap-card__question--a">
                  <span className={'trap-card__answer-badge' + (qa.answer ? ' trap-card__answer-badge--true' : ' trap-card__answer-badge--false')}>
                    {qa.answer ? 'VERO' : 'FALSO'}
                  </span>
                  <p className="trap-card__text">{qa.text}</p>
                </div>

                <div className="trap-card__divider">
                  <span>vs</span>
                </div>

                <div className="trap-card__question trap-card__question--b">
                  <span className={'trap-card__answer-badge' + (qb.answer ? ' trap-card__answer-badge--true' : ' trap-card__answer-badge--false')}>
                    {qb.answer ? 'VERO' : 'FALSO'}
                  </span>
                  <p className="trap-card__text">{qb.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrapsPage;
