import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { fetchServices, fetchAvailableSlots, saveBooking } from './lib/supabase.js'
import { generateDiagnostic } from './lib/api.js'
import { buildIcs, downloadIcs } from './lib/ics.js'

const STEP = {
  HERO: 0,
  SERVICE: 1,
  QUALIFY: 2,
  SLOT: 3,
  CONTACT: 4,
  LOADING: 5,
  CONFIRM: 6,
}

const QUESTIONS = [
  { id: 'q1', kind: 'text', text: 'С каким запросом вы приходите? Расскажите своими словами, 1–3 предложения.' },
  { id: 'q2', kind: 'text', text: 'Что вы уже пробовали для решения этого вопроса?' },
  { id: 'q3', kind: 'text', text: 'Как вы поймёте, что сессия прошла успешно?' },
  { id: 'q4', kind: 'range', text: 'Насколько остро это переживается прямо сейчас?', min: 1, max: 10 },
  { id: 'q5', kind: 'pills', text: 'Готовы ли вы делать домашние задания между сессиями?', options: ['Да', 'Нет', 'Не уверен(а)'] },
]

const TOTAL_STEPS = 5

export default function App() {
  const [step, setStep] = useState(STEP.HERO)
  const [services, setServices] = useState([])
  const [slots, setSlots] = useState([])
  const [chosen, setChosen] = useState({
    service: null,
    answers: { q4: 5 },
    slot: null,
    name: '',
    email: '',
  })
  const [diagnostic, setDiagnostic] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const wizardRef = useRef(null)

  useEffect(() => {
    fetchServices().then(setServices).catch((e) => setErrMsg(e.message))
  }, [])

  function go(toStep) {
    setStep(toStep)
    setTimeout(() => {
      if (wizardRef.current && toStep !== STEP.HERO) {
        wizardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 60)
  }

  function startWizard() {
    go(STEP.SERVICE)
  }

  function pickService(svc) {
    setChosen((c) => ({ ...c, service: svc }))
    fetchAvailableSlots(svc.id).then(setSlots).catch((e) => setErrMsg(e.message))
    go(STEP.QUALIFY)
  }

  function setAnswer(id, value) {
    setChosen((c) => ({ ...c, answers: { ...c.answers, [id]: value } }))
  }

  function pickSlot(slot) {
    setChosen((c) => ({ ...c, slot }))
    go(STEP.CONTACT)
  }

  async function submit() {
    setErrMsg('')
    if (!chosen.name.trim() || !validEmail(chosen.email)) {
      setErrMsg('Проверьте имя и email.')
      return
    }
    go(STEP.LOADING)
    try {
      const report = await generateDiagnostic({
        service: chosen.service,
        answers: chosen.answers,
        clientName: chosen.name,
      })
      setDiagnostic(report)
      await saveBooking({
        slot_id: chosen.slot.id,
        service_id: chosen.service.id,
        client_name: chosen.name,
        client_email: chosen.email,
        qualification_answers: chosen.answers,
        diagnostic_report: report,
      })
      go(STEP.CONFIRM)
    } catch (e) {
      setErrMsg(e.message || 'Что-то пошло не так. Попробуйте ещё раз.')
      go(STEP.CONTACT)
    }
  }

  function reset() {
    setChosen({ service: null, answers: { q4: 5 }, slot: null, name: '', email: '' })
    setDiagnostic('')
    setErrMsg('')
    go(STEP.HERO)
  }

  const progress = useMemo(() => {
    if (step === STEP.HERO) return 0
    if (step === STEP.LOADING || step === STEP.CONFIRM) return 100
    return Math.min(100, (step / TOTAL_STEPS) * 100)
  }, [step])

  return (
    <div className="app-shell">
      <header className="site-header rise rise-1">
        <div className="brand">Mind<span className="dot"></span>Match</div>
        <div className="tagline">приходите на сессию подготовленным{' '}/{' '}AI-диагностика</div>
      </header>

      <Hero onStart={startWizard} />

      <Strip />

      <Editorial />

      <section ref={wizardRef} className="wizard step-enter" key={step}>
        <div className="wizard-progress"><div className="fill" style={{ width: `${progress}%` }} /></div>

        {errMsg && <div className="error-banner">{errMsg}</div>}

        {step === STEP.HERO && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p className="lede" style={{ marginBottom: 32 }}>
              Запись начнётся с пяти бережных вопросов.<br />Это займёт три минуты.
            </p>
            <button onClick={startWizard}>Начать запись →</button>
          </div>
        )}

        {step === STEP.SERVICE && (
          <ServiceStep services={services} chosen={chosen.service} onPick={pickService} onBack={() => go(STEP.HERO)} />
        )}

        {step === STEP.QUALIFY && (
          <QualifyStep
            answers={chosen.answers}
            onChange={setAnswer}
            onNext={() => go(STEP.SLOT)}
            onBack={() => go(STEP.SERVICE)}
          />
        )}

        {step === STEP.SLOT && (
          <SlotStep slots={slots} chosen={chosen.slot} onPick={pickSlot} onBack={() => go(STEP.QUALIFY)} />
        )}

        {step === STEP.CONTACT && (
          <ContactStep
            chosen={chosen}
            onChange={(field, v) => setChosen((c) => ({ ...c, [field]: v }))}
            onSubmit={submit}
            onBack={() => go(STEP.SLOT)}
          />
        )}

        {step === STEP.LOADING && <LoadingStep />}

        {step === STEP.CONFIRM && (
          <ConfirmStep chosen={chosen} diagnostic={diagnostic} onReset={reset} />
        )}
      </section>

      <footer className="site-footer rise rise-5">
        <div>© 2026 MindMatch</div>
        <div className="colophon">сделано неспешно, в одну ночь</div>
      </footer>
    </div>
  )
}

// ============================================================
// Hero, Editorial intro, Marquee strip
// ============================================================

function Hero({ onStart }) {
  return (
    <section className="hero">
      <div>
        <div className="hero-eyebrow rise rise-2">
          <span className="rule" /><span className="eyebrow">консультация × AI-диагностика</span>
        </div>
        <h1 className="rise rise-2">
          Приходите к&nbsp;коучу <span className="accent">не&nbsp;с&nbsp;пустого&nbsp;листа</span>.
        </h1>
        <p className="lede rise rise-3" style={{ marginTop: 32, maxWidth: 540 }}>
          Перед первой встречей вы отвечаете на пять вопросов — а AI готовит для вас и для&nbsp;коуча
          бережную пред-диагностику запроса. Сессия начинается с сути, а не со знакомства.
        </p>
        <div className="cta-row rise rise-4">
          <button onClick={onStart}>Записаться</button>
          <div className="helper">бесплатно, 3 минуты, без регистрации</div>
        </div>
      </div>

      <div className="hero-meta rise rise-3">
        <div className="row"><span>Длительность сессии</span><strong>60–90 мин</strong></div>
        <div className="row"><span>Формат</span><strong>онлайн</strong></div>
        <div className="row"><span>Подготовка к встрече</span><strong>AI-документ</strong></div>
        <div className="row"><span>Письмо со ссылкой</span><strong>сразу после записи</strong></div>
      </div>

      <svg className="hero-ornament" viewBox="0 0 280 280">
        <circle cx="140" cy="140" r="130" />
        <circle cx="140" cy="140" r="100" />
        <circle cx="140" cy="140" r="70" />
        <circle cx="140" cy="140" r="40" />
        <circle cx="140" cy="140" r="10" />
      </svg>
    </section>
  )
}

function Strip() {
  return (
    <div className="strip rise rise-5">
      <span>записаться</span>
      <span>ответить на 5 вопросов</span>
      <span>получить диагностику</span>
      <span>прийти подготовленным</span>
    </div>
  )
}

function Editorial() {
  return (
    <>
      <section className="editorial">
        <div className="col-label">
          <span className="num">01</span>
          <div className="eyebrow">как это устроено</div>
        </div>
        <div>
          <h2>Запись и диагностика — в одной форме</h2>
          <p className="lede" style={{ marginTop: 16 }}>
            Вы не пересылаете коучу «вводные» в мессенджере и не заполняете гугл-форму после
            оплаты. Всё происходит за один сценарий — пять вопросов внутри формы записи, после
            которых вы получаете короткий документ.
          </p>
        </div>
      </section>

      <section className="editorial">
        <div className="col-label">
          <span className="num">02</span>
          <div className="eyebrow">для кого</div>
        </div>
        <div>
          <h2>Коучи личностного роста и&nbsp;их клиенты</h2>
          <p>
            MindMatch снимает первый барьер: коуч приходит на сессию с пред-гипотезой и сразу
            работает с сутью, клиент чувствует, что его уже услышали. Это рамка коучинга — не
            терапии и не диагноза.
          </p>
        </div>
      </section>
    </>
  )
}

// ============================================================
// Wizard step components
// ============================================================

function ServiceStep({ services, chosen, onPick, onBack }) {
  return (
    <>
      <div className="wizard-header">
        <div>
          <h2>Выберите тип консультации</h2>
          <div className="step-lede">с этого начнётся ваш запрос</div>
        </div>
        <div className="step-tag">шаг 1 из 5</div>
      </div>
      <div className="service-list">
        {services.map((s) => (
          <button
            key={s.id}
            className={`service-card ${chosen?.id === s.id ? 'selected' : ''}`}
            onClick={() => onPick(s)}
          >
            <span className="duration">{s.duration_min} минут</span>
            <span className="name">{s.name}</span>
            <span className="desc">{s.description}</span>
          </button>
        ))}
      </div>
      <div className="wizard-nav">
        <button className="back-link" onClick={onBack}>← Назад</button>
        <span style={{ color: 'var(--ink-mute)', fontSize: 13 }}>выберите карточку, чтобы продолжить</span>
      </div>
    </>
  )
}

function QualifyStep({ answers, onChange, onNext, onBack }) {
  const ready = QUESTIONS.every((q) => {
    const v = answers[q.id]
    if (q.kind === 'text') return typeof v === 'string' && v.trim().length > 0
    if (q.kind === 'range') return v != null
    if (q.kind === 'pills') return Boolean(v)
    return false
  })
  return (
    <>
      <div className="wizard-header">
        <div>
          <h2>Пять вопросов о запросе</h2>
          <div className="step-lede">отвечайте свободно — это для подготовки к встрече</div>
        </div>
        <div className="step-tag">шаг 2 из 5</div>
      </div>

      <div className="q-list">
        {QUESTIONS.map((q, i) => (
          <div key={q.id} className="q-item">
            <div className="q-label">
              <span className="num">{i + 1}.</span>
              <span className="q-text">{q.text}</span>
            </div>
            {q.kind === 'text' && (
              <textarea
                style={{ marginLeft: 36, width: 'calc(100% - 36px)' }}
                value={answers[q.id] || ''}
                onChange={(e) => onChange(q.id, e.target.value)}
                placeholder="..."
              />
            )}
            {q.kind === 'range' && (
              <div className="range-row">
                <input
                  type="range"
                  min={q.min}
                  max={q.max}
                  value={answers[q.id] ?? 5}
                  onChange={(e) => onChange(q.id, Number(e.target.value))}
                />
                <div className="val">{answers[q.id] ?? 5}</div>
              </div>
            )}
            {q.kind === 'pills' && (
              <div className="pill-row">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    className={`pill ${answers[q.id] === opt ? 'selected' : ''}`}
                    onClick={() => onChange(q.id, opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="wizard-nav">
        <button className="back-link" onClick={onBack}>← Назад</button>
        <button onClick={onNext} disabled={!ready}>Выбрать время →</button>
      </div>
    </>
  )
}

function SlotStep({ slots, chosen, onPick, onBack }) {
  const byDay = useMemo(() => {
    const map = new Map()
    for (const s of slots) {
      const d = new Date(s.starts_at)
      const key = d.toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(s)
    }
    return Array.from(map.entries()).slice(0, 5)
  }, [slots])

  return (
    <>
      <div className="wizard-header">
        <div>
          <h2>Выберите время</h2>
          <div className="step-lede">ближайшие пять рабочих дней</div>
        </div>
        <div className="step-tag">шаг 3 из 5</div>
      </div>

      {byDay.length === 0 && <p style={{ color: 'var(--ink-mute)' }}>Загружаем расписание...</p>}

      {byDay.map(([day, daySlots]) => {
        const d = new Date(day)
        const weekday = d.toLocaleDateString('ru-RU', { weekday: 'long' })
        const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
        return (
          <div key={day} className="slot-section">
            <div className="slot-day-title">
              <span className="weekday">{weekday}</span>
              <span>{dateStr}</span>
            </div>
            <div className="slot-grid">
              {daySlots.map((s) => {
                const t = new Date(s.starts_at)
                const hh = String(t.getHours()).padStart(2, '0')
                const mm = String(t.getMinutes()).padStart(2, '0')
                return (
                  <button
                    key={s.id}
                    className={`slot-btn ${chosen?.id === s.id ? 'selected' : ''}`}
                    onClick={() => onPick(s)}
                    disabled={s.is_taken}
                  >
                    {hh}:{mm}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="wizard-nav">
        <button className="back-link" onClick={onBack}>← Назад</button>
        <span style={{ color: 'var(--ink-mute)', fontSize: 13 }}>кликните по времени</span>
      </div>
    </>
  )
}

function ContactStep({ chosen, onChange, onSubmit, onBack }) {
  return (
    <>
      <div className="wizard-header">
        <div>
          <h2>Куда отправить диагностику</h2>
          <div className="step-lede">через минуту вы получите её на экран и&nbsp;в&nbsp;письмо</div>
        </div>
        <div className="step-tag">шаг 4 из 5</div>
      </div>

      <div className="contact-form">
        <div>
          <label>Как к вам обращаться?</label>
          <input
            type="text"
            value={chosen.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Имя или имя и фамилия"
            autoFocus
          />
        </div>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={chosen.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div style={{ color: 'var(--ink-mute)', fontSize: 13, marginTop: 8 }}>
          Запрос: <strong>{chosen.service?.name}</strong> ·{' '}
          {chosen.slot && new Date(chosen.slot.starts_at).toLocaleString('ru-RU', {
            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
          })}
        </div>
      </div>

      <div className="wizard-nav">
        <button className="back-link" onClick={onBack}>← Назад</button>
        <button onClick={onSubmit} disabled={!chosen.name.trim() || !validEmail(chosen.email)}>
          Получить диагностику →
        </button>
      </div>
    </>
  )
}

function LoadingStep() {
  const phrases = [
    'Готовим вашу диагностику...',
    'Перечитываем ответы...',
    'Подбираем слова для коуча...',
  ]
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % phrases.length), 1600)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="loading-state">
      <div className="arc" />
      <div className="msg">{phrases[i]}</div>
    </div>
  )
}

function ConfirmStep({ chosen, diagnostic, onReset }) {
  const startsAt = new Date(chosen.slot.starts_at)
  const dateLine = startsAt.toLocaleString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })

  function downloadCalendar() {
    const ics = buildIcs({
      startIso: chosen.slot.starts_at,
      durationMin: chosen.service.duration_min,
      summary: `MindMatch · ${chosen.service.name}`,
      description: `Запись на консультацию. Диагностика отправлена на ${chosen.email}.`,
    })
    downloadIcs(`mindmatch-${startsAt.toISOString().slice(0,10)}.ics`, ics)
  }

  function printPage() {
    window.print()
  }

  return (
    <>
      <div className="confirm-head">
        <div className="check">✓ запись подтверждена</div>
        <h2>До встречи, {chosen.name.split(' ')[0]}.</h2>
        <div className="booking-summary">
          {chosen.service.name}<br />
          <span style={{ color: 'var(--ink-mute)' }}>{dateLine}</span>
        </div>
      </div>

      <div className="diagnostic">
        <Markdownish text={diagnostic} />
      </div>

      <div className="confirm-actions">
        <button onClick={downloadCalendar}>Добавить в календарь (.ics)</button>
        <button className="ghost" onClick={printPage}>Скачать как PDF</button>
        <button className="ghost" onClick={onReset}>Записаться ещё раз</button>
      </div>
    </>
  )
}

function Markdownish({ text }) {
  if (!text) return null
  const blocks = text.split(/\n\n+/).map((b) => b.trim()).filter(Boolean)
  return (
    <>
      {blocks.map((b, i) => {
        if (b.startsWith('### ')) return <h3 key={i}>{b.replace(/^###\s+/, '')}</h3>
        if (/^[-*]\s+/m.test(b)) {
          const items = b.split('\n').filter((l) => /^[-*]\s+/.test(l)).map((l) => l.replace(/^[-*]\s+/, ''))
          return (
            <ul key={i}>{items.map((it, j) => <li key={j}>{stripEm(it)}</li>)}</ul>
          )
        }
        return <p key={i}>{stripEm(b)}</p>
      })}
    </>
  )
}

function stripEm(s) {
  const parts = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let m
  let last = 0
  let key = 0
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) parts.push(s.slice(last, m.index))
    const seg = m[0]
    if (seg.startsWith('**')) parts.push(<strong key={key++}>{seg.slice(2, -2)}</strong>)
    else parts.push(<em key={key++}>{seg.slice(1, -1)}</em>)
    last = m.index + seg.length
  }
  if (last < s.length) parts.push(s.slice(last))
  return parts
}

function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '')
}
