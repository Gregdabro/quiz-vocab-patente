# Quiz Patente — Полный технический аудит
> Версия: 1.0 · Дата: 2026-05  
> Аудитор: Senior Staff Engineer  
> Проект: `quiz-vocab-patente`  
> Эталон: `quiz-patente-master-plan.md` + `NLP_ANALYSIS.md`

---

## 1. Executive Summary

### Общая оценка

Проект находится в состоянии **функциональной беты** с несколькими **критическими архитектурными дефектами**, которые **полностью разрушают основной учебный флоу** (vocab-first). Большинство компонентов реализованы технически грамотно и в целом следуют планируемой архитектуре — что является несомненным достоинством. Однако цепочка из трёх взаимосвязанных дефектов делает систему vocab-first функционально мёртвой для конечного пользователя.

### Главные сильные стороны

- Архитектура сервисного слоя (services/) **безупречна** и полностью готова к замене на API
- `vocabService.js` с Leitner-4 реализован **правильно и полно** — лучшая часть проекта
- `blockService.js` — надёжная реализация, хорошая защита от граничных случаев
- CSS написан с **явным учётом iOS 12**: нет `gap` в flexbox, комментарии с пометкой «iOS 12 fix»
- Python-скрипты генерации данных **запущены и дали результат** — 25 vocab + 25 blocks JSON файлов присутствуют
- `useQuiz.js` — правильная защита от race condition через `answeringRef`, корректный `cancelled` флаг в `useEffect`

### Главные слабости

1. ~~**КРИТИЧНО: `translation_ru: null` у 100% (3001 из 3001) слов**~~ → **RESOLVED 2026-05-14:** Статистическое word alignment из параллельного корпуса. 92.9% заполнено.
2. ~~**КРИТИЧНО: `HomePage` ведёт на `/quiz/:topicId`, минуя `/topic/:topicId`**~~ → **RESOLVED 2026-05-14:** Добавлена TrainingPage + пункт «Тренировка» в BottomNav.
3. ~~**КРИТИЧНО: отсутствует interleaving вопросов**~~ → **RESOLVED 2026-05-16:** `random.shuffle` добавлен для типов A и C.
4. **ВЫСОКОЕ: `completeBlock` вызывается с `totalBlocks=999`** — магическое число делает последний блок недостижимым в корректном состоянии.
5. **ВЫСОКОЕ: `example_question_id` присутствует в vocab JSON, но карточка его не показывает** — ключевой принцип «пример из реального вопроса» не реализован.
6. **СРЕДНЕЕ: `VocabCard` не реализует errorful generation** — показывает слово И перевод одновременно, хотя NLP_ANALYSIS требует «слово скрыто, перевод открывается по клику».

### Оценки (0–10)

| Область | Оценка |
|---|---|
| Архитектурное качество (сервисный слой) | 8/10 |
| Качество данных (vocab JSON) | 7/10 (92.9% переводов, 212 артефактов лемматизации) |
| UX качество | 6/10 (+1 vocab-first доступен через TrainingPage) |
| Качество обучающей системы | 5/10 (+1 переводы работают) |
| Производительность | 7/10 |
| CSS / Совместимость | 8/10 |
| Готовность к релизу | 5/10 (+2 критические исправлены) |

**Вердикт (обновлён 2026-05-14):** 3 критических блокера устранены. Проект пригоден для beta.

---

## 2. Master Plan Compliance Matrix

| Подсистема | Запланировано | Реализовано | Статус | Серьёзность | Примечания |
|---|---|---|---|---|---|
| Фаза 1: QuizPage (random mode) | ✅ | ✅ | Полностью | — | Корректно, race condition защита есть |
| Фаза 1: HomePage | ✅ | ⚠️ | Частично | КРИТИЧНО | Ведёт на `/quiz/` вместо `/topic/`, минуя vocab-фазу |
| Фаза 1: StatsPage | ✅ | ✅ | Полностью | — | Реализована, не placeholder |
| Фаза 1: ErrorsPage | ✅ | ✅ | Полностью | — | Корректна, включая batching |
| Фаза 1: progressService | ✅ | ✅ | Полностью | — | Точно по контракту |
| Фаза 1: errorsService | ✅ | ✅ | Полностью | — | Включает getErrorCountForQuestions |
| Фаза 1: questionsService | ✅ | ✅ | Полностью | — | loadBlockQuestions добавлен |
| Фаза 1: useQuiz | ✅ | ✅ | Полностью | — | isBlockMode, blockPassed реализованы |
| Фаза 2: generate-vocab.py | ✅ | ✅ | Полностью (2026-05-14) | — | Скрипт есть, переводы заполнены через align-translations.py (92.9%) |
| Фаза 2: generate-blocks.py | ✅ | ⚠️ | Частично | ВЫСОКОЕ | Блоки есть, interleaving не реализован |
| Фаза 2: global_vocab.json | ✅ | ✅ | Полностью | — | 22 слова присутствуют с переводами |
| Фаза 3: vocabService (Leitner-4) | ✅ | ✅ | Полностью | — | Точная реализация алгоритма |
| Фаза 3: blockService | ✅ | ✅ | Полностью | — | Корректно, магич. число 999 — технический долг |
| Фаза 3: useVocab | ✅ | ✅ | Полностью | — | Все три режима: block/global/free |
| Фаза 3: useBlocks | ✅ | ✅ | Полностью | — | |
| Фаза 3: VocabCard | ✅ | ⚠️ | Частично | СРЕДНЕЕ | Переводы есть (92.9%), errorful generation реализован, пример из вопроса — ожидает |
| Фаза 3: VocabSession | ✅ | ✅ | Полностью | — | Все состояния обработаны |
| Фаза 3: VocabProgress | ✅ | ✅ | Полностью | — | Аналог QuizPagination |
| Фаза 3: BlockSelectPage | ✅ | ✅ | Полностью | — | Корректно, все состояния |
| Фаза 3: DictionaryPage | ✅ | ✅ | Полностью | — | Лучше, чем запланировано (добавлен Leitner-бейдж) |
| Фаза 3: VocabSessionPage | ✅ | ✅ | Полностью | — | Включая /vocab/global |
| Нулевой урок (onboarding) | ✅ | ✅ | Полностью | — | Перенаправление при первом запуске |
| QuizPage: блочный режим | ✅ | ✅ | Полностью | — | Получает blockId из URL или location.state |
| QuizPage: random режим | ✅ | ✅ | Полностью | — | Сохранён параллельно |
| Interleaving вопросов в блоке | ✅ | ✅ | Полностью (2026-05-16) | — | random.shuffle добавлен, макс. последовательных снижен с 26 до 13 |
| cross-topic vocab tracking | Фаза 4 | ❌ | Отложено | — | Корректно отложено |
| "Exam Traps" режим | Фаза 4 | ❌ | Отложено | — | Корректно отложено |
| Image-first карточки | ✅ (ч/з sign_images) | ⚠️ | Частично | ВЫСОКОЕ | Изображение есть, но перевод null |
| Числовые карточки (тип C) | Фаза 4 | ❌ | Отложено | — | Отложено, но нет спец. рендера для чисел |
| ProgressSummary (HomePage) | ✅ | ✅ | Полностью | — | Компонент добавлен сверх плана |

