import { ClockIcon } from '@heroicons/react/24/outline'

export function CommandFeed({ items }: { items: Array<{ title: string; body: string; time: string }> }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.title}-${item.time}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="mt-1 text-sm text-slate-400">{item.body}</div>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-400">
              <ClockIcon className="h-4 w-4" />
              {item.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

