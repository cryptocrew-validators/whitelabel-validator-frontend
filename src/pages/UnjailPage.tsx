import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useChain } from '@cosmos-kit/react'
import { TransactionStatus } from '../components/TransactionStatus'
import { TransactionStatus as TxStatus, ValidatorInfo } from '../types'
import { unjailTransaction } from '../services/transactions'
import { QueryService } from '../services/queries'
import { useNetwork } from '../contexts/NetworkContext'
import { createInjectiveSigner } from '../utils/injective-signer'
import { toValidatorOperatorAddress } from '../utils/address'

export default function UnjailPage() {
  const { address, getOfflineSignerDirect, chain } = useChain('injective')
  const { network } = useNetwork()
  const [txStatus, setTxStatus] = useState<TxStatus>({ status: 'idle' })
  const [validatorAddress, setValidatorAddress] = useState<string>('')
  const [validator, setValidator] = useState<ValidatorInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [infoDismissed, setInfoDismissed] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [profileImageError, setProfileImageError] = useState(false)

  useEffect(() => {
    if (address) {
      loadValidator()
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
      // Derive validator operator address from wallet account
      const derivedValidatorAddress = toValidatorOperatorAddress(address)
      const validatorInfo = await queryService.getValidator(derivedValidatorAddress)
      
      if (validatorInfo) {
        console.log('[UNJAIL PAGE] Loaded validator info:', {
          operatorAddress: validatorInfo.operatorAddress,
          status: validatorInfo.status,
          jailed: validatorInfo.jailed,
          moniker: validatorInfo.moniker,
        })
        setValidator(validatorInfo)
        setValidatorAddress(derivedValidatorAddress)
      } else {
        console.log('[UNJAIL PAGE] No validator found for address:', derivedValidatorAddress)
        setValidator(null)
        setValidatorAddress('')
      }
    } catch (error) {
      console.error('Failed to load validator:', error)
      setValidator(null)
      setValidatorAddress('')
    } finally {
      setLoading(false)
    }
  }

  const handleUnjail = async () => {
    if (!address || !getOfflineSignerDirect) {
      setTxStatus({ status: 'error', error: 'Wallet not connected' })
      return
    }

    if (!validatorAddress) {
      setTxStatus({ status: 'error', error: 'Validator address not found' })
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
      
      const result = await unjailTransaction(signer, validatorAddress, chain.chain_id)
      
      // Only proceed if transaction succeeded (code 0)
      if (result.transactionHash) {
        setTxStatus({ 
          status: 'success', 
          hash: result.transactionHash,
          rawLog: (result as any).rawLog,
        })
        
        // Reload validator info to check if status changed
        await loadValidator()
      } else {
        throw new Error('Transaction completed but no transaction hash was returned')
      }
    } catch (error: any) {
      console.error('Unjail error:', error)
      // Try to extract raw log from error if available
      const rawLog = error?.rawLog || error?.txResponse?.rawLog || error?.txResult?.log
      setTxStatus({ 
        status: 'error', 
        error: error.message || 'Failed to unjail validator',
        rawLog: rawLog,
      })
    }
  }

  const explorerUrl = chain.explorers?.[0]?.url || (network === 'mainnet' 
    ? 'https://explorer.injective.network' 
    : 'https://testnet.explorer.injective.network')

  return (
    <div className="page">
      <h1>Unjail Validator</h1>
      
      {!address ? (
        <div className="error-message">
          Please connect your wallet to unjail a validator.
        </div>
      ) : loading ? (
        <div>Loading validator information...</div>
      ) : !validator ? (
        <div className="error-message">
          No validator found for the connected wallet. Please ensure you're connected with a validator operator wallet that has registered a validator.
        </div>
      ) : (
        <>
          {!validator.jailed && !infoDismissed && (
            <TransactionStatus 
              status={{
                status: 'info',
                info: 'Your validator is not jailed. Unjail is only available for jailed validators.',
              }}
              explorerUrl={explorerUrl}
              inline={true}
              onDismiss={() => setInfoDismissed(true)}
            />
          )}
          <div className="validator-info" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="info-section">
              <h3>Status</h3>
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
                  <span className="info-label">Status</span>
                  <span className="info-value">
                    {(() => {
                      if (validator.jailed) {
                        return <span className="status-badge status-badge-warning">Jailed</span>
                      }
                      if (validator.status === 'BOND_STATUS_BONDED') {
                        return <span className="status-badge status-badge-success">Active</span>
                      }
                      return <span className="status-badge status-badge-info">{validator.status.replace('BOND_STATUS_', '')}</span>
                    })()}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Jailed</span>
                  <span className={`info-value ${validator.jailed ? 'status-jailed' : 'status-active'}`}>
                    {validator.jailed ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {validator.jailed && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--accent-primary)', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Unjail Validator</h3>
                  <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Your validator is currently jailed. Click the button below to unjail it.
                  </p>
                  <form className="unjail-form" onSubmit={(e) => { e.preventDefault(); handleUnjail(); }}>
                    <button
                      type="submit"
                      disabled={txStatus.status === 'pending'}
                    >
                      {txStatus.status === 'pending' ? 'Unjailing...' : 'Unjail Validator'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {txStatus.status !== 'idle' && (
            <TransactionStatus 
              status={txStatus} 
              explorerUrl={explorerUrl}
              onDismiss={() => setTxStatus({ status: 'idle' })}
            />
          )}
        </>
      )}
    </div>
  )
}
