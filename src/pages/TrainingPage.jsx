import React from 'react';
import { useNavigate } from 'react-router-dom';
import useTopics from '../hooks/useTopics';
import useProgress from '../hooks/useProgress';
import Spinner from '../components/ui/Spinner';
import TopicGrid from '../components/home/TopicGrid';
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

        <TopicGrid
          topics={topics}
          onTopicClick={function (topicId) { navigate('/topic/' + topicId); }}
        />
      </div>
    </div>
  );
};

export default TrainingPage;
