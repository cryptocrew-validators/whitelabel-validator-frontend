import { useEffect, useState } from 'react'
import { useChain } from '@cosmos-kit/react'
import { useNetwork } from '../contexts/NetworkContext'
import { getChainConfig } from '../config/chains'
import { QueryService } from '../services/queries'
import { toValidatorOperatorAddress } from '../utils/address'

export function BalanceDisplay() {
  const { address, status, wallet } = useChain('injective')
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

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here if desired
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!address) {
    return null
  }

  const formattedBalance = loading 
    ? 'Loading...' 
    : `${(parseInt(balance) / 1e18).toFixed(4)} INJ`

  return (
    <div className="wallet-card">
      <div className="wallet-card-header">
        <span className="wallet-name">{wallet?.prettyName || 'Connected'}</span>
        <div className="address-with-copy">
          <span className="wallet-address">{address.slice(0, 8)}...{address.slice(-6)}</span>
          <button
            className="copy-button"
            onClick={() => copyToClipboard(address, 'wallet')}
            title="Copy wallet address"
            aria-label="Copy wallet address"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
      <div className="wallet-card-body">
        <div className="wallet-info-item">
          <span className="wallet-info-label">Balance</span>
          <span className="wallet-info-value">{formattedBalance}</span>
        </div>
        {validatorOperatorAddress && (
          <div className="wallet-info-item" title={validatorOperatorAddress}>
            <span className="wallet-info-label">Validator</span>
            <div className="address-with-copy">
              <span className="wallet-info-value validator-address">{validatorOperatorAddress.slice(0, 10)}...{validatorOperatorAddress.slice(-6)}</span>
              <button
                className="copy-button"
                onClick={() => copyToClipboard(validatorOperatorAddress, 'validator')}
                title="Copy validator address"
                aria-label="Copy validator address"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
