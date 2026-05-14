// Fallback service catalog used until Supabase is wired.
// In production these come from `services` table.

export const FALLBACK_SERVICES = [
  {
    id: 1,
    name: 'Карьерный фокус',
    duration_min: 60,
    description: 'Разобрать, что мешает двигаться в работе, и собрать план на 30 дней.',
  },
  {
    id: 2,
    name: 'Прорыв из выгорания',
    duration_min: 90,
    description: 'Найти источник усталости и составить мягкий план восстановления.',
  },
  {
    id: 3,
    name: 'Точка А → точка Б',
    duration_min: 60,
    description: 'Понять, где вы сейчас и куда хотите прийти — без давления и общих фраз.',
  },
]

// Generate fallback slots: weekdays at 10:00, 12:00, 15:00, 17:00 for the next 7 days.
export function generateFallbackSlots() {
  const slots = []
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  let day = new Date(now)
  day.setDate(day.getDate() + 1) // start tomorrow

  let count = 0
  while (slots.length < 28 && count < 14) {
    const dow = day.getDay()
    if (dow !== 0 && dow !== 6) {
      for (const hour of [10, 12, 15, 17]) {
        const slot = new Date(day)
        slot.setHours(hour, 0, 0, 0)
        slots.push({
          id: `fb-${slot.toISOString()}`,
          starts_at: slot.toISOString(),
          is_taken: false,
        })
      }
    }
    day = new Date(day)
    day.setDate(day.getDate() + 1)
    count++
  }
  return slots
}
