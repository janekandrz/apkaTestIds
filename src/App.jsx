import { useEffect, useMemo, useState } from 'react'

const ANSWER_KEY = [
  'BD', 'AD', 'AB', 'BC', 'AC', 'AD', 'AD', 'AC', 'BC', 'AB',
  'AC', 'AC', 'CD', 'AC', 'CD', 'AC', 'BC', 'BC', 'AC', 'CD',
  'AC', 'CD', 'BD', 'AD', 'BC', 'CD', 'AD', 'BC', 'AD', 'AC',
]

const EXAM_QUESTIONS = ANSWER_KEY.map((correct, index) => ({
  image: `/questions/q${String(index + 1).padStart(2, '0')}.png`,
  context: index === 5 || index === 6 ? '/questions/context-06-07.png' : null,
  correct: correct.split(''),
  source: 'Egzamin 2022',
}))

const BAZA_QUESTION_DATA = [
  [1, 'AD'], [3, 'AB'], [4, 'AD'], [5, 'CD'], [6, 'AD'], [7, 'CD'],
  [8, 'AB'], [9, 'BC'], [10, 'BC'], [11, 'AC'], [12, 'BD'], [13, 'AC'],
  [15, 'CD'], [28, 'BD'], [31, 'CD'], [35, 'AC'], [42, 'AD'], [45, 'BD'],
  [50, 'AC'], [58, 'B'], [60, 'C'], [63, 'C'], [70, 'BD'], [73, 'B'],
]

const BAZA_QUESTIONS = BAZA_QUESTION_DATA.map(([sourceNumber, correct]) => ({
  image: `/questions/baza-${String(sourceNumber).padStart(2, '0')}.png`,
  context: sourceNumber === 58 || sourceNumber === 60
    ? '/questions/context-06-07.png'
    : null,
  correct: correct.split(''),
  choices: sourceNumber === 63 ? ['A', 'B', 'C'] : undefined,
  source: `IS_BAZA nr ${sourceNumber}`,
}))

const QUESTIONS = [...EXAM_QUESTIONS, ...BAZA_QUESTIONS].map((question, index) => ({
  ...question,
  id: index + 1,
}))

const DEFAULT_ANSWERS = ['A', 'B', 'C', 'D']
const ACTIVE_KEY = 'egzamin-is-active'
const HISTORY_KEY = 'egzamin-is-history'