---

## 3. Architecture Audit

### 3.1 Роутинг

**Актуальная карта маршрутов** соответствует master-plan с расширениями:

```
/                          → HomePage
/quiz/:topicId             → QuizPage (random)
/quiz/:topicId/block/:blockId → QuizPage (block mode)
/topic/:topicId            → BlockSelectPage  ← ПРАВИЛЬНАЯ точка входа для vocab-first
/vocab/:topicId            → VocabSessionPage
/errors                    → ErrorsPage
/stats                     → StatsPage
/dictionary                → DictionaryPage
```

**Дефект:** `HomePage` при клике на карточку темы вызывает `navigate('/quiz/${topic.topic_id}')`, а не `navigate('/topic/${topic.topic_id}')`. Это означает, что весь блочный флоу (vocab → тест → разблокировка) **недостижим с главной страницы**. Пользователь может попасть в BlockSelectPage только через BottomNav (нет такой вкладки) или зная URL вручную. 

**Вывод:** Маршрутизация технически правильная, но точка входа в vocab-first флоу не подключена к основному навигационному паттерну.

**Исправление (2026-05-14):** 
- Создана `TrainingPage.jsx` — отдельная страница выбора темы для vocab-first блочного флоу (клик по теме → `/topic/:id`).
- Добавлен пункт «Тренировка» в `BottomNav` между «Главная» и «Ошибки».
- Добавлен маршрут `/training` в `App.jsx`.
- `HomePage` сохранена без изменений (базовый квиз через `/quiz/:id`).
- **Статус:** RESOLVED. Vocab-first флоу теперь достижим через BottomNav → Тренировка → выбор темы → BlockSelectPage.

### 3.2 Сервисный слой

Это **лучшая часть проекта**. Абстракция работает идеально:

- Все сервисы используют `var` вместо `const/let` — это намеренно для ES5-совместимости через legacy plugin. Корректно.
- `try/catch` везде, graceful degradation на `{}` при ошибке парсинга.
- Ни один компонент не обращается к `localStorage` напрямую — принцип соблюдён.

**Единственная проблема (исправлено 2026-05-16):** ~~В `useQuiz.js` вызов `completeBlockService(topicId, parseInt(blockId, 10), 999)` — магическое число.~~ **RESOLVED:** `useQuiz` теперь загружает блоки через `loadBlocks()` и передаёт реальное `totalBlocks`. `blockService.completeBlock` при `nextBlock > totalBlocks` оставляет `current_block` на последнем блоке и устанавливает `topic_completed: true`.

### 3.3 Хуки

**useQuiz.js** — профессиональная реализация:
- `answeringRef` предотвращает двойной клик (race condition)
- `isSavedRef` предотвращает двойное сохранение статистики
- `cancelled` флаг предотвращает setState после размонтирования
- Все topicId варианты обрабатываются

Небольшой дефект: `isBlockMode` входит в зависимости `useEffect` (`[topicId, blockId, isBlockMode, sessionKey]`), но `isBlockMode` — производная от `blockId`, поэтому при изменении `blockId` эффект запускается дважды (один раз из-за `blockId`, второй из-за `isBlockMode`). На практике это не вызывает проблем из-за `cancelled` флага, но излишне.

**useVocab.js** — функционально корректен, но написан в неидиоматичном стиле. Использование `var _a = useState(...)` вместо деструктуризации — очевидно, попытка поддержать старые движки, но `@vitejs/plugin-legacy` транспилирует деструктуризацию автоматически. Это создаёт 15+ лишних строк кода. Функциональных дефектов нет.

