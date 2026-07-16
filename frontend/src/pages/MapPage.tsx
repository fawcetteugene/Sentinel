import type { Incident, Resource } from '@/types'
import { MapPanel } from '@/components/MapPanel'
import { SectionHeader } from '@/components/SectionHeader'
import { useIncidentsQuery, useResourcesQuery } from '@/lib/queries'

export function MapPage() {
  const incidentsQuery = useIncidentsQuery()
  const resourcesQuery = useResourcesQuery()
  const incidents = incidentsQuery.data ?? []
  const resources = resourcesQuery.data ?? []

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <SectionHeader eyebrow="Interactive Map" title="Live operational geography" />
      <MapPanel incidents={incidents} resources={resources} />
    </div>
  )
}
