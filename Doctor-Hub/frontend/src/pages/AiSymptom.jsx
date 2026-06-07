import { useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'

const EXAMPLE_SYMPTOMS = ['fever', 'headache', 'cough', 'fatigue', 'chest pain']

export default function AiSymptom() {
  const { backendUrl, token } = useContext(AppContext)
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const analyze = async () => {
    const symptoms = input.split(',').map((s) => s.trim()).filter(Boolean)
    if (!symptoms.length) {
      toast.warn('Enter symptoms separated by commas')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/ai/predict-disease`,
        { symptoms },
        { headers: token ? { token } : {} }
      )
      if (data.success) setResult(data.data)
      else toast.error(data.message)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const addTag = (tag) => {
    const parts = input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!parts.includes(tag)) parts.push(tag)
    setInput(parts.join(', '))
  }

  return (
    <div className="pb-16">
      <div className="dh-hero--clinical">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-200">Pre-visit triage</p>
          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">AI symptom check</h1>
          <p className="mt-3 max-w-2xl text-sm text-teal-100/90 md:text-base">
            Describe how you feel before booking — we suggest possible conditions and when to see a
            specialist. Guidance only, not a diagnosis.
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_minmax(280px,340px)]">
        <div className="space-y-6">
          <div className="dh-portal-panel p-6 md:p-8">
            <label className="dh-label" htmlFor="symptoms-input">
              Your symptoms
            </label>
            <p className="mt-1 text-xs text-slate-500">Separate each symptom with a comma</p>
            <textarea
              id="symptoms-input"
              className="dh-textarea mt-3 min-h-[120px]"
              rows={5}
              placeholder="e.g. fever, headache, sore throat"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_SYMPTOMS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                >
                  + {tag}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={analyze}
              disabled={loading}
              className="dh-btn mt-6 min-w-[200px]"
            >
              {loading ? 'Analyzing…' : 'Analyze symptoms'}
            </button>
          </div>

          {result && (
            <div className="dh-card overflow-hidden p-0">
              <div className="border-b border-amber-100 bg-amber-50/80 px-6 py-4">
                <p className="text-sm font-medium text-amber-900">{result.disclaimer}</p>
              </div>
              <div className="p-6 md:p-8">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Possible matches
                </h2>
                <ul className="mt-5 space-y-4">
                  {result.predictions.map((p) => {
                    const pct = Math.round((p.confidence || 0) * 100)
                    return (
                      <li key={p.condition}>
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="font-semibold text-slate-900">{p.condition}</span>
                          <span className="shrink-0 font-semibold text-teal-700">{pct}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
                <Link to="/doctors" className="dh-btn-outline mt-8 inline-flex">
                  Find a doctor →
                </Link>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="dh-card p-6">
            <h3 className="font-semibold text-slate-900">How it works</h3>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                  1
                </span>
                List symptoms you are experiencing today.
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                  2
                </span>
                AI ranks likely conditions with confidence scores.
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                  3
                </span>
                Book a verified doctor for proper diagnosis and care.
              </li>
            </ol>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5">
            <p className="text-sm font-semibold text-red-900">Emergency?</p>
            <p className="mt-1 text-xs leading-relaxed text-red-800/90">
              For severe chest pain, difficulty breathing, or loss of consciousness, call emergency
              services immediately — do not rely on this tool.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
