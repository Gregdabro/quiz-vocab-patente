/**
 * useQuiz.js
 * Главный хук логики прохождения квиза.
 *
 * topicId: "1"–"25" | "all" | "errors" | "errors:N"
 * options: { blockId } — режим блочного квиза
 *
 * Контракт:
 * { questions, current, goTo, answered, answer, results, isFinished, finish, reset, loading, error, isBlockMode, blockPassed }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadTopicQuestions, loadAllQuestions, loadTopicErrorQuestions, loadBlockQuestions, pickSessionQuestions } from '../services/questionsService.js';
import { getErrorQuestions } from '../services/errorsService.js';
import { incrementError, decrementError } from '../services/errorsService.js';
import { saveTestResult } from '../services/progressService.js';
import { completeBlock as completeBlockService, loadBlocks } from '../services/blockService.js';

export default function useQuiz(topicId, options) {
  var blockId = (options && options.blockId) || null;
  var isBlockMode = blockId !== null;

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);

  // Map: questionId → boolean (ответ пользователя)
  const [answered, setAnswered] = useState(() => new Map());

  // Массив { questionId, correct, topicId }
  const [results, setResults] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  // Результат блочного квиза: true если ≥80% и блок сдан
  const [blockPassed, setBlockPassed] = useState(false);

  // Ref для хранения всех вопросов при режиме "errors"
  const allQuestionsRef = useRef([]);
  // Защита от двойного сохранения статистики
  const isSavedRef = useRef(false);
  // Защита от Race Condition при быстром клике
  const answeringRef = useRef(false);
  // Реальное количество блоков (загружается для блочного режима)
  const totalBlocksRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setQuestions([]);
    setCurrent(0);
    setAnswered(new Map());
    setResults([]);
    setIsFinished(false);
    isSavedRef.current = false;
    answeringRef.current = false;
    setBlockPassed(false);

    let promise;

    if (isBlockMode) {
      // Блочный режим: конкретные вопросы блока, без shuffle
      // Параллельно загружаем блоки чтобы знать real totalBlocks
      promise = Promise.all([
        loadBlockQuestions(topicId, blockId),
        loadBlocks(topicId),
      ]).then(function (result) {
        var questions = result[0];
        var blocks = result[1];
        totalBlocksRef.current = blocks.length;
        return questions;
      });
    } else if (topicId === 'all') {
      promise = loadAllQuestions();
    } else if (topicId === 'errors') {
      promise = loadAllQuestions().then((all) => {
        allQuestionsRef.current = all;
        return getErrorQuestions(all);
      });
    } else if (typeof topicId === 'string' && topicId.startsWith('errors:')) {
      // Режим «ошибки по конкретной теме»
      const tid = topicId.slice(7); // убираем префикс 'errors:'
      promise = loadTopicErrorQuestions(tid);
    } else {
      promise = loadTopicQuestions(topicId);
    }

    promise
      .then((raw) => {
        if (cancelled) return;
        // В блочном режиме не шафлим и не обрезаем — порядок из JSON
        if (isBlockMode) {
          setQuestions(raw);
        } else {
          const session = pickSessionQuestions(raw);
          setQuestions(session);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Ошибка загрузки вопросов');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [topicId, blockId, sessionKey]);

  /**
   * Ответить на текущий вопрос.
   * @param {boolean} userAnswer
   */
  const answer = useCallback((userAnswer) => {
    if (isFinished || answeringRef.current) return;

    const q = questions[current];
    if (!q) return;
    if (answered.has(q.id)) return; // уже отвечен

    answeringRef.current = true;

    const isCorrect = userAnswer === q.answer;

    // Обновляем ошибки
    if (isCorrect) {
      decrementError(q.id);
    } else {
      incrementError(q.id);
    }

    // Обновляем answered (новая Map для иммутабельности)
    const newAnswered = new Map(answered);
    newAnswered.set(q.id, userAnswer);
    setAnswered(newAnswered);

    // Обновляем results
    const newResults = results.concat([{
      questionId: q.id,
      correct: isCorrect,
      topicId: q.topic_id,
    }]);
    setResults(newResults);

    // Проверяем завершение сессии
    if (newResults.length === questions.length && !isSavedRef.current) {
      const correctCount = newResults.filter((r) => r.correct).length;
      if (isBlockMode) {
        // Блочный режим: сохраняем с ключом "block:N" чтобы не мешать random-прогрессу
        saveTestResult('block:' + topicId, correctCount, questions.length);
        // Проверяем ≥80% для разблокировки следующего блока
        var passed = correctCount >= Math.ceil(questions.length * 0.8);
        if (passed) {
          completeBlockService(topicId, parseInt(blockId, 10), totalBlocksRef.current);
        }
        setBlockPassed(passed);
      } else {
        saveTestResult(topicId, correctCount, questions.length);
      }
      isSavedRef.current = true;
      setIsFinished(true);
    }

    // Снимаем блокировку через небольшую задержку
    // чтобы предотвратить дебаунс на уровне UI
    setTimeout(() => {
      answeringRef.current = false;
    }, 50);
  }, [questions, current, answered, results, isFinished, isBlockMode, blockId]);

  /**
   * Перейти к вопросу по индексу (кликабельная пагинация).
   * @param {number} index
   */
  const goTo = useCallback((index) => {
    if (index >= 0 && index < questions.length) {
      setCurrent(index);
    }
  }, [questions.length]);

  /**
   * Завершить сессию вручную и сохранить результат.
   */
  const finish = useCallback(() => {
    if (isSavedRef.current) return;

    var correctCount = results.filter(function (r) { return r.correct; }).length;
    if (isBlockMode) {
      saveTestResult('block:' + topicId, correctCount, questions.length);
      var passed = correctCount >= Math.ceil(questions.length * 0.8);
      if (passed) {
        completeBlockService(topicId, parseInt(blockId, 10), totalBlocksRef.current);
      }
      setBlockPassed(passed);
    } else {
      saveTestResult(topicId, correctCount, questions.length);
    }

    isSavedRef.current = true;
    setIsFinished(true);
  }, [results, questions.length, topicId, isBlockMode, blockId]);

  /**
   * Сбросить сессию и запустить новую (для кнопки "Попробовать снова").
   */
  const reset = useCallback(() => {
    setSessionKey(prev => prev + 1);
  }, []);

  return {
    questions,
    current,
    goTo,
    answered,
    answer,
    results,
    isFinished,
    finish,
    reset,
    loading,
    error,
    isBlockMode,
    blockPassed,
  };
}
