'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from './useRealtime'
import type { Incident } from '@/types'

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchIncidents() {
      const supabase = createClient()
      const { data } = await supabase
        .from('incidents')
        .select('*, victim:profiles!victim_id(*), responder:profiles!responder_id(*)')
        .order('created_at', { ascending: false })

      if (data) setIncidents(data as Incident[])
      setLoading(false)
    }
    fetchIncidents()
  }, [])

  const handleRealtimePayload = useCallback(() => {
    async function refetch() {
      const supabase = createClient()
      const { data } = await supabase
        .from('incidents')
        .select('*, victim:profiles!victim_id(*), responder:profiles!responder_id(*)')
        .order('created_at', { ascending: false })

      if (data) setIncidents(data as Incident[])
    }
    refetch()
  }, [])

  useRealtime({
    table: 'incidents',
    onPayload: handleRealtimePayload,
  })

  const activeIncidents = incidents.filter((i) => i.status === 'active')
  const todayIncidents = incidents.filter((i) => {
    const today = new Date()
    const created = new Date(i.created_at)
    return (
      created.getDate() === today.getDate() &&
      created.getMonth() === today.getMonth() &&
      created.getFullYear() === today.getFullYear()
    )
  })

  return { incidents, activeIncidents, todayIncidents, loading }
}
