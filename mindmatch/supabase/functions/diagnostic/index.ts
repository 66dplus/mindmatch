// Supabase Edge Function — diagnostic
// Proxies the OpenRouter call so the API key never reaches the browser.
//
// Deploy:
//   supabase functions deploy diagnostic --no-verify-jwt
//   supabase secrets set OPENROUTER_API=sk-or-…
//
// Invoke (from the SPA): POST /functions/v1/diagnostic
//   body: { service, answers, clientName }

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const SYSTEM_PROMPT = `Ты — ассистент коуча личностного роста. На основе ответов клиента сгенерируй короткий (200–300 слов) диагностический документ из четырёх секций ровно в таком порядке и формате (Markdown):

### Суть запроса
Переформулируй запрос клиента своими словами одним абзацем, бережно и точно.

### Предварительная гипотеза
Опиши, что может стоять за запросом. Не ставь диагнозов. Тон мягкий, без оценочных суждений.

### Рекомендации к сессии
Три буллета для коуча — на что обратить внимание, какие вопросы могут раскрыть тему.

### Что клиенту сделать до встречи
Одно-два простых действия (наблюдения, заметки), которые помогут прийти подготовленным.

Стиль: на «вы», без медицинских терминов, без слова «диагноз», без рекомендации обратиться к врачу. Это рамка коучинга, не терапии.`

interface Body {
  service?: { name?: string; duration_min?: number }
  answers?: Record<string, unknown>
  clientName?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const apiKey = Deno.env.get('OPENROUTER_API')
  if (!apiKey) {
    return json({ error: 'OPENROUTER_API not configured on the server' }, 500)
  }

  const userPrompt = renderUserPrompt(body)

  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://66dplus.github.io/mindmatch/',
        'X-Title': 'MindMatch diagnostic',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.4,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    })
    if (!resp.ok) {
      const text = await resp.text()
      return json({ error: `OpenRouter ${resp.status}: ${text.slice(0, 300)}` }, 502)
    }
    const data = await resp.json()
    const report = data?.choices?.[0]?.message?.content?.trim() || ''
    return json({ report })
  } catch (e) {
    return json({ error: 'Network error: ' + (e as Error).message }, 502)
  }
})

function renderUserPrompt({ service, answers, clientName }: Body) {
  const lines = [
    `Имя клиента: ${clientName || '—'}`,
    `Тип сессии: ${service?.name || '—'} (${service?.duration_min || '—'} мин)`,
    '',
    'Ответы клиента на квалификацию:',
    `1. С каким запросом приходит: ${pickStr(answers?.q1)}`,
    `2. Что уже пробовал(а): ${pickStr(answers?.q2)}`,
    `3. Как поймёт, что сессия удалась: ${pickStr(answers?.q3)}`,
    `4. Острота переживания (1–10): ${answers?.q4 ?? '—'}`,
    `5. Готовность к домашним заданиям: ${pickStr(answers?.q5)}`,
  ]
  return lines.join('\n')
}

function pickStr(v: unknown) {
  if (typeof v === 'string') return v.trim() || '—'
  if (typeof v === 'number') return String(v)
  return '—'
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
