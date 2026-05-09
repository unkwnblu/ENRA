'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle, Clock, Activity, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useIncidents } from '@/hooks/useIncidents'
import { useRealtime } from '@/hooks/useRealtime'
import StatCard from '@/components/shared/StatCard'
import ActiveIncidentsFeed from '@/components/dashboard/ActiveIncidentsFeed'
import IncidentDetailPanel from '@/components/dashboard/IncidentDetailPanel'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Incident } from '@/types'

const LiveMap = dynamic(() => import('@/components/dashboard/LiveMap'), { ssr: false })

export default function DashboardClient() {
  const { activeIncidents, todayIncidents, loading } = useIncidents()
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [respondersOnDuty, setRespondersOnDuty] = useState(0)
  const [avgResponseTime, setAvgResponseTime] = useState(0)

  async function fetchStats() {
    const supabase = createClient()

    const { count } = await supabase
      .from('responders')
      .select('*', { count: 'exact', head: true })
      .eq('is_on_duty', true)
    setRespondersOnDuty(count ?? 0)

    const { data: resolved } = await supabase
      .from('incidents')
      .select('created_at, resolved_at')
      .eq('status', 'resolved')
      .not('resolved_at', 'is', null)
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())

    if (resolved && resolved.length > 0) {
      const totalMinutes = resolved.reduce((sum, inc) => {
        const diff = (new Date(inc.resolved_at!).getTime() - new Date(inc.created_at).getTime()) / 60000
        return sum + diff
      }, 0)
      setAvgResponseTime(Math.round(totalMinutes / resolved.length))
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleResponderChange = useCallback(() => {
    fetchStats()
  }, [])

  useRealtime({ table: 'responders', onPayload: handleResponderChange })

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Active Incidents" value={activeIncidents.length} icon={AlertTriangle} color="red" />
        <StatCard title="Incidents Today" value={todayIncidents.length} icon={Activity} color="blue" />
        <StatCard title="Avg Response Time" value={`${avgResponseTime} min`} icon={Clock} color="yellow" />
        <StatCard title="Responders On Duty" value={respondersOnDuty} icon={ShieldCheck} color="green" />
      </div>

      {/* Map + Feed */}
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_380px] gap-4">
        <LiveMap incidents={activeIncidents} onSelectIncident={setSelectedIncident} />
        <ActiveIncidentsFeed incidents={activeIncidents} onSelectIncident={setSelectedIncident} />
      </div>

      {/* Detail Panel */}
      {selectedIncident && (
        <IncidentDetailPanel
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  )
}
