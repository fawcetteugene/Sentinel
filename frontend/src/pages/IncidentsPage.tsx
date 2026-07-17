import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { Incident, IncidentStatus } from '@/types'
import { Badge, SeverityBadge } from '@/components/Badge'
import { SectionHeader } from '@/components/SectionHeader'
import { Composer } from '@/components/Composer'
import { MapPanel } from '@/components/MapPanel'
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

const statusDescriptions: Record<IncidentStatus, string> = {
  new: 'Fresh report waiting for review.',
  triaged: 'Community leader or responder has confirmed it.',
  dispatched: 'A volunteer or resource is on the way.',
  responding: 'People are actively helping on site.',
  contained: 'The situation is under control.',
  resolved: 'Immediate danger is over.',
  closed: 'The incident has been fully closed out.',
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
  const currentIndex = selectedIncident ? statusFlow.indexOf(selectedIncident.status) : -1
  const nextStatus = currentIndex >= 0 && currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null
  const manageStatuses = user?.role !== 'public_user'

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <SectionHeader
        eyebrow="Community reports"
        title="Track emergencies, missing people, and local help requests"
        description="Leaders and volunteers can review live reports, while the public can submit a simple emergency report without an account."
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <MapPanel incidents={incidents} resources={[]} />
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-glow">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-5 py-4">Incident</th>
                  <th className="px-5 py-4">Severity</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Trust</th>
                  <th className="px-5 py-4">Lifecycle</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Resources</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {incidents.map((incident) => {
                  const analysis = incident.analysis as Record<string, unknown> | null | undefined
                  const trust = Number(analysis?.trust_score ?? 0)
                  const lifecycle = Array.isArray(analysis?.lifecycle) ? analysis?.lifecycle as Array<{ status?: string }> : []
                  return (
                    <tr
                      key={incident.id}
                      onClick={() => setSelectedIncidentId(incident.id)}
                      className={`cursor-pointer hover:bg-white/5 ${selectedIncident?.id === incident.id ? 'bg-white/5' : ''}`}
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium">{incident.title}</div>
                        <div className="text-xs text-slate-400">{incident.hazard_type}</div>
                      </td>
                      <td className="px-5 py-4"><SeverityBadge severity={incident.severity} /></td>
                      <td className="px-5 py-4"><Badge label={incident.status.toUpperCase()} tone="bg-calm/15 text-calm ring-calm/30" /></td>
                      <td className="px-5 py-4 text-slate-300">
                        {trust ? (
                          <div className="space-y-1">
                            <div>{trust}/100</div>
                            <div className="text-xs text-slate-500">{analysis?.verification_status ? String(analysis.verification_status) : 'pending'}</div>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-300">{lifecycle.map((item) => item.status).filter(Boolean).slice(-3).join(' → ') || 'reported'}</td>
                      <td className="px-5 py-4 text-slate-300">{incident.priority ?? 'Pending'}</td>
                      <td className="px-5 py-4 text-slate-300">{incident.recommended_resources?.join(', ') ?? 'Pending analysis'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {selectedIncident ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-calm/80">Incident lifecycle</div>
                  <h3 className="mt-2 text-2xl font-semibold">{selectedIncident.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{selectedIncident.description}</p>
                </div>
                <div className="space-y-2 text-right">
                  <SeverityBadge severity={selectedIncident.severity} />
                  <div>
                    <Badge label={selectedIncident.status.toUpperCase()} tone="bg-calm/15 text-calm ring-calm/30" />
                  </div>
                  <div className="text-xs text-slate-400">{selectedIncident.hazard_type.replaceAll('_', ' ')}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Detail label="Trust" value={`${Number(analysis?.trust_score ?? 0)}/100`} />
                <Detail label="Verification" value={String(analysis?.verification_status ?? 'pending')} />
                <Detail label="Risk" value={selectedIncident.risk_level ?? 'unknown'} />
                <Detail label="Priority" value={selectedIncident.priority ?? 'pending'} />
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Current stage</div>
                    <div className="mt-1 text-lg font-semibold text-slate-100">{statusLabels[selectedIncident.status]}</div>
                    <div className="text-sm text-slate-400">{statusDescriptions[selectedIncident.status]}</div>
                  </div>
                  <div className="text-sm text-slate-400">
                    {currentIndex >= 0 ? `${currentIndex + 1}/${statusFlow.length}` : '0/0'}
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-calm to-amber-300 transition-all"
                    style={{ width: currentIndex >= 0 ? `${((currentIndex + 1) / statusFlow.length) * 100}%` : '0%' }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {statusFlow.map((status) => {
                    const active = selectedIncident.status === status
                    return (
                      <span
                        key={status}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                          active ? 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/30' : 'bg-white/5 text-slate-300 ring-white/10'
                        }`}
                      >
                        {statusLabels[status]}
                      </span>
                    )
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="text-sm font-semibold text-slate-100">Lifecycle updates</div>
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
                              setSelectedIncidentId(selectedIncident.id)
                            } finally {
                              setSavingStatus(null)
                            }
                          }}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            !manageStatuses || savingStatus !== null || selectedIncident.status === 'closed'
                              ? 'cursor-not-allowed border-white/5 bg-white/5 text-slate-500'
                              : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                          }`}
                        >
                          <div className="text-sm font-semibold">{statusLabels[status]}</div>
                          <div className="mt-1 text-xs text-slate-400">{statusDescriptions[status]}</div>
                        </button>
                      ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                    <span>
                      {manageStatuses ? 'Status changes are saved to the live incident feed.' : 'You can review the lifecycle, but this account cannot update incident status.'}
                    </span>
                    {nextStatus ? <span>Next suggested step: {statusLabels[nextStatus]}</span> : <span>This incident is already at the final stage.</span>}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="text-sm font-semibold text-slate-100">Lifecycle feed</div>
                  <div className="mt-3 space-y-3">
                    {(lifecycle.length > 0 ? lifecycle : [{ status: selectedIncident.status, timestamp: selectedIncident.updated_at, by: 'system' }]).map((step, index) => (
                      <div key={`${step.status ?? 'step'}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-slate-100">{statusLabels[(step.status as IncidentStatus) ?? selectedIncident.status] ?? String(step.status ?? 'reported')}</div>
                          <div className="text-xs text-slate-500">{step.by ?? 'system'}</div>
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.25em] text-calm/70">
                          {(step.timestamp ? new Date(step.timestamp).toLocaleString() : 'Time not recorded')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div className="space-y-4">
          <Composer
            title="Community report"
            submitLabel="Save report"
            fields={[
              { name: 'title', label: 'What happened?' },
              { name: 'description', label: 'More details' },
              { name: 'latitude', label: 'Latitude', type: 'number' },
              { name: 'longitude', label: 'Longitude', type: 'number' },
              { name: 'severity', label: 'Urgency', placeholder: 'critical' },
              { name: 'hazard_type', label: 'Type', placeholder: 'flood' },
              { name: 'number_of_people', label: 'People affected', type: 'number' },
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
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/70 p-4">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-slate-100">{value}</div>
    </div>
  )
}
