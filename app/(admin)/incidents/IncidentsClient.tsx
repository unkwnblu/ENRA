'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import DataTable from '@/components/shared/DataTable'
import Badge from '@/components/shared/Badge'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Incident, EmergencyType, IncidentStatus } from '@/types'

const PAGE_SIZE = 20

export default function IncidentsClient() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<EmergencyType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('incidents')
        .select('*, victim:profiles!victim_id(*), responder:profiles!responder_id(*)', { count: 'exact' })

      if (typeFilter !== 'all') query = query.eq('emergency_type', typeFilter)
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString())
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        query = query.lte('created_at', end.toISOString())
      }
      if (search) query = query.ilike('victim.full_name', `%${search}%`)

      query = query.order(sortKey, { ascending: sortDir === 'asc' })
      query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      const { data, count } = await query
      setIncidents((data as Incident[]) ?? [])
      setTotal(count ?? 0)
      setLoading(false)
    }
    fetch()
  }, [page, typeFilter, statusFilter, dateFrom, dateTo, search, sortKey, sortDir])

  const columns = useMemo(() => [
    {
      key: 'victim',
      label: 'Victim Name',
      render: (row: Incident) => row.victim?.full_name ?? 'Unknown',
    },
    {
      key: 'emergency_type',
      label: 'Type',
      render: (row: Incident) => <Badge variant={row.emergency_type} />,
    },
    {
      key: 'created_at',
      label: 'Date & Time',
      sortable: true,
      render: (row: Incident) =>
        new Date(row.created_at).toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit', hour12: true,
        }),
    },
    {
      key: 'responder',
      label: 'Responder',
      render: (row: Incident) => row.responder?.full_name ?? 'Unassigned',
    },
    {
      key: 'response_time',
      label: 'Response Time',
      render: (row: Incident) => {
        if (!row.resolved_at) return '—'
        const mins = Math.round(
          (new Date(row.resolved_at).getTime() - new Date(row.created_at).getTime()) / 60000
        )
        return `${mins} min`
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Incident) => <Badge variant={row.status} />,
    },
    {
      key: 'actions',
      label: '',
      render: (row: Incident) => (
        <Link
          href={`/incidents/${row.id}`}
          className="text-sm font-medium text-red-500 hover:text-red-700"
        >
          View
        </Link>
      ),
    },
  ], [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          All Incidents {!loading && <span className="text-slate-400 font-normal">({total})</span>}
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as EmergencyType | 'all'); setPage(1) }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">All Types</option>
            <option value="medical">Medical</option>
            <option value="fire">Fire</option>
            <option value="security">Security</option>
            <option value="accident">Accident</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as IncidentStatus | 'all'); setPage(1) }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Search</label>
          <input
            type="text"
            placeholder="Search by victim name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner className="h-8 w-8" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={incidents}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          onSort={(key, dir) => { setSortKey(key); setSortDir(dir) }}
          sortKey={sortKey}
          sortDir={sortDir}
        />
      )}
    </div>
  )
}
