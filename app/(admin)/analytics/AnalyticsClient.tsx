'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts'
import { Download, Activity, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import StatCard from '@/components/shared/StatCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Incident, EmergencyType } from '@/types'

const TYPE_COLORS: Record<EmergencyType, string> = {
  medical: '#ef4444',
  fire: '#f97316',
  security: '#3b82f6',
  accident: '#eab308',
}

type TimeRange = 'daily' | 'weekly' | 'monthly'

export default function AnalyticsClient() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('daily')

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: true })
      if (data) setIncidents(data as Incident[])
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) {
    return <div className="flex justify-center py-12"><LoadingSpinner className="h-8 w-8" /></div>
  }

  const resolved = incidents.filter((i) => i.status === 'resolved')
  const avgResponse = resolved.length > 0
    ? Math.round(
        resolved.reduce((sum, i) => {
          if (!i.resolved_at) return sum
          return sum + (new Date(i.resolved_at).getTime() - new Date(i.created_at).getTime()) / 60000
        }, 0) / resolved.length
      )
    : 0

  const typeCounts: Record<string, number> = {}
  incidents.forEach((i) => { typeCounts[i.emergency_type] = (typeCounts[i.emergency_type] || 0) + 1 })
  const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  // Volume over time data
  const volumeData = (() => {
    const buckets: Record<string, number> = {}
    incidents.forEach((i) => {
      const d = new Date(i.created_at)
      let key: string
      if (timeRange === 'daily') {
        key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (timeRange === 'weekly') {
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else {
        key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }
      buckets[key] = (buckets[key] || 0) + 1
    })
    return Object.entries(buckets).map(([date, count]) => ({ date, count }))
  })()

  // Pie data
  const pieData = Object.entries(typeCounts).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
    color: TYPE_COLORS[type as EmergencyType] ?? '#64748b',
  }))

  // Response time trends (weekly, last 3 months)
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const recentResolved = resolved.filter((i) => new Date(i.created_at) >= threeMonthsAgo)
  const weeklyResponse = (() => {
    const weeks: Record<string, { total: number; count: number }> = {}
    recentResolved.forEach((i) => {
      if (!i.resolved_at) return
      const d = new Date(i.created_at)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      const key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!weeks[key]) weeks[key] = { total: 0, count: 0 }
      weeks[key].total += (new Date(i.resolved_at).getTime() - new Date(i.created_at).getTime()) / 60000
      weeks[key].count++
    })
    return Object.entries(weeks).map(([week, v]) => ({
      week,
      avg: Math.round(v.total / v.count),
    }))
  })()

  function exportCSV() {
    const headers = ['ID', 'Type', 'Status', 'Address', 'Created At', 'Resolved At']
    const rows = incidents.map((i) => [
      i.id, i.emergency_type, i.status, `"${i.address}"`, i.created_at, i.resolved_at ?? '',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'incidents_export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPDF() {
    const content = `
ERNA Incident Report
Generated: ${new Date().toLocaleString()}

Total Incidents: ${incidents.length}
Resolved: ${resolved.length}
Average Response Time: ${avgResponse} min
Most Common Type: ${mostCommon}

Breakdown by Type:
${Object.entries(typeCounts).map(([t, c]) => `  ${t}: ${c}`).join('\n')}
    `.trim()

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'incidents_report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Incidents" value={incidents.length} icon={Activity} color="blue" />
        <StatCard title="Total Resolved" value={resolved.length} icon={CheckCircle} color="green" />
        <StatCard title="Avg Response Time" value={`${avgResponse} min`} icon={Clock} color="yellow" />
        <StatCard title="Most Common Type" value={mostCommon} icon={AlertTriangle} color="red" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Incident Volume</h3>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
              {(['daily', 'weekly', 'monthly'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    timeRange === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 font-semibold text-slate-900">Emergency Type Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 font-semibold text-slate-900">Response Time Trends (Last 3 Months)</h3>
        {weeklyResponse.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Not enough resolved incidents to show trends.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyResponse}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" unit=" min" />
              <Tooltip />
              <Bar dataKey="avg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Export */}
      <div className="flex gap-3">
        <button onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Download className="h-4 w-4" /> Export as CSV
        </button>
        <button onClick={exportPDF}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Download className="h-4 w-4" /> Export as Report
        </button>
      </div>
    </div>
  )
}
