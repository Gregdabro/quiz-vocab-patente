import React, { useRef, useEffect } from 'react';

/**
 * Компонент пагинации для теста (v3).
 * Реализован в виде горизонтального слайдера с кнопками-стрелками.
 * 
 * @param {Array} questions — массив вопросов
 * @param {number} current — индекс текущего вопроса
 * @param {Object} answered — мапа ответов { index: answerValue }
 * @param {Function} onSelect — обработчик выбора вопроса
 * @param {Function} onFinish — обработчик нажатия VERIFICA
 * @param {boolean} isFinished — завершены ли все вопросы (определяет активность кнопки VERIFICA)
 */
const QuizPagination = ({ 
  questions, 
  current, 
  answered, 
  onSelect,
  onFinish,
  isFinished = false
}) => {
  var viewportRef = useRef(null);
  var finishBtnRef = useRef(null);

  // Автоматическая прокрутка к активному вопросу при его смене
  useEffect(function () {
    if (viewportRef.current) {
      var activeItem = viewportRef.current.children[0].children[current];
      if (activeItem) {
        activeItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [current]);

  // Авто-прокрутка к VERIFICA когда все вопросы отвечены
  useEffect(function () {
    if (isFinished && finishBtnRef.current) {
      finishBtnRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [isFinished]);

  return (
    <div className="quiz-pagination-slider" data-no-swipe="true">
      <div className="pagination-viewport-container">
        <div className="pagination-viewport" ref={viewportRef}>
          <div className="pagination-track">
            {questions.map((q, index) => {
              let statusClass = '';
              if (index === current) statusClass = 'active';
              else if (answered.has(q.id)) {
                const isCorrect = answered.get(q.id) === q.answer;
                statusClass = isCorrect ? 'correct' : 'wrong';
              }
              
              return (
                <div 
                  key={q.id}
                  onClick={() => onSelect(index)}
                  className={`pagination-item ${statusClass}`}
                  title={`Вопрос ${index + 1}`}
                >
                  {index + 1}
                </div>
              );
            })}
            
            {/* Кнопка "Финиш" (VERIFICA) в конце ленты */}
            <div
              ref={finishBtnRef}
              className={'pagination-item pagination-item--finish' + (!isFinished ? ' disabled' : '')}
              onClick={function () { isFinished && onFinish(); }}
            >
              VERIFICA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPagination;
