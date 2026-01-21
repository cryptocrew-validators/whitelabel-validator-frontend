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
      // Convert account address to validator operator address
      // This is simplified - in practice you'd need to derive it
      const validatorAddress = address.replace('inj1', 'injvaloper1')
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
        chain.chain_id
      )
      
      setTxStatus({ 
        status: 'success', 
        hash: result.transactionHash 
      })
      
      // Reload validator info
      await loadValidator()
    } catch (error: any) {
      setTxStatus({ 
        status: 'error', 
        error: error.message || 'Failed to update validator' 
      })
    }
  }

  const explorerUrl = chain.explorers?.[0]?.url || (network === 'mainnet' 
    ? 'https://explorer.injective.network' 
    : 'https://testnet.explorer.injective.network')

  return (
    <div className="page">
      <h1>Edit Validator</h1>
      
      {address && (
        <>
          {loading ? (
            <div>Loading validator information...</div>
          ) : validator ? (
            <>
              <ValidatorEditForm
                validator={validator}
                onSubmit={handleSubmit}
                isSubmitting={txStatus.status === 'pending'}
              />
              <TransactionStatus 
                status={txStatus} 
                explorerUrl={explorerUrl}
              />
            </>
          ) : (
            <div>Validator not found. Please ensure you're connected with a validator operator wallet.</div>
          )}
        </>
      )}
    </div>
  )
}
