export function Timeline({ items }: { items: Array<{ label: string; narrative: string; timestamp: string }> }) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-calm shadow-[0_0_0_6px_rgba(56,189,248,0.15)]" />
            {index < items.length - 1 ? <div className="mt-2 h-full w-px bg-white/10" /> : null}
          </div>
          <div className="-mt-1 pb-4">
            <div className="text-sm font-semibold">{item.label}</div>
            <div className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</div>
            <div className="mt-2 text-sm text-slate-300">{item.narrative}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

