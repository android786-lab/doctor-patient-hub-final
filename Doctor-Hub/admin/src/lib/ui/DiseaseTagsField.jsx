import { useId, useState } from 'react'

/** Comma-separated diseases with suggestions and "add new" chip. */
export default function DiseaseTagsField({
  label = 'Diseases treated',
  value = '',
  onChange,
  suggestions = [],
  onAddSuggestion,
  placeholder = 'Type disease and press Enter',
  inputClassName = 'dh-input w-full',
}) {
  const id = useId()
  const [input, setInput] = useState('')
  const tags = value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase()
    if (!tag) return
    if (tags.includes(tag)) {
      setInput('')
      return
    }
    const next = [...tags, tag].join(', ')
    onChange(next)
    setInput('')
  }

  const removeTag = (tag) => {
    onChange(tags.filter((t) => t !== tag).join(', '))
  }

  const filteredSuggestions = suggestions
    .filter((s) => !tags.includes(String(s).toLowerCase()))
    .slice(0, 12)

  return (
    <div>
      {label ? (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      <div className="mb-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200"
          >
            {tag}
            <button
              type="button"
              className="text-teal-600 hover:text-teal-900"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        id={id}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag(input)
          }
        }}
        onBlur={() => {
          if (input.trim()) addTag(input)
        }}
        placeholder={placeholder}
        className={inputClassName}
      />
      {filteredSuggestions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="w-full text-xs text-slate-500">Suggestions:</span>
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-teal-300 hover:bg-teal-50"
              onClick={() => addTag(s)}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
      {onAddSuggestion ? (
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-900"
          onClick={async () => {
            const name = window.prompt('New disease name')
            if (!name?.trim()) return
            await onAddSuggestion(name.trim())
            addTag(name)
          }}
        >
          + Add new disease to catalog
        </button>
      ) : null}
      <p className="mt-1 text-xs text-slate-500">Press Enter or comma to add each disease.</p>
    </div>
  )
}
