# Промпт: Мастер-промпт для генерации проекта с нуля

**Когда использовать**: Когда хочешь воспроизвести проект типа MindMatch с нуля — или адаптировать под другую нишу. Это не один промпт, а последовательность из 6 шагов. Каждый шаг — отдельный чёткий контракт с AI.

---

## Шаг 0. Перед стартом: установи скиллы

```bash
# В терминале, один раз:
npx skills add superpowers/brainstorming
npx skills add superpowers/frontend-design
```

Без скиллов шаги 1 и 2 дадут худший результат.

---

## Шаг 1. Брейнсторминг

```
Хочу сделать [ИДЕЯ ПРОДУКТА].

Контекст:
- Ниша: [кто клиенты]
- Проблема: [что болит у пользователя]
- Ограничения: [время / бюджет / стек]
- Развернуть по ТЗ: [если есть — прикрепи файл]

/brainstorming
```

**Ожидаемый ответ AI**: уточняющие вопросы, риски, предложение по scope MVP.
**Твой следующий шаг**: ответь на вопросы, выбери один вариант scope.

---

## Шаг 2. Фронтенд через design skill

```
Делай весь фронт через `frontend-design` skill.

Продукт: [одно предложение из шага 1]
Аудитория: [из шага 1]
Тон: [эмоциональное описание, не технические требования]
Стек: React + Vite

Экраны / шаги wizard:
1. [Название экрана] — [что делает пользователь]
2. [...]
...N. Подтверждение

Mock-данные: если нет Supabase env, приложение должно работать на локальных заглушках.
GitHub Pages: после build Vite должен корректно работать на /[repo-name]/ base path.
```

**Ожидаемый ответ AI**: полный React SPA с App.jsx + App.css + data/services.js + lib/supabase.js (mock fallback).

---

## Шаг 3. Backend: схема БД + RLS

```
У меня авторизован Supabase MCP. Применяй миграции сам.

Таблицы:
- services: id, name, duration_min, description
- available_slots: id, service_id (FK), starts_at, is_taken
- bookings: id, slot_id (FK), service_id (FK), client_name, client_email, qualification_answers (jsonb), diagnostic_report, created_at

Триггер: после INSERT в bookings → SET is_taken = true в available_slots по slot_id.

RLS (anon):
- SELECT: services, available_slots
- UPDATE: available_slots (для триггера)
- INSERT: bookings (без SELECT — не возвращаем данные анониму)

Seed: 3 услуги + 20 слотов на ближайшие 2 недели.
```

---

## Шаг 4. Edge Function (AI-диагностика)

```
Напиши Edge Function diagnostic, задеплой через MCP.
Деплой: --no-verify-jwt

POST body: { service, answers, clientName }

Вызывает OpenRouter:
- URL: https://openrouter.ai/api/v1/chat/completions
- Auth: Deno.env.get('OPENROUTER_API')
- Модель: google/gemini-2.5-flash
- max_tokens: 1200 (русский плотнее по токенам)
- temperature: 0.4

Системный промпт:
[Вставь свой системный промпт или попроси AI написать под твою нишу]

Возвращает: { report: string } — Markdown.
CORS: '*'.
Секрет лежит в Supabase Dashboard → Edge Function Secrets как OPENROUTER_API.
```

---

## Шаг 5. CI/CD: GitHub Pages

```
Настрой деплой на GitHub Pages через GitHub Actions.
Условия: не Vercel (требует SMS), репозиторий публичный.

Workflow: на push в main
1. npm ci в папке [app-folder]/
2. npm run build (Vite)
3. Deploy на GitHub Pages

Env-переменные из GitHub Secrets:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_DIAGNOSTIC_FN_URL

Vite base: /[repo-name]/
Permissions: pages: write, id-token: write, contents: read
```

---

## Шаг 6. Интеграция и smoke test

```
Свяжи фронтенд с backend:
1. fetchServices() → таблица services
2. fetchAvailableSlots(serviceId) → таблица available_slots (is_taken=false, в будущем)
3. saveBooking(payload) → INSERT в bookings (без .select() — нет SELECT-политики для anon)
4. Diagnostic → POST на VITE_DIAGNOSTIC_FN_URL

Проверь curl-запросом что edge function отвечает корректным markdown.
Если кириллица искажена — смени модель на google/gemini-2.5-flash, max_tokens 1200.
```

---

## Итоговая архитектура

```
Browser (GitHub Pages)
  └── React SPA (Vite)
        ├── /data/services.js     — mock fallback
        ├── /lib/supabase.js      — Supabase client + mock guard
        └── /lib/api.js           — diagnostic call + mock fallback
              │
              ▼
        Supabase (Postgres + Edge Functions)
              ├── services        — SELECT (anon)
              ├── available_slots — SELECT + UPDATE (anon)
              ├── bookings        — INSERT only (anon)
              └── diagnostic fn   — OpenRouter proxy
                    │
                    ▼
              OpenRouter → google/gemini-2.5-flash
```

---

## Частые ошибки и решения

| Ошибка | Причина | Решение |
|---|---|---|
| RLS violation на bookings INSERT | `.insert().select()` требует SELECT-политику | Убери `.select()` из insert-запроса |
| Garbled Cyrillic в AI-ответе | Claude Haiku плохо держит русский | Смени на gemini-2.5-flash, max_tokens 1200 |
| API key visible в DevTools | Ключ попал на фронтенд | Ключ только в Supabase Edge Function Secrets |
| App падает без env vars | Нет mock fallback | Добавь `hasSupabase` guard + local stub data |
| 404 на GitHub Pages после refresh | Vite base path не настроен | `base: '/repo-name/'` в vite.config.js |
