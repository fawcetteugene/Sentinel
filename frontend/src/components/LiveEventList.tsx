export function LiveEventList({ events }: { events: Array<{ type: string; message: string; created_at: string }> }) {
  return (
    <div className="space-y-3">
      {events.slice(0, 12).map((event, index) => (
        <div key={`${event.created_at}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-medium capitalize">{event.type}</div>
            <div className="text-[11px] text-slate-500">{new Date(event.created_at).toLocaleTimeString()}</div>
          </div>
          <div className="mt-2 text-sm text-slate-300">{event.message}</div>
        </div>
      ))}
    </div>
  )
}

