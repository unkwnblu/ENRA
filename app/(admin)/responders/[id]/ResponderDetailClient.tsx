'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import DataTable from '@/components/shared/DataTable'
import Badge from '@/components/shared/Badge'
import StatCard from '@/components/shared/StatCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { ShieldCheck, Clock, Zap, Activity } from 'lucide-react'
import type { Profile, Responder, Incident } from '@/types'

export default function ResponderDetailClient({ id }: { id: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [responder, setResponder] = useState<Responder | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const [profRes, respRes, incRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('responders').select('*').eq('id', id).single(),
        supabase
          .from('incidents')
          .select('*, victim:profiles!victim_id(*)')
          .eq('responder_id', id)
          .order('created_at', { ascending: false }),
      ])
      if (profRes.data) setProfile(profRes.data as Profile)
      if (respRes.data) setResponder(respRes.data as Responder)
      if (incRes.data) setIncidents(incRes.data as Incident[])
      setLoading(false)
    }
    fetch()
  }, [id])

  const fastestResponse = useMemo(() => {
    const resolved = incidents.filter((i) => i.resolved_at)
    if (resolved.length === 0) return null
    const times = resolved.map((i) =>
      (new Date(i.resolved_at!).getTime() - new Date(i.created_at).getTime()) / 60000
    )
    return Math.round(Math.min(...times))
  }, [incidents])

  const columns = useMemo(() => [
    { key: 'victim', label: 'Victim', render: (row: Incident) => row.victim?.full_name ?? 'Unknown' },
    { key: 'type', label: 'Type', render: (row: Incident) => <Badge variant={row.emergency_type} /> },
    {
      key: 'date', label: 'Date', render: (row: Incident) =>
        new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    { key: 'status', label: 'Status', render: (row: Incident) => <Badge variant={row.status} /> },
    {
      key: 'response', label: 'Response Time', render: (row: Incident) => {
        if (!row.resolved_at) return '—'
        return `${Math.round((new Date(row.resolved_at).getTime() - new Date(row.created_at).getTime()) / 60000)} min`
      },
    },
    {
      key: 'actions', label: '', render: (row: Incident) => (
        <Link href={`/incidents/${row.id}`} className="text-sm font-medium text-red-500 hover:text-red-700">View</Link>
      ),
    },
  ], [])

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner className="h-8 w-8" /></div>
  if (!profile || !responder) return <p className="py-12 text-center text-slate-400">Responder not found.</p>

  return (
    <div className="space-y-6">
      <Link href="/responders" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to Responders
      </Link>

      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-slate-900">{profile.full_name}</h2>
        {profile.suspended
          ? <Badge variant="suspended" />
          : <Badge variant={responder.is_on_duty ? 'on_duty' : 'off_duty'} />
        }
      </div>
      <p className="text-sm text-slate-500">{profile.email} · {profile.phone ?? 'No phone'}</p>

      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Status" value={responder.is_on_duty ? 'On Duty' : 'Off Duty'} icon={ShieldCheck} color="green" />
        <StatCard title="Total Handled" value={responder.total_handled} icon={Activity} color="blue" />
        <StatCard title="Avg Response" value={`${Math.round(responder.avg_response_time)} min`} icon={Clock} color="yellow" />
        <StatCard title="Fastest Response" value={fastestResponse !== null ? `${fastestResponse} min` : '—'} icon={Zap} color="red" />
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Incident History</h3>
        <DataTable
          columns={columns}
          data={incidents}
          page={1}
          pageSize={100}
          total={incidents.length}
          onPageChange={() => {}}
        />
      </div>
    </div>
  )
}
