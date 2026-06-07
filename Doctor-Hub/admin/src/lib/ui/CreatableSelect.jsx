import { useEffect, useId, useState } from 'react'

/**
 * Select with optional "add new" — calls onAddNew when user enters a custom value.
 */
export default function CreatableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  addLabel = '+ Add new…',
  onAddNew,
  disabled = false,
  required = false,
  className = '',
  inputClassName = 'dh-input w-full',
}) {
  const id = useId()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!adding) setDraft('')
  }, [adding])

  const normalized = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  )
  const hasValue = normalized.some((o) => o.value === value)

  const handleSelect = (e) => {
    const v = e.target.value
    if (v === '__add_new__') {
      setAdding(true)
      return
    }
    onChange(v)
  }

  const submitNew = async () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    let nextValue = trimmed
    if (onAddNew) {
      const result = await onAddNew(trimmed)
      if (result != null && result !== '') nextValue = result
    }
    onChange(nextValue)
    setAdding(false)
    setDraft('')
  }

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      ) : null}
      {adding ? (
        <div className="flex flex-wrap gap-2">
          <input
            id={id}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Enter new value"
            className={`${inputClassName} min-w-0 flex-1`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitNew()
              }
              if (e.key === 'Escape') setAdding(false)
            }}
          />
          <button type="button" className="dh-btn dh-btn-primary shrink-0 px-3 py-2 text-sm" onClick={submitNew}>
            Add
          </button>
          <button type="button" className="dh-btn shrink-0 px-3 py-2 text-sm" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <select
          id={id}
          value={hasValue ? value : value || ''}
          onChange={handleSelect}
          disabled={disabled}
          required={required && !value}
          className={inputClassName}
        >
          <option value="">{placeholder}</option>
          {normalized.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label ?? o.value}
            </option>
          ))}
          {!hasValue && value ? (
            <option value={value}>{value}</option>
          ) : null}
          {onAddNew ? <option value="__add_new__">{addLabel}</option> : null}
        </select>
      )}
    </div>
  )
}
