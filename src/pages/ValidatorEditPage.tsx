import { useState, useEffect } from 'react'
import { useChain } from '@cosmos-kit/react'
import { ValidatorEditForm } from '../components/ValidatorEditForm'
import { TransactionStatus } from '../components/TransactionStatus'
import { ValidatorEditFormData } from '../utils/validation'
import { TransactionStatus as TxStatus, ValidatorInfo } from '../types'
import { editValidatorTransaction } from '../services/transactions'
import { QueryService } from '../services/queries'
import { useNetwork } from '../contexts/NetworkContext'
import { createInjectiveSigner } from '../utils/injective-signer'

export default function ValidatorEditPage() {
  const { address, getOfflineSignerDirect, chain } = useChain('injective')
  const { network } = useNetwork()
  const [txStatus, setTxStatus] = useState<TxStatus>({ status: 'idle' })
  const [validator, setValidator] = useState<ValidatorInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (address) {
      loadValidator()
    }
  }, [address, network])

  const loadValidator = async () => {
    if (!address) return
    
    setLoading(true)
    try {
      const queryService = new QueryService(network)
      // Derive validator operator address from wallet account (same as createValidatorTransaction)
      const { toValidatorOperatorAddress } = await import('../utils/address')
      const validatorAddress = toValidatorOperatorAddress(address)
      const validatorInfo = await queryService.getValidator(validatorAddress)
      setValidator(validatorInfo)
    } catch (error) {
      console.error('Failed to load validator:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: ValidatorEditFormData) => {
    if (!address || !getOfflineSignerDirect || !validator) {
      setTxStatus({ status: 'error', error: 'Wallet not connected or validator not found' })
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
      
      const result = await editValidatorTransaction(
        signer,
        address,
        data,
        validator.operatorAddress,
        chain.chain_id,
        validator.commission.rate
      )
      
      // Only proceed if transaction succeeded (code 0)
      // The transaction function will throw if it failed, so if we get here, it succeeded
      if (result.transactionHash) {
        setTxStatus({ 
          status: 'success', 
          hash: result.transactionHash,
          rawLog: (result as any).rawLog,
        })
        
        // Reload validator info
        await loadValidator()
      } else {
        throw new Error('Transaction completed but no transaction hash was returned')
      }
    } catch (error: any) {
      console.error('Validator edit error:', error)
      // Try to extract raw log from error if available
      const rawLog = error?.rawLog || error?.txResponse?.rawLog || error?.txResult?.log
      setTxStatus({ 
        status: 'error', 
        error: error.message || 'Failed to update validator',
        rawLog: rawLog,
      })
    }
  }

  const explorerUrl = chain.explorers?.[0]?.url || (network === 'mainnet' 
    ? 'https://explorer.injective.network' 
    : 'https://testnet.explorer.injective.network')

  return (
    <div className="page">
      <h1>Edit Validator</h1>
      
      {!address ? (
        <div className="error-message">
          Please connect your wallet to edit validator information.
        </div>
      ) : loading ? (
        <div>Loading validator information...</div>
      ) : !validator ? (
        <div className="error-message">
          No validator found for the connected wallet. Please ensure you're connected with a validator operator wallet that has registered a validator.
        </div>
      ) : (
        <>
          <ValidatorEditForm
            validator={validator}
            onSubmit={handleSubmit}
            isSubmitting={txStatus.status === 'pending'}
          />
          <TransactionStatus 
            status={txStatus} 
            explorerUrl={explorerUrl}
            onDismiss={() => setTxStatus({ status: 'idle' })}
          />
        </>
      )}
    </div>
  )
}
