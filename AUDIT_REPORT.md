# Технический аудит Quiz Patente — Полный отчёт

> Дата аудита: 16 мая 2026  
> Версия проекта: quiz-vocab-patente-main  
> Аудитор: Senior Staff Engineer Review  

---

## 1. Executive Summary

### Общая оценка

Проект **значительно превысил** изначальный скоуп из master-plan. На момент аудита реализованы Фазы 1, 2 и существенная часть Фазы 3, плюс добавлены не запланированные системы (TrapsPage, TrainingPage, exam_traps). Это говорит о высокой продуктивности — но создало ряд архитектурных долгов.

**Главные достоинства:**
- Полностью реализованная vocab-first система с Leitner-4, cross-topic tracking, глобальным словарём
- Грамотная сервисная архитектура — localStorage изолирован в services/, компоненты не знают о хранилище
- NLP-скрипты выполнены с высоким качеством (spaCy + TF-IDF + networkx граф знаков)
- Данные консистентны: все 25 тем имеют vocab и blocks файлы, question_ids и vocab_ids верифицированы
- Нет использования `gap:` в flex-контейнерах (критично для iOS 12)
- Хорошая защита от race conditions в useQuiz (answeringRef, isSavedRef)

**Главные проблемы:**
1. **Серьёзная проблема:** blockId передаётся через `location.state`, который теряется при обновлении страницы — URL роут `/quiz/:topicId/block/:blockId` существует в App.jsx, но BlockSelectPage его не использует
2. **Запланированное дублирование кода:** TrainingPage сейчас повторяет структуру HomePage (~65% кода идентично) — это осознанный временный шаг: в дальнейшем HomePage получит режим официального экзамена, а TrainingPage останется для bloc-first подготовки
3. Block 1 каждой темы получает 30 vocab_ids (все новые) — когнитивная перегрузка для первого блока
4. BottomNav содержит 5 вкладок — не умещается на 768px iPad mini 2 без горизонтального скролла

### Скоры

| Категория | Оценка | Комментарий |
|---|---|---|
| Release Risk Score | 3/10 | Один серьёзный баг с роутингом, остальное работает |
| Maintainability Score | 7/10 | Хорошая архитектура, временное дублирование |
| UX Quality Score | 7/10 | VERIFICA-паттерн намерен, 5 tabs — проблема |
| Architecture Quality Score | 8/10 | Сервисная абстракция — молодец |
| Learning-System Quality Score | 7/10 | Работает, но Block 1 перегружен |

**Вердикт:** Проект **beta-ready**, но не production-ready. Один серьёзный баг с роутингом блокирует релиз.

---

## 2. Master Plan Compliance Matrix

| Подсистема | Запланировано | Реализовано | Статус | Критичность | Примечания |
|---|---|---|---|---|---|
| Фаза 1: Quiz | 30 случайных вопросов | ✓ Работает | Полностью | — | |
| Фаза 1: Errors режим | /quiz/errors | ✓ + errors:topicId | Полностью | — | |
| Фаза 1: StatsPage | Placeholder | ✓ Реальная статистика | Лучше плана | — | Реализована раньше срока |
| Фаза 1: ProgressService | localStorage abstraction | ✓ Корректно | Полностью | — | |
| Фаза 1: ErrorsService | Счётчик ошибок | ✓ decrement/increment | Полностью | — | |
| Фаза 1: QuestionsService | Dynamic import + batch | ✓ + question_topic_map | Полностью + | — | loadErrorQuestions оптимизирован |
| Фаза 1: useSwipe | Touch navigation | ✓ + data-no-swipe | Полностью | — | |
| Фаза 1: SlideTransition | Анимация вопросов | ✓ | Полностью | — | |
| Фаза 1: ConfirmationModal | Выход из теста | ✓ | Полностью | — | |
| Фаза 2: generate-vocab.py | spaCy + TF-IDF | ✓ 696 строк | Полностью | — | |
| Фаза 2: generate-blocks.py | networkx граф | ✓ | Полностью | — | |
| Фаза 2: global_vocab.json | 22 универсальных слова | ✓ 22 записи | Полностью | — | |
| Фаза 2: topic_N_vocab.json | 25 тем | ✓ Все 25 | Полностью | — | |
| Фаза 2: topic_N_blocks.json | 25 тем | ✓ Все 25 | Полностью | — | |
| Фаза 3: vocabService.js | Leitner-4 | ✓ + cross-topic | Превышение | — | filterMasteredWords не в плане |
| Фаза 3: blockService.js | Прогресс блоков | ✓ Полный CRUD | Полностью | — | |
| Фаза 3: useVocab.js | 3 режима | ✓ block/global/free | Полностью | — | |
| Фаза 3: useBlocks.js | Навигация по блокам | ✓ | Полностью | — | |
| Фаза 3: VocabCard.jsx | image-first + phrase-first | ✓ + NumberCard | Полностью | — | |
| Фаза 3: VocabSession.jsx | Сессия карточек | ✓ + autoAdvance | Полностью | — | |
| Фаза 3: VocabProgress.jsx | Кружки-индикаторы | ✓ | Полностью | — | |
| Фаза 3: BlockSelectPage.jsx | Список блоков | ✓ + inline vocab | Полностью | — | |
| Фаза 3: DictionaryPage.jsx | Справочник | ✓ + inline сессия | Полностью | — | |
| Фаза 3: VocabSessionPage.jsx | /vocab/:topicId | ✓ + global режим | Полностью | — | |
| Фаза 3: Нулевой урок | 22 слова при первом запуске | ✓ Баннер + navigate | Полностью | — | |
| Фаза 3: QuizPage block режим | Конкретный блок | ✓ Частично | Частично | Высокая | blockId через state, не URL |
| Фаза 3: BlockSelectPage навигация | Блочный квиз | URL route не используется | Дефект | Высокая | state теряется при обновлении |
| Фаза 4: Exam Traps | Не запланировано в Ф3 | ✓ TrapsPage реализована | Раньше срока | — | exam_traps.json + find-exam-traps.py |
| Фаза 4: Cross-topic vocab | Не запланировано в Ф3 | ✓ filterMasteredWords | Раньше срока | — | |
| Фаза 4: Image-first cards | Не запланировано в Ф3 | ✓ VocabCard типа A | Раньше срока | — | |
| Фаза 4: Numbers cards | Не запланировано в Ф3 | ✓ isNumberCard | Раньше срока | — | |
| ResultScreen через VERIFICA | Намеренное поведение по образцу официального экзамена | Реализовано корректно | Соответствует плану | — | Пользователь явно нажимает VERIFICA, как на patenteonline.it |
| DictionaryPage vocab race | Должен работать без гонки | Потенциальная гонка | Риск | Средняя | allVocabIds→useVocab пересинхронизация |
| BottomNav 4 вкладки | 4 вкладки по плану | 5 вкладок в коде | Дивергенция | Средняя | Не умещается на 768px |
| TrainingPage | Временный дубль HomePage | Осознанное решение | Технический долг (временный) | Низкая | В будущем HomePage станет официальным quiz, TrainingPage — подготовкой |
| /traps роут скрыт | Должен быть в nav | В nav нет, но в BottomNav нет | Нет доступа | Средняя | Только через баннер на HomeP |
| Vocab Block 1 перегрузка | 10-12 слов по плану | 30 слов в Block 1 | Нарушение плана | Высокая | Педагогически вредно |

