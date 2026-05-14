# Supabase setup (5 минут)

## 1. Создать проект
1. https://supabase.com/dashboard → **New project**
2. Имя: `mindmatch`, регион: ближе к РФ (Frankfurt / Stockholm)
3. Дождаться готовности (~2 мин)

## 2. Применить схему
1. SQL Editor → New query
2. Вставить содержимое `migrations/001_init.sql`
3. Run

Это создаст таблицы `services`, `available_slots`, `bookings`, RLS-политики и засидирует 3 услуги + 20 свободных слотов на 5 рабочих дней.

## 3. Положить ключ OpenRouter
Settings → Edge Functions → Secrets:
```
OPENROUTER_API_KEY = sk-or-v1-...
OPENROUTER_MODEL   = anthropic/claude-3.5-haiku   # опционально, иначе берётся этот
```

## 4. Развернуть edge-функцию
```bash
# Один раз: установить supabase CLI
brew install supabase/tap/supabase

# Залогиниться
supabase login

# Связать проект (взять PROJECT_REF из URL дашборда)
cd supabase
supabase link --project-ref <PROJECT_REF>

# Деплой
supabase functions deploy diagnostic --no-verify-jwt
```

URL функции будет: `https://<PROJECT_REF>.supabase.co/functions/v1/diagnostic`

## 5. Подключить фронт
В `mindmatch/.env.local` (создать рядом с `package.json`):
```
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...           # из Settings → API → anon public
VITE_DIAGNOSTIC_FN_URL=https://<PROJECT_REF>.supabase.co/functions/v1/diagnostic
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
