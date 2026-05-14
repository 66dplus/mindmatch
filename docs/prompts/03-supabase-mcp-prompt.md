# Промпт: Supabase MCP + Backend

**Когда использовать**: Когда нужно создать backend на Supabase — схему БД, Edge Functions, RLS-политики — без ручной настройки через Dashboard и без копипасты SQL в терминал. MCP позволяет AI делать это напрямую.

**Суть подхода**: Supabase MCP (Model Context Protocol) даёт Claude Code прямой доступ к твоему Supabase-проекту. AI применяет миграции, деплоит edge functions и проверяет логи сам — ты только авторизуешь.

---

## Промпт: схема + RLS

```
У меня уже создан Supabase-проект, я авторизовал MCP.
Применяй миграции и деплой edge function сам, без CLI и без копипасты.

Нужна схема для [ОПИСАНИЕ ПРОДУКТА]:

Таблицы:
- [table_1]: [поля и типы]
- [table_2]: [поля и типы, FK если есть]

RLS-политики (MVP-уровень, не продакшн):
- anon может читать [table_1], [table_2]
- anon может создавать записи в [table_3]
- anon НЕ может читать [table_3] (приватные данные)

Триггер: после INSERT в [table_3] пометить связанную запись в [table_2] как занятую.

Seed-данные: добавь [X примеров] для демо.
```

---

## Промпт: Edge Function

```
Напиши Supabase Edge Function на TypeScript / Deno:

Имя функции: [diagnostic / send-email / etc]
Деплой: --no-verify-jwt (для MVP, без авторизации)

Входные данные (POST body): { [поле1]: тип, [поле2]: тип }
Исходящий запрос: [OpenRouter / OpenAI / другой API]
  - URL: [endpoint]
  - Auth header: Bearer из Deno.env.get('[ENV_VAR_NAME]')
  - Модель: [название модели]
Возвращает: { [поле]: тип }

CORS: '*' для MVP.
Обработка ошибок: возвращай JSON с {error: string}, статус 502 при сетевых сбоях.

Секрет API-ключа лежит в Supabase Dashboard → Edge Function Secrets под именем [ENV_VAR_NAME].
```

---

## Пример из MindMatch

**Промпт схемы**:
> «Применяй миграции сам, без CLI. Нужны таблицы: services, available_slots (с триггером mark_slot_taken), bookings. RLS: anon читает services и slots, anon создаёт bookings, anon НЕ читает bookings.»

**Промпт edge function**:
> «Напиши Edge Function diagnostic. Принимает {service, answers, clientName}, дёргает OpenRouter с системным промптом, возвращает markdown. CORS — '*' для MVP. Модель — google/gemini-2.5-flash. Секрет — OPENROUTER_API.»

---

## Критичные детали про RLS

RLS (Row Level Security) — самое частое место ошибок:

1. **`INSERT` + `.select()` в одном запросе требует SELECT-политику**. Если у anon есть только INSERT-политика, `.insert().select()` упадёт с ошибкой RLS. Решение: убрать `.select()` из insert-запроса или добавить SELECT-политику.

2. **Триггеры запускаются от имени вызывающего пользователя** (SECURITY INVOKER по умолчанию). Если trigerr делает UPDATE в другой таблице — нужна UPDATE-политика для anon на ту таблицу тоже.

3. **Секрет API-ключа живёт в Supabase Edge Function Secrets**, не в `.env.local`. `.env.local` — это только для фронтенда, и даже там переменные без `VITE_`-префикса в браузер не попадают. Главное — ключ в браузере виден всем через DevTools.

---

## Почему MCP, а не CLI

| Подход | Плюсы | Минусы |
|---|---|---|
| Supabase CLI | Локальная разработка, git history | Требует установки, Docker, настройки |
| Dashboard вручную | Наглядно | Нельзя автоматизировать, copy-paste ошибки |
| **MCP (рекомендую)** | AI делает всё сам, видит ошибки | Требует одноразовой авторизации |

Для демо и обучения MCP — оптимальный баланс: студент видит весь процесс, не занимаясь настройкой инфраструктуры.
