import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import type { Incident, Resource } from '@/types'

const icon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:999px;background:${color};box-shadow:0 0 0 6px ${color}33;border:2px solid white"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })

export function MapPanel({ incidents, resources }: { incidents: Incident[]; resources: Resource[] }) {
  const center: [number, number] = incidents.length ? [incidents[0].latitude, incidents[0].longitude] : [-1.286389, 36.817223]
  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-glow">
      <MapContainer center={center} zoom={12} scrollWheelZoom className="h-[620px] w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.latitude, incident.longitude]}
            icon={icon(incident.severity === 'critical' ? '#ef4444' : incident.severity === 'high' ? '#f97316' : incident.severity === 'moderate' ? '#f59e0b' : '#10b981')}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{incident.title}</div>
                <div>{incident.severity.toUpperCase()}</div>
                <div>{incident.priority ?? 'Untriaged'}</div>
              </div>
            </Popup>
          </Marker>
        ))}
        {resources
          .filter((resource) => resource.latitude != null && resource.longitude != null)
          .map((resource) => (
            <Marker key={resource.id} position={[resource.latitude as number, resource.longitude as number]} icon={icon('#38bdf8')}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{resource.name}</div>
                  <div>{resource.kind}</div>
                  <div>{resource.status}</div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  )
}
