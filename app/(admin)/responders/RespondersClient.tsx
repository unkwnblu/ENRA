'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import DataTable from '@/components/shared/DataTable'
import Badge from '@/components/shared/Badge'
import Modal from '@/components/shared/Modal'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Profile, Responder } from '@/types'

interface ResponderRow extends Responder {
  profile: Profile
}

export default function RespondersClient() {
  const [responders, setResponders] = useState<ResponderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<ResponderRow | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Add form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  async function fetchResponders() {
    const supabase = createClient()
    const { data } = await supabase
      .from('responders')
      .select('*, profile:profiles!id(*)')
      .order('total_handled', { ascending: false })

    if (data) setResponders(data as ResponderRow[])
    setLoading(false)
  }

  useEffect(() => { fetchResponders() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      // Fallback: use signUp if admin API isn't available
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError || !signUpData.user) {
        setFormError(signUpError?.message ?? 'Failed to create user.')
        setFormLoading(false)
        return
      }

      await supabase.from('profiles').upsert({
        id: signUpData.user.id,
        full_name: name,
        email,
        phone,
        role: 'responder',
      })
      await supabase.from('responders').insert({
        id: signUpData.user.id,
        is_on_duty: false,
        total_handled: 0,
        avg_response_time: 0,
      })
    } else if (authData.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        full_name: name,
        email,
        phone,
        role: 'responder',
      })
      await supabase.from('responders').insert({
        id: authData.user.id,
        is_on_duty: false,
        total_handled: 0,
        avg_response_time: 0,
      })
    }

    setShowAdd(false)
    setName(''); setEmail(''); setPhone(''); setPassword('')
    setFormLoading(false)
    fetchResponders()
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setFormError('')
    setFormLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name, phone })
      .eq('id', editTarget.id)

    if (error) {
      setFormError(error.message)
      setFormLoading(false)
      return
    }

    setEditTarget(null)
    setFormLoading(false)
    fetchResponders()
  }

  async function handleSuspend(id: string) {
    if (!confirm('Are you sure you want to suspend this responder?')) return
    const supabase = createClient()
    await supabase.from('profiles').update({ suspended: true }).eq('id', id)
    fetchResponders()
  }

  function openEdit(r: ResponderRow) {
    setName(r.profile.full_name)
    setPhone(r.profile.phone ?? '')
    setEditTarget(r)
  }

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      render: (row: ResponderRow) => (
        <span className="font-medium">{row.profile.full_name}</span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row: ResponderRow) => row.profile.phone ?? '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: ResponderRow) => {
        if (row.profile.suspended) return <Badge variant="suspended" />
        return <Badge variant={row.is_on_duty ? 'on_duty' : 'off_duty'} />
      },
    },
    {
      key: 'total_handled',
      label: 'Incidents Handled',
      sortable: true,
      render: (row: ResponderRow) => row.total_handled,
    },
    {
      key: 'avg_response_time',
      label: 'Avg Response',
      render: (row: ResponderRow) => `${Math.round(row.avg_response_time)} min`,
    },
    {
      key: 'actions',
      label: '',
      render: (row: ResponderRow) => (
        <div className="flex gap-2">
          <Link href={`/responders/${row.id}`} className="text-sm font-medium text-red-500 hover:text-red-700">View</Link>
          <button onClick={() => openEdit(row)} className="text-sm font-medium text-slate-500 hover:text-slate-700">Edit</button>
          {!row.profile.suspended && (
            <button onClick={() => handleSuspend(row.id)} className="text-sm font-medium text-orange-500 hover:text-orange-700">Suspend</button>
          )}
        </div>
      ),
    },
  ], [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Responders</h2>
        <button
          onClick={() => { setShowAdd(true); setFormError(''); setName(''); setEmail(''); setPhone(''); setPassword('') }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
        >
          <Plus className="h-4 w-4" /> Add Responder
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner className="h-8 w-8" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={responders}
          page={1}
          pageSize={100}
          total={responders.length}
          onPageChange={() => {}}
        />
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Responder">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Temporary Password</label>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
          <button type="submit" disabled={formLoading}
            className="w-full rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
            {formLoading ? 'Creating…' : 'Create Responder'}
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Responder">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
          <button type="submit" disabled={formLoading}
            className="w-full rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
            {formLoading ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