---

## 3. Architecture Audit

### 3.1 Роутинг

**Маршруты в App.jsx:**
```
/                         → HomePage
/quiz/:topicId/block/:blockId → QuizPage   ← URL-роут существует
/quiz/:topicId            → QuizPage
/topic/:topicId           → BlockSelectPage
/vocab/:topicId           → VocabSessionPage
/errors                   → ErrorsPage
/stats                    → StatsPage
/training                 → TrainingPage   ← НЕ запланировано в SKILL.md
/traps                    → TrapsPage      ← НЕ запланировано в SKILL.md
/dictionary               → DictionaryPage
```

**Проблема 1 (Высокая): Двойственность передачи blockId**

В App.jsx зарегистрирован роут `/quiz/:topicId/block/:blockId`, что правильно. Но `BlockSelectPage.handleStartQuiz` вызывает:
```javascript
navigate('/quiz/' + topicId, { state: { blockId: blockId } });
```
То есть всегда идёт на `/quiz/2`, передавая blockId в `location.state`. При обновлении страницы браузер сохранит URL `/quiz/2`, но `location.state` исчезнет — `blockId` станет `null`, квиз перейдёт в random-режим, загрузит 30 случайных вопросов вместо блока. Пользователь не понимает что произошло.

**Рекомендация:** Заменить navigate на URL-based:
```javascript
navigate('/quiz/' + topicId + '/block/' + blockId);
```

**Проблема 2 (Средняя): /traps недоступна через навигацию**

`TrapsPage` (`/traps`) присутствует в App.jsx и в баннере на HomeP, но не в `BottomNav`. Пользователь может случайно потерять к ней доступ если не вернётся на HomePage. Нет кнопки "назад" к списку ловушек при выборе темы (есть `onBackOverride`, но это возврат на предыдущий экран внутри страницы, а не к HomePage).

**Проблема 3 (Контекст, не баг): /training — разделение ответственности**

`TrainingPage` в текущей версии выглядит как дубль `HomePage` и ведёт на `/topic/` вместо `/quiz/`. Это **осознанное архитектурное решение**: в дальнейшем `HomePage` (`/`) станет точной копией официального итальянского экзамена (30 вопросов, таймер, режим VERIFICA), а `TrainingPage` (`/training`) останется входной точкой в bloc-first подготовительный флоу. Разделение страниц сделано заранее, пока обе выглядят похоже — это правильный задел. Единственное что нужно сейчас — извлечь общий компонент `TopicGrid` чтобы не дублировать вёрстку карточек тем.

### 3.2 Сервисы

Сервисный слой реализован **образцово**. Все сервисы:
- Не используют React
- Полностью изолируют localStorage
- Имеют корректные fallback при JSON parse errors
- Готовы к замене на API (Phase 2)

