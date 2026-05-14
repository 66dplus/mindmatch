# Handoff — состояние после перезапуска Claude Code

**Что осталось доделать**: подключить боевой Supabase к уже задеплоенному фронту.

## Готово ✅

- Live demo: https://66dplus.github.io/mindmatch/ (mock-режим, end-to-end проходит)
- Репозиторий: https://github.com/66dplus/mindmatch
- Дизайн-спека: [docs/superpowers/specs/2026-05-14-mindmatch-design.md](docs/superpowers/specs/2026-05-14-mindmatch-design.md)
- Все deliverables (md + docx): [docs/deliverables/](docs/deliverables/)
- Скриншоты wizard (8 шагов): [docs/screenshots/](docs/screenshots/)
- Supabase миграции + edge function — написаны, не применены: [mindmatch/supabase/](mindmatch/supabase/)
- GitHub Actions secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DIAGNOSTIC_FN_URL` — установлены
- Локальный `mindmatch/.env.local` с теми же значениями

## Контекст для следующей сессии

Supabase проект:
- URL: `https://hvwgzesfiprzinilgisb.supabase.co`
- Anon (publishable) key: `sb_publishable_gmwmiW2FgpUKlNdEIlvkZA_Y3YTkCfj`
- Project ref: `hvwgzesfiprzinilgisb`

OpenRouter:
- Ключ — у пользователя, спросить заново после рестарта.

## План действий после рестарта Claude Code

1. Проверить, что Supabase MCP подгрузился. Команды через MCP должны быть доступны (что-то вроде `mcp__supabase__apply_migration`, `mcp__supabase__deploy_edge_function`).
2. Применить миграции из `mindmatch/supabase/migrations/0001_init.sql` и `0002_seed.sql`.
3. Получить от пользователя OpenRouter API key.
4. Установить секрет: `OPENROUTER_API_KEY=<key>` в Supabase secrets.
5. Задеплоить edge function `mindmatch/supabase/functions/diagnostic/index.ts`.
6. Проверить e2e на https://66dplus.github.io/mindmatch/ — заполнить wizard и убедиться что AI-диагностика реальная (не mock).
7. Сделать финальный скриншот реальной диагностики, заменить mock-confirm в docs/screenshots.
8. Финальный коммит + push.
9. Удалить этот файл HANDOFF.md.

## Если MCP не подгрузится

Альтернативы:
- `supabase login` + `supabase link --project-ref hvwgzesfiprzinilgisb` (нужен DB password)
- Personal Access Token от supabase.com/dashboard/account/tokens → Management API
- Ручной путь: вставить SQL в Supabase Studio SQL Editor
