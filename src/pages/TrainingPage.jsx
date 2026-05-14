import React from 'react';
import { useNavigate } from 'react-router-dom';
import useTopics from '../hooks/useTopics';
import useProgress from '../hooks/useProgress';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import Spinner from '../components/ui/Spinner';
import AppHeader from '../components/layout/AppHeader';

/**
 * Страница выбора темы для тренировки (vocab-first блочный флоу).
 * Клик по теме ведёт на /topic/:topicId → BlockSelectPage.
 *
 * Отличается от HomePage:
 *   - Нет ProgressSummary
 *   - Нет onboarding-перенаправления
 *   - Навигация на /topic/ вместо /quiz/
 */
const TrainingPage = () => {
  const { topics, loading, error } = useTopics();
  const { progress } = useProgress();
  const navigate = useNavigate();

  if (loading) return <Spinner />;
  if (error) return <div className="container error-container">{error}</div>;

  return (
    <div className="page homepage">
      <AppHeader title="Тренировка" />

      <div className="container home-container">
        <h2 className="home-title">
          Выберите тему
        </h2>

        <div className="grid-2col">
          {topics.map((topic) => (
            <Card
              key={topic.topic_id}
              className="topic-card topic-card--clickable"
              onClick={() => navigate('/topic/' + topic.topic_id)}
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrainingPage;
