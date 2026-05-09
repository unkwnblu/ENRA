'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import DataTable from '@/components/shared/DataTable'
import Badge from '@/components/shared/Badge'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Profile } from '@/types'

interface UserRow extends Profile {
  alert_count: number
}

export default function UsersClient() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const supabase = createClient()

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'user')
        .order('created_at', { ascending: false })

      if (!profiles) { setLoading(false); return }

      const userRows: UserRow[] = await Promise.all(
        profiles.map(async (p) => {
          const { count } = await supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .eq('victim_id', p.id)
          return { ...p, alert_count: count ?? 0 } as UserRow
        })
      )

      setUsers(userRows)
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = useMemo(() => {
    if (!search) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
    )
  }, [users, search])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleSuspend(id: string) {
    if (!confirm('Are you sure you want to suspend this user?')) return
    const supabase = createClient()
    await supabase.from('profiles').update({ suspended: true }).eq('id', id)
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, suspended: true } : u)))
  }

  const columns = useMemo(() => [
    { key: 'name', label: 'Name', render: (row: UserRow) => <span className="font-medium">{row.full_name}</span> },
    { key: 'email', label: 'Email', render: (row: UserRow) => row.email },
    { key: 'phone', label: 'Phone', render: (row: UserRow) => row.phone ?? '—' },
    {
      key: 'joined', label: 'Date Joined', render: (row: UserRow) =>
        new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    { key: 'alerts', label: 'Alerts Sent', render: (row: UserRow) => row.alert_count },
    {
      key: 'status', label: 'Status',
      render: (row: UserRow) => <Badge variant={row.suspended ? 'suspended' : 'on_duty'} label={row.suspended ? 'Suspended' : 'Active'} />,
    },
    {
      key: 'actions', label: '',
      render: (row: UserRow) => (
        <div className="flex gap-2">
          <Link href={`/users/${row.id}`} className="text-sm font-medium text-red-500 hover:text-red-700">View</Link>
          {!row.suspended && (
            <button onClick={() => handleSuspend(row.id)} className="text-sm font-medium text-orange-500 hover:text-orange-700">Suspend</button>
          )}
        </div>
      ),
    },
  ], [])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Users</h2>

      <input
        type="text"
        placeholder="Search by name, email, or phone…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
      />

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner className="h-8 w-8" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={paginated}
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