**Единственная проблема:** в `questionsService.js` существует модульный кэш `_questionsByTopic` — это singleton на уровне модуля. При reset (сброс прогресса через clearQuestionTopicMap) кэш вопросов (`_questionsByTopic`) не очищается. Это не критично (данные неизменны), но нарушает принцип консистентности.

### 3.3 Хуки

**useQuiz** — хорошо спроектирован, имеет защиты:
- `answeringRef` — блокирует двойной клик
- `isSavedRef` — блокирует двойное сохранение
- `cancelled` флаг в useEffect — правильно

**Дизайн useQuiz: VERIFICA как намеренный финальный шаг**

`answer()` при заполнении всего теста вызывает `setIsFinished(true)`, после чего кнопка VERIFICA в пагинации становится кликабельной. `showResults` устанавливается только при явном нажатии VERIFICA через `handleFinish`. Это **намеренное поведение**, воспроизводящее механику официального итальянского экзамена (patenteonline.it): на реальном экзамене студент должен сам инициировать проверку, а не получать результат автоматически после последнего ответа. Пользователь может перейти к любому вопросу через пагинацию, пересмотреть ответы и только затем нажать VERIFICA.

**Важный UX-нюанс (Средняя):** кнопка VERIFICA находится в конце трека пагинации. После ответа на вопрос 30 она может быть не видна на экране без прокрутки. Рекомендуется добавить визуальный сигнал (пульсация кнопки VERIFICA, или всплывающий toast "Все вопросы отвечены — нажмите VERIFICA") чтобы пользователь понял что тест готов к завершению.

**useVocab** — грамотный, но имеет проблему:

`isFinished = total === 0 || rated >= total`

Это работает корректно. Но при `total === 0` (все слова освоены, filteredMastered вернул пустой список) состояние `isFinished = true` немедленно при загрузке. `VocabSession` покажет экран "Все слова изучены". **Проблема:** `VocabSessionWrapper` в `BlockSelectPage` при `isFinished` показывает кнопку "Продолжить", вызывающую `onDone` → `completeVocabPhase()`. Это правильно. Но `VocabSessionPage` при `isFinished` (total=0) немедленно показывает footer с "Продолжить" — **до того как пользователь успел что-то прочитать**.

**useBlocks** — корректен, но имеет побочный эффект: `refresh()` читает из localStorage синхронно. При быстрых последовательных действиях (completeBlock → navigateToBlock) может быть race condition на уровне React state (оба обновления инициируют render с разным progress). Реально для iPad mini 2 это не воспроизводится из-за медленного UI.

**useErrorTopics** — Оптимизирован с батчингом, правильно. Минус: при каждом рендере `ErrorsPage` все 25 тем перезагружаются если есть хоть одна ошибка. При наличии `question_topic_map.json` можно было загружать только темы с ошибками (как это делает `loadErrorQuestions`).

### 3.4 Управление состоянием

Нет глобального стора (Redux, Zustand, Context). Для данного проекта (один пользователь, localStorage-first) это правильно. Состояние распределено по компонентам и хукам логично.

**Проблема (Средняя): VocabSession хранит `ratings` локально И в Leitner**

`VocabSession` ведёт локальный объект `ratings` для отображения прогресса. Параллельно `useVocab` ведёт `ratedIndices` Set. Это двойное ведение одного и того же состояния. `VocabSession.ratedIndices` строится из локального `ratings`, а не из `ratedIndices` хука. При рестарте сессии локальный `ratings` сбрасывается при `loading=true`, а `ratedIndices` в хуке — при изменении `sessionKey`. Синхронизация работает, но хрупко.

### 3.5 localStorage схема

Реальные ключи в localStorage:
- `qp_progress` — прогресс по темам
- `qp_errors` — счётчик ошибок
- `qp_vocab` — Leitner состояние карточек
- `qp_block_prog` — прогресс по блокам
- `qp_onboarding_done` — флаг онбординга

**Потенциальная проблема:** При сохранении `qp_vocab` сохраняется весь объект целиком. Если пользователь изучил много тем, этот объект может стать большим. Ключи вида `2_v001` — для 25 тем по 100+ карточек это ~2500 ключей. В JSON с числами это ~100KB — в пределах нормы для localStorage (5-10MB лимит).

**Проблема (Средняя):** `completeBlock` в `blockService` использует `indexOf(blockId - 1)` для проверки разблокировки. Это предполагает что блоки нумеруются последовательно начиная с 1. Анализ данных показывает: block_id в JSON это целые числа 1,2,3... Это работает. Но если скрипт когда-нибудь сгенерирует блоки с другой нумерацией — сломается.

---

## 4. NLP & Learning-System Audit

### 4.1 Соответствие NLP-анализу

