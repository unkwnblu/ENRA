'use client'

import { useEffect, useState } from 'react'
import { X, MapPin, Phone, Clock, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Incident, IncidentUpdate } from '@/types'
import Badge from '@/components/shared/Badge'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

interface IncidentDetailPanelProps {
  incident: Incident
  onClose: () => void
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function minutesBetween(start: string, end: string): string {
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000
  return `${Math.round(diff)} min`
}

export default function IncidentDetailPanel({ incident, onClose }: IncidentDetailPanelProps) {
  const [updates, setUpdates] = useState<IncidentUpdate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUpdates() {
      const supabase = createClient()
      const { data } = await supabase
        .from('incident_updates')
        .select('*, actor:profiles!actor_id(*)')
        .eq('incident_id', incident.id)
        .order('created_at', { ascending: true })

      if (data) setUpdates(data as IncidentUpdate[])
      setLoading(false)
    }
    fetchUpdates()
  }, [incident.id])

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-900">Incident Details</h2>
        <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-5">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={incident.emergency_type} />
              <Badge variant={incident.status} />
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              {incident.victim?.full_name ?? 'Unknown'}
            </h3>
          </div>

          {/* Info Grid */}
          <div className="space-y-3 rounded-lg bg-slate-50 p-4">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700">{incident.victim?.phone ?? 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700">{incident.address}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700">
                Responder: {incident.responder?.full_name ?? 'Unassigned'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700">
                {formatTime(incident.created_at)}
                {incident.resolved_at && (
                  <> — resolved in {minutesBetween(incident.created_at, incident.resolved_at)}</>
                )}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Timeline</h4>
            {loading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            ) : updates.length === 0 ? (
              <p className="text-sm text-slate-400">No updates yet.</p>
            ) : (
              <div className="relative space-y-0 pl-5">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                {updates.map((update) => (
                  <div key={update.id} className="relative pb-4">
                    <div className="absolute left-[-17px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400" />
                    <p className="text-sm text-slate-700">{update.message}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatTime(update.created_at)}
                      {update.actor && <> — {update.actor.full_name}</>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
