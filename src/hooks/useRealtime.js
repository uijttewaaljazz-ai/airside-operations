import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../services/supabase.js'

export function useRealtimePoints(enabled) {
  const [points, setPoints] = useState([])
  const [connectionStatus, setConnectionStatus] = useState('verbinden')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('points')
      .select('*')
      .order('created_at', { ascending: false })

    if (loadError) {
      setError(loadError.message)
      return
    }

    setPoints(data || [])
    setError('')
  }, [])

  useEffect(() => {
    if (!enabled) return undefined

    load()
    setConnectionStatus('verbinden')

    const channel = supabase
      .channel('airside-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'points' }, load)
      .subscribe(status => setConnectionStatus(status === 'SUBSCRIBED' ? 'live' : 'verbinden'))

    const interval = setInterval(load, 8000)
    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [enabled, load])

  return { points, connectionStatus, error, load }
}
