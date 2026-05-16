/**
 * useBlocks.js
 * Хук для навигации по блокам темы.
 *
 * Загружает блоки, отслеживает прогресс, проверяет разблокировку,
 * управляет переходом между блоками и завершением vocab-фазы.
 *
 * Контракт:
 * { blocks, currentBlock, currentBlockId, completedBlockIds, vocabPhaseDone,
 *   completeBlock, completeVocabPhase, navigateToBlock, isUnlocked,
 *   refresh, loading, error }
 */

import { useState, useEffect, useCallback } from 'react';
import {
  loadBlocks as loadBlocksService,
  getBlockProgress,
  completeBlock as completeBlockService,
  completeVocabPhase as completeVocabPhaseService,
  navigateToBlock as navigateToBlockService,
  isBlockUnlocked,
} from '../services/blockService.js';

export default function useBlocks(topicId) {
  var [blocks, setBlocks] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [progress, setProgress] = useState(function () { return getBlockProgress(topicId); });

  // ---------------------------------------------------------------------------
  // Загрузка блоков
  // ---------------------------------------------------------------------------

  useEffect(function () {
    var cancelled = false;

    setLoading(true);
    setError(null);

    loadBlocksService(topicId)
      .then(function (data) {
        if (cancelled) return;
        setBlocks(data);
        setLoading(false);
      })
      .catch(function (err) {
        if (cancelled) return;
        setError(err.message || 'Ошибка загрузки блоков');
        setLoading(false);
      });

    return function () { cancelled = true; };
  }, [topicId]);

  // Синхронизация прогресса при смене topicId
  useEffect(function () {
    setProgress(getBlockProgress(topicId));
  }, [topicId]);

  // ---------------------------------------------------------------------------
  // Производные значения
  // ---------------------------------------------------------------------------

  var currentBlockId = progress.current_block;
  var completedBlockIds = progress.completed_blocks;
  var vocabPhaseDone = progress.vocab_phase_done;

  // Текущий блок как объект
  var currentBlock = null;
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].block_id === currentBlockId) {
      currentBlock = blocks[i];
      break;
    }
  }
  if (!currentBlock && blocks.length > 0) {
    currentBlock = blocks[0];
  }

  // ---------------------------------------------------------------------------
  // Действия
  // ---------------------------------------------------------------------------

  /**
   * Обновить прогресс из localStorage.
   */
  var refresh = useCallback(function () {
    setProgress(getBlockProgress(topicId));
  }, [topicId]);

  /**
   * Завершить блок. Если результат ≥ 80% — перейти к следующему.
   * @param {number} blockId — ID завершаемого блока
   * @param {number} correctCount — правильных ответов
   * @param {number} totalCount — всего вопросов
   * @returns {boolean} — true если блок сдан и открыт следующий
   */
  var completeBlock = useCallback(function (blockId, correctCount, totalCount) {
    var score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    if (score >= 80) {
      completeBlockService(topicId, blockId, blocks.length);
      refresh();
      return true;
    }
    return false;
  }, [topicId, blocks.length, refresh]);

  /**
   * Отметить vocab-фазу как пройденную.
   */
  var completeVocabPhase = useCallback(function () {
    completeVocabPhaseService(topicId);
    refresh();
  }, [topicId, refresh]);

  /**
   * Перейти к конкретному блоку (только если разблокирован).
   * @param {number} blockId
   * @returns {boolean} — true если переход успешен
   */
  var navigateToBlock = useCallback(function (blockId) {
    var ok = navigateToBlockService(topicId, blockId);
    if (ok) refresh();
    return ok;
  }, [topicId, refresh]);

  /**
   * Проверить, разблокирован ли блок.
   * @param {number} blockId
   * @returns {boolean}
   */
  var isUnlocked = useCallback(function (blockId) {
    return isBlockUnlocked(topicId, blockId);
  }, [topicId]);

  return {
    blocks: blocks,
    currentBlock: currentBlock,
    currentBlockId: currentBlockId,
    completedBlockIds: completedBlockIds,
    vocabPhaseDone: vocabPhaseDone,
    completeBlock: completeBlock,
    completeVocabPhase: completeVocabPhase,
    navigateToBlock: navigateToBlock,
    isUnlocked: isUnlocked,
    refresh: refresh,
    loading: loading,
    error: error,
  };
}