**Что реализовано корректно:**
- Лемматизация через spaCy `it_core_news_sm` ✓
- Двухуровневые стоп-слова (L1 грамматические, L2 квази-стопы) ✓
- Гибридный скоринг (TF_block + TF_topic + sign_specificity + trap_bonus) ✓
- Биграммы и триграммы ✓
- Граф знаков + обход для порядка блоков ✓
- Атомарная единица = знак для Типа A ✓
- Числовые карточки для Типа C ✓
- exam_traps с cosine similarity ✓

**Что отклонилось от плана:**

**Проблема (Высокая): Block 1 перегружен — 30 vocab_ids, все новые**

По NLP_ANALYSIS.md блок должен содержать 10-12 новых слов. Анализ данных показывает: Block 1 темы 2 содержит **30 vocab_ids, все 30 помечены как new_vocab_ids**. Это потому что `generate-vocab.py` назначает `new_vocab_ids` = все vocab_ids первого блока (нет предыдущего блока для сравнения). 

Блоки 2-18 работают корректно: new_vocab_ids = 0-5 слов. Проблема только в первом блоке каждой темы.

Для пользователя это означает: перед первым тестом нужно изучить 30 карточек. При средней скорости 1-2 минуты на карточку — это 30-60 минут только на vocabulary phase. Это противоречит принципу "микро-прогресс" и вероятно вызовет отказ от изучения.

**Рекомендация:** В `generate-vocab.py` ограничить `new_vocab_ids` для Block 1 топ-12 словами по `score` (уже посчитан). Остальные переместить в обычные `vocab_ids`.

### 4.2 Leitner-4 реализация

Алгоритм реализован правильно. Интервалы: [0, 1, 3, 7, 30] блоков. Оценки: know→box+1, hard→no change, dontknow→box-1. Всё соответствует плану.

**Проблема (Средняя):** `isCardDue` использует `currentBlock - last_seen_block >= interval`. Но `last_seen_block` это blockId (1-18), а не номер сессии. Если пользователь проходит блоки нелинейно (перешёл с блока 5 на блок 2), интервал будет вычислен неверно. При нормальном линейном прохождении работает корректно.

### 4.3 Cross-topic vocab filtering

`filterMasteredWords` использует `lemma_topic_map.json` (684 леммы). Слово считается освоенным в другой теме при box ≥ 3. Реализация корректна, но:

**Проблема:** Первое слово фразы как лемма: `var lemma = (card.lemma || card.word || '').split(' ')[0]`. Для фразы "strada deformata" берётся только "strada". В lemma_topic_map.json "strada" встречается в десятках тем — значит любое слово с "strada" в начале будет считаться освоенным если пользователь выучил "strada" в любой теме. Это слишком агрессивная фильтрация.

### 4.4 Типология тем A/B/C

Правильно разделена в Python-скриптах и данных. VocabCard корректно определяет режим (image-first если есть sign_images). NumberCards генерируются только для блоков с `number_rules`. 

**Проблема (Низкая):** `topic_type` хранится в каждом блоке отдельно (`block.topic_type`). Если тема меняет тип — нужно пересоздавать все блоки. Лучше хранить topic_type в отдельном файле или в topics.json.

---

## 5. UX/UI Audit

### 5.1 BottomNav — 5 вкладок на iPad mini 2

**Проблема (Высокая):**
BottomNav содержит 5 вкладок: Главная, Тренировка, Ошибки, Статистика, Словарь. 

iPad mini 2 имеет экран 768×1024px (portrait). При 5 вкладках каждая получает ~153px. Иконка 24px + текст + паддинги — критически мало. Это либо обрежется, либо потребует горизонтального скролла. По SKILL.md предполагалось 4 вкладки.

Дополнительно: при 5 вкладках активная вкладка визуально "теряется" — меньше contrast ratio.

### 5.2 VERIFICA — намеренное поведение, но требует UX-подсказки

Механика "ответить на все вопросы → нажать VERIFICA → увидеть результат" воспроизводит официальный итальянский экзамен. Это правильный дизайн. Однако после ответа на вопрос 30 кнопка VERIFICA находится за пределами видимой области пагинации на iPad mini 2.

Рекомендация: при `isFinished === true` добавить визуальный сигнал — например, кнопка VERIFICA начинает пульсировать, или появляется небольшой toast-баннер "Все вопросы отвечены". Это сохраняет семантику явного завершения, но не оставляет пользователя в неведении.

### 5.3 Vocab Session — первый блок

30 карточек в Block 1 — серьёзная UX проблема. Даже при хорошей мотивации пользователь устаёт к 15-й карточке. После 30-й карточки нужно пройти ещё 30 вопросов — итого 1+ час в первой сессии.

### 5.4 BlockSelectPage — кнопки зависят от vocabPhaseDone глобально

```javascript
{!vocabPhaseDone ? (
  <button onClick={() => handleStartVocab(currentBlockId)}>Учить слова</button>
) : (
  <button onClick={() => handleStartQuiz(currentBlockId)}>Начать тест</button>
)}
```

Верхний блок кнопок отображает только одну из двух кнопок. Если vocab done → только "Начать тест". Нет способа повторить vocab для текущего блока кроме как найти нужный BlockCard внизу. Это неочевидно.

### 5.5 TrainingPage vs HomePage — запланированное разделение

