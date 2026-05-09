'use client'

import type { Incident } from '@/types'
import Badge from '@/components/shared/Badge'

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface ActiveIncidentsFeedProps {
  incidents: Incident[]
  onSelectIncident: (incident: Incident) => void
}

export default function ActiveIncidentsFeed({ incidents, onSelectIncident }: ActiveIncidentsFeedProps) {
  if (incidents.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center">
        <div className="mb-2 text-3xl">✓</div>
        <p className="font-medium text-slate-700">No Active Incidents</p>
        <p className="mt-1 text-sm text-slate-400">All clear — no emergencies right now.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Active Incidents</h2>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {incidents.length}
        </span>
      </div>
      <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
        {incidents.map((incident) => (
          <button
            key={incident.id}
            onClick={() => onSelectIncident(incident)}
            className="w-full px-4 py-3 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {incident.victim?.full_name ?? 'Unknown Victim'}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={incident.emergency_type} />
                  <span className="text-xs text-slate-400">{timeAgo(incident.created_at)}</span>
                </div>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {incident.responder?.full_name ?? 'Unassigned'}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