**Потенциальный баг в useVocab:** `useEffect` зависит от `freeVocabIds` (массив). Массив пересоздаётся на каждом рендере через `useMemo` в `DictionaryPage`, но `useMemo` зависит от `vocabData` — что корректно. Однако если бы `allVocabIds` передавался без `useMemo`, эффект зацикливался бы. Текущая реализация в `DictionaryPage` использует `useMemo` — правильно.

**useVocab режим 'block':** Хук загружает `block.vocab_ids` (все vocab блока), а не `block.new_vocab_ids`. Это правильно с точки зрения Leitner — повторные карточки должны тоже показываться по расписанию. Но для первого блока любой темы `new_vocab_ids = vocab_ids` (все 30 слов новые), что создаёт очень длинную первую сессию.

**useBlocks.js:** Прогресс не обновляется при возврате из QuizPage. Когда пользователь завершил блочный квиз и нажал «К блокам» (через `onFinish` в ResultScreen → `navigate(backPath)` → `/topic/:topicId`), `BlockSelectPage` монтируется заново. Хук `useBlocks` инициализирует `progress` через `useState(() => getBlockProgress(topicId))` — это **корректно** для монтирования, localStorage уже обновлён в `useQuiz`. Проблем нет.

### 3.4 Data Flow

```
JSON (static) → services (async import) → hooks (state) → components (render)
localStorage → services (sync R/W) → hooks (state) → components
```

Поток данных чистый. Единственное нарушение: `useErrorTopics.js` содержит комментарий «2. Читаем ошибки из localStorage — синхронно, без запросов» — это документирование прямого вызова `getErrors()` из service, что абсолютно корректно.

### 3.5 State Management

Локальное состояние через `useState` — правильно для масштаба приложения. Нет prop drilling глубже 2 уровней. Нет Context — не нужен.

Единственный паттерн, вызывающий вопросы: `VocabSession` дублирует трекинг рейтингов (`ratings` state) поверх `useVocab` (который сам ведёт `ratedIndices`). Это объясняется тем, что `useVocab` возвращает только `Set<index>`, а `VocabSession` нужен `Map<cardId, rating>` для построения `ratedIndices` для `VocabProgress`. Дублирование оправдано архитектурно.

### 3.6 localStorage

Четыре ключа: `qp_progress`, `qp_errors`, `qp_vocab`, `qp_block_prog` + `qp_onboarding_done`.

Все операции обёрнуты в try/catch. Нет прямого доступа из компонентов. Нет утечек между сессиями. Нет риска коррупции данных (простой JSON, merge-стратегия).

**Динамические импорты (исправлено 2026-05-14):** `blockService.js`, `vocabService.js` и `questionsService.js (loadBlockQuestions)` переведены с `import(/* @vite-ignore */)` на `import.meta.glob()`. Vite теперь статически включает все blocks/vocab JSON в production bundle — риск 404 устранён.

**Потенциальная проблема:** `qp_vocab` будет расти со временем. При 3001 слове * ~50 байт на запись = ~150 KB. Для localStorage (обычно 5 MB лимит) — безопасно. Однако на iPad mini 2 с iOS 12 localStorage может быть ограничен 2.5 MB. При 25 темах * 120 слов * 50 байт = ~150 KB — в пределах нормы.

---

## 4. NLP & Learning-System Audit

### 4.1 Критический дефект: translation_ru = null для 3001 слов (100%) — RESOLVED 2026-05-14

~~Это **самый серьёзный дефект всего проекта**. Python-скрипт `generate-vocab.py` жёстко прописывает `'translation_ru': None` — переводы никогда не генерировались.~~

**Исправление:**
- Создан `scripts/align-translations.py` — статистическое word alignment из параллельного корпуса 7041 вопросов (IT→RU).
- Используется pymorphy3 для лемматизации русских слов (нормализация падежей).
- Co-occurrence TF-IDF scoring для выбора лучшего перевода.
- 68 ручных исправлений для ключевых многословных терминов (напр. `veicolo` → `транспортное средство`).
- `generate-vocab.py` модифицирован: загружает `translation_cache.json` и заполняет `translation_ru` через `_translate()`.
- Все 25 topic vocab + global_vocab перегенерированы.

**Результат:** 2789 из 3001 записей (92.9%) имеют переводы.
- 1061 из 1153 уникальных слов (92%) — с переводами
- 68 ручных исправлений
- 212 записей без перевода — артефакты лемматизации spaCy (см. задачу ниже)

**Оставшаяся задача:** 212 слов без перевода (7.1%) — итальянский spaCy ошибочно лемматизирует существительные как глаголы (напр. `carreggiata` → `carreggiare`, `bicicletta` → `biciclettare`). Эти «слова» не существуют в текстах вопросов → выравнивание невозможно. Требуется исправление лемматизации в `generate-vocab.py`.

### 4.2 Отсутствие примеров из реальных вопросов в карточке

NLP_ANALYSIS.md (Часть 2.3) требует:
> «Один пример предложения из реального вопроса экзамена»

В vocab JSON присутствует поле `example_question_id`. В `VocabCard.jsx` это поле **не используется**. Карточка не загружает и не показывает реальный пример предложения. Это нарушает принцип «контекстной привязки» и «errorful generation» из раздела психологии обучения.

### 4.3 Errorful generation не реализован — RESOLVED 2026-05-16

~~Master-plan (раздел 7, принцип 3): «Показывать итальянское слово → студент вспоминает перевод до показа.» `VocabCard` показывает слово и перевод одновременно, нет механизма «flip card».~~

