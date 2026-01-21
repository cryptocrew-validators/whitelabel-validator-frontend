import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseDeeplinkPubkey } from '../utils/pubkey'

interface DeeplinkPubkey {
  pubkey: string | null
  error: string | null
}

export function useDeeplinkPubkey(): DeeplinkPubkey {
  const [searchParams] = useSearchParams()
  const [pubkey, setPubkey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const pubkeyParam = searchParams.get('pubkey')
    
    if (!pubkeyParam) {
      setPubkey(null)
      setError(null)
      return
    }

    const result = parseDeeplinkPubkey(pubkeyParam)
    
    if (result.valid && result.normalized) {
      setPubkey(result.normalized)
      setError(null)
    } else {
      setPubkey(null)
      setError(result.error || 'Invalid pubkey format')
    }
  }, [searchParams])

  return { pubkey, error }
}
