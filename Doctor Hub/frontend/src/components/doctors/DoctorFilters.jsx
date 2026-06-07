const DEFAULT_TREATMENTS = [
  { id: '', label: 'All types', icon: '◆' },
  { id: 'allopathic', label: 'Allopathic', icon: '⚕' },
  { id: 'homeopathic', label: 'Homeopathic', icon: '🌿' },
  { id: 'herbal', label: 'Herbal', icon: '🍃' },
]

const DEFAULT_SPECIALITIES = [
  'General physician',
  'Gynecologist',
  'Dermatologist',
  'Pediatricians',
  'Neurologist',
  'Gastroenterologist',
]

export default function DoctorFilters({
  disease,
  setDisease,
  treatment,
  setTreatment,
  speciality,
  onApplyDisease,
  onClearAll,
  onSpeciality,
  resultCount,
  specialities = DEFAULT_SPECIALITIES,
  treatments = DEFAULT_TREATMENTS,
  diseaseSuggestions = [],
}) {
  const treatmentButtons =
    treatments.length > 0
      ? treatments
      : DEFAULT_TREATMENTS

  const specialityList = specialities.length > 0 ? specialities : DEFAULT_SPECIALITIES

  return (
    <aside className="space-y-5 lg:w-80 lg:shrink-0">
      <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-800">Smart search</p>
        <label className="mt-3 block text-sm font-medium text-slate-700">Filter by disease</label>
        <input
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-inner focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          placeholder="e.g. diabetes, fever, migraine"
          value={disease}
          onChange={(e) => setDisease(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onApplyDisease()}
          list={diseaseSuggestions.length ? 'dh-disease-suggestions' : undefined}
        />
        {diseaseSuggestions.length > 0 ? (
          <datalist id="dh-disease-suggestions">
            {diseaseSuggestions.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        ) : null}
        <button type="button" className="dh-btn mt-3 w-full py-2.5 text-sm" onClick={onApplyDisease}>
          Search doctors
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Treatment system</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {treatmentButtons.map((t) => (
            <button
              key={t.id || 'all'}
              type="button"
              onClick={() => setTreatment(t.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition ${
                treatment === t.id
                  ? 'border-teal-600 bg-teal-600 text-white shadow-md'
                  : 'border-slate-100 bg-slate-50 text-slate-700 hover:border-teal-200 hover:bg-teal-50'
              }`}
            >
              <span className="text-sm opacity-80">{t.icon || '⚕'}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Speciality</p>
        <div className="mt-3 flex flex-col gap-0.5 max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => onSpeciality(null)}
            className={`rounded-lg px-3 py-2 text-left text-sm transition ${
              !speciality ? 'bg-teal-50 font-semibold text-teal-800' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            All specialities
          </button>
          {specialityList.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeciality(s)}
              className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                speciality === s
                  ? 'bg-teal-50 font-semibold text-teal-800'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onClearAll}
        className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:border-teal-300 hover:text-teal-700"
      >
        Clear all filters
      </button>

      {resultCount !== undefined && (
        <p className="text-center text-xs text-slate-500">
          Showing <strong className="text-teal-700">{resultCount}</strong> doctor
          {resultCount === 1 ? '' : 's'}
        </p>
      )}
    </aside>
  )
}

export { DEFAULT_SPECIALITIES, DEFAULT_TREATMENTS }
