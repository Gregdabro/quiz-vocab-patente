/**
 * questionsService.js
 * Загрузка вопросов из JSON-файлов (src/data/).
 * Сейчас: динамический import(). Phase 2: заменить на fetch('/api/questions/...')
 */

import topicsData from '../data/topics.json';
import { shuffle } from '../utils/shuffle.js';
import { getErrors } from './errorsService.js';

const SESSION_SIZE = 30;


const questionsCache = import.meta.glob('../data/questions/topic_*.json');

/**
 * Загружает все вопросы одной темы.
 * @param {number|string} topicId
 * @returns {Promise<Array>}
 */
export async function loadTopicQuestions(topicId) {
  const path = '../data/questions/topic_' + topicId + '.json';
  if (!questionsCache[path]) {
    throw new Error('Вопросы темы не найдены: ' + path);
  }
  const module = await questionsCache[path]();
  return module.default || module;
}

/**
 * Загружает все вопросы из всех тем (1–25).
 * @returns {Promise<Array>}
 */
export async function loadAllQuestions() {
  const ids = Array.from({ length: 25 }, (_, i) => i + 1);
  const all = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(id => loadTopicQuestions(id))
    );
    all.push(...results.flat());
  }
  return all;
}

/**
 * Возвращает случайную выборку из SESSION_SIZE вопросов.
 * @param {Array} questions — полный список вопросов
 * @returns {Array} — 30 перемешанных вопросов
 */
export function pickSessionQuestions(questions) {
  const shuffled = shuffle(questions);
  return shuffled.slice(0, SESSION_SIZE);
}

/**
 * Загружает вопросы одной темы, отфильтрованные по ошибкам пользователя.
 * Shuffle делает pickSessionQuestions / useQuiz — здесь не нужен.
 * @param {number|string} topicId
 * @returns {Promise<Array>}
 */
export async function loadTopicErrorQuestions(topicId) {
  const allTopicQuestions = await loadTopicQuestions(topicId);
  const errorIds = getErrors();
  return allTopicQuestions.filter(q => errorIds[String(q.id)]);
}

/**
 * Загружает вопросы конкретного блока темы (без shuffle, без ограничения).
 * Используется в блочном режиме QuizPage.
 * @param {number|string} topicId
 * @param {number|string} blockId
 * @returns {Promise<Array>}
 */
export async function loadBlockQuestions(topicId, blockId) {
  // 1. Загрузить блоки темы
  var blockPath = '../data/blocks/topic_' + topicId + '_blocks.json';
  var blocksModule;
  try {
    blocksModule = await import(/* @vite-ignore */ blockPath);
  } catch (e) {
    throw new Error('Блоки для темы ' + topicId + ' не найдены');
  }
  var blocks = blocksModule.default || blocksModule;

  // 2. Найти нужный блок
  var block = null;
  for (var i = 0; i < blocks.length; i++) {
    if (String(blocks[i].block_id) === String(blockId)) {
      block = blocks[i];
      break;
    }
  }
  if (!block) {
    throw new Error('Блок ' + blockId + ' не найден в теме ' + topicId);
  }

  // 3. Загрузить все вопросы темы
  var allQuestions = await loadTopicQuestions(topicId);

  // 4. Отфильтровать и сохранить порядок из блока
  var questionMap = {};
  for (var j = 0; j < allQuestions.length; j++) {
    questionMap[allQuestions[j].id] = allQuestions[j];
  }

  var blockQuestions = [];
  var questionIds = block.question_ids;
  for (var k = 0; k < questionIds.length; k++) {
    var q = questionMap[questionIds[k]];
    if (q) blockQuestions.push(q);
  }

  return blockQuestions;
}

/**
 * Загружает метаданные тем.
 * @returns {Promise<Array>}
 */
export async function loadTopics() {
  return topicsData;
}
