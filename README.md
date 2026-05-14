# MindMatch

> Запись к коучу личностного роста с AI-диагностикой запроса.
> Учебный кейс для тестового задания «автор курса по вайбкодингу» (Skyeng).

Перед первой сессией клиент отвечает на 5 вопросов внутри формы записи. AI собирает из ответов короткий диагностический документ — клиент видит его на экране подтверждения, коуч получает его в базе. Сессия начинается с сути, а не со знакомства.

## Стек

| | Демо | No-VPN альтернатива (для урока) |
|---|---|---|
| AI-инструмент для кода | **Claude Code** | Qwen Coder Agent |
| Frontend | React + Vite | (то же) |
| БД | **Supabase** (Postgres + Edge Functions) | (то же) |
| LLM | OpenRouter → Claude 3.5 Haiku | GigaChat / Yandex Cloud |
| Хостинг | **GitHub Pages** | (то же) |

## Структура репо

```
skyeng-test/
├── docs/                    ← документы Часть 1, Часть 3, история промптов
│   └── superpowers/specs/   ← дизайн-спецификация
├── mindmatch/               ← Vite SPA
│   ├── src/
│   │   ├── App.jsx          ← wizard state-machine, 6 шагов
│   │   ├── lib/             ← supabase client, OpenRouter API, .ics generator
│   │   ├── data/            ← fallback-данные для работы без backend
│   │   └── *.css            ← тема (editorial-organic)
│   └── supabase/
│       ├── migrations/      ← схема + сиды
│       └── functions/       ← edge function `diagnostic`
└── .github/workflows/       ← деплой на GitHub Pages
```

## Live demo

→ **https://66dplus.github.io/mindmatch/** *(будет доступно после push + включения Pages)*

## Запуск локально

```bash
cd mindmatch
npm install
npm run dev            # http://localhost:5173
```

Без `.env.local` приложение работает на mock-фолбэке: услуги и слоты подставляются из `src/data/services.js`, диагностику генерирует локальный stub. Всё кликается end-to-end, удобно для демо без бэкенда.

## Подключение Supabase (~ 5 минут)

1. https://supabase.com/dashboard → **New project** (регион Frankfurt). Email-only signup, без SMS.
2. SQL Editor → выполнить файлы `mindmatch/supabase/migrations/0001_init.sql`, затем `0002_seed.sql`.
3. Project Settings → API → скопировать **URL** и **anon key**.
4. Edge Functions → Manage secrets → добавить `OPENROUTER_API_KEY=…`.
5. Deploy edge function (нужен Supabase CLI):
   ```bash
   cd mindmatch
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase functions deploy diagnostic --no-verify-jwt
   ```
6. Скопировать пример env:
   ```bash
   cp mindmatch/.env.example mindmatch/.env.local
   # вставить реальные значения
   ```
7. `npm run dev` ещё раз — backend подключится автоматически.

## Деплой на GitHub Pages

GitHub Actions сам собирает и публикует на push в `main`:

1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions → добавить:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DIAGNOSTIC_FN_URL`
3. `git push` → workflow `Deploy MindMatch` соберёт и опубликует.

При первом запуске без секретов сайт деплоится в mock-режиме — это ОК для демонстрации UX.

## Дизайн

Editorial-organic: Fraunces (variable serif) + DM Sans, тёплая бумажная палитра (`#F4EFE6` / `#1F1B16` / акцент saffron `#D67340` / sage `#6B7A65`). Подробности — в [дизайн-спецификации](docs/superpowers/specs/2026-05-14-mindmatch-design.md).
