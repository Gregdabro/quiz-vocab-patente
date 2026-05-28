import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useTopics from '../hooks/useTopics';
import useProgress from '../hooks/useProgress';
import { isOnboardingDone, completeOnboarding } from '../services/vocabService';
import Spinner from '../components/ui/Spinner';
import ProgressSummary from '../components/stats/ProgressSummary';
import TopicGrid from '../components/home/TopicGrid';
import AppHeader from '../components/layout/AppHeader';

/**
 * Главная страница приложения.
 * Список из 25 тематических категорий с прогрессом.
 *
 * При первом запуске (qp_onboarding_done !== true) показывает баннер
 * с предложением пройти нулевой урок (22 универсальных слова).
 * Пользователь может начать урок или пропустить.
 */
const HomePage = () => {
  const { topics, loading, error } = useTopics();
  const { progress } = useProgress();
  const navigate = useNavigate();

  var _onboarding = useState(function () { return !isOnboardingDone(); });
  var showOnboardingBanner = _onboarding[0];
  var setShowOnboardingBanner = _onboarding[1];

  function handleStartOnboarding() {
    setShowOnboardingBanner(false);
    navigate('/vocab/global');
  }

  function handleSkipOnboarding() {
    completeOnboarding();
    setShowOnboardingBanner(false);
  }

  if (loading) return <Spinner />;
  if (error) return <div className="container error-container">{error}</div>;

  return (
    <div className="page homepage">
      <AppHeader title="Quiz Patente" />
      
      <div className="container home-container">
        <ProgressSummary progress={progress} />

        {/* Нулевой урок — только при первом запуске */}
        {showOnboardingBanner && (
          <div className="home-onboarding-banner">
            <span className="home-onboarding-banner__icon">📚</span>
            <div className="home-onboarding-banner__text">
              <span className="home-onboarding-banner__title">Базовые слова</span>
              <span className="home-onboarding-banner__desc">
                Изучите 22 универсальных слова за 5 минут. Они встречаются во всех темах — это сэкономит время при изучении.
              </span>
            </div>
            <div className="home-onboarding-banner__actions">
              <button
                className="home-onboarding-banner__btn home-onboarding-banner__btn--start"
                onClick={handleStartOnboarding}
              >
                Начать
              </button>
              <button
                className="home-onboarding-banner__btn home-onboarding-banner__btn--skip"
                onClick={handleSkipOnboarding}
              >
                Пропустить
              </button>
            </div>
          </div>
        )}

        <button
          className="home-traps-banner"
          onClick={() => navigate('/traps')}
        >
          <span className="home-traps-banner__icon">🎯</span>
          <span className="home-traps-banner__text">
            <span className="home-traps-banner__title">Ловушки экзамена</span>
            <span className="home-traps-banner__desc">Вопросы с подвохом — почти одинаковые, но с разными ответами</span>
          </span>
          <span className="home-traps-banner__arrow">›</span>
        </button>

        <h2 className="home-title">
          Выберите тему
        </h2>

        <TopicGrid
          topics={topics}
          onTopicClick={function (topicId) { navigate('/quiz/' + topicId); }}
        />
      </div>
    </div>
  );
};

export default HomePage;
