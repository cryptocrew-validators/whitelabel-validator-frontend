import { useEffect, useState } from 'react'
import { useChain } from '@cosmos-kit/react'
import { useNetwork } from '../contexts/NetworkContext'
import { getChainConfig } from '../config/chains'
import { QueryService } from '../services/queries'
import { toValidatorOperatorAddress } from '../utils/address'

export function BalanceDisplay() {
  const { address, status } = useChain('injective')
  const { network } = useNetwork()
  const [balance, setBalance] = useState<string>('0')
  const [loading, setLoading] = useState(false)
  const [validatorOperatorAddress, setValidatorOperatorAddress] = useState<string | null>(null)

  useEffect(() => {
    // Only load balance when wallet is connected and ready
    if (address && status === 'Connected') {
      loadBalance()
      loadValidator()
    } else {
      setBalance('0')
      setValidatorOperatorAddress(null)
    }
  }, [address, status, network])

  const loadValidator = async () => {
    if (!address) return
    
    try {
      const queryService = new QueryService(network)
      const derivedValidatorAddress = toValidatorOperatorAddress(address)
      const validatorInfo = await queryService.getValidator(derivedValidatorAddress)
      
      if (validatorInfo) {
        setValidatorOperatorAddress(validatorInfo.operatorAddress)
      } else {
        setValidatorOperatorAddress(null)
      }
    } catch (error) {
      // Silently handle validator loading errors
      setValidatorOperatorAddress(null)
    }
  }

  const loadBalance = async () => {
    if (!address) return
    
    setLoading(true)
    try {
      const config = getChainConfig(network)
      // Use REST API: GET /cosmos/bank/v1beta1/balances/{address}
      const url = `${config.rest}/cosmos/bank/v1beta1/balances/${address}`
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 404) {
          // Account might not exist yet, balance is 0
          setBalance('0')
          return
        }
        throw new Error(`Failed to fetch balance: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      const balances = data.balances || []
      
      // Find the INJ balance
      const injBalance = balances.find((b: any) => b.denom === 'inj')
      const balanceAmount = injBalance?.amount || '0'
      
      setBalance(balanceAmount)
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className="balance-label">Balance:</span>
          <span className="balance-value">{formattedBalance}</span>
        </div>
        {validatorOperatorAddress && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', alignItems: 'flex-end', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#aaa' }}>Validator:</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#4a9eff', wordBreak: 'break-all', textAlign: 'right' }}>
              {validatorOperatorAddress}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