**Исправление:** Добавлен state `revealed` (по умолчанию `false`). Перевод скрыт за кнопкой «Показать перевод». После раскрытия появляются кнопки оценки. При смене карточки `revealed` сбрасывается. Для карточек без перевода (212) кнопки оценки доступны сразу.

### 4.4 Interleaving вопросов в блоках — RESOLVED 2026-05-16

~~NLP_ANALYSIS.md (Часть 5.2): «Перемешивать вопросы разных знаков внутри блока». В `topic_2_blocks.json`, блок 1: 28 вопросов знака 014.jpg подряд. `generate-blocks.py` использует round-robin `_interleave()`, но при доминировании одного знака образуется «хвост» из вопросов одного знака.~~

**Исправление:**
- Тип A: добавлен `random.shuffle(final_qids)` после `_interleave()` — макс. последовательных одного знака снижен с 26 до 13.
- Тип C: сортировка по длине текста заменена на `random.shuffle(questions)`.
- Все 25 `topic_N_blocks.json` перегенерированы.

**Ограничение:** При 28/30 вопросов от одного знака shuffle не может полностью устранить последовательности. Требуется улучшение алгоритма блочного построения (распределение доминирующих знаков по нескольким блокам).

### 4.5 Leitner-4 — корректная реализация

Алгоритм реализован точно по спецификации:
- Интервалы [0, 1, 3, 7, 30] блоков
- `know` → box+1, `hard` → box без изменений, `dontknow` → box-1
- Составной ключ `{topicId}_{vocabId}` — корректно (ID не уникальны глобально)
- `isCardDue` — правильная логика проверки

Единственный нюанс: для `box=0` интервал `0`, то есть `currentBlock - null >= 0` всегда `true` (т.к. `null` в арифметике даёт 0). Это корректное поведение — новые карточки показываются всегда.

### 4.6 Типология тем A/B/C

`topic_type` поле присутствует в blocks JSON и используется в `BlockSelectPage` для выбора отображения (знаки для A, шаблонные фразы для B/C, числовые правила для C). Логика корректна.

### 4.7 Первый блок как самый сложный (нелогичный порядок)

Block 1 темы 2 содержит знак `014.jpg` (трамвай, 28 вопросов — самый частый знак). По логике master-plan первый блок должен быть **самым лёгким** (наибольшее пересечение с базовым словарём). Однако `overlap_score=1.0` у блоков 1 и 2 (и у блока 12) — это означает, что алгоритм использовал `overlap_coefficient` по-другому.

Вероятная причина: score 1.0 означает 100% пересечение внутри блока (все слова блока пересекаются друг с другом), а не пересечение с базовым словарём темы. Порядок блоков определяется по BFS-обходу графа, но без учёта сложности лексики для начинающего. «Трамвай» (014.jpg) — специфический знак, не самый простой для старта.

---

## 5. UX/UI Audit

### 5.1 Главный UX-дефект: vocab-first недостижим с главной страницы — RESOLVED 2026-05-14

```
Пользователь открывает приложение
  → Нулевой урок (22 слова) ← OK
  → HomePage (25 тем)
  → Клик на тему
  → /quiz/N (случайные 30 вопросов) ← базовый квиз (сохранён)
  
  ИЛИ (новый путь):
  → BottomNav «Тренировка»
  → TrainingPage (выбор темы)
  → Клик на тему
  → /topic/N (BlockSelectPage) ← vocab-first флоу
```

**Исправление:** Добавлена `TrainingPage` + пункт «Тренировка» в `BottomNav` + маршрут `/training`. `HomePage` сохранена без изменений — ведёт на базовый квиз.

### 5.2 Onboarding

Нулевой урок работает корректно: при первом запуске `isOnboardingDone()` возвращает `false`, и `useEffect` в `HomePage` делает `navigate('/vocab/global', { replace: true })`. Флаг устанавливается в `VocabSessionPage` при нажатии «Продолжить». Поведение правильное.

**Потенциальная проблема:** Если пользователь закрывает приложение во время нулевого урока не нажав «Продолжить», `qp_onboarding_done` не устанавливается, и при следующем открытии его снова перенаправят на урок. Это **корректное поведение** — урок завершён не был.

### 5.3 BlockSelectPage UX

Кнопка «Тест» заблокирована (`disabled`) пока не пройдена vocab-фаза (`vocabDone=false`). Это принудительный vocab-first. Однако в BlockCard нет объяснения **почему** кнопка заблокирована — пользователь не понимает, что нужно нажать «Слова». Рекомендация: добавить tooltip или текст-подсказку.

### 5.4 QuizPage — auto-advance

После ответа на вопрос квиз **не переходит автоматически** к следующему. Пользователь должен свайпнуть или кликнуть на следующий кружок в пагинации. Для учебного приложения с 30 вопросами это **дополнительное трение**. Master-plan не специфицировал auto-advance, но в большинстве подобных приложений он используется.

### 5.5 ResultScreen — информация о blockPassed

`ResultScreen` получает `passThreshold` (80 для блочного режима, 87 для обычного) и показывает `isPassed`. Но `blockPassed` из `useQuiz` в `QuizPage` не используется напрямую — он рассчитывается повторно внутри `ResultScreen` через `scorePercent >= passThreshold`. Это избыточное дублирование логики, хотя результат одинаков.

`ResultScreen` не сообщает пользователю «следующий блок разблокирован» — важный мотивационный момент.

### 5.6 VocabCard UX

**Хорошо:**
- Кнопки оценки [Не знаю] / [Сложно] / [Знаю] блокируются после нажатия
- Feedback-сообщение появляется после оценки
- Автопереход к следующей неоценённой карточке