Сейчас обе страницы выглядят одинаково — список тем с карточками. Разница только в том, куда ведёт клик: `/quiz/topicId` (random quiz) vs `/topic/topicId` (bloc-first). Это **намеренный задел**: в следующей итерации `HomePage` превратится в точную копию официального итальянского экзамена (30 вопросов по жёстким правилам, таймер, режим VERIFICA без возможности переключать перевод), а `TrainingPage` останется свободным учебным пространством.

Что нужно сделать уже сейчас — извлечь общий `TopicGrid` компонент для карточек тем, чтобы верстку не приходилось синхронизировать в двух местах когда они начнут расходиться.

### 5.6 VocabCard — когда нет перевода

Если `card.translation_ru` пустой, кнопки оценки показываются сразу без нажатия "Показать перевод". Это допустимо, но показывает кнопки без контента — странный UX. В глобальном словаре (global_vocab.json) у всех записей нет поля `translation_ru` — только `word` и `frequency`. Значит для онбординга кнопки оценки появляются без перевода.

Проверка:
```json
{
  "id": "g001",
  "word": "veicolo",
  "translation_ru": "транспортное средство"  ← есть!
}
```
На самом деле translation_ru присутствует в global_vocab. Проблема не воспроизводится для глобальных карточек, но теоретически возможна для vocab записей без перевода.

---

## 6. Performance Audit

### 6.1 Загрузка данных

Стратегия оптимальна:
- `import.meta.glob` с ленивой загрузкой — Vite включает все JSON в chunks
- `question_topic_map.json` для loadErrorQuestions — не грузит лишние темы
- Батчинг по 5 тем в useErrorTopics
- `_questionsByTopic` кэш для повторных вызовов loadQuestionText

**Потенциальная проблема (Средняя):**

`DictionaryPage.DictionaryTopicView` использует `useVocab(topicId, { mode: 'free', vocabIds: allVocabIds })`. `allVocabIds` вычисляется из `vocabData` через `useMemo`. При первом рендере `vocabData = null`, поэтому `allVocabIds = []`. `useVocab` загружается с пустым списком, `cards = []`. После загрузки `vocabData` → `allVocabIds` меняется → `useVocab` получает новый `freeVocabIds` → перезагружается. Это два рендера и два вызова `useVocab`. Работает, но неэффективно.

### 6.2 Bundle size

Все JSON данные включены в Vite bundle через `import.meta.glob`. Суммарный объём:
- 25 × topic_N.json (7144 вопроса) — ориентировочно ~8-12MB
- 25 × topic_N_vocab.json — ориентировочно ~1MB
- 25 × topic_N_blocks.json — ориентировочно ~2MB
- exam_traps.json (620 ловушек) — ~200KB
- lemma_topic_map.json (684 леммы) — ~50KB

Но благодаря `import.meta.glob` с lazy loading (`() => import(...)`) данные загружаются только при необходимости. На старте приложения грузится только `topics.json` (~2KB). Это правильно.

**Проблема (Средняя):** `translation_cache.json` (1MB файл в scripts/) не включён в src/, поэтому не попадает в bundle. Хорошо. Но `lemma_topic_map.json` в src/data/ — статически доступен, но грузится лениво через dynamic import. При первом открытии DictionaryPage и первом вызове `filterMasteredWords` будет сетевой запрос. Для iPad mini 2 с медленным соединением это ощутимо.

### 6.3 React render оптимизация

- `QuestionCard` обёрнут в `React.memo` ✓
- `ErrorTopicCard` обёрнут в `React.memo` с `displayName` ✓
- `Icon` компонент обёрнут в `React.memo` (судя по SKILL.md) — нужно верифицировать
- `useCallback` используется корректно в большинстве мест

**Проблема (Низкая):** В `VocabSession.handleRate` dependency array включает `ratings` — объект, который меняется при каждой оценке. Это означает `handleRate` пересоздаётся при каждой оценке. Это не критично (нет бесконечного рендера), но неоптимально для старого iPad.

---

## 7. CSS & Compatibility Audit

### 7.1 iOS 12 / Chrome 92 совместимость

**Хорошие решения:**
- Нет `gap:` в flex-контейнерах (проверено grep-ом по всем CSS файлам — 0 вхождений)
- Вендорные префиксы в components.css: `-webkit-inline-flex`, `-webkit-align-items`, `-webkit-user-select`
- `@vitejs/plugin-legacy` настроен правильно: `targets: ['ios_saf >= 12', 'safari >= 12', 'chrome >= 92']`
- `build.target: ['es2015', 'safari12', 'ios12']`

**Потенциальные проблемы:**

`Optional chaining` (`card?.id`) в VocabCard.jsx — используется в dependency array `useEffect`. plugin-legacy должен транспилировать это в ES5. Но при `targets: ['safari >= 12']` — Safari 12 поддерживает optional chaining только с iOS 13.4. Однако plugin-legacy с `additionalLegacyPolyfills` должен это покрыть.

