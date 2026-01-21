import { useState, useEffect } from 'react'
import { useChain } from '@cosmos-kit/react'
import { DelegateForm } from '../components/DelegateForm'
import { UndelegateForm } from '../components/UndelegateForm'
import { TransactionStatus } from '../components/TransactionStatus'
import { DelegationFormData } from '../utils/validation'
import { TransactionStatus as TxStatus, DelegationInfo, UnbondingDelegation } from '../types'
import { delegateTransaction, undelegateTransaction } from '../services/transactions'
import { QueryService } from '../services/queries'
import { useNetwork } from '../contexts/NetworkContext'
import { createInjectiveSigner } from '../utils/injective-signer'

export default function DelegationPage() {
  const { address, getOfflineSignerDirect, chain } = useChain('injective')
  const { network } = useNetwork()
  const [delegateTxStatus, setDelegateTxStatus] = useState<TxStatus>({ status: 'idle' })
  const [undelegateTxStatus, setUndelegateTxStatus] = useState<TxStatus>({ status: 'idle' })
  const [validatorAddress, setValidatorAddress] = useState<string>('')
  const [delegation, setDelegation] = useState<DelegationInfo | null>(null)
  const [unbonding, setUnbonding] = useState<UnbondingDelegation | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (address && validatorAddress) {
      loadDelegationInfo()
    }
  }, [address, validatorAddress, network])

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
      setDelegateTxStatus({ status: 'error', error: 'Wallet not connected' })
      return
    }

    try {
      setDelegateTxStatus({ status: 'pending' })
      
      // Get direct offline signer from Cosmos Kit for protobuf signing
      const offlineSigner = getOfflineSignerDirect()
      if (!offlineSigner) {
        throw new Error('Failed to get offline signer')
      }
      
      const signer = await createInjectiveSigner(offlineSigner, chain.chain_id, network)
      
      const result = await delegateTransaction(signer, address, data, chain.chain_id)
      
      setDelegateTxStatus({ 
        status: 'success', 
        hash: result.transactionHash 
      })
      
      // Reload delegation info
      await loadDelegationInfo()
    } catch (error: any) {
      setDelegateTxStatus({ 
        status: 'error', 
        error: error.message || 'Failed to delegate' 
      })
    }
  }

  const handleUndelegate = async (data: DelegationFormData) => {
    if (!address || !getOfflineSignerDirect) {
      setUndelegateTxStatus({ status: 'error', error: 'Wallet not connected' })
      return
    }

    try {
      setUndelegateTxStatus({ status: 'pending' })
      
      // Get direct offline signer from Cosmos Kit for protobuf signing
      const offlineSigner = getOfflineSignerDirect()
      if (!offlineSigner) {
        throw new Error('Failed to get offline signer')
      }
      
      const signer = await createInjectiveSigner(offlineSigner, chain.chain_id, network)
      
      const result = await undelegateTransaction(signer, address, data, chain.chain_id)
      
      setUndelegateTxStatus({ 
        status: 'success', 
        hash: result.transactionHash 
      })
      
      // Reload delegation info
      await loadDelegationInfo()
    } catch (error: any) {
      setUndelegateTxStatus({ 
        status: 'error', 
        error: error.message || 'Failed to undelegate' 
      })
    }
  }

  const explorerUrl = chain.explorers?.[0]?.url || (network === 'mainnet' 
    ? 'https://explorer.injective.network' 
    : 'https://testnet.explorer.injective.network')

  return (
    <div className="page">
      <h1>Delegation Management</h1>
      
      {address && (
        <>
          <div className="form-group">
            <label>
              Validator Operator Address:
              <input
                type="text"
                value={validatorAddress}
                onChange={(e) => setValidatorAddress(e.target.value)}
                placeholder="injvaloper1..."
              />
            </label>
          </div>

          {validatorAddress && (
            <>
              {loading ? (
                <div>Loading delegation information...</div>
              ) : (
                <>
                  {delegation && (
                    <div className="info-section">
                      <h3>Current Delegation</h3>
                      <p>Shares: {delegation.shares}</p>
                      <p>Balance: {delegation.balance.amount} {delegation.balance.denom}</p>
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
                    isSubmitting={delegateTxStatus.status === 'pending'}
                  />
                  <TransactionStatus 
                    status={delegateTxStatus} 
                    explorerUrl={explorerUrl}
                  />

                  <UndelegateForm
                    validatorAddress={validatorAddress}
                    onSubmit={handleUndelegate}
                    isSubmitting={undelegateTxStatus.status === 'pending'}
                  />
                  <TransactionStatus 
                    status={undelegateTxStatus} 
                    explorerUrl={explorerUrl}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
