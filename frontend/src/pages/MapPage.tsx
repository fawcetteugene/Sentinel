import { MapPanel } from '@/components/MapPanel'
import { SectionHeader } from '@/components/SectionHeader'
import { useCurrentWeatherQuery, useIncidentsQuery, useRoadClosuresQuery, useResourcesQuery } from '@/lib/queries'

export function MapPage() {
  const incidentsQuery = useIncidentsQuery()
  const resourcesQuery = useResourcesQuery()
  const closuresQuery = useRoadClosuresQuery()
  const weatherQuery = useCurrentWeatherQuery()
  const incidents = incidentsQuery.data ?? []
  const resources = resourcesQuery.data ?? []
  const closures = closuresQuery.data ?? []

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <SectionHeader
        eyebrow="Community map"
        title="Live villages, routes, shelters, and response assets"
        description="Incidents, closures, weather overlays, safe routes, and community resources are rendered in one simple view."
      />
      <MapPanel incidents={incidents} resources={resources} closures={closures} weather={weatherQuery.data} />
    </div>
  )
}
