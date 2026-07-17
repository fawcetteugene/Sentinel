import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Badge } from '@/components/Badge'
import { SectionHeader } from '@/components/SectionHeader'

const filters = [
  { label: 'All', value: '' },
  { label: 'Incidents', value: 'incident' },
  { label: 'Resources', value: 'resource' },
  { label: 'Users', value: 'user' },
  { label: 'Assignments', value: 'assignment' },
  { label: 'Reports', value: 'report' },
  { label: 'Notifications', value: 'notification' },
  { label: 'Closures', value: 'closure' },
]

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('')

  const searchQuery = useQuery({
    queryKey: ['search', query, kind],
    queryFn: () => api.search(query, kind || null),
    enabled: query.trim().length > 0,
  })

  const results = searchQuery.data?.results ?? []

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <SectionHeader
        eyebrow="Global Search"
        title="Search the operational picture"
        description="Query incidents, missions, assets, people, reports, notifications, and closures from one screen."
      />
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search everything..."
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-calm/60"
          />
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setKind(filter.value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold ring-1 transition ${
                  kind === filter.value ? 'bg-calm/15 text-calm ring-calm/30' : 'bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">Try terms like flood, ambulance, commander, report, shelter, or closure.</div>
      </div>

      {query.trim().length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-sm text-slate-400">
          Enter a search term to scan the full operational dataset.
        </div>
      ) : searchQuery.isLoading ? (
        <div className="text-sm text-slate-400">Searching operational records…</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {results.length ? (
            results.map((result) => (
              <a key={`${result.entity_type}-${result.entity_id}`} href={result.url ?? '#'} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow transition hover:-translate-y-1 hover:bg-white/10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{result.title}</div>
                    <div className="text-sm text-slate-400">{result.subtitle}</div>
                  </div>
                  <Badge label={result.entity_type.toUpperCase()} tone="bg-white/10 text-slate-200 ring-white/10" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {result.severity ? <Badge label={result.severity.toUpperCase()} tone="bg-calm/15 text-calm ring-calm/30" /> : null}
                  {result.status ? <Badge label={result.status.toUpperCase()} tone="bg-white/10 text-slate-200 ring-white/10" /> : null}
                </div>
              </a>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-sm text-slate-400">
              No operational records matched this query.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
