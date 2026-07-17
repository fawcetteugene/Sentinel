import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Circle, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer } from 'react-leaflet'
import type { Incident, Resource, RoadClosure, SimulationWorldSnapshot, WeatherSnapshot } from '@/types'

type Coordinate = [number, number]

const incidentColor = (severity: Incident['severity']) => {
  switch (severity) {
    case 'critical':
      return '#ef4444'
    case 'high':
      return '#f97316'
    case 'moderate':
      return '#f59e0b'
    default:
      return '#10b981'
  }
}

const resourceColor = (status: Resource['status']) => {
  switch (status) {
    case 'busy':
      return '#f59e0b'
    case 'offline':
      return '#ef4444'
    case 'maintenance':
      return '#fb7185'
    default:
      return '#38bdf8'
  }
}

const worldColor = (kind: string, status?: string | null) => {
  if (status === 'critical') return '#ef4444'
  if (status === 'warning') return '#f59e0b'
  switch (kind) {
    case 'market':
      return '#f59e0b'
    case 'clinic':
    case 'hospital':
      return '#38bdf8'
    case 'shelter':
    case 'school':
    case 'church':
    case 'mosque':
    case 'community_hall':
      return '#34d399'
    case 'fire_station':
      return '#f97316'
    case 'police_station':
      return '#60a5fa'
    case 'command_center':
      return '#a78bfa'
    case 'water_tank':
      return '#22d3ee'
    case 'bodaboda':
    case 'private_vehicle':
    case 'tractor':
      return '#f97316'
    case 'river':
      return '#22d3ee'
    case 'road':
      return '#94a3b8'
    case 'city':
      return '#f8fafc'
    case 'airport':
    case 'helipad':
      return '#e879f9'
    default:
      return '#38bdf8'
  }
}