**Плохо:**
- ~~Нет flip-анимации (показать/скрыть перевод)~~ → RESOLVED: кнопка «Показать перевод»
- ~~Перевод показывается сразу (пассивное чтение вместо errorful generation)~~ → RESOLVED
- Изображение знака занимает много места, но показывается только первый знак — для слова `tratto strada`, связанного с 24 знаками, это бессмысленно

### 5.7 DictionaryPage

Лучше, чем планировалось. Добавлена группировка по `semantic_group`, Leitner-бейдж (`L0`–`L4`), статистика (слов / групп / изучено). Это полезные дополнения сверх плана.

**Проблема:** `useVocab` вызывается с `selectedTopicId || 0` когда тема не выбрана. Это вызывает попытку загрузить `topic_0_vocab.json` (несуществующий файл). Файл не найден → возвращается `[]` (пустой массив) → `vocab.isFinished = true` (т.к. `total = 0`). Это не крашит приложение, но запускает ненужный сетевой запрос при каждом рендере в состоянии «выбор темы».

---

## 6. Performance Audit

### 6.1 Загрузка данных

`loadAllQuestions()` загружает ВСЕ 25 тем батчами по 5. При режиме `topicId='all'` или `topicId='errors'` это **всегда** делает 25 динамических импортов. На iPad mini 2 с медленным соединением это может занять 2-4 секунды. Spinner есть, UX деградации нет, но время ожидания значительное.

Потенциальное улучшение для режима `errors`: сначала загрузить только темы, в которых есть ошибки (из `qp_errors`), а не все 25.

### 6.2 Динамические импорты блоков и словарей — RESOLVED 2026-05-14

~~`blockService.loadBlocks()` и `vocabService.loadTopicVocab()` используют template literal в `import()` с комментарием `/* @vite-ignore */`. Это означает Vite **не включает** эти файлы в граф зависимостей автоматически.~~

**Исправлено:** `blockService.js`, `vocabService.js` и `questionsService.js (loadBlockQuestions)` переведены на `import.meta.glob()`. Все 25 blocks JSON + 25 vocab JSON + global_vocab JSON теперь статически включаются в production bundle как отдельные чанки.

### 6.3 Re-renders

`ProgressSummary` в `HomePage` пересчитывает статистику на каждом рендере. Нет `useMemo`. При 25 темах это `Object.values(progress).filter(...)` × 2 — тривиально по стоимости, не проблема.

`VocabSession` пересоздаёт `Set ratedIndices` на каждом рендере через `for` цикл. При 30 карточках — тривиально.

### 6.4 CSS производительность

Нет `backdrop-filter`, нет тяжёлых `filter`, нет `position: fixed` кроме header и BottomNav (которые неизбежны). Тени минимальны (`box-shadow` без blur > 12px). Совместимо с GPU iPhone A7 в iPad mini 2.

---

## 7. CSS & Compatibility Audit

### 7.1 iOS 12 / Chrome 92 совместимость

**Хорошо:**
- Нет `gap` в flexbox (явные комментарии «iOS 12 fix»)
- Все отступы через `margin-*`
- `@vitejs/plugin-legacy` с таргетами `ios_saf >= 12, safari >= 12, chrome >= 92`
- `build.target: ['es2015', 'safari12', 'ios12']`

**Потенциальные проблемы:**
- `CSS Custom Properties (variables)` — поддерживаются в Chrome 49+, iOS 10+ ✅
- ~~`position: sticky` для AppHeader без `-webkit-sticky`~~ → **RESOLVED 2026-05-16:** Добавлен `-webkit-sticky` префикс в `.app-header` CSS-класс, убран из inline style.

### 7.2 CSS структура

3113 строк CSS разделены на 4 файла. Это управляемо. Нет конфликтов специфичности, нет `!important` (не найдено).

**Наблюдение:** `global.css` — 136 строк (переменные), `layout.css` — 81 строка, `components.css` — 1346 строк, `pages.css` — 1550 строк. Соотношение компонентов к страницам необычное — страницы слишком «жирные», много уникальных стилей вместо переиспользования компонентных классов.

### 7.3 Именование

BEM-like naming (`block__element--modifier`) последователен. Нет inline `style=` кроме динамических значений (ширина прогресс-бара, цвет метки типа темы). Корректно.

---

## 8. Bug List

