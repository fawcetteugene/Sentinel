import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Incident } from '@/types'
import { Badge, SeverityBadge } from '@/components/Badge'
import { SectionHeader } from '@/components/SectionHeader'
import { Composer } from '@/components/Composer'
import { MapPanel } from '@/components/MapPanel'
import { queryKeys, useIncidentsQuery } from '@/lib/queries'

export function IncidentsPage() {
  const queryClient = useQueryClient()
  const incidentsQuery = useIncidentsQuery()
  const incidents = incidentsQuery.data ?? []

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <SectionHeader
        eyebrow="Incident Management"
        title="Create, triage, and analyze incidents"
        description="Incident commanders and dispatchers can create reports, trigger AI analysis, and track the operational state of every event."
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
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Resources</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-white/5">
                    <td className="px-5 py-4">
                      <div className="font-medium">{incident.title}</div>
                      <div className="text-xs text-slate-400">{incident.hazard_type}</div>
                    </td>
                    <td className="px-5 py-4"><SeverityBadge severity={incident.severity} /></td>
                    <td className="px-5 py-4"><Badge label={incident.status.toUpperCase()} tone="bg-calm/15 text-calm ring-calm/30" /></td>
                    <td className="px-5 py-4 text-slate-300">{incident.priority ?? 'Pending'}</td>
                    <td className="px-5 py-4 text-slate-300">{incident.recommended_resources?.join(', ') ?? 'Pending analysis'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <Composer
            title="New incident report"
            submitLabel="Create report"
            fields={[
              { name: 'title', label: 'Title' },
              { name: 'description', label: 'Description' },
              { name: 'latitude', label: 'Latitude', type: 'number' },
              { name: 'longitude', label: 'Longitude', type: 'number' },
              { name: 'severity', label: 'Severity', placeholder: 'critical' },
              { name: 'hazard_type', label: 'Hazard Type', placeholder: 'flood' },
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
