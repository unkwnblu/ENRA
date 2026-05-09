'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, MapPin, Phone, Clock, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Badge from '@/components/shared/Badge'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Incident, IncidentUpdate, EmergencyContact } from '@/types'

const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer),
  { ssr: false }
)
const CircleMarker = dynamic(
  () => import('react-leaflet').then((m) => m.CircleMarker),
  { ssr: false }
)

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export default function IncidentDetailClient({ id }: { id: string }) {
  const [incident, setIncident] = useState<Incident | null>(null)
  const [updates, setUpdates] = useState<IncidentUpdate[]>([])
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()

      const [incResult, updResult, contResult] = await Promise.all([
        supabase
          .from('incidents')
          .select('*, victim:profiles!victim_id(*), responder:profiles!responder_id(*)')
          .eq('id', id)
          .single(),
        supabase
          .from('incident_updates')
          .select('*, actor:profiles!actor_id(*)')
          .eq('incident_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('incidents')
          .select('victim_id')
          .eq('id', id)
          .single()
          .then(async ({ data }) => {
            if (!data) return { data: [] }
            return supabase
              .from('emergency_contacts')
              .select('*')
              .eq('user_id', data.victim_id)
          }),
      ])

      if (incResult.data) setIncident(incResult.data as Incident)
      if (updResult.data) setUpdates(updResult.data as IncidentUpdate[])
      if (contResult.data) setContacts(contResult.data as EmergencyContact[])
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) {
    return <div className="flex justify-center py-12"><LoadingSpinner className="h-8 w-8" /></div>
  }

  if (!incident) {
    return <p className="py-12 text-center text-slate-400">Incident not found.</p>
  }

  const responseTime = incident.resolved_at
    ? `${Math.round((new Date(incident.resolved_at).getTime() - new Date(incident.created_at).getTime()) / 60000)} min`
    : null

  return (
    <div className="space-y-6">
      <Link href="/incidents" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to Incidents
      </Link>

      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-slate-900">
          {incident.victim?.full_name ?? 'Unknown'}
        </h2>
        <Badge variant={incident.emergency_type} />
        <Badge variant={incident.status} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Info */}
        <div className="col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
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
              <span className="text-slate-700">Responder: {incident.responder?.full_name ?? 'Unassigned'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700">
                {formatTime(incident.created_at)}
                {responseTime && <> — resolved in {responseTime}</>}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 font-semibold text-slate-900">Timeline</h3>
            {updates.length === 0 ? (
              <p className="text-sm text-slate-400">No updates recorded.</p>
            ) : (
              <div className="relative space-y-0 pl-5">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                {updates.map((u) => (
                  <div key={u.id} className="relative pb-4">
                    <div className="absolute left-[-17px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400" />
                    <p className="text-sm text-slate-700">{u.message}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatTime(u.created_at)}
                      {u.actor && <> — {u.actor.full_name}</>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Emergency Contacts */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 font-semibold text-slate-900">Emergency Contacts Notified</h3>
            {contacts.length === 0 ? (
              <p className="text-sm text-slate-400">No emergency contacts on file.</p>
            ) : (
              <div className="space-y-2">
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
                    <div>
                      <span className="font-medium text-slate-700">{c.name}</span>
                      <span className="ml-2 text-slate-400">({c.relationship})</span>
                    </div>
                    <span className="text-slate-500">{c.phone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Map */}
        <div className="h-72 overflow-hidden rounded-xl border border-slate-200">
          <MapContainer
            center={[incident.latitude, incident.longitude]}
            zoom={16}
            className="h-full w-full"
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <CircleMarker
              center={[incident.latitude, incident.longitude]}
              radius={10}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.7, weight: 2 }}
            />
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
