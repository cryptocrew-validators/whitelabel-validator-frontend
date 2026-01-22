import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [profileImageError, setProfileImageError] = useState(false)
  const [warningDismissed, setWarningDismissed] = useState(false)

  useEffect(() => {
    if (address) {
      loadValidator()
      loadOrchestrator()
    }
  }, [address, network])

  // Load Keybase profile picture when validator changes
  useEffect(() => {
    const loadKeybasePicture = async () => {
      if (!validator?.identity || validator.identity.trim() === '') {
        setProfileImageUrl(null)
        setProfileImageError(false)
        return
      }

      const { loadKeybasePicture: loadCachedPicture } = await import('../utils/keybase-cache')
      const pictureUrl = await loadCachedPicture(validator.identity)
      
      if (pictureUrl) {
        setProfileImageUrl(pictureUrl)
        setProfileImageError(false)
      } else {
        setProfileImageUrl(null)
        setProfileImageError(false)
      }
    }

    if (validator) {
      loadKeybasePicture()
    } else {
      setProfileImageUrl(null)
      setProfileImageError(false)
    }
  }, [validator])

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
      <h1>Orchestrator Registration</h1>
      
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
          {!warningDismissed && (
            <TransactionStatus 
              status={{
                status: 'warning',
                warning: 'An orchestrator has already been registered for this wallet. Orchestrator addresses cannot be changed once registered.',
              }}
              explorerUrl={explorerUrl}
              inline={true}
              onDismiss={() => setWarningDismissed(true)}
            />
          )}
          <div className="validator-info" style={{ marginTop: '1.5rem' }}>
            <div className="info-section">
              <h3>Registered Orchestrator</h3>
              <Link to="/status" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="validator-profile-header" style={{ cursor: 'pointer' }}>
                  <div className="profile-picture-container">
                    {profileImageUrl && !profileImageError ? (
                      <img
                        src={profileImageUrl}
                        alt={`${validator.moniker} profile`}
                        className="profile-picture"
                        onError={() => setProfileImageError(true)}
                      />
                    ) : (
                      <div className="profile-picture-default">
                        {validator.moniker
                          ? (() => {
                              const words = validator.moniker.trim().split(/\s+/)
                              if (words.length >= 2) {
                                return (words[0][0] + words[1][0]).toUpperCase()
                              }
                              return validator.moniker.substring(0, 2).toUpperCase()
                            })()
                          : 'V'}
                      </div>
                    )}
                  </div>
                  <div className="validator-profile-info">
                    <div className="info-item">
                      <span className="info-label">Moniker</span>
                      <span className="info-value">{validator.moniker || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </Link>
              <div className="info-grid" style={{ marginTop: '1rem' }}>
                <div className="info-item">
                  <span className="info-label">Orchestrator Address</span>
                  <span className="info-value address-value">{existingOrchestrator.orchestratorAddress}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Ethereum Address</span>
                  <span className="info-value address-value">{existingOrchestrator.ethereumAddress}</span>
                </div>
              </div>
            </div>
          </div>
          <TransactionStatus 
            status={orchestratorTxStatus} 
            explorerUrl={explorerUrl}
            onDismiss={() => setOrchestratorTxStatus({ status: 'idle' })}
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
            onDismiss={() => setOrchestratorTxStatus({ status: 'idle' })}
          />
        </>
      )}
    </div>
  )
}
