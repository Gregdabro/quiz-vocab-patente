/**
 * blockService.js
 * Загрузка блоков темы и управление прогрессом по блокам.
 *
 * localStorage key: qp_block_prog
 *
 * Схема qp_block_prog:
 * {
 *   "2": {
 *     current_block: 1,          — ID текущего активного блока
 *     completed_blocks: [1, 2],  — массив ID завершённых блоков
 *     vocab_phase_done: false,   — пройдена ли vocab-фаза текущего блока
 *     topic_completed: false     — все блоки темы завершены
 *   }
 * }
 *
 * Правило разблокировки:
 *   - Блок 1 всегда открыт
 *   - Блок N открыт если блок (N-1) есть в completed_blocks
 *
 * Загрузка блоков:
 *   - Через динамический import() из src/data/blocks/
 *   - Vite обрабатывает template literal pattern и включает все JSON в сборку
 */

const STORAGE_KEY = 'qp_block_prog';

const blocksCache = import.meta.glob('../data/blocks/topic_*_blocks.json');

// ---------------------------------------------------------------------------
// Внутренние хелперы
// ---------------------------------------------------------------------------

/**
 * Сохранить весь объект прогресса в localStorage.
 * @param {Object} all
 */
function _save(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('blockService: localStorage quota exceeded — данные не сохранены');
    } else {
      console.error('blockService: не удалось сохранить прогресс', e);
    }
  }
}

// ---------------------------------------------------------------------------
// localStorage — чтение
// ---------------------------------------------------------------------------

/**
 * Получить весь прогресс по блокам из localStorage.
 * @returns {Object}
 */
export function getBlockProgressAll() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Получить прогресс по блокам для конкретной темы.
 * Возвращает дефолтный объект если данных ещё нет.
 * @param {number|string} topicId
 * @returns {{ current_block: number, completed_blocks: number[], vocab_phase_done: boolean }}
 */
export function getBlockProgress(topicId) {
  var all = getBlockProgressAll();
  return all[String(topicId)] || {
    current_block: 1,
    completed_blocks: [],
    vocab_phase_done: false,
  };
}

// ---------------------------------------------------------------------------
// Загрузка данных из JSON
// ---------------------------------------------------------------------------

/**
 * Загрузить массив блоков для темы из статического JSON.
 * Использует import.meta.glob — Vite статически включает все matching файлы в сборку.
 * @param {number|string} topicId
 * @returns {Promise<Array>}
 */
export function loadBlocks(topicId) {
  var path = '../data/blocks/topic_' + topicId + '_blocks.json';
  if (!blocksCache[path]) {
    return Promise.resolve([]);
  }
  return blocksCache[path]().then(function (module) {
    return module.default;
  }).catch(function (e) {
    console.error('blockService: не удалось загрузить блоки для темы ' + topicId, e);
    return [];
  });
}

// ---------------------------------------------------------------------------
// Навигация по блокам
// ---------------------------------------------------------------------------

/**
 * Получить объект текущего блока из уже загруженного массива.
 * @param {number|string} topicId
 * @param {Array} blocks — результат loadBlocks()
 * @returns {Object|null}
 */
export function getCurrentBlock(topicId, blocks) {
  var progress = getBlockProgress(topicId);
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].block_id === progress.current_block) return blocks[i];
  }
  return blocks[0] || null;
}

/**
 * Проверить, разблокирован ли блок для данной темы.
 * @param {number|string} topicId
 * @param {number} blockId
 * @returns {boolean}
 */
export function isBlockUnlocked(topicId, blockId) {
  if (blockId === 1) return true;
  var progress = getBlockProgress(topicId);
  return progress.completed_blocks.indexOf(blockId - 1) !== -1;
}

/**
 * Получить список блоков, доступных пользователю (разблокированных).
 * @param {number|string} topicId
 * @param {Array} blocks
 * @returns {Array}
 */
export function getUnlockedBlocks(topicId, blocks) {
  return blocks.filter(function (b) {
    return isBlockUnlocked(topicId, b.block_id);
  });
}

// ---------------------------------------------------------------------------
// Обновление прогресса
// ---------------------------------------------------------------------------

/**
 * Отметить vocab-фазу текущего блока как пройденную.
 * Вызывается после завершения сессии карточек.
 * @param {number|string} topicId
 */
export function completeVocabPhase(topicId) {
  var all = getBlockProgressAll();
  var key = String(topicId);
  var progress = all[key] || { current_block: 1, completed_blocks: [], vocab_phase_done: false };
  progress.vocab_phase_done = true;
  all[key] = progress;
  _save(all);
}

/**
 * Отметить блок как завершённый (результат ≥ 80%) и перейти к следующему.
 * @param {number|string} topicId
 * @param {number} blockId — ID завершённого блока
 * @param {number} totalBlocks — общее число блоков в теме
 */
export function completeBlock(topicId, blockId, totalBlocks) {
  var all = getBlockProgressAll();
  var key = String(topicId);
  var progress = all[key] || { current_block: 1, completed_blocks: [], vocab_phase_done: false };

  if (progress.completed_blocks.indexOf(blockId) === -1) {
    progress.completed_blocks.push(blockId);
  }

  var nextBlock = blockId + 1;
  if (nextBlock <= totalBlocks) {
    progress.current_block = nextBlock;
    progress.vocab_phase_done = false;
  } else {
    // Все блоки завершены — остаёмся на последнем, помечаем тему завершённой
    progress.current_block = blockId;
    progress.topic_completed = true;
  }

  all[key] = progress;
  _save(all);
}

/**
 * Перейти к конкретному блоку (ручная навигация из BlockSelectPage).
 * Можно перейти только к разблокированному блоку.
 * @param {number|string} topicId
 * @param {number} blockId
 * @returns {boolean} — true если переход выполнен, false если блок заблокирован
 */
export function navigateToBlock(topicId, blockId) {
  if (!isBlockUnlocked(topicId, blockId)) return false;
  var all = getBlockProgressAll();
  var key = String(topicId);
  var progress = all[key] || { current_block: 1, completed_blocks: [], vocab_phase_done: false };
  progress.current_block = blockId;
  progress.vocab_phase_done = false;
  all[key] = progress;
  _save(all);
  return true;
}

// ---------------------------------------------------------------------------
// Сброс и очистка
// ---------------------------------------------------------------------------

/**
 * Сбросить прогресс по блокам для конкретной темы.
 * @param {number|string} topicId
 */
export function resetBlockProgress(topicId) {
  var all = getBlockProgressAll();
  delete all[String(topicId)];
  _save(all);
}

/**
 * Очистить весь прогресс по блокам.
 */
export function clearBlockProgress() {
  localStorage.removeItem(STORAGE_KEY);
}
