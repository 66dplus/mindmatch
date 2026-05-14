# Supabase setup (5 минут)

## 1. Создать проект
1. https://supabase.com/dashboard → **New project**
2. Имя: `mindmatch`, регион: ближе к РФ (Frankfurt / Stockholm)
3. Дождаться готовности (~2 мин)

## 2. Применить схему и сиды
Открыть SQL Editor и выполнить файлы в порядке:
1. `migrations/0001_init.sql` — таблицы, индексы, триггер `mark_slot_taken`, RLS-политики
2. `migrations/0002_seed.sql` — 3 услуги + ~30 свободных слотов на ближайшие 2 недели

> Альтернатива через CLI: `supabase db push` после `supabase link`

## 3. Положить ключ OpenRouter
Settings → Edge Functions → Secrets:
```
OPENROUTER_API_KEY=sk-or-v1-...
```
Модель `anthropic/claude-3.5-haiku` зашита в `functions/diagnostic/index.ts` — её можно поменять там же.

## 4. Развернуть edge-функцию
```bash
brew install supabase/tap/supabase     # один раз
supabase login                          # один раз
cd mindmatch
supabase link --project-ref <PROJECT_REF>
supabase functions deploy diagnostic --no-verify-jwt
```

URL функции: `https://<PROJECT_REF>.functions.supabase.co/diagnostic`

## 5. Подключить фронт
В `mindmatch/.env.local` (создать рядом с `package.json`):
```
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...           # из Settings → API → anon public
VITE_DIAGNOSTIC_FN_URL=https://<PROJECT_REF>.functions.supabase.co/diagnostic
```

Без этих переменных приложение работает на mock-данных — это полезно для локальной разработки и для случая, когда лимиты OpenRouter исчерпаны.

## 6. Проверить
```bash
cd mindmatch
npm run dev
# Открыть http://localhost:5173/mindmatch/
# Пройти полный сценарий — после сабмита в БД должна появиться запись
```

## Альтернатива без VPN

Если OpenRouter недоступен — замените upstream вызов в `functions/diagnostic/index.ts` на GigaChat API (Сбер):

```ts
const upstream = await fetch("https://gigachat.devices.sberbank.ru/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${gigaToken}`,   // отдельный OAuth flow
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "GigaChat",
    messages: [...],
  }),
})
```

См. https://developers.sber.ru/docs/ru/gigachat/api/overview
