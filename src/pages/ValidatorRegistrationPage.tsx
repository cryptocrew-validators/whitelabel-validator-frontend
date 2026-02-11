import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useChain } from '@cosmos-kit/react'
import { ValidatorRegistrationForm } from '../components/ValidatorRegistrationForm'
import { TransactionStatus } from '../components/TransactionStatus'
import { ValidatorRegistrationFormData } from '../utils/validation'
import { TransactionStatus as TxStatus, ValidatorInfo } from '../types'
import { createValidatorTransaction } from '../services/transactions'
import { useNetwork } from '../contexts/NetworkContext'
import { createInjectiveSigner } from '../utils/injective-signer'
import { QueryService } from '../services/queries'
import { toValidatorOperatorAddress } from '../utils/address'

export default function ValidatorRegistrationPage() {
  const { address, getOfflineSignerDirect, chain, status } = useChain('injective')
  const { network } = useNetwork()
  const [validatorTxStatus, setValidatorTxStatus] = useState<TxStatus>({ status: 'idle' })
  const [existingValidator, setExistingValidator] = useState<ValidatorInfo | null>(null)
  const [loadingValidator, setLoadingValidator] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [profileImageError, setProfileImageError] = useState(false)
  const [warningDismissed, setWarningDismissed] = useState(false)

  useEffect(() => {
    if (address) {
      checkExistingValidator()
    }
  }, [address, network])

  // Load Keybase profile picture when existingValidator changes
  useEffect(() => {
    const loadKeybasePicture = async () => {
      if (!existingValidator?.identity || existingValidator.identity.trim() === '') {
        setProfileImageUrl(null)
        setProfileImageError(false)
        return
      }

      const { loadKeybasePicture: loadCachedPicture } = await import('../utils/keybase-cache')
      const pictureUrl = await loadCachedPicture(existingValidator.identity)
      
      if (pictureUrl) {
        setProfileImageUrl(pictureUrl)
        setProfileImageError(false)
      } else {
        setProfileImageUrl(null)
        setProfileImageError(false)
      }
    }

    if (existingValidator) {
      loadKeybasePicture()
    } else {
      setProfileImageUrl(null)
      setProfileImageError(false)
    }
  }, [existingValidator])

  const checkExistingValidator = async () => {
    if (!address) return
    
    setLoadingValidator(true)
    try {
      const queryService = new QueryService(network)
      // Derive validator operator address from wallet account (same as createValidatorTransaction)
      const derivedValidatorAddress = toValidatorOperatorAddress(address)
      const validatorInfo = await queryService.getValidator(derivedValidatorAddress)
      
      if (validatorInfo) {
        setExistingValidator(validatorInfo)
      } else {
        setExistingValidator(null)
      }
    } catch (error) {
      console.error('Failed to check existing validator:', error)
      setExistingValidator(null)
    } finally {
      setLoadingValidator(false)
    }
  }

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
      
      // Only proceed if transaction succeeded (code 0)
      // The transaction function will throw if it failed, so if we get here, it succeeded
      if (result.transactionHash) {
        setValidatorTxStatus({ 
          status: 'success', 
          hash: result.transactionHash,
          rawLog: (result as any).rawLog,
        })
        // Refresh validator check to get the newly registered validator info
        // Add a small delay to ensure the validator is indexed on-chain
        await new Promise(resolve => setTimeout(resolve, 2000))
        await checkExistingValidator()
        
        // Trigger refresh of validator address in BalanceDisplay
        window.dispatchEvent(new CustomEvent('validator-registered'))
      } else {
        throw new Error('Transaction completed but no transaction hash was returned')
      }
    } catch (error: any) {
      console.error('Validator registration error:', error)
      const errorMessage = error?.message || String(error) || 'Failed to register validator'
      // Try to extract raw log from error if available
      const rawLog = error?.rawLog || error?.txResponse?.rawLog || error?.txResult?.log
      setValidatorTxStatus({ 
        status: 'error', 
        error: errorMessage,
        rawLog: rawLog,
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
      ) : loadingValidator ? (
        <div>Checking for existing validator...</div>
      ) : existingValidator ? (
        <>
          {!warningDismissed && (
            <TransactionStatus 
              status={{
                status: 'warning',
                warning: 'A validator has already been registered with this wallet. You cannot register another validator with the same wallet address.',
              }}
              explorerUrl={explorerUrl}
              inline={true}
              onDismiss={() => setWarningDismissed(true)}
            />
          )}
          <div className="validator-info" style={{ marginTop: '1.5rem' }}>
            <div className="info-section">
              <h3>Registered Validator</h3>
              <Link to="/status" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="validator-profile-header" style={{ cursor: 'pointer' }}>
                  <div className="profile-picture-container">
                    {profileImageUrl && !profileImageError ? (
                      <img
                        src={profileImageUrl}
                        alt={`${existingValidator.moniker} profile`}
                        className="profile-picture"
                        onError={() => setProfileImageError(true)}
                      />
                    ) : (
                      <div className="profile-picture-default">
                        {existingValidator.moniker
                          ? (() => {
                              const words = existingValidator.moniker.trim().split(/\s+/)
                              if (words.length >= 2) {
                                return (words[0][0] + words[1][0]).toUpperCase()
                              }
                              return existingValidator.moniker.substring(0, 2).toUpperCase()
                            })()
                          : 'V'}
                      </div>
                    )}
                  </div>
                  <div className="validator-profile-info">
                    <div className="info-item">
                      <span className="info-label">Moniker</span>
                      <span className="info-value">{existingValidator.moniker || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <p>To register a new validator, please connect with a different wallet address.</p>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-tertiary)' }}>
              You can use the{' '}
              <Link to="/edit" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                Edit Validator
              </Link>
              {' '}page to update your existing validator's information.
            </p>
          </div>
        </>
      ) : (
        <>
          <ValidatorRegistrationForm
            onSubmit={handleValidatorSubmit}
            isSubmitting={validatorTxStatus.status === 'pending'}
          />
          <TransactionStatus 
            status={validatorTxStatus} 
            explorerUrl={explorerUrl}
            onDismiss={() => setValidatorTxStatus({ status: 'idle' })}
          />
        </>
      )}
    </div>
  )
}