| Серьёзность | Файл | Проблема | Влияние | Рекомендация |
|---|---|---|---|---|
| 🔴 КРИТИЧНО | `src/data/vocabulary/topic_*_vocab.json` | ~~`translation_ru: null` у 100% слов~~ **RESOLVED 2026-05-14:** Статистическое word alignment из параллельного корпуса + 68 ручных правок. 92.9% заполнено. | RESOLVED (212 артефактов лемматизации — отдельная задача) |
| 🔴 КРИТИЧНО | `src/pages/HomePage.jsx:49` | `navigate('/quiz/${topic.topic_id}')` вместо `/topic/` | ~~Весь vocab-first флоу недостижим с главной~~ **RESOLVED 2026-05-14:** Добавлена TrainingPage + пункт «Тренировка» в BottomNav. HomePage сохранена для базового квиза. | RESOLVED |
| 🟠 ВЫСОКОЕ | `src/hooks/useQuiz.js:146,184` | ~~`completeBlockService(..., 999)`~~ **RESOLVED 2026-05-16:** `useQuiz` загружает реальное `totalBlocks` через `loadBlocks()`; `blockService.completeBlock` добавляет `topic_completed: true` при завершении всех блоков | RESOLVED |
| 🟠 ВЫСОКОЕ | `scripts/generate-blocks.py` | ~~Вопросы в блоке не перемешиваются~~ **RESOLVED 2026-05-16:** `random.shuffle` добавлен для типов A (после interleave) и C (вместо сортировки по длине) | RESOLVED |
| 🟠 ВЫСОКОЕ | `src/services/blockService.js`, `vocabService.js`, `questionsService.js` | ~~`import(/* @vite-ignore */ ...)`~~ **RESOLVED 2026-05-14:** заменено на `import.meta.glob()` во всех трёх файлах | RESOLVED |
| 🟡 СРЕДНЕЕ | `src/components/vocab/VocabCard.jsx` | `example_question_id` не используется | Нет примера из реального вопроса | Загрузить вопрос по ID и показать текст |
| 🟡 СРЕДНЕЕ | `src/components/vocab/VocabCard.jsx` | ~~Нет flip-механизма (errorful generation)~~ **RESOLVED 2026-05-16:** Добавлен state `revealed`, кнопка «Показать перевод», кнопки оценки после раскрытия | RESOLVED |
| 🟡 СРЕДНЕЕ | `src/pages/DictionaryPage.jsx:58` | `useVocab(selectedTopicId \|\| 0, ...)` | При selectedTopicId=null загружается topic_0 (несуществующий) | Условно вызывать useVocab только при selectedTopicId !== null (или вынести в отдельный компонент) |
| 🟡 СРЕДНЕЕ | `src/hooks/useQuiz.js:99` | `isBlockMode` в deps массиве useEffect | isBlockMode — производная от blockId, двойной триггер эффекта | Убрать `isBlockMode` из зависимостей |
| 🟡 СРЕДНЕЕ | `src/components/vocab/VocabCard.jsx:33` | `useEffect(..., [card && card.id])` | Нестандартный dependency (выражение вместо значения) | `[card?.id]` или `[card]` |
| 🟡 СРЕДНЕЕ | `src/styles/layout.css` | ~~`position: sticky` без `-webkit-sticky`~~ **RESOLVED 2026-05-16:** Добавлен `-webkit-sticky` префикс в CSS-класс `.app-header`, убран из inline style | RESOLVED |
| 🟢 НИЗКОЕ | `src/pages/BlockSelectPage.jsx` | Нет объяснения почему кнопка «Тест» заблокирована | UX непонятен | Добавить tooltip или текст под кнопкой |
| 🟢 НИЗКОЕ | `src/components/quiz/ResultScreen.jsx` | Не сообщает об разблокировке следующего блока | Слабая мотивация | Добавить «🎉 Следующий блок разблокирован!» |
| 🟢 НИЗКОЕ | `src/hooks/useVocab.js` | `var _a = useState(...)` вместо деструктуризации | Читаемость кода | Рефакторинг на стандартный синтаксис (legacy plugin всё равно транспилирует) |
| 🟢 НИЗКОЕ | Все сервисы | `var` вместо `const/let` | Читаемость кода | Не критично (legacy plugin транспилирует оба варианта), но рефакторинг улучшит DX |

---

## 9. Dead Code & Duplication Report

### Дублирование логики

1. **`blockPassed` vs `isPassed` в ResultScreen.** `useQuiz` вычисляет `blockPassed`, QuizPage передаёт его... нет, он передаёт `passThreshold=80`, а `ResultScreen` сам вычисляет `isPassed`. `blockPassed` из `useQuiz` нигде не используется в UI — он только используется как флаг для вызова `completeBlockService`. Можно упростить.

2. **Дублирование трекинга оценок.** `useVocab` ведёт `ratedIndices` (Set индексов). `VocabSession` ведёт `ratings` (Map cardId→rating). Оба нужны для разных целей, но есть дублирование факта «была ли оценена карточка».

3. **`loadTopics` в `questionsService.js` и `useTopics.js`.** `questionsService` экспортирует `loadTopics()`, который просто возвращает `topicsData` (прямой импорт JSON). Это правильно как абстракция, но `topicsData` уже синхронно доступен — обёртка в `async function` излишняя. Работает корректно.

### Неиспользуемые поля данных

- `example_question_id` в vocab JSON — поле присутствует, но ни один компонент его не читает
- `lemma` в vocab JSON — поле не используется в frontend
- `level` (0/1/2/3) в vocab JSON — поле не используется для фильтрации карточек
- `SIGN_IMAGE_BASE` определён в **двух местах**: `BlockSelectPage.jsx` и `VocabCard.jsx` — вынести в константу

---

## 10. Technical Debt Assessment

### Срочный долг (блокирует MVP)

| Долг | Файл | Сложность |
|---|---|---|
| Заполнить переводы `translation_ru` | vocab JSON × 25 | XL (требует внешний API или ручная работа) |
| Исправить навигацию HomePage → `/topic/` | HomePage.jsx | XS (1 строка) |
| Исправить `@vite-ignore` → `import.meta.glob` | blockService, vocabService | S |

### Среднесрочный долг (исправить до release)

| Долг | Файл | Сложность |
|---|---|---|
| Interleaving вопросов в блоках | generate-blocks.py | XS |
| Передача реального totalBlocks в completeBlock | useQuiz.js, blockService.js | S |
| Flip-карточка (errorful generation) | VocabCard.jsx | M |
| Пример из реального вопроса в карточке | VocabCard.jsx + vocab JSON | M |
| `-webkit-sticky` для AppHeader | layout.css | XS |
| Уведомление о разблокировке блока в ResultScreen | ResultScreen.jsx | S |

