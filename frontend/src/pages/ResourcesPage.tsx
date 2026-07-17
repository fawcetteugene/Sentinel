import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ResourceBadge } from '@/components/Badge'
import { Composer } from '@/components/Composer'
import { SectionHeader } from '@/components/SectionHeader'
import { StatCard } from '@/components/StatCard'
import { queryKeys, useResourcesQuery } from '@/lib/queries'

export function ResourcesPage() {
  const queryClient = useQueryClient()
  const resourcesQuery = useResourcesQuery()
  const resources = resourcesQuery.data ?? []

  const available = resources.filter((item) => item.status === 'available').length
  const busy = resources.filter((item) => item.status === 'busy').length

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <SectionHeader eyebrow="Resources" title="Community assets" description="Local transport, shelters, clinics, water, food, and support." />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total" value={resources.length} accent="bg-emerald-50 text-emerald-700" />
        <StatCard title="Available" value={available} accent="bg-sky-50 text-sky-700" />
        <StatCard title="Busy" value={busy} accent="bg-amber-50 text-amber-700" />
        <StatCard title="Offline" value={resources.filter((item) => item.status === 'offline').length} accent="bg-rose-50 text-rose-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {resources.map((resource) => (
            <div key={resource.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-slate-950">{resource.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{resource.kind.replaceAll('_', ' ')}</div>
                </div>
                <ResourceBadge status={resource.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Mini label="Qty" value={`${resource.quantity}`} />
                <Mini label="ETA" value={resource.eta_minutes ? `${resource.eta_minutes} min` : '—'} />
                <Mini label="Fuel" value={resource.fuel_level ? `${resource.fuel_level}%` : '—'} />
                <Mini label="Unit" value={resource.unit_name ?? '—'} />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <SectionHeader eyebrow="Add" title="New resource" />
          <div className="mt-4">
            <Composer
              title=""
              submitLabel="Save"
              fields={[
                { name: 'name', label: 'Name' },
                { name: 'kind', label: 'Kind', placeholder: 'ambulance' },
                { name: 'status', label: 'Status', placeholder: 'available' },
                { name: 'quantity', label: 'Quantity', type: 'number' },
                { name: 'unit_name', label: 'Unit' },
                { name: 'eta_minutes', label: 'ETA', type: 'number' },
              ]}
              onSubmit={async (values) => {
                await api.createResource({
                  name: values.name,
                  kind: values.kind ?? 'ambulance',
                  status: values.status ?? 'available',
                  quantity: Number(values.quantity ?? 1),
                  unit_name: values.unit_name || null,
                  eta_minutes: values.eta_minutes ? Number(values.eta_minutes) : null,
                })
                await queryClient.invalidateQueries({ queryKey: queryKeys.resources })
                await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  )
}