const emptyAnswers = () => Object.fromEntries(QUESTIONS.map(({ id }) => [id, []]))
const emptyChecked = () => Object.fromEntries(QUESTIONS.map(({ id }) => [id, false]))

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function sameAnswers(left = [], right = []) {
  return [...left].sort().join('') === [...right].sort().join('')
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function App() {
  const saved = readStorage(ACTIVE_KEY, null)
  const [screen, setScreen] = useState(saved ? 'quiz' : 'home')
  const [current, setCurrent] = useState(saved?.current ?? 0)
  const [answers, setAnswers] = useState(saved?.answers ?? emptyAnswers())
  const [checked, setChecked] = useState(saved?.checked ?? emptyChecked())
  const [startedAt, setStartedAt] = useState(saved?.startedAt ?? null)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState(() => readStorage(HISTORY_KEY, []))

  const answeredCount = useMemo(
    () => QUESTIONS.filter(({ id }) => checked[id]).length,
    [checked],
  )

  useEffect(() => {
    if (screen !== 'quiz' || !startedAt) return undefined

    const updateElapsed = () => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }

    updateElapsed()
    const timer = window.setInterval(updateElapsed, 1000)
    return () => window.clearInterval(timer)
  }, [screen, startedAt])

  useEffect(() => {
    if (screen !== 'quiz' || !startedAt) return
    localStorage.setItem(ACTIVE_KEY, JSON.stringify({ current, answers, checked, startedAt }))
  }, [answers, checked, current, screen, startedAt])

  function startQuiz() {
    const timestamp = Date.now()
    setAnswers(emptyAnswers())
    setChecked(emptyChecked())
    setCurrent(0)
    setStartedAt(timestamp)
    setElapsed(0)
    setResult(null)
    setScreen('quiz')
    localStorage.setItem(
      ACTIVE_KEY,
      JSON.stringify({
        current: 0,
        answers: emptyAnswers(),
        checked: emptyChecked(),
        startedAt: timestamp,
      }),
    )
  }

  function toggleAnswer(questionId, answer) {
    if (checked[questionId]) return

    setAnswers((previous) => {
      const selected = previous[questionId] ?? []
      const next = selected.includes(answer)
        ? selected.filter((item) => item !== answer)
        : [...selected, answer].sort()

      const requiredAnswers = QUESTIONS.find(({ id }) => id === questionId).correct.length
      if (next.length === requiredAnswers) {
        setChecked((currentChecked) => ({ ...currentChecked, [questionId]: true }))
      }

      return { ...previous, [questionId]: next }
    })
  }

  function finishQuiz() {
    const details = QUESTIONS.map((question) => ({
      id: question.id,
      selected: answers[question.id] ?? [],
      correct: question.correct,
      isCorrect: sameAnswers(answers[question.id], question.correct),
    }))
    const score = details.filter(({ isCorrect }) => isCorrect).length
    const completedAt = Date.now()
    const summary = {
      id: completedAt,
      date: new Date(completedAt).toISOString(),
      score,
      total: QUESTIONS.length,
      duration: Math.floor((completedAt - startedAt) / 1000),
      details,
    }
    const nextHistory = [summary, ...history].slice(0, 20)

    setResult(summary)
    setHistory(nextHistory)
    setScreen('result')
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory))
    localStorage.removeItem(ACTIVE_KEY)
  }

  function abandonQuiz() {
    localStorage.removeItem(ACTIVE_KEY)
    setScreen('home')
    setStartedAt(null)
  }

  if (screen === 'home') {
    return (
      <main className="shell">
        <section className="hero">
          <span className="eyebrow">Identyfikacja systemów</span>
          <h1>Egzamin IS</h1>
          <p>
            {QUESTIONS.length} unikalne pytania z egzaminu 2022 i bazy IS.
            W każdym pytaniu wybierz wszystkie poprawne odpowiedzi.
          </p>
          <button className="primary large" onClick={startQuiz}>
            {saved ? 'Zacznij od nowa' : 'Rozpocznij test'}
          </button>
          {saved && (
            <button className="secondary large" onClick={() => setScreen('quiz')}>
              Kontynuuj zapisany test
            </button>
          )}
        </section>

        <section className="history">
          <div className="section-heading">
            <h2>Historia wyników</h2>
            {history.length > 0 && (
              <button
                className="text-button"
                onClick={() => {
                  setHistory([])
                  localStorage.removeItem(HISTORY_KEY)
                }}
              >
                Wyczyść
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="empty">Brak ukończonych podejść.</p>
          ) : (
            <div className="history-list">
              {history.map((attempt) => (
                <article className="attempt" key={attempt.id}>
                  <strong>{attempt.score}/{attempt.total}</strong>
                  <span>{Math.round((attempt.score / attempt.total) * 100)}%</span>
                  <span>{formatDuration(attempt.duration)}</span>
                  <time>{new Date(attempt.date).toLocaleString('pl-PL')}</time>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    )
  }

  if (screen === 'result' && result) {
    return (
      <main className="shell">
        <section className="result-card">
          <span className="eyebrow">Test zakończony</span>
          <div className="score">{result.score}<small>/{result.total}</small></div>
          <h1>{Math.round((result.score / result.total) * 100)}%</h1>
          <p>Czas: {formatDuration(result.duration)}</p>
          <div className="result-actions">
            <button className="primary" onClick={startQuiz}>Spróbuj ponownie</button>
            <button className="secondary" onClick={() => setScreen('home')}>Strona główna</button>
          </div>
        </section>

        <section className="review">
          <h2>Podsumowanie odpowiedzi</h2>
          <div className="review-grid">
            {result.details.map((item) => (
              <button
                className={`review-item ${item.isCorrect ? 'correct' : 'wrong'}`}
                key={item.id}
                onClick={() => {
                  setCurrent(item.id - 1)
                  setScreen('review')
                }}
              >
                <strong>{item.id}</strong>
                <span>{item.selected.join('') || '—'} / {item.correct.join('')}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    )
  }

  const question = QUESTIONS[current]
  const selected = answers[question.id] ?? []
  const isReview = screen === 'review'
  const isChecked = isReview || checked[question.id]
  const isCurrentCorrect = sameAnswers(selected, question.correct)

  return (
    <main className="quiz-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setScreen(result ? 'result' : 'home')}>Egzamin IS</button>
        <div className="topbar-stats">
          {!isReview && <span>{answeredCount}/{QUESTIONS.length} odpowiedziano</span>}
          {!isReview && <span>{formatDuration(elapsed)}</span>}
          {isReview && <span>Podgląd wyniku</span>}
        </div>
      </header>

      <div className="progress" aria-label={`Pytanie ${question.id} z ${QUESTIONS.length}`}>
        <div style={{ width: `${((current + 1) / QUESTIONS.length) * 100}%` }} />
      </div>

      <section className="question-card">
        <div className="question-meta">
          <span>Pytanie {question.id} z {QUESTIONS.length} · {question.source}</span>
          {isChecked && (
            <span className={isCurrentCorrect ? 'status-correct' : 'status-wrong'}>
              {isCurrentCorrect ? 'Poprawnie' : 'Błędnie'}
            </span>
          )}
        </div>

        {question.context && (
          <img className="context-image" src={question.context} alt="Wykres do pytań 6 i 7" />
        )}
        <img className="question-image" src={question.image} alt={`Treść pytania ${question.id}`} />

        <div className="answer-grid">
          {(question.choices ?? DEFAULT_ANSWERS).map((answer) => {
            const isSelected = selected.includes(answer)
            const isCorrect = isChecked && question.correct.includes(answer)
            const isWrong = isChecked && isSelected && !isCorrect
            return (
              <button
                key={answer}
                className={[
                  'answer',
                  isSelected ? 'selected' : '',
                  isCorrect ? 'answer-correct' : '',
                  isWrong ? 'answer-wrong' : '',
                ].join(' ')}
                onClick={() => toggleAnswer(question.id, answer)}
                disabled={isChecked}
              >
                {answer}
              </button>
            )
          })}
        </div>
        <p className="hint">
          {isChecked
            ? isCurrentCorrect
              ? 'Dobra odpowiedź.'
              : `Poprawne odpowiedzi: ${question.correct.join(', ')}.`
            : `Zaznacz ${question.correct.length === 1 ? 'jedną odpowiedź' : 'dwie odpowiedzi'}. Wynik pojawi się od razu.`}
        </p>

        <nav className="navigation">
          <button
            className="secondary"
            onClick={() => setCurrent((value) => Math.max(0, value - 1))}
            disabled={current === 0}
          >
            Wstecz
          </button>
          {current < QUESTIONS.length - 1 ? (
            <button
              className="primary"
              onClick={() => setCurrent((value) => value + 1)}
              disabled={!isReview && !checked[question.id]}
            >
              Dalej
            </button>
          ) : isReview ? (
            <button className="primary" onClick={() => setScreen('result')}>Wróć do wyniku</button>
          ) : (
            <button className="finish" onClick={finishQuiz} disabled={!checked[question.id]}>
              Zakończ test
            </button>
          )}
        </nav>
      </section>

      {!isReview && (
        <div className="quiz-footer">
          <button className="text-button danger" onClick={abandonQuiz}>Przerwij test</button>
          <div className="question-dots">
            {QUESTIONS.map(({ id }, index) => (
              <button
                key={id}
                className={[
                  index === current ? 'active' : '',
                  checked[id] ? 'answered' : '',
                  checked[id] && sameAnswers(answers[id], QUESTIONS[index].correct) ? 'dot-correct' : '',
                  checked[id] && !sameAnswers(answers[id], QUESTIONS[index].correct) ? 'dot-wrong' : '',
                ].join(' ')}
                onClick={() => setCurrent(index)}
                aria-label={`Przejdź do pytania ${id}`}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

export default App
