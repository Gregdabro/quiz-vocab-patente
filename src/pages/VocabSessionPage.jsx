import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useVocab from '../hooks/useVocab';
import useTopics from '../hooks/useTopics';
import VocabSession from '../components/vocab/VocabSession';
import AppHeader from '../components/layout/AppHeader';

/**
 * VocabSessionPage — страница vocab-сессии для темы.
 * Маршрут: /vocab/:topicId
 *
 * Режимы:
 *   /vocab/:topicId          — vocab-сессия текущего блока темы
 *   /vocab/global            — нулевой урок (22 универсальных слова)
 *
 * После завершения — кнопка «Продолжить» возвращает в тему или на главную.
 */
var VocabSessionPage = function () {
  var rawTopicId = useParams().topicId;
  var navigate = useNavigate();

  var isGlobal = rawTopicId === 'global';
  var topicId = isGlobal ? 'global' : parseInt(rawTopicId, 10);

  var mode = isGlobal ? 'global' : 'block';

  var vocab = useVocab(topicId, { mode: mode });

  // Загружаем список тем для отображения заголовка
  var topics = useTopics().topics;
  var topicMeta = null;
  for (var i = 0; i < topics.length; i++) {
    if (topics[i].topic_id === topicId) { topicMeta = topics[i]; break; }
  }

  var title = isGlobal
    ? 'Базовые слова'
    : (topicMeta ? topicMeta.title : 'Тема ' + topicId);

  var handleBack = function () {
    if (isGlobal) {
      navigate('/');
    } else {
      navigate('/topic/' + topicId);
    }
  };

  var handleDone = function () {
    if (isGlobal) {
      navigate('/');
    } else {
      navigate('/topic/' + topicId);
    }
  };

  return (
    <div className="page vocab-session-page">
      <AppHeader title={title} showBack={true} onBackOverride={handleBack} />

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

      {vocab.isFinished && (
        <div className="vocab-session-page__footer">
          <button className="btn btn-primary" onClick={handleDone}>
            Продолжить
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
  );
};

export default VocabSessionPage;
