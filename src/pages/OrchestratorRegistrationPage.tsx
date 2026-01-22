import { useState, useEffect } from 'react'
import { useChain } from '@cosmos-kit/react'
import { OrchestratorForm } from '../components/OrchestratorForm'
import { TransactionStatus } from '../components/TransactionStatus'
import { OrchestratorRegistrationFormData } from '../utils/validation'
import { TransactionStatus as TxStatus, ValidatorInfo, OrchestratorMapping } from '../types'
import { registerOrchestratorTransaction } from '../services/transactions'
import { useNetwork } from '../contexts/NetworkContext'
import { createInjectiveSigner } from '../utils/injective-signer'
import { QueryService } from '../services/queries'
import { toValidatorOperatorAddress } from '../utils/address'

export default function OrchestratorRegistrationPage() {
  const { address, getOfflineSignerDirect, chain } = useChain('injective')
  const { network } = useNetwork()
  const [orchestratorTxStatus, setOrchestratorTxStatus] = useState<TxStatus>({ status: 'idle' })
  const [validator, setValidator] = useState<ValidatorInfo | null>(null)
  const [existingOrchestrator, setExistingOrchestrator] = useState<OrchestratorMapping | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingOrchestrator, setLoadingOrchestrator] = useState(false)

  useEffect(() => {
    if (address) {
      loadValidator()
      loadOrchestrator()
    }
  }, [address, network])

  const loadValidator = async () => {
    if (!address) return
    
    setLoading(true)
    try {
      const queryService = new QueryService(network)
      // Derive validator operator address from wallet account (same as createValidatorTransaction)
      const derivedValidatorAddress = toValidatorOperatorAddress(address)
      const validatorInfo = await queryService.getValidator(derivedValidatorAddress)
      setValidator(validatorInfo)
    } catch (error) {
      console.error('Failed to load validator:', error)
      setValidator(null)
    } finally {
      setLoading(false)
    }
  }

  const loadOrchestrator = async () => {
    if (!address) return
    
    setLoadingOrchestrator(true)
    try {
      const queryService = new QueryService(network)
      const orchestratorInfo = await queryService.getOrchestratorBySender(address)
      setExistingOrchestrator(orchestratorInfo)
    } catch (error) {
      console.error('Failed to load orchestrator:', error)
      setExistingOrchestrator(null)
    } finally {
      setLoadingOrchestrator(false)
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
      
      // Only proceed if transaction succeeded (code 0)
      // The transaction function will throw if it failed, so if we get here, it succeeded
      if (result.transactionHash) {
        setOrchestratorTxStatus({ 
          status: 'success', 
          hash: result.transactionHash,
          rawLog: (result as any).rawLog,
        })
        
        // Reload orchestrator info after successful registration
        await loadOrchestrator()
      } else {
        throw new Error('Transaction completed but no transaction hash was returned')
      }
    } catch (error: any) {
      console.error('Orchestrator registration error:', error)
      // Try to extract raw log from error if available
      const rawLog = error?.rawLog || error?.txResponse?.rawLog || error?.txResult?.log
      setOrchestratorTxStatus({ 
        status: 'error', 
        error: error.message || 'Failed to register orchestrator',
        rawLog: rawLog,
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
      ) : loading || loadingOrchestrator ? (
        <div>Loading validator information...</div>
      ) : !validator ? (
        <div className="error-message">
          No validator found for the connected wallet. Please ensure you're connected with a validator operator wallet that has registered a validator.
        </div>
      ) : existingOrchestrator ? (
        <>
          <TransactionStatus 
            status={{
              status: 'warning',
              warning: 'An orchestrator has already been registered for this wallet. Orchestrator addresses cannot be changed once registered.',
            }}
            explorerUrl={explorerUrl}
          />
          <div className="info-section" style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
            <h3>Registered Orchestrator</h3>
            <p style={{ marginTop: '0.5rem' }}>
              <strong>Orchestrator Address:</strong>
              <br />
              <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{existingOrchestrator.orchestratorAddress}</span>
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              <strong>Ethereum Address:</strong>
              <br />
              <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{existingOrchestrator.ethereumAddress}</span>
            </p>
          </div>
          <TransactionStatus 
            status={orchestratorTxStatus} 
            explorerUrl={explorerUrl}
          />
        </>
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