**Реальная проблема (Средняя):** `React.StrictMode` в `main.jsx`. В development StrictMode вызывает useEffect дважды, что может создать гонки при разработке. Для production это не проблема (StrictMode отключается). Но при тестировании на iPad dev build может вести себя нестабильно.

### 7.2 AppHeader использует inline styles

`AppHeader.jsx` использует массивный inline style объект вместо CSS классов:
```jsx
<header className="app-header" style={{
  height: 'var(--header-height)',
  backgroundColor: 'var(--color-header-bg)',
  ...
}}>
```
Это нарушает архитектурное соглашение из SKILL.md ("Стили: только через CSS-классы; inline style только для динамических значений"). Функционально работает, но:
- Захламляет JSX
- Не кэшируется (новый объект на каждый рендер)
- Нарушает принцип разделения ответственности

### 7.3 CSS архитектура

`pages.css` = 1857 строк — очень большой файл. При добавлении новых страниц он будет расти неконтролируемо. Рекомендуется разбить на отдельные файлы по страницам при следующем рефакторинге.

Специфичность CSS выглядит управляемой — нет `!important`, нет глубокой вложенности. BEM-подобное именование соблюдается.

---

## 8. Bug List

| Критичность | Файл | Проблема | Почему важно | Рекомендованный фикс |
|---|---|---|---|---|
| ВЫСОКАЯ | src/pages/BlockSelectPage.jsx | blockId передаётся через `location.state` вместо URL | Теряется при обновлении страницы — квиз переходит в random режим | Изменить navigate на `/quiz/${topicId}/block/${blockId}` |
| ВЫСОКАЯ | scripts/generate-vocab.py + blocks.json | Block 1 содержит 30 new_vocab_ids вместо 10-12 | Когнитивная перегрузка в первой сессии, противоречит педагогическому плану | Ограничить new_vocab_ids в Block 1 топ-12 по score |
| СРЕДНЯЯ | src/components/quiz/QuizPagination.jsx | VERIFICA не видна после ответа на вопрос 30 | Пользователь не знает что тест готов к завершению | Пульсация кнопки или toast-подсказка при isFinished |
| СРЕДНЯЯ | src/components/layout/BottomNav.jsx | 5 вкладок вместо 4 | Не умещается на 768px экране iPad mini 2 | Переосмыслить структуру nav с учётом планов по HomePage |
| СРЕДНЯЯ | src/pages/DictionaryPage.jsx | allVocabIds → useVocab двойная загрузка | Два render цикла при открытии словаря | Загружать vocab один раз и передавать в useVocab |
| СРЕДНЯЯ | src/services/vocabService.js | filterMasteredWords использует только первое слово фразы как лемму | Агрессивная фильтрация — удаляет слова где первое слово совпадает | Использовать полную лемму фразы или отключить фильтрацию для фраз |
| СРЕДНЯЯ | src/pages/TrainingPage.jsx | Верстка карточек дублирует HomePage.jsx | При расхождении страниц придётся синхронизировать вручную | Извлечь общий `TopicGrid` компонент, навигацию оставить разной |
| СРЕДНЯЯ | src/components/layout/AppHeader.jsx | Все стили в inline объекте | Нарушение архитектурных соглашений, объект пересоздаётся | Перенести в `.app-header` CSS класс |
| СРЕДНЯЯ | src/hooks/useVocab.js | При isFinished (total=0) сразу показывается footer | Пользователь не успевает прочитать "Все слова изучены" | Добавить минимальную задержку или явный CTA |
| НИЗКАЯ | src/services/questionsService.js | _questionsByTopic кэш не очищается при clearQuestionTopicMap() | Minor inconsistency при сбросе прогресса | Добавить `_questionsByTopic = {}` в clearQuestionTopicMap |
| НИЗКАЯ | src/hooks/useVocab.js | Зависимость useCallback от `ratedIndices` (Set) создаёт лишние пересоздания | Перформанс на медленном устройстве | Использовать useRef для отслеживания ratedIndices |
| НИЗКАЯ | src/pages/BlockSelectPage.jsx | `vocabPhaseDone` зависит только от current блока, не показывает vocab-кнопку для completed | Нет способа повторить vocab завершённого блока | Добавить кнопку "Повторить слова" для completed блоков |

---

## 9. Dead Code & Duplication Report

### Временное дублирование (осознанное)

**TrainingPage.jsx vs HomePage.jsx**

Дублирование ~65% верстки — осознанный временный шаг. Обе страницы используют одинаковые карточки тем, но ведут в разные режимы (`/quiz/` и `/topic/`). Когда `HomePage` превратится в официальный экзамен-симулятор, а `TrainingPage` останется учебным пространством, они кардинально разойдутся по содержимому.

Что нужно сделать сейчас — извлечь только компонент карточки темы в `TopicGrid.jsx`, не меняя логику страниц:
```jsx
const TopicGrid = ({ onTopicClick }) => { ... }
```

### Неиспользуемое

