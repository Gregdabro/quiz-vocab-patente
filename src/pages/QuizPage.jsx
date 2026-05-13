import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import useQuiz from '../hooks/useQuiz';
import useSwipe from '../hooks/useSwipe';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import AppHeader from '../components/layout/AppHeader';

// Новые компоненты после рефакторинга
import QuizPagination from '../components/quiz/QuizPagination';
import QuestionCard from '../components/quiz/QuestionCard';
import CommentAccordion from '../components/quiz/CommentAccordion';
import ResultScreen from '../components/quiz/ResultScreen';
import SlideTransition from '../components/ui/SlideTransition';
import ConfirmationModal from '../components/ui/ConfirmationModal';

/**
 * Страница прохождения теста (Рефакторинг v2).
 * Интегрирует модульные компоненты квиза.
 *
 * Режимы:
 *   - random:  /quiz/:topicId (случайные 30 вопросов)
 *   - block:   /quiz/:topicId/block/:blockId (конкретный блок)
 *   - errors:  /quiz/errors, /quiz/errors:topicId
 *   - all:     /quiz/all
 */
const QuizPage = () => {
  var _a = useParams();
  var topicId = _a.topicId;
  var urlBlockId = _a.blockId;
  var navigate = useNavigate();
  var location = useLocation();

  // blockId может прийти из URL (/quiz/:topicId/block/:blockId) или из location.state
  var blockId = urlBlockId || (location.state && location.state.blockId) || null;

  var _b = useQuiz(topicId, { blockId: blockId });
  var questions = _b.questions;
  var current = _b.current;
  var goTo = _b.goTo;
  var answer = _b.answer;
  var answered = _b.answered;
  var results = _b.results;
  var isFinished = _b.isFinished;
  var finish = _b.finish;
  var reset = _b.reset;
  var loading = _b.loading;
  var error = _b.error;
  var isBlockMode = _b.isBlockMode;
  var blockPassed = _b.blockPassed;

  var _c = useState(false);
  var showComment = _c[0];
  var setShowComment = _c[1];

  // Глобальное состояние перевода (сохраняется при смене вопроса)
  var _d = useState(false);
  var globalTranslation = _d[0];
  var setGlobalTranslation = _d[1];

  // Направление анимации перехода
  var _e = useState('forward');
  var transitionDirection = _e[0];
  var setTransitionDirection = _e[1];

  var _f = useState(false);
  var showResults = _f[0];
  var setShowResults = _f[1];

  var _g = useState(false);
  var isExitModalOpen = _g[0];
  var setIsExitModalOpen = _g[1];

  const handleGoTo = useCallback((index) => {
    setTransitionDirection(index > current ? 'forward' : 'backward');
    goTo(index);
    setShowComment(false);
  }, [current, goTo]);

  // Логика свайпа
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => handleGoTo(current + 1),
    onSwipeRight: () => handleGoTo(current - 1),
    threshold: 60
  });

  // Определяем куда возвращаться при выходе
  var backPath;
  if (isBlockMode) {
    backPath = '/topic/' + topicId;
  } else if (topicId.startsWith('errors:')) {
    backPath = '/errors';
  } else {
    backPath = '/';
  }

  // Заголовок страницы
  var headerTitle;
  if (isBlockMode) {
    headerTitle = 'Тема ' + topicId + ' — Блок ' + blockId;
  } else if (topicId === 'errors') {
    headerTitle = 'Работа над ошибками';
  } else if (topicId === 'all') {
    headerTitle = 'Случайный тест';
  } else if (topicId.startsWith('errors:')) {
    headerTitle = 'Ошибки — Тема ' + topicId.slice(7);
  } else {
    headerTitle = 'Тема ' + topicId;
  }

  // Обработчик ответа
  const handleAnswer = useCallback((userAnswer) => {
    answer(userAnswer);
    setShowComment(false);
  }, [answer]);

  // Обработчик завершения
  const handleFinish = useCallback(() => {
    finish();
    setShowResults(true);
  }, [finish]);

  // Обработчик выхода
  const handleExitRequest = useCallback(() => {
    if (isFinished) {
      navigate(backPath);
    } else {
      setIsExitModalOpen(true);
    }
  }, [isFinished, navigate, backPath]);

  const handleToggleComment = useCallback(() => {
    setShowComment(prev => !prev);
  }, []);

  const handleToggleTranslation = useCallback(() => {
    setGlobalTranslation(prev => !prev);
  }, []);

  if (loading) return <Spinner />;
  if (error) return <div className="container error" style={{ padding: '40px', textAlign: 'center' }}>{error}</div>;
  if (!questions.length) return <div className="container" style={{ padding: '40px', textAlign: 'center' }}>Нет доступных вопросов</div>;

  const currentQuestion = questions[current];
  const currentAnswer = answered.has(currentQuestion.id) ? answered.get(currentQuestion.id) : undefined;
  const isCorrect = currentAnswer !== undefined ? currentAnswer === currentQuestion.answer : null;


  return (
    <div className="page quiz-page" {...swipeHandlers}>
      <AppHeader 
        title={headerTitle}
        showBack={true}
        onBackOverride={handleExitRequest}
      />
      
      <div className="container" style={{ paddingBottom: '120px' }}>
        {/* Пагинация (общие 30 вопросов) */}
        <QuizPagination 
          questions={questions}
          current={current}
          answered={answered}
          onSelect={handleGoTo}
          onFinish={handleFinish}
          isFinished={isFinished}
        />

        <SlideTransition contentKey={currentQuestion.id} direction={transitionDirection}>
          <QuestionCard 
            question={currentQuestion}
            currentAnswer={currentAnswer}
            isSessionFinished={isFinished}
            onAnswer={handleAnswer}
            showComment={showComment}
            onToggleComment={handleToggleComment}
            showTranslation={globalTranslation}
            onToggleTranslation={handleToggleTranslation}
          />
        </SlideTransition>

        {/* Аккордеон комментария (появляется по кнопке 💬) */}
        <CommentAccordion 
          comment={currentQuestion.comment}
          isVisible={showComment && (currentAnswer !== undefined || isFinished)}
          isCorrect={isCorrect}
        />

        {/* Экран результатов (Overlay) */}
        {showResults && (
          <ResultScreen
            results={results}
            total={questions.length}
            onRestart={function () {
              reset();
              setShowResults(false);
            }}
            onClose={function () { setShowResults(false); }}
            onFinish={function () { navigate(backPath); }}
            passThreshold={isBlockMode ? 80 : 87}
            isBlockMode={isBlockMode}
          />
        )}

        {/* Модальное окно подтверждения выхода */}
        <ConfirmationModal 
          isOpen={isExitModalOpen}
          message="Вы уверены, что хотите покинуть квиз? Ваш прогресс в этой сессии будет потерян."
          onConfirm={() => navigate(backPath)}
          onCancel={() => setIsExitModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default QuizPage;
