import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { Incident, IncidentStatus } from '@/types'
import { Badge, SeverityBadge } from '@/components/Badge'
import { SectionHeader } from '@/components/SectionHeader'
import { Composer } from '@/components/Composer'
import { MapPanel } from '@/components/MapPanel'
import { StatCard } from '@/components/StatCard'
import { queryKeys, useIncidentsQuery } from '@/lib/queries'

const statusFlow: IncidentStatus[] = ['new', 'triaged', 'dispatched', 'responding', 'contained', 'resolved', 'closed']
const statusLabels: Record<IncidentStatus, string> = {
  new: 'Reported',
  triaged: 'Checked',
  dispatched: 'Dispatched',
  responding: 'On site',
  contained: 'Contained',
  resolved: 'Resolved',
  closed: 'Closed',
}

export function IncidentsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const incidentsQuery = useIncidentsQuery()
  const incidents = incidentsQuery.data ?? []
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null)
  const [savingStatus, setSavingStatus] = useState<IncidentStatus | null>(null)
  const selectedIncident = useMemo(
    () => incidents.find((incident) => incident.id === (selectedIncidentId ?? incidents[0]?.id)) ?? null,
    [incidents, selectedIncidentId],
  )
  const analysis = selectedIncident?.analysis as Record<string, unknown> | null | undefined
  const lifecycle = Array.isArray(analysis?.lifecycle) ? (analysis.lifecycle as Array<{ status?: string; timestamp?: string; by?: string }>) : []
  const manageStatuses = user?.role !== 'public_user'

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <SectionHeader eyebrow="Incidents" title="Live reports" description="Review status, trust, and response steps." />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Open" value={incidents.filter((item) => !['resolved', 'closed'].includes(item.status)).length} accent="bg-rose-50 text-rose-700" />
        <StatCard title="Critical" value={incidents.filter((item) => item.severity === 'critical').length} accent="bg-amber-50 text-amber-700" />
        <StatCard title="Reviewed" value={incidents.filter((item) => (item.analysis as Record<string, unknown> | null | undefined)?.verification_status === 'confirmed').length} accent="bg-emerald-50 text-emerald-700" />
        <StatCard title="Closed" value={incidents.filter((item) => item.status === 'closed').length} accent="bg-sky-50 text-sky-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <MapPanel incidents={incidents} resources={[]} />
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-4">Incident</th>
                  <th className="px-5 py-4">Severity</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Trust</th>
                  <th className="px-5 py-4">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {incidents.map((incident) => {
                  const itemAnalysis = incident.analysis as Record<string, unknown> | null | undefined
                  const trust = Number(itemAnalysis?.trust_score ?? 0)
                  const lifecycle = Array.isArray(itemAnalysis?.lifecycle) ? (itemAnalysis.lifecycle as Array<{ status?: string }>) : []
                  return (
                    <tr
                      key={incident.id}
                      onClick={() => setSelectedIncidentId(incident.id)}
                      className={`cursor-pointer hover:bg-slate-50 ${selectedIncident?.id === incident.id ? 'bg-slate-50' : ''}`}
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-950">{incident.title}</div>
                        <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{incident.hazard_type}</div>
                      </td>
                      <td className="px-5 py-4"><SeverityBadge severity={incident.severity} /></td>
                      <td className="px-5 py-4">
                        <Badge label={incident.status.toUpperCase()} tone="bg-emerald-50 text-emerald-700 ring-emerald-200" />
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        <div className="font-semibold">{trust || '—'}</div>
                        <div className="text-xs text-slate-500">{itemAnalysis?.verification_status ? String(itemAnalysis.verification_status) : 'pending'}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{incident.priority ?? 'pending'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {selectedIncident ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Detail</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-950">{selectedIncident.title}</div>
                  <div className="mt-2 text-sm text-slate-600">{selectedIncident.description}</div>
                </div>
                <div className="text-right">
                  <SeverityBadge severity={selectedIncident.severity} />
                  <div className="mt-2">
                    <Badge label={selectedIncident.status.toUpperCase()} tone="bg-emerald-50 text-emerald-700 ring-emerald-200" />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Mini label="Trust" value={`${Number(analysis?.trust_score ?? 0)}/100`} />
                <Mini label="Verification" value={String(analysis?.verification_status ?? 'pending')} />
                <Mini label="Risk" value={selectedIncident.risk_level ?? 'unknown'} />
                <Mini label="Priority" value={selectedIncident.priority ?? 'pending'} />
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Lifecycle</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {statusFlow.map((status) => {
                    const active = selectedIncident.status === status
                    return (
                      <span
                        key={status}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                          active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-white text-slate-500 ring-slate-200'
                        }`}
                      >
                        {statusLabels[status]}
                      </span>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-950">Update</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {statusFlow
                      .filter((status) => status !== selectedIncident.status)
                      .map((status) => (
                        <button
                          key={status}
                          disabled={!manageStatuses || savingStatus !== null || selectedIncident.status === 'closed'}
                          onClick={async () => {
                            setSavingStatus(status)
                            try {
                              await api.updateIncident(selectedIncident.id, { status })
                              await Promise.all([
                                queryClient.invalidateQueries({ queryKey: queryKeys.incidents }),
                                queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
                              ])
                            } finally {
                              setSavingStatus(null)
                            }
                          }}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            !manageStatuses || savingStatus !== null || selectedIncident.status === 'closed'
                              ? 'cursor-not-allowed border-slate-200 bg-white text-slate-400'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="font-semibold">{statusLabels[status]}</div>
                        </button>
                      ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-950">Feed</div>
                  <div className="mt-3 space-y-2">
                    {(lifecycle.length > 0 ? lifecycle : [{ status: selectedIncident.status, timestamp: selectedIncident.updated_at, by: 'system' }]).map((step, index) => (
                      <div key={`${step.status ?? 'step'}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-slate-950">{statusLabels[(step.status as IncidentStatus) ?? selectedIncident.status]}</div>
                          <div className="text-xs text-slate-500">{step.by ?? 'system'}</div>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{step.timestamp ? new Date(step.timestamp).toLocaleString() : 'Time not recorded'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <SectionHeader eyebrow="Report" title="New incident" />
          <div className="mt-4">
            <Composer
              title=""
              submitLabel="Save"
              fields={[
                { name: 'title', label: 'What happened?' },
                { name: 'description', label: 'Details' },
                { name: 'latitude', label: 'Latitude', type: 'number' },
                { name: 'longitude', label: 'Longitude', type: 'number' },
                { name: 'severity', label: 'Urgency', placeholder: 'critical' },
                { name: 'hazard_type', label: 'Type', placeholder: 'flood' },
                { name: 'number_of_people', label: 'People', type: 'number' },
              ]}
              onSubmit={async (values) => {
                await api.createIncident({
                  title: values.title,
                  description: values.description,
                  latitude: Number(values.latitude),
                  longitude: Number(values.longitude),
                  severity: values.severity ?? 'moderate',
                  hazard_type: values.hazard_type ?? 'other',
                  number_of_people: Number(values.number_of_people ?? 0),
                  status: 'new',
                  image_urls: [],
                  voice_note_urls: [],
                })
                await queryClient.invalidateQueries({ queryKey: queryKeys.incidents })
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
