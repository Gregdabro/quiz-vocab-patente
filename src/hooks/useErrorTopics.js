import { useState, useEffect } from 'react';
import { loadTopics } from '../services/questionsService.js';
import { getErrors } from '../services/errorsService.js';

var _questionTopicMap = null;

export default function useErrorTopics() {
  var [topics, setTopics] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);

  useEffect(function () {
    var cancelled = false;

    async function load() {
      try {
        // 1. Загружаем метаданные тем (topics.json — лёгкий файл)
        var rawTopics = await loadTopics();
        if (cancelled) return;

        // 2. Читаем ошибки из localStorage — синхронно, без запросов
        var errorIds = getErrors();
        var errorIdList = Object.keys(errorIds);

        // 3. Оптимизация: если ошибок нет — не грузим ничего
        if (errorIdList.length === 0) {
          var empty = rawTopics.map(function (t) { return { ...t, errorCount: 0 }; });
          if (!cancelled) {
            setTopics(empty);
            setLoading(false);
          }
          return;
        }

        // 4. Ленивая загрузка question_topic_map (52KB вместо 25×~500KB)
        if (!_questionTopicMap) {
          try {
            var mapModule = await import('../data/question_topic_map.json');
            _questionTopicMap = mapModule.default || mapModule;
          } catch (e) {
            if (!cancelled) {
              setError('Ошибка загрузки question_topic_map');
              setLoading(false);
            }
            return;
          }
        }

        if (cancelled) return;

        // 5. Подсчёт ошибок по темам через маппинг
        var errorCountMap = {};
        for (var i = 0; i < errorIdList.length; i++) {
          var tid = _questionTopicMap[errorIdList[i]];
          if (tid !== undefined) {
            errorCountMap[tid] = (errorCountMap[tid] || 0) + 1;
          }
        }

        // 6. Обогащаем темы полем errorCount
        var enriched = rawTopics.map(function (t) {
          return { ...t, errorCount: errorCountMap[t.topic_id] || 0 };
        });

        if (!cancelled) {
          setTopics(enriched);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Ошибка загрузки тем');
          setLoading(false);
        }
      }
    }

    load();
    return function () { cancelled = true; };
  }, []);

  return { topics: topics, loading: loading, error: error };
}