### Приемлемый долг (исправить при возможности)

| Долг | Файл | Сложность |
|---|---|---|
| Рефакторинг `var _a = useState(...)` → деструктуризация | useVocab.js, useBlocks.js | S |
| Выделить `SIGN_IMAGE_BASE` в константу | BlockSelectPage, VocabCard | XS |
| `isBlockMode` убрать из deps useEffect | useQuiz.js | XS |
| `useVocab` с `selectedTopicId=0` в DictionaryPage | DictionaryPage.jsx | S |
| Auto-advance после ответа в QuizPage | QuizPage.jsx | M |

---

## 11. Production Readiness Verdict

**Проект НЕ готов к production.**

### Блокеры (на 2026-05-14):

1. ~~**100% vocab без переводов**~~ → **RESOLVED:** 92.9% заполнено через параллельный корпус
2. ~~**Навигация с главной обходит vocab-first**~~ → **RESOLVED:** TrainingPage + BottomNav
3. ~~**Риск 404 на блоки/словари** (`@vite-ignore`)~~ → **RESOLVED:** `import.meta.glob`

### Оставшиеся критические задачи:

- **Interleaving вопросов в блоках** — не реализован
- **212 слов без перевода** — артефакты лемматизации spaCy

Проект **пригоден для beta** с оговорками:
- Отсутствие interleaving — снижение эффективности обучения
- Отсутствие flip-карточки — неоптимальная педагогика
- Нет примеров из реальных вопросов — ключевой принцип не реализован

**Стабильность риск-оценка:** 7/10 (было 6/10, +1 за устранение 3 блокеров)

---

## 12. Приоритизированный план исправлений

### Phase 1 — Критические исправления (1–2 дня)

**1.1 Исправить навигацию HomePage** — ✅ RESOLVED 2026-05-14
- Файлы: `src/pages/TrainingPage.jsx` (новый), `src/App.jsx`, `src/components/layout/BottomNav.jsx`
- Решение: Создана TrainingPage (выбор темы → `/topic/:id`), добавлен пункт «Тренировка» в BottomNav. HomePage сохранена без изменений.
- Сложность: XS
- Проверка: клик «Тренировка» → выбор темы → /topic/N → BlockSelectPage

**1.2 Исправить динамические импорты в blockService и vocabService** — ✅ RESOLVED 2026-05-14
- Файлы: `src/services/blockService.js`, `src/services/vocabService.js`, `src/services/questionsService.js`
- Заменено: `import(/* @vite-ignore */ ...)` → `import.meta.glob(...)` во всех трёх файлах
- `loadBlockQuestions()` теперь вызывает `loadBlocks()` из blockService вместо inline-импорта
- Сложность: S
- Проверка: production build — 25 blocks чанков + 25 vocab чанков + global_vocab чанк в сборке

**1.3 Заполнить переводы translation_ru** — ✅ RESOLVED 2026-05-14
- Файлы: `scripts/align-translations.py` (новый), `scripts/translation_cache.json` (новый), `scripts/generate-vocab.py` (модифицирован), 25 topic vocab + global_vocab (перегенерированы)
- Решение: Статистическое word alignment из параллельного корпуса 7041 вопросов (pymorphy3 + co-occurrence TF-IDF). 68 ручных правок ключевых терминов.
- Результат: 2789/3001 записей (92.9%) с переводами. 1061/1153 уникальных слов (92%).
- Оставлено: 212 артефактов лемматизации spaCy → задача 4.4
- Сложность: L (алгоритм + данные)
- Проверка: `VocabCard` отображает перевод под итальянским словом

### Phase 2 — Архитектурная стабилизация (2-3 дня)

**2.1 Добавить interleaving в generate-blocks.py** — ✅ RESOLVED 2026-05-16
- Файл: `scripts/generate-blocks.py`
- Изменения: `random.shuffle(final_qids)` для типа A (после round-robin), `random.shuffle(shuffled_qs)` для типа C (вместо сортировки по длине)
- Все 25 `topic_N_blocks.json` перегенерированы
- Результат: макс. последовательных одного знака снижен с 26 до 13 (для блока с 28/30 одного знака)
- Сложность: XS

**2.2 Исправить completeBlock с totalBlocks=999** — ✅ RESOLVED 2026-05-16
- Файлы: `src/hooks/useQuiz.js`, `src/services/blockService.js`
- Решение: `useQuiz` загружает блоки через `loadBlocks()` параллельно с вопросами и передаёт `blocks.length` в `completeBlock`. `blockService.completeBlock` при `nextBlock > totalBlocks` оставляет `current_block` на последнем блоке и устанавливает `topic_completed: true`.
- Сложность: S

**2.3 Добавить `-webkit-sticky` для AppHeader** — ✅ RESOLVED 2026-05-16
- Файлы: `src/styles/layout.css`, `src/components/layout/AppHeader.jsx`
- Добавлен CSS-класс `.app-header` с `position: -webkit-sticky; position: sticky;`. `position: 'sticky'` убран из inline style в AppHeader.
- Сложность: XS

### Phase 3 — UX улучшения (3-5 дней)

**3.1 Реализовать flip-карточку (errorful generation)** — ✅ RESOLVED 2026-05-16
- Файлы: `src/components/vocab/VocabCard.jsx`, `src/styles/components.css`
- Добавлен state `revealed` (по умолчанию `false`). Кнопка «Показать перевод» → revealed=true → кнопки оценки. Для карточек без перевода кнопки оценки доступны сразу.
- Сложность: S

