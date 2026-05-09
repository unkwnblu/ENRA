'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import type { Incident } from '@/types'
import Badge from '@/components/shared/Badge'
import 'leaflet/dist/leaflet.css'

const typeColors: Record<string, string> = {
  medical: '#ef4444',
  fire: '#f97316',
  security: '#3b82f6',
  accident: '#eab308',
}

interface LiveMapProps {
  incidents: Incident[]
  onSelectIncident: (incident: Incident) => void
}

export default function LiveMap({ incidents, onSelectIncident }: LiveMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
        <p className="text-sm text-slate-400">Loading map…</p>
      </div>
    )
  }

  const center: [number, number] = incidents.length > 0
    ? [incidents[0].latitude, incidents[0].longitude]
    : [6.6742, -1.5726] // Default: KNUST campus

  return (
    <div className="h-full overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={center}
        zoom={15}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {incidents.map((incident) => (
          <CircleMarker
            key={incident.id}
            center={[incident.latitude, incident.longitude]}
            radius={10}
            pathOptions={{
              color: typeColors[incident.emergency_type] ?? '#64748b',
              fillColor: typeColors[incident.emergency_type] ?? '#64748b',
              fillOpacity: 0.7,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onSelectIncident(incident),
            }}
          >
            <Popup>
              <div className="space-y-1 text-xs">
                <p className="font-semibold">{incident.victim?.full_name ?? 'Unknown'}</p>
                <Badge variant={incident.emergency_type} />
                <p className="text-slate-500">{incident.address}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
