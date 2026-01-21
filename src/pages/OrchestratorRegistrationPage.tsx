import { useState } from 'react'
import { useChain } from '@cosmos-kit/react'
import { OrchestratorForm } from '../components/OrchestratorForm'
import { TransactionStatus } from '../components/TransactionStatus'
import { OrchestratorRegistrationFormData } from '../utils/validation'
import { TransactionStatus as TxStatus } from '../types'
import { registerOrchestratorTransaction } from '../services/transactions'
import { useNetwork } from '../contexts/NetworkContext'
import { createInjectiveSigner } from '../utils/injective-signer'

export default function OrchestratorRegistrationPage() {
  const { address, getOfflineSignerDirect, chain } = useChain('injective')
  const { network } = useNetwork()
  const [orchestratorTxStatus, setOrchestratorTxStatus] = useState<TxStatus>({ status: 'idle' })

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
      console.error('Orchestrator registration error:', error)
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
      <h1>Register Orchestrator</h1>
      
      {!address ? (
        <div className="error-message">
          Please connect your wallet to register an orchestrator.
        </div>
      ) : (
        <>
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
    </div>
  )
}
