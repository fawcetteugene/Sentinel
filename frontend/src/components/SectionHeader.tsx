export function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.35em] text-calm/80">{eyebrow}</div>
      <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
      {description ? <p className="mt-2 max-w-3xl text-sm text-slate-400">{description}</p> : null}
    </div>
  )
}