const markerIcon = (color: string, size = 14) =>
  L.divIcon({
    className: 'sentinel-map-icon',
    html: `<div class="sentinel-map-dot" style="--marker-color:${color};width:${size}px;height:${size}px"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })

export function MapPanel({
  incidents,
  resources,
  closures = [],
  weather,
  world = null,
}: {
  incidents: Incident[]
  resources: Resource[]
  closures?: RoadClosure[]
  weather?: WeatherSnapshot | null
  world?: SimulationWorldSnapshot | null
}) {
  const worldCenter =
    world?.world_locations.find((item) => item.category === 'community_core' || item.category === 'urban_core' || item.kind === 'command_center') ?? null
  const center: Coordinate = worldCenter
    ? [worldCenter.latitude, worldCenter.longitude]
    : incidents.length
      ? [incidents[0].latitude, incidents[0].longitude]
      : [-1.286389, 36.817223]
  const responderSample = world?.responders ?? []
  const vehicleSample = world?.vehicles ?? []
  const facilitySample = world?.facilities ?? []
  const zoneSample = world?.zones ?? []
  const safeDestinations = resources.filter((resource) => resource.latitude != null && resource.longitude != null && ['shelter', 'hospital'].includes(resource.kind))
  const hotspotGroups = buildHotspots(incidents)

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-glow">
      <MapContainer center={center} zoom={12} scrollWheelZoom className="h-[680px] w-full">
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {weather ? (
          <Circle
            center={center}
            radius={weather.flood_warning ? 28000 : weather.heatwave_warning ? 22000 : 14000}
            pathOptions={{
              color: weather.flood_warning ? '#38bdf8' : weather.heatwave_warning ? '#fb7185' : '#0ea5e9',
              fillColor: weather.flood_warning ? '#38bdf8' : weather.heatwave_warning ? '#fb7185' : '#0ea5e9',
              fillOpacity: 0.08,
              weight: 1,
              dashArray: '8 10',
            }}
          />
        ) : null}

        {world?.world_locations.map((location) =>
          location.path.length > 1 ? (
            <Polyline
              key={location.id}
              positions={location.path.map((point) => [point.latitude, point.longitude])}
              pathOptions={{
                color: worldColor(location.kind, location.status),
                weight: location.kind === 'river' ? 4 : 3,
                opacity: location.kind === 'river' ? 0.6 : 0.45,
                dashArray: location.kind === 'road' ? '9 10' : undefined,
              }}
            />
          ) : (
            <Marker key={location.id} position={[location.latitude, location.longitude]} icon={markerIcon(worldColor(location.kind, location.status), location.kind === 'city' ? 13 : 11)}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{location.name}</div>
                  <div className="text-slate-500">{location.kind.replace('_', ' ')}</div>
                  {location.note ? <div className="mt-1 text-slate-400">{location.note}</div> : null}
                </div>
              </Popup>
            </Marker>
          ),
        )}

        {zoneSample.map((zone) =>
          zone.points.length > 2 ? (
            <Polygon
              key={zone.id}
              positions={zone.points.map((point) => [point.latitude, point.longitude])}
              pathOptions={{
                color: worldColor(zone.kind, zone.severity),
                fillColor: worldColor(zone.kind, zone.severity),
                fillOpacity: zone.opacity,
                weight: 1.5,
                dashArray: zone.kind === 'fire' ? '4 6' : undefined,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{zone.name}</div>
                  <div>{zone.status}</div>
                  <div>{zone.severity}</div>
                </div>
              </Popup>
            </Polygon>
          ) : (
            <Circle
              key={zone.id}
              center={[zone.latitude, zone.longitude]}
              radius={zone.radius_m}
              pathOptions={{
                color: worldColor(zone.kind, zone.severity),
                fillColor: worldColor(zone.kind, zone.severity),
                fillOpacity: zone.opacity,
                weight: 1.5,
              }}
            />
          ),
        )}

        {closures.map((closure) => (
          <Circle
            key={closure.id}
            center={[closure.latitude, closure.longitude]}
            radius={3500}
            pathOptions={{
              color: closure.is_active ? '#fb7185' : '#34d399',
              fillColor: closure.is_active ? '#fb7185' : '#34d399',
              fillOpacity: 0.18,
              weight: 1.5,
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{closure.title}</div>
                <div>{closure.reason}</div>
                <div className="text-slate-500">{closure.is_active ? 'Active closure' : 'Cleared route'}</div>
              </div>
            </Popup>
          </Circle>
        ))}

        {incidents.map((incident) => (
          <Marker key={incident.id} position={[incident.latitude, incident.longitude]} icon={markerIcon(incidentColor(incident.severity), 16)}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{incident.title}</div>
                <div>{incident.severity.toUpperCase()}</div>
                <div>{incident.priority ?? 'Untriaged'}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {hotspotGroups.map((hotspot) => (
          <Circle
            key={hotspot.id}
            center={[hotspot.latitude, hotspot.longitude]}
            radius={Math.min(22000, 4000 + hotspot.weight * 3200)}
            pathOptions={{
              color: hotspot.weight > 5 ? '#dc2626' : hotspot.weight > 3 ? '#f59e0b' : '#38bdf8',
              fillColor: hotspot.weight > 5 ? '#dc2626' : hotspot.weight > 3 ? '#f59e0b' : '#38bdf8',
              fillOpacity: 0.12 + hotspot.weight * 0.015,
              weight: 1,
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">Risk hotspot</div>
                <div>{hotspot.count} incidents nearby</div>
                <div className="text-slate-500">Weighted risk: {hotspot.weight.toFixed(1)}</div>
              </div>
            </Popup>
          </Circle>
        ))}

        {facilitySample.map((facility) => (
          <Marker key={facility.id} position={[facility.latitude, facility.longitude]} icon={markerIcon(worldColor(facility.kind, facility.alert_level), facility.kind === 'hospital' ? 14 : 11)}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{facility.name}</div>
                <div>{facility.kind.replace('_', ' ')}</div>
                <div className="text-slate-500">
                  {facility.alert_level ?? 'normal'}
                  {facility.capacity != null ? ` · ${facility.occupancy ?? 0}/${facility.capacity}` : ''}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {responderSample.map((responder) => (
          <Marker key={responder.id} position={[responder.latitude, responder.longitude]} icon={markerIcon(worldColor('city', responder.status), 8)}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{responder.name}</div>
                <div className="capitalize">{responder.kind.replace('_', ' ')}</div>
                <div>{responder.status}</div>
                {responder.mission ? <div className="text-slate-500">{responder.mission}</div> : null}
              </div>
            </Popup>
          </Marker>
        ))}

        {vehicleSample.map((vehicle) => (
          <Marker key={vehicle.id} position={[vehicle.latitude, vehicle.longitude]} icon={markerIcon(worldColor(vehicle.kind, vehicle.status), vehicle.kind === 'helicopter' ? 12 : 10)}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{vehicle.name}</div>
                <div className="capitalize">{vehicle.kind.replace('_', ' ')}</div>
                <div>{vehicle.status}</div>
                <div className="text-slate-500">
                  {vehicle.eta_minutes != null ? `ETA ${vehicle.eta_minutes} min` : 'ETA pending'}
                  {vehicle.fuel_level != null ? ` · Fuel ${vehicle.fuel_level}%` : ''}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {world?.missions.map((mission) => {
          const responder = responderSample.find((item) => item.mission === mission.title)
          const vehicle = vehicleSample.find((item) => item.mission === mission.title)
          const origin = responder ?? vehicle
          const destination = incidents.find((incident) => incident.id === mission.incident_id)
          return origin && destination ? (
            <Polyline
              key={`mission-route-${mission.id}`}
              positions={[[origin.latitude, origin.longitude], [destination.latitude, destination.longitude]]}
              pathOptions={{
                color: mission.status === 'completed' ? '#34d399' : '#38bdf8',
                weight: 3,
                opacity: 0.8,
                dashArray: '10 8',
              }}
            />
          ) : null
        })}

        {resources
          .filter((resource) => resource.latitude != null && resource.longitude != null)
          .map((resource) => (
            <Marker key={resource.id} position={[resource.latitude as number, resource.longitude as number]} icon={markerIcon(resourceColor(resource.status), 12)}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{resource.name}</div>
                  <div>{resource.kind}</div>
                  <div>{resource.status}</div>
                </div>
              </Popup>
            </Marker>
          ))}

        {incidents.map((incident) => {
          const destination = nearestDestination([incident.latitude, incident.longitude], safeDestinations)
          return destination ? (
            <Polyline
              key={`safe-route-${incident.id}`}
              positions={[[incident.latitude, incident.longitude], [destination.latitude as number, destination.longitude as number]]}
              pathOptions={{
                color: '#38bdf8',
                weight: 3,
                opacity: 0.75,
                dashArray: '10 8',
              }}
            />
          ) : null
        })}
      </MapContainer>
    </div>
  )
}

function nearestDestination(origin: Coordinate, destinations: Resource[]): Resource | null {
  if (!destinations.length) return null
  return destinations.reduce((best, candidate) => {
    if (best.latitude == null || best.longitude == null) return candidate
    if (candidate.latitude == null || candidate.longitude == null) return best
    const bestDistance = Math.hypot(best.latitude - origin[0], best.longitude - origin[1])
    const candidateDistance = Math.hypot(candidate.latitude - origin[0], candidate.longitude - origin[1])
    return candidateDistance < bestDistance ? candidate : best
  })
}

function buildHotspots(incidents: Incident[]) {
  const groups = new Map<string, { latitude: number; longitude: number; count: number; weight: number }>()
  for (const incident of incidents) {
    const key = `${incident.latitude.toFixed(1)}:${incident.longitude.toFixed(1)}`
    const current = groups.get(key) ?? { latitude: 0, longitude: 0, count: 0, weight: 0 }
    current.latitude += incident.latitude
    current.longitude += incident.longitude
    current.count += 1
    current.weight += incident.severity === 'critical' ? 2.5 : incident.severity === 'high' ? 1.6 : incident.severity === 'moderate' ? 1.1 : 0.7
    groups.set(key, current)
  }
  return Array.from(groups.entries()).map(([id, hotspot]) => ({
    id,
    latitude: hotspot.latitude / hotspot.count,
    longitude: hotspot.longitude / hotspot.count,
    count: hotspot.count,
    weight: hotspot.weight,
  }))
}
