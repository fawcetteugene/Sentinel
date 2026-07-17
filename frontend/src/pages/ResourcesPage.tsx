import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Resource } from '@/types'
import { ResourceBadge } from '@/components/Badge'
import { Composer } from '@/components/Composer'
import { SectionHeader } from '@/components/SectionHeader'
import { queryKeys, useResourcesQuery } from '@/lib/queries'

export function ResourcesPage() {
  const queryClient = useQueryClient()
  const resourcesQuery = useResourcesQuery()
  const resources = resourcesQuery.data ?? []

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <SectionHeader eyebrow="Community resources" title="People, places, transport, and supplies" description="Track the local support network that helps communities respond before outside rescue arrives." />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {resources.map((resource) => (
            <div key={resource.id} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{resource.name}</div>
                  <div className="text-sm text-slate-400">{resource.kind.replace('_', ' ')}</div>
                </div>
                <ResourceBadge status={resource.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                <div className="rounded-2xl bg-slate-950/60 p-3">Qty {resource.quantity}</div>
                <div className="rounded-2xl bg-slate-950/60 p-3">ETA {resource.eta_minutes ?? '—'}</div>
                <div className="rounded-2xl bg-slate-950/60 p-3">Fuel {resource.fuel_level ?? '—'}</div>
                <div className="rounded-2xl bg-slate-950/60 p-3">Unit {resource.unit_name ?? '—'}</div>
              </div>
            </div>
          ))}
        </div>
        <Composer
          title="Add community resource"
          submitLabel="Save resource"
          fields={[
            { name: 'name', label: 'Name' },
            { name: 'kind', label: 'Kind', placeholder: 'ambulance' },
            { name: 'status', label: 'Status', placeholder: 'available' },
            { name: 'quantity', label: 'Quantity', type: 'number' },
            { name: 'unit_name', label: 'Unit Name' },
            { name: 'eta_minutes', label: 'ETA Minutes', type: 'number' },
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
  )
}
