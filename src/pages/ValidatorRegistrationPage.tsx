import { useState } from 'react'
import { useChain } from '@cosmos-kit/react'
import { ValidatorRegistrationForm } from '../components/ValidatorRegistrationForm'
import { OrchestratorForm } from '../components/OrchestratorForm'
import { TransactionStatus } from '../components/TransactionStatus'
import { ValidatorRegistrationFormData, OrchestratorRegistrationFormData } from '../utils/validation'
import { TransactionStatus as TxStatus } from '../types'
import { createValidatorTransaction, registerOrchestratorTransaction } from '../services/transactions'
import { useNetwork } from '../contexts/NetworkContext'
import { createInjectiveSigner } from '../utils/injective-signer'

export default function ValidatorRegistrationPage() {
  const { address, getOfflineSignerDirect, chain, status, sendTx } = useChain('injective')
  const { network } = useNetwork()
  const [validatorTxStatus, setValidatorTxStatus] = useState<TxStatus>({ status: 'idle' })
  const [orchestratorTxStatus, setOrchestratorTxStatus] = useState<TxStatus>({ status: 'idle' })
  const [validatorRegistered, setValidatorRegistered] = useState(false)

  const handleValidatorSubmit = async (data: ValidatorRegistrationFormData) => {
    if (!address || !getOfflineSignerDirect) {
      setValidatorTxStatus({ status: 'error', error: 'Wallet not connected' })
      return
    }

    if (status !== 'Connected') {
      setValidatorTxStatus({ status: 'error', error: 'Wallet is not fully connected. Please wait and try again.' })
      return
    }

    try {
      setValidatorTxStatus({ status: 'pending' })
      
      // Get direct offline signer from Cosmos Kit for protobuf signing
      const offlineSigner = getOfflineSignerDirect()
      if (!offlineSigner) {
        throw new Error('Failed to get offline signer')
      }
      
      const signer = await createInjectiveSigner(offlineSigner, chain.chain_id, network)
      
      // Use Injective DirectSigner's signAndBroadcast which properly handles EthAccount
      const result = await createValidatorTransaction(signer, address, data, chain.chain_id)
      
      setValidatorTxStatus({ 
        status: 'success', 
        hash: result.transactionHash 
      })
      setValidatorRegistered(true)
    } catch (error: any) {
      console.error('Validator registration error:', error)
      const errorMessage = error?.message || String(error) || 'Failed to register validator'
      setValidatorTxStatus({ 
        status: 'error', 
        error: errorMessage
      })
    }
  }

  const handleOrchestratorSubmit = async (data: OrchestratorRegistrationFormData) => {
    if (!address || !getOfflineSignerDirect) {
      setOrchestratorTxStatus({ status: 'error', error: 'Wallet not connected' })
      return
    }

    try {
      setOrchestratorTxStatus({ status: 'pending' })
      
      // Get direct offline signer from Cosmos Kit for protobuf signing
      const offlineSigner = getOfflineSignerDirect()
      if (!offlineSigner) {
        throw new Error('Failed to get offline signer')
      }
      
      const signer = await createInjectiveSigner(offlineSigner, chain.chain_id, network)
      
      const result = await registerOrchestratorTransaction(signer, address, data, chain.chain_id)
      
      setOrchestratorTxStatus({ 
        status: 'success', 
        hash: result.transactionHash 
      })
    } catch (error: any) {
      setOrchestratorTxStatus({ 
        status: 'error', 
        error: error.message || 'Failed to register orchestrator' 
      })
    }
  }

  const explorerUrl = chain.explorers?.[0]?.url || (network === 'mainnet' 
    ? 'https://explorer.injective.network' 
    : 'https://testnet.explorer.injective.network')

  return (
    <div className="page">
      <h1>Validator Registration</h1>
      
      {!address ? (
        <div className="error-message">
          Please connect your wallet to register a validator.
        </div>
      ) : (
        <>
          {!validatorRegistered ? (
            <>
              <ValidatorRegistrationForm
                onSubmit={handleValidatorSubmit}
                isSubmitting={validatorTxStatus.status === 'pending'}
              />
              <TransactionStatus 
                status={validatorTxStatus} 
                explorerUrl={explorerUrl}
              />
            </>
          ) : (
            <>
              <div className="success-message">
                Validator registered successfully! You can now register the orchestrator address.
              </div>
              <OrchestratorForm
                onSubmit={handleOrchestratorSubmit}
                isSubmitting={orchestratorTxStatus.status === 'pending'}
              />
              <TransactionStatus 
                status={orchestratorTxStatus} 
                explorerUrl={explorerUrl}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
