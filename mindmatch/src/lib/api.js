// Calls the diagnostic edge function (Supabase) that proxies OpenRouter.
// Falls back to a deterministic mock when the function URL isn't configured.

const FN_URL = import.meta.env.VITE_DIAGNOSTIC_FN_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function generateDiagnostic({ service, answers, clientName }) {
  if (!FN_URL) {
    return mockDiagnostic({ service, answers, clientName })
  }
  try {
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY } : {}),
      },
      body: JSON.stringify({ service, answers, clientName }),
    })
    if (!res.ok) throw new Error(`AI запрос вернул ${res.status}`)
    const data = await res.json()
    return data.report || data.text || mockDiagnostic({ service, answers, clientName })
  } catch (e) {
    console.warn('[api] diagnostic fallback:', e.message)
    return mockDiagnostic({ service, answers, clientName })
  }
}

function mockDiagnostic({ service, answers, clientName }) {
  const first = (clientName || 'клиент').split(' ')[0]
  const q1 = (answers.q1 || '').slice(0, 120)
  const urgency = answers.q4 || 5
  return [
    '### Суть запроса',
    `${first} приходит с запросом, связанным с темой «${service?.name?.toLowerCase() || 'личностный рост'}». В своих словах: «${q1}». Острота переживания на момент обращения — ${urgency} из 10.`,
    '',
    '### Предварительная гипотеза',
    `Похоже, за внешним вопросом стоит более глубокий слой — потребность в опоре и в том, чтобы быть услышанным/услышанной без оценки. Возможны несколько внутренних голосов, которые тянут в разные стороны: один требует результата, другой просит замедлиться.`,
    '',
    '### Рекомендации к сессии',
    '- Начать с короткого «приземления» (1–2 минуты), чтобы снизить уровень напряжения.',
    '- Уточнить критерий «как поймём, что сессия удалась» — это покажет реальный фокус.',
    '- Аккуратно проверить, нет ли запроса на быстрое решение там, где нужен процесс.',
    '',
    '### Что сделать клиенту до встречи',
    '- За день до сессии записать одну фразу: «если бы всё уже получилось, я бы…».',
    '- Прийти на встречу с одним конкретным эпизодом из жизни, который иллюстрирует запрос.',
    '',
    '*Документ сгенерирован AI как стартовая опора для сессии. Это не диагноз и не замена терапевтической работы.*',
  ].join('\n')
}