- `src/constants.js` содержит только `SIGN_IMAGE_BASE`. Можно было inline в vocabService/vocabCard. Но как единственный source of truth для S3 URL — это правильно.
- `AppHeader` prop `onBackOverride` дублирует логику — либо `onBackOverride()`, либо `navigate(-1)`. Нормально для гибкости.
- `useProgress.getForTopic` экспортируется из хука, но нигде не используется в компонентах (progressService.getTopicProgress вызывается напрямую в useTopics). Минорный unused export.

---

## 10. Technical Debt Assessment

### Срочный долг (исправить до релиза)

1. **blockId URL routing** — 1 час работы
2. **Block 1 vocab overload** — скрипт нужно доработать + перегенерировать данные

### Средний долг (исправить в следующей итерации)

3. **VERIFICA visibility** — toast или пульсация при isFinished
4. **TopicGrid компонент** — извлечь общую верстку из HomePage и TrainingPage (не рефакторинг архитектуры, только компонент карточки)
5. **BottomNav 5 вкладок** — решить после финального дизайна HomePage
6. **filterMasteredWords lemma matching** — 1 час в Python скрипте
7. **AppHeader inline styles** — 30 минут

### Принимаемый долг (можно оставить)

8. `_questionsByTopic` cache не очищается — данные неизменны, безвредно
9. `useProgress.getForTopic` unused export — harmless
10. `VocabSession.ratings` локальный дубль — работает, не критично
11. `pages.css` монолит — проблема при масштабировании, сейчас работает

---

## 11. Production Readiness Verdict

**Статус: Beta. НЕ production-ready.**

### Блокеры релиза (P0):
1. blockId теряется при обновлении страницы → квиз сбрасывается в random mode

### Серьёзные проблемы (P1, исправить до GA):
2. Block 1 с 30 new_vocab_ids → вероятный отказ от использования в первой сессии
3. VERIFICA не видна после ответа на вопрос 30 → пользователь не знает что тест завершён

### Stability risks:
- Нет обработки quota exceeded для localStorage (только console.error)
- Нет graceful fallback при недоступности S3 URL (изображения)
- Нет обработки случая когда block question_ids содержат вопросы которых нет в теме (проверено — все валидны, но нет runtime guard)

---

## 12. Prioritized Fix Plan

### Phase 1 — Critical Fixes (исправить сейчас, ~2 часа)

**P1.1 — blockId URL routing**
- Файл: `src/pages/BlockSelectPage.jsx`
- Проблема: navigate через state
- Фикс: изменить `handleStartQuiz`:
```javascript
var handleStartQuiz = function (blockId) {
  navigate('/quiz/' + topicId + '/block/' + blockId);
};
```
- Убедиться что в `useQuiz` blockId из URL парсится как `options.blockId`
- В QuizPage: `var blockId = urlBlockId || null;` (убрать state fallback)
- Приоритет: HIGH
- Сложность: S

**P1.2 — Block 1 vocab overload**
- Файл: `scripts/generate-blocks.py`
- Проблема: `new_vocab_ids` в первом блоке = все vocab_ids
- Фикс: ограничить `new_vocab_ids` первого блока топ-12 по score, перегенерировать все `topic_N_blocks.json`
- Приоритет: HIGH
- Сложность: M (доработка скрипта + регенерация)

### Phase 2 — Architecture Stabilization (~3 часа)

**P2.1 — TopicGrid компонент**
- Создать `src/components/home/TopicGrid.jsx` с карточкой темы
- Рефакторинг только верстки карточек — не трогать логику навигации в HomePage и TrainingPage
- Сложность: S

**P2.2 — BottomNav: решить структуру после финального дизайна HomePage**
- После реализации официального экзамена на HomePage пересмотреть нужность отдельной вкладки "Тренировка"
- Пока: как минимум убедиться что 5 вкладок нормально рендерятся на 768px или уменьшить шрифт labels
- Сложность: S

**P2.3 — AppHeader: убрать inline styles**
- Перенести все стили из inline в `.app-header` CSS класс
- Сложность: XS

### Phase 3 — UX Improvements (~3 часа)

**P3.1 — DictionaryPage: fix double loading**
- Файл: `src/pages/DictionaryPage.jsx`
- Вместо `useVocab` в `DictionaryTopicView` с пустым allVocabIds в первом рендере — добавить guard
- Или: загружать vocab через useEffect, затем вызывать useVocab только после получения данных
- Сложность: S

**P3.2 — VERIFICA visibility при isFinished**
- Файл: `src/pages/QuizPage.jsx` или `src/components/quiz/QuizPagination.jsx`
- Добавить визуальный сигнал когда все вопросы отвечены: пульсация кнопки VERIFICA или toast-подсказка
- Сохраняет семантику явного завершения, устраняет неопределённость
- Сложность: XS

**P3.3 — VocabSessionPage: не показывать footer мгновенно при total=0**
- Добавить минимальную задержку (1 секунда) или явный CTA перед footer при empty-состоянии
- Сложность: XS

### Phase 4 — Learning-System Improvements (~4 часа)

**P4.1 — filterMasteredWords: улучшить lemma matching**
- Файл: `src/services/vocabService.js`
- Использовать полную лемму или только однословные леммы для cross-topic matching
- Сложность: S

