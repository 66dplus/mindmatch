// Supabase Edge Function: POST /diagnostic
// Proxies a structured prompt to OpenRouter and returns markdown.
//
// Required Supabase secrets:
//   OPENROUTER_API_KEY  — your openrouter.ai key
//   OPENROUTER_MODEL    — e.g. "anthropic/claude-3.5-haiku" (optional, has default)
//
// Deploy:
//   supabase functions deploy diagnostic --no-verify-jwt
//
// Call: POST { service: {...}, answers: {...}, clientName: "Anna" }

// @ts-expect-error — Deno runtime
import "jsr:@std/dotenv/load"

const SYSTEM_PROMPT = `Ты — ассистент коуча личностного роста. На основе ответов клиента
сгенерируй короткий (200–300 слов) диагностический документ из 4 секций:

1. **Суть запроса** (1 абзац, переформулируй своими словами)
2. **Предварительная гипотеза** (что может стоять за запросом — мягко,
   без диагнозов)
3. **Рекомендации к сессии** (3 буллета для коуча: на что обратить внимание)
4. **Что клиенту сделать до встречи** (1–2 простых действия)

Стиль: бережный, на «вы», без медицинских терминов, без оценочных суждений.
Не давай советов уровня «обратитесь к врачу» — это рамка коучинга, не терапии.
Выводи markdown с заголовками вида "### Суть запроса".`

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
}

// @ts-expect-error — Deno serve
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== "POST") return json({ error: "POST only" }, 405)

  let body: { service?: { name?: string }; answers?: Record<string, unknown>; clientName?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: "Body must be JSON" }, 400)
  }

  const service = body.service?.name ?? "консультация"
  const a = body.answers ?? {}
  const name = body.clientName ?? "клиент"

  const userPrompt = `Имя клиента: ${name}
Тип консультации: ${service}

Ответы клиента:
1. С каким запросом приходите: ${a.q1 ?? "—"}
2. Что уже пробовали: ${a.q2 ?? "—"}
3. Критерий успеха сессии: ${a.q3 ?? "—"}
4. Острота переживания (1–10): ${a.q4 ?? "—"}
5. Готовность к домашним заданиям: ${a.q5 ?? "—"}

Сгенерируй диагностический документ согласно формату.`

  // @ts-expect-error — Deno.env
  const apiKey = Deno.env.get("OPENROUTER_API_KEY")
  if (!apiKey) return json({ error: "OPENROUTER_API_KEY not configured" }, 500)
  // @ts-expect-error — Deno.env
  const model = Deno.env.get("OPENROUTER_MODEL") ?? "anthropic/claude-3.5-haiku"

  try {
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://66dplus.github.io/mindmatch",
        "X-Title": "MindMatch",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    })
    if (!upstream.ok) {
      const text = await upstream.text()
      return json({ error: `OpenRouter ${upstream.status}`, detail: text.slice(0, 400) }, 502)
    }
    const data = await upstream.json()
    const report = data.choices?.[0]?.message?.content ?? ""
    return json({ report })
  } catch (e) {
    return json({ error: "Upstream failure", detail: String(e) }, 502)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })
}
