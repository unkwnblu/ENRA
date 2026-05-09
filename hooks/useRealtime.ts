'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface UseRealtimeOptions {
  table: string
  schema?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  onPayload: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
}

export function useRealtime({ table, schema = 'public', event = '*', onPayload }: UseRealtimeOptions) {
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes' as never,
        { event, schema, table },
        onPayload
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, schema, event, onPayload])
}
