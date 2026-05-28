import React from 'react';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';

/**
 * TopicGrid — сетка карточек тем с прогрессом.
 * Используется в HomePage и TrainingPage.
 *
 * Props:
 *   topics       — массив топиков с полями topic_id, title, questions_count, image, progress
 *   onTopicClick — callback(topicId) при клике на карточку
 */
var TopicGrid = function (props) {
  var topics = props.topics;
  var onTopicClick = props.onTopicClick;

  return (
    <div className="grid-2col">
      {topics.map(function (topic) {
        return (
          <Card
            key={topic.topic_id}
            className="topic-card topic-card--clickable"
            onClick={function () { onTopicClick(topic.topic_id); }}
          >
            <div className="topic-card__header">
              <div className="topic-image">
                <img
                  src={topic.image}
                  alt=""
                  loading="lazy"
                  className="topic-image__img"
                />
              </div>
              <div className="topic-info">
                <h3 className="topic-info__title">
                  {topic.title}
                </h3>
                <p className="topic-info__count">
                  Вопросов: {topic.questions_count}
                </p>
              </div>
            </div>

            <div className="topic-progress">
              <div className="topic-progress__stats">
                <span>Прогресс: {topic.progress?.bestScore || 0} / 30</span>
                <span>{Math.round((topic.progress?.bestScore || 0) / 30 * 100)}%</span>
              </div>
              <ProgressBar
                progress={(topic.progress?.bestScore || 0) / 30 * 100}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default TopicGrid;
