import { useState, useEffect } from 'react'
import { useChain } from '@cosmos-kit/react'
import { DelegateForm } from '../components/DelegateForm'
import { UndelegateForm } from '../components/UndelegateForm'
import { TransactionStatus } from '../components/TransactionStatus'
import { DelegationFormData } from '../utils/validation'
import { TransactionStatus as TxStatus, DelegationInfo, UnbondingDelegation, ValidatorInfo } from '../types'
import { delegateTransaction, undelegateTransaction } from '../services/transactions'
import { QueryService } from '../services/queries'
import { useNetwork } from '../contexts/NetworkContext'
import { createInjectiveSigner } from '../utils/injective-signer'
import { toValidatorOperatorAddress } from '../utils/address'
import { getChainConfig } from '../config/chains'

export default function DelegationPage() {
  const { address, getOfflineSignerDirect, chain } = useChain('injective')
  const { network } = useNetwork()
  const [txStatus, setTxStatus] = useState<TxStatus>({ status: 'idle' })
  const [validatorAddress, setValidatorAddress] = useState<string>('')
  const [validator, setValidator] = useState<ValidatorInfo | null>(null)
  const [delegation, setDelegation] = useState<DelegationInfo | null>(null)
  const [unbonding, setUnbonding] = useState<UnbondingDelegation | null>(null)
  const [availableBalance, setAvailableBalance] = useState<string>('0')
  const [loading, setLoading] = useState(false)
  const [loadingValidator, setLoadingValidator] = useState(false)

  useEffect(() => {
    if (address) {
      loadValidator()
    }
  }, [address, network])

  useEffect(() => {
    if (address && validatorAddress) {
      loadDelegationInfo()
    }
  }, [address, validatorAddress, network])

  useEffect(() => {
    if (address) {
      loadBalance()
    }
  }, [address, network])

  const loadBalance = async () => {
    if (!address) return
    
    try {
      const config = getChainConfig(network)
      // Use REST API: GET /cosmos/bank/v1beta1/balances/{address}
      const url = `${config.rest}/cosmos/bank/v1beta1/balances/${address}`
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 404) {
          setAvailableBalance('0')
          return
        }
        console.warn('Failed to fetch balance:', response.statusText)
        setAvailableBalance('0')
        return
      }
      
      const data = await response.json()
      const balances = data.balances || []
      
      // Find the INJ balance
      const injBalance = balances.find((b: any) => b.denom === 'inj')
      const balanceAmount = injBalance?.amount || '0'
      
      setAvailableBalance(balanceAmount)
    } catch (error) {
      console.warn('Failed to load balance:', error)
      setAvailableBalance('0')
    }
  }

  const loadValidator = async () => {
    if (!address) return
    
    setLoadingValidator(true)
    try {
      const queryService = new QueryService(network)
      // Derive validator operator address from wallet account (same as createValidatorTransaction)
      const derivedValidatorAddress = toValidatorOperatorAddress(address)
      const validatorInfo = await queryService.getValidator(derivedValidatorAddress)
      
      if (validatorInfo) {
        setValidator(validatorInfo)
        setValidatorAddress(derivedValidatorAddress)
      } else {
        setValidator(null)
        setValidatorAddress('')
      }
    } catch (error) {
      console.error('Failed to load validator:', error)
      setValidator(null)
      setValidatorAddress('')
    } finally {
      setLoadingValidator(false)
    }
  }

  const loadDelegationInfo = async () => {
    if (!address || !validatorAddress) return
    
    setLoading(true)
    try {
      const queryService = new QueryService(network)
      const [delegationInfo, unbondingInfo] = await Promise.all([
        queryService.getDelegation(address, validatorAddress),
        queryService.getUnbondingDelegation(address, validatorAddress),
      ])
      setDelegation(delegationInfo)
      setUnbonding(unbondingInfo)
    } catch (error) {
      console.error('Failed to load delegation info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelegate = async (data: DelegationFormData) => {
    if (!address || !getOfflineSignerDirect) {
      setTxStatus({ status: 'error', error: 'Wallet not connected' })
      return
    }

    try {
      setTxStatus({ status: 'pending' })
      
      // Get direct offline signer from Cosmos Kit for protobuf signing
      const offlineSigner = getOfflineSignerDirect()
      if (!offlineSigner) {
        throw new Error('Failed to get offline signer')
      }
      
      const signer = await createInjectiveSigner(offlineSigner, chain.chain_id, network)
      
      const result = await delegateTransaction(signer, address, data, chain.chain_id)
      
      // Only proceed if transaction succeeded (code 0)
      if (result.transactionHash) {
        setTxStatus({ 
          status: 'success', 
          hash: result.transactionHash,
          rawLog: (result as any).rawLog,
        })
        
        // Reload delegation info and balance
        await Promise.all([loadDelegationInfo(), loadBalance()])
      } else {
        throw new Error('Transaction completed but no transaction hash was returned')
      }
    } catch (error: any) {
      console.error('Delegation error:', error)
      // Try to extract raw log from error if available
      const rawLog = error?.rawLog || error?.txResponse?.rawLog || error?.txResult?.log
      setTxStatus({ 
        status: 'error', 
        error: error.message || 'Failed to delegate',
        rawLog: rawLog,
      })
    }
  }

  const handleUndelegate = async (data: DelegationFormData) => {
    if (!address || !getOfflineSignerDirect) {
      setTxStatus({ status: 'error', error: 'Wallet not connected' })
      return
    }

    try {
      setTxStatus({ status: 'pending' })
      
      // Get direct offline signer from Cosmos Kit for protobuf signing
      const offlineSigner = getOfflineSignerDirect()
      if (!offlineSigner) {
        throw new Error('Failed to get offline signer')
      }
      
      const signer = await createInjectiveSigner(offlineSigner, chain.chain_id, network)
      
      const result = await undelegateTransaction(signer, address, data, chain.chain_id)
      
      // Only proceed if transaction succeeded (code 0)
      if (result.transactionHash) {
        setTxStatus({ 
          status: 'success', 
          hash: result.transactionHash,
          rawLog: (result as any).rawLog,
        })
        
        // Reload delegation info and balance
        await Promise.all([loadDelegationInfo(), loadBalance()])
      } else {
        throw new Error('Transaction completed but no transaction hash was returned')
      }
    } catch (error: any) {
      console.error('Undelegation error:', error)
      // Try to extract raw log from error if available
      const rawLog = error?.rawLog || error?.txResponse?.rawLog || error?.txResult?.log
      setTxStatus({ 
        status: 'error', 
        error: error.message || 'Failed to undelegate',
        rawLog: rawLog,
      })
    }
  }

  const explorerUrl = chain.explorers?.[0]?.url || (network === 'mainnet' 
    ? 'https://explorer.injective.network' 
    : 'https://testnet.explorer.injective.network')

  return (
    <div className="page">
      <h1>Delegation Management</h1>
      
      {!address ? (
        <div className="error-message">
          Please connect your wallet to manage delegations.
        </div>
      ) : loadingValidator ? (
        <div>Loading validator information...</div>
      ) : !validator ? (
        <div className="error-message">
          No validator found for the connected wallet. Please ensure you're connected with a validator operator wallet that has registered a validator.
        </div>
      ) : (
        <>
          <div className="info-section" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
            <h3>Validator Operator Address</h3>
            <p style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{validator.operatorAddress}</p>
          </div>

          {loading ? (
            <div>Loading delegation information...</div>
          ) : (
            <>
              {delegation && (
                <div className="info-section">
                  <h3>Current Delegation</h3>
                  <p>Shares: {delegation.shares}</p>
                  <p>Balance (raw): {delegation.balance.amount} {delegation.balance.denom}</p>
                  <p>Balance (INJ): {(parseFloat(delegation.balance.amount) / 1e18).toFixed(4)} INJ</p>
                </div>
              )}

              {unbonding && unbonding.entries.length > 0 && (
                <div className="info-section">
                  <h3>Unbonding Delegations</h3>
                  {unbonding.entries.map((entry, index) => (
                    <div key={index}>
                      <p>Balance: {entry.balance} INJ</p>
                      <p>Completion Time: {new Date(entry.completionTime).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              <DelegateForm
                validatorAddress={validatorAddress}
                onSubmit={handleDelegate}
                isSubmitting={txStatus.status === 'pending'}
                availableBalance={availableBalance}
              />

              <UndelegateForm
                validatorAddress={validatorAddress}
                onSubmit={handleUndelegate}
                isSubmitting={txStatus.status === 'pending'}
                currentDelegation={delegation}
              />
              
              <TransactionStatus 
                status={txStatus} 
                explorerUrl={explorerUrl}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