**P4.2 — BlockSelectPage: vocab-кнопка для completed блоков**
- Добавить "Повторить слова" для уже завершённых блоков
- Сложность: S

**P4.3 — useErrorTopics: оптимизация через question_topic_map**
- Не грузить все 25 тем если question_topic_map позволяет найти только нужные
- Сложность: M

### Phase 5 — Performance & Polish (~2 часа)

**P5.1 — localStorage quota guard**
- Во всех сервисах при catch в _save добавить очистку старых данных как fallback
- Сложность: S

**P5.2 — pages.css: разбить на файлы**
- `pages/home.css`, `pages/quiz.css`, `pages/vocab.css` и т.д.
- Сложность: S (механическая работа)

**P5.3 — useVocab: useRef вместо useState для ratedIndices**
- Оптимизация для медленного iPad
- Сложность: S

---

## 13. Final Strategic Recommendations

### Что оставить без изменений

- Сервисная архитектура (services/) — отличная база для Phase 2 backend
- Leitner-4 реализация — корректна, не трогать
- Python NLP скрипты — качественная работа, только доработать Block 1 new_vocab_ids
- JSON структура данных — консистентна, полная, проверена
- useQuiz race condition guards (answeringRef, isSavedRef) — правильные решения
- CSS переменные система — хорошо организована
- VocabCard errorful generation принцип — правильно реализован

### Что упростить

- **DictionaryPage** — убрать double-loading паттерн, одна загрузка vocab
- **filterMasteredWords** — применять только для однословных лемм, не для фраз

### Что переписать

- **handleStartQuiz в BlockSelectPage** — URL-based навигация (P1.1)

### Что было недооценено в плане

- **Сложность Block 1**: план не учёл что первый блок всегда получает все vocab_ids как новые
- **TrapsPage**: не была запланирована, но реализована качественно — правильное добавление
- **Cross-topic filtering**: реализован опережая план, но требует доработки lemma matching
- **Архитектурное разделение HomePage/TrainingPage**: правильное стратегическое решение, сделанное заранее

### Что было переоценено (overengineered)

- `filterMasteredWords` с lemma_topic_map — слишком сложная логика для MVP, плюс некорректная для фраз. Для одного пользователя достаточно было простого порогового правила.
- `loadErrorQuestions` с question_topic_map — хорошая оптимизация, но для одного пользователя с localStorage разница в скорости незначительна

### Долгосрочная устойчивость архитектуры

Архитектура **устойчива** для текущего скоупа. Переход на backend потребует правки только services/ файлов — компоненты и хуки останутся без изменений. Это было реализовано корректно.

При масштабировании (если проект вырастет в multi-user) потребуется:
- Переход на контекст/стейт-менеджер для избежания prop drilling при глубоких деревьях
- Разбивка pages.css на модули
- Server-side generation vocab данных (сейчас они в bundle)

---

*Аудит выполнен на основе полного анализа исходного кода репозитория quiz-vocab-patente-main.*

---

## 14. Fix Log

| Дата | Шаг | Статус | Описание | Файлы |
|---|---|---|---|---|
| 2026-05-28 | P1.1 — blockId URL routing | **DONE** | Заменён `navigate` в `handleStartQuiz`: blockId теперь передаётся через URL (`/quiz/${topicId}/block/${blockId}`), а не через `location.state`. При обновлении страницы blockId сохраняется. | `src/pages/BlockSelectPage.jsx:84` |
| 2026-05-28 | P1.2 — Block 1 vocab overload | **DONE** | (1) `generate-blocks.py`: добавлен хелпер `_limit_block1_new_vocab` — ограничивает `new_vocab_ids` первого блока топ-12 по frequency. Перегенерированы все 25 `topic_N_blocks.json`. (2) `useVocab.js`: block-режим теперь использует `new_vocab_ids` для новых слов + Leitner-due review из полного `vocab_ids` (исключая never-seen карточки, не попавшие в new_vocab_ids). Block 1 сессия сокращена с ~30 до ~12 карточек. | `scripts/generate-blocks.py`, `src/data/blocks/*.json`, `src/hooks/useVocab.js` |
| 2026-05-28 | P2.1 — TopicGrid компонент | **DONE** | Извлечён общий `TopicGrid` компонент (`src/components/home/TopicGrid.jsx`) с версткой карточек тем. HomePage и TrainingPage теперь используют `<TopicGrid>` с разными `onTopicClick`: `/quiz/:id` vs `/topic/:id`. Устранено ~35 строк дублирования в каждой странице. | `src/components/home/TopicGrid.jsx`, `src/pages/HomePage.jsx`, `src/pages/TrainingPage.jsx` |
| 2026-05-28 | P2.2 — BottomNav 5 вкладок | **DONE** | Уменьшен `font-size` с 14px до 12px, горизонтальный padding с `var(--spacing-3)` до `var(--spacing-2)`. Добавлен `.bottom-nav__label` с `text-overflow: ellipsis` для защиты от переполнения. 5 вкладок надёжно помещаются на 768px. | `src/styles/components.css` |
