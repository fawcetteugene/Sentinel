import { useState, type FormEvent } from 'react'

export function Composer({
  title,
  fields,
  onSubmit,
  submitLabel = 'Submit',
}: {
  title: string
  fields: Array<{ name: string; label: string; type?: string; placeholder?: string }>
  onSubmit: (values: Record<string, string>) => Promise<void> | void
  submitLabel?: string
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await onSubmit(values)
      setValues({})
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-4 grid gap-3">
        {fields.map((field) => (
          <label key={field.name} className="grid gap-2 text-sm">
            <span className="text-slate-400">{field.label}</span>
            <input
              type={field.type ?? 'text'}
              value={values[field.name] ?? ''}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
              placeholder={field.placeholder}
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-calm/60"
            />
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-2xl bg-calm px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? 'Processing…' : submitLabel}
      </button>
    </form>
  )
}
