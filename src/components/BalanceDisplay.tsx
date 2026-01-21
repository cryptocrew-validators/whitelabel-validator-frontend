import { useEffect, useState } from 'react'
import { useChain } from '@cosmos-kit/react'

export function BalanceDisplay() {
  const { address, getSigningStargateClient, status } = useChain('injective')
  const [balance, setBalance] = useState<string>('0')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Only load balance when wallet is connected and ready
    if (address && getSigningStargateClient && status === 'Connected') {
      loadBalance()
    } else {
      setBalance('0')
    }
  }, [address, getSigningStargateClient, status])

  const loadBalance = async () => {
    if (!address || !getSigningStargateClient) return
    
    setLoading(true)
    try {
      const client = await getSigningStargateClient()
      const balances = await client.getBalance(address, 'inj')
      setBalance(balances.amount || '0')
    } catch (error: any) {
      // Silently handle balance loading errors - they're not critical
      // Only log unexpected errors
      const errorMessage = error?.message || String(error)
      if (!errorMessage.includes('Client Not Exist') && 
          !errorMessage.includes('AggregateError') &&
          !errorMessage.includes('All promises were rejected') &&
          !errorMessage.includes('not found')) {
        // Only log unexpected errors
        console.warn('Failed to load balance:', errorMessage)
      }
      setBalance('0')
    } finally {
      setLoading(false)
    }
  }

  if (!address) {
    return null
  }

  const formattedBalance = loading 
    ? 'Loading...' 
    : `${(parseInt(balance) / 1e18).toFixed(4)} INJ`

  return (
    <div className="balance-display">
      <span className="balance-label">Balance:</span>
      <span className="balance-value">{formattedBalance}</span>
    </div>
  )
}
