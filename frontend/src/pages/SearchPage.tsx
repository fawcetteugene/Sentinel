import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Badge } from '@/components/Badge'
import { SectionHeader } from '@/components/SectionHeader'
import { StatCard } from '@/components/StatCard'

const filters = [
  { label: 'All', value: '' },
  { label: 'Incidents', value: 'incident' },
  { label: 'Resources', value: 'resource' },
  { label: 'Users', value: 'user' },
  { label: 'Assignments', value: 'assignment' },
  { label: 'Reports', value: 'report' },
  { label: 'Alerts', value: 'notification' },
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
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <SectionHeader eyebrow="Search" title="Find records" description="Incidents, people, resources, reports, alerts, and closures." />
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500"
          />
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setKind(filter.value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold ring-1 transition ${
                  kind === filter.value ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-50 text-slate-600 ring-slate-200 hover:bg-slate-100'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Results" value={results.length} accent="bg-emerald-50 text-emerald-700" />
        <StatCard title="Query" value={query.trim() || '—'} accent="bg-sky-50 text-sky-700" />
        <StatCard title="Scope" value={kind || 'all'} accent="bg-amber-50 text-amber-700" />
        <StatCard title="State" value={query.trim().length ? 'live' : 'idle'} accent="bg-rose-50 text-rose-700" />
      </div>

      {query.trim().length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500">Type a word to search.</div>
      ) : searchQuery.isLoading ? (
        <div className="text-sm text-slate-500">Searching…</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {results.map((result) => (
            <a
              key={`${result.entity_type}-${result.entity_id}`}
              href={result.url ?? '#'}
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-slate-950">{result.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{result.subtitle}</div>
                </div>
                <Badge label={result.entity_type.toUpperCase()} tone="bg-emerald-50 text-emerald-700 ring-emerald-200" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.severity ? <Badge label={result.severity.toUpperCase()} tone="bg-sky-50 text-sky-700 ring-sky-200" /> : null}
                {result.status ? <Badge label={result.status.toUpperCase()} tone="bg-slate-50 text-slate-600 ring-slate-200" /> : null}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
