'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import DataTable from '@/components/shared/DataTable'
import Badge from '@/components/shared/Badge'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Profile, Incident, EmergencyContact } from '@/types'

export default function UserDetailClient({ id }: { id: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const [profRes, incRes, contRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase
          .from('incidents')
          .select('*, responder:profiles!responder_id(*)')
          .eq('victim_id', id)
          .order('created_at', { ascending: false }),
        supabase.from('emergency_contacts').select('*').eq('user_id', id),
      ])
      if (profRes.data) setProfile(profRes.data as Profile)
      if (incRes.data) setIncidents(incRes.data as Incident[])
      if (contRes.data) setContacts(contRes.data as EmergencyContact[])
      setLoading(false)
    }
    fetch()
  }, [id])

  const columns = useMemo(() => [
    {
      key: 'date', label: 'Date', render: (row: Incident) =>
        new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    { key: 'type', label: 'Type', render: (row: Incident) => <Badge variant={row.emergency_type} /> },
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
  if (!profile) return <p className="py-12 text-center text-slate-400">User not found.</p>

  return (
    <div className="space-y-6">
      <Link href="/users" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Link>

      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-slate-900">{profile.full_name}</h2>
        <Badge variant={profile.suspended ? 'suspended' : 'on_duty'} label={profile.suspended ? 'Suspended' : 'Active'} />
      </div>
      <p className="text-sm text-slate-500">{profile.email} · {profile.phone ?? 'No phone'} · Joined {new Date(profile.created_at).toLocaleDateString()}</p>

      {/* Emergency Contacts */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Emergency Contacts</h3>
        {contacts.length === 0 ? (
          <p className="text-sm text-slate-400">No emergency contacts saved.</p>
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

      {/* Alert History */}
      <div>
        <h3 className="mb-3 font-semibold text-slate-900">Alert History ({incidents.length})</h3>
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