**3.2 Показать пример из реального вопроса**
- Файлы: `src/components/vocab/VocabCard.jsx`, `src/services/questionsService.js`
- Загрузить вопрос по `example_question_id` и показать его текст на карточке
- Сложность: M (нужна загрузка вопросов по одному ID без всего файла — или передавать вопросы в компонент)

**3.3 Уведомление о разблокировке в ResultScreen**
- Файл: `src/components/quiz/ResultScreen.jsx`
- Если `isBlockMode && isPassed` — показать «🎉 Следующий блок разблокирован!»
- Сложность: S

**3.4 Объяснить почему кнопка «Тест» заблокирована**
- Файл: `src/pages/BlockSelectPage.jsx`
- Добавить текст под кнопкой: «Сначала изучите слова этого блока»
- Сложность: XS

**3.5 Починить DictionaryPage useVocab с id=0**
- Файл: `src/pages/DictionaryPage.jsx`
- Перенести `useVocab` в отдельный компонент, который рендерится только при `selectedTopicId !== null`
- Сложность: S

### Phase 4 — Обучающая система (1-2 недели)

**4.4 Исправить лемматизацию spaCy — 212 слов без перевода** 🆕
- Файл: `scripts/generate-vocab.py`
- Проблема: Итальянский spaCy (`it_core_news_sm`) ошибочно лемматизирует существительные как глаголы: `carreggiata` → `carreggiare`, `bicicletta` → `biciclettare`, `autoveicolo` → `autoveicolare`. Эти леммы не существуют в текстах вопросов → `translation_ru = null`.
- Решение: В `process_topic_v2` использовать оригинальную форму слова (из `word_to_qids` или частотного анализа) вместо леммы spaCy для поля `word`. Или: в `align-translations.py` искать по оригинальной форме из вопросов, а не по лемме.
- Сложность: M
- Проверка: 0 слов без перевода после перегенерации

**4.1 Числовые карточки для тем C (11, 12, 20...)**
- Специальный рендер в `VocabCard` для слов с `number_rules`
- Шаблон с пропуском: `«Il limite massimo di velocità sulle autostrade è di ___»`
- Сложность: M

**4.2 Cross-topic vocab tracking**
- При загрузке vocab-сессии — фильтровать слова, уже освоенные в других темах
- Требует глобального словаря с mapping word→topics
- Сложность: L

**4.3 Exam Traps режим**
- Найти пары вопросов (cosine sim > 0.85) с разными ответами
- Отдельный режим в QuizPage или отдельная страница
- Сложность: M (Python) + M (frontend)

### Phase 5 — Performance & Polish

**5.1 Оптимизировать режим 'errors' в useQuiz**
- Загружать только темы, где есть ошибки (из qp_errors) вместо всех 25
- Сложность: S

**5.2 Auto-advance после ответа**
- Автопереход через 800мс к следующему вопросу
- Опциональная настройка
- Сложность: S

**5.3 Рефакторинг useVocab, useBlocks на современный синтаксис**
- `var _a = useState(...)` → `const [state, setState] = useState(...)`
- Сложность: S (косметика)

---

## 13. Финальные стратегические рекомендации

### Что сделано правильно и трогать не нужно

- Архитектура `services/` — идеальна, не менять
- `vocabService.js` с Leitner-4 — эталонная реализация, не менять
- CSS-совместимость с iPad mini 2 — грамотно, продолжать в том же духе
- `useQuiz.js` с race condition защитой — не менять
- Структура `topic_N_blocks.json` и `topic_N_vocab.json` — корректна, нужно только заполнить переводы

### Что нужно переписать

- `generate-vocab.py` в части генерации переводов — добавить интеграцию с DeepL API или создать ручной словарь для топ-500 слов
- Навигацию в `HomePage` — одна строка (XS)
- Динамические импорты в `blockService` и `vocabService` — перейти на `import.meta.glob`

### Что было переусложнено

- `useVocab.js` — написан в стиле ES5 (`var _a = useState(...)`) вместо использования транспилятора. Legacy plugin делает это автоматически. Читаемость ухудшена без причины.
- `BlockSelectPage` с инлайн-VocabSession — громоздко. Лучше всегда переходить на `/vocab/:topicId` и возвращаться назад. Инлайн-рендер создаёт дублирование кода и усложняет поддержку.

### Что было недооценено

- **Переводы** — самая трудоёмкая часть всей системы, полностью пропущена
- **Пример из реального вопроса** — ключевой педагогический принцип, требует нетривиальной интеграции (загрузка вопроса по ID в контексте карточки)
- **Interleaving** — одна строка в Python-скрипте, но её отсутствие снижает эффективность обучения

### Долгосрочная устойчивость архитектуры

Архитектура **устойчива**. Абстракция services/ позволит безболезненно перейти на backend (Phase 2) без переписывания компонентов. Разделение на статические JSON-данные (questions, vocab, blocks) и динамические localStorage-данные (progress, errors, vocab progress, block progress) — правильная граница.

Единственная системная проблема: при росте числа тем или добавлении новых языков (например, ukrainский интерфейс) потребуется рефакторинг `translation_ru` → `translations: {}`. Стоит предусмотреть это в структуре vocab JSON заранее.

---

*Конец отчёта. Все выводы основаны на реальном анализе кода проекта `quiz-vocab-patente`.*
