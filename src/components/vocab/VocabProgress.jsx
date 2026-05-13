/**
 * VocabProgress.jsx
 * Горизонтальный ряд кружков-индикаторов — аналог QuizPagination, но для карточек.
 *
 * Состояния:
 *   - active (текущая карточка)
 *   - rated (оценена — закрашенный кружок)
 *   - default (не оценена — контур)
 *
 * Props:
 *   total         — общее число карточек
 *   currentIndex  — индекс текущей карточки (0-based)
 *   ratedIndices  — Set индексов, которые уже оценены
 *   onGoTo        — fn(index) — переход к карточке по клику
 */

export default function VocabProgress(_a) {
  var total = _a.total;
  var currentIndex = _a.currentIndex;
  var ratedIndices = _a.ratedIndices;
  var onGoTo = _a.onGoTo;

  if (total <= 1) return null;

  var dots = [];
  for (var i = 0; i < total; i++) {
    var className = 'vocab-progress__dot';
    if (i === currentIndex) {
      className += ' vocab-progress__dot--active';
    } else if (ratedIndices && ratedIndices.has(i)) {
      className += ' vocab-progress__dot--rated';
    }

    dots.push(
      <button
        key={i}
        className={className}
        onClick={function (idx) {
          return function () {
            if (onGoTo) onGoTo(idx);
          };
        }(i)}
        aria-label={'Карточка ' + (i + 1)}
      />
    );
  }

  return (
    <div className="vocab-progress">
      <div className="vocab-progress__track">
        {dots}
      </div>
    </div>
  );
}
