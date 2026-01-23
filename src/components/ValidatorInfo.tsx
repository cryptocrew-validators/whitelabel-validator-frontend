import { useState, useEffect } from 'react'
import { ValidatorInfo as ValidatorInfoType, OrchestratorMapping } from '../types'
import { formatTokenAmount } from '../utils/format'

interface ValidatorInfoProps {
  validator: ValidatorInfoType | null
  orchestrator: OrchestratorMapping | null
  loading: boolean
}

export function ValidatorInfo({ validator, orchestrator, loading }: ValidatorInfoProps) {
  // Hooks must be called before any early returns
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [profileImageError, setProfileImageError] = useState(false)
  
  // Load Keybase profile picture with caching
  useEffect(() => {
    if (!validator || !validator.identity || validator.identity.trim() === '') {
      setProfileImageUrl(null)
      setProfileImageError(false)
      return
    }

    const loadKeybasePicture = async () => {
      if (!validator?.identity) return
      
      const { loadKeybasePicture: loadCachedPicture } = await import('../utils/keybase-cache')
      const pictureUrl = await loadCachedPicture(validator.identity)
      
      if (pictureUrl) {
        setProfileImageUrl(pictureUrl)
        setProfileImageError(false)
      } else {
        setProfileImageUrl(null)
        setProfileImageError(true)
      }
    }

    loadKeybasePicture()
  }, [validator?.identity])

  if (loading) {
    return <div>Loading validator information...</div>
  }

  if (!validator) {
    return <div>Validator not found</div>
  }

  // Format token amounts with 18 decimals
  const tokensFormatted = formatTokenAmount(validator.tokens, 18, 4)
  const delegatorSharesFormatted = formatTokenAmount(validator.delegatorShares, 18, 4)
  const minSelfDelegationFormatted = formatTokenAmount(validator.minSelfDelegation, 18, 4)
  
  const getStatusBadge = () => {
    if (validator.slashingInfo?.tombstoned) {
      return <span className="status-badge status-badge-error">Tombstoned</span>
    }
    if (validator.jailed) {
      return <span className="status-badge status-badge-warning">Jailed</span>
    }
    if (validator.status === 'BOND_STATUS_BONDED') {
      return <span className="status-badge status-badge-success">Active</span>
    }
    return <span className="status-badge status-badge-info">{validator.status.replace('BOND_STATUS_', '')}</span>
  }

  const getDefaultProfileInitials = () => {
    if (validator.moniker) {
      // Get first letter of each word in moniker, up to 2 letters
      const words = validator.moniker.trim().split(/\s+/)
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
      }
      return validator.moniker.substring(0, 2).toUpperCase()
    }
    return 'V'
  }

  const showProfilePicture = profileImageUrl !== null && !profileImageError

  return (
    <div className="validator-info">
      <div className="info-section">
        <h3>Basic Info</h3>
        <div className="validator-profile-header">
          <div className="profile-picture-container">
            {showProfilePicture && profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={`${validator.moniker} profile`}
                className="profile-picture"
                onError={() => setProfileImageError(true)}
              />
            ) : (
              <div className="profile-picture-default">
                {getDefaultProfileInitials()}
              </div>
            )}
          </div>
          <div className="validator-profile-info">
            <div className="info-item">
              <span className="info-label">Moniker</span>
              <span className="info-value">{validator.moniker}</span>
            </div>
            {validator.identity && (
              <div className="info-item">
                <span className="info-label">Identity</span>
                <span className="info-value">{validator.identity}</span>
              </div>
            )}
          </div>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Operator Address</span>
            <span className="info-value address-value">{validator.operatorAddress}</span>
          </div>
          {validator.website && (
            <div className="info-item">
              <span className="info-label">Website</span>
              <span className="info-value">
                <a href={validator.website} target="_blank" rel="noopener noreferrer">{validator.website}</a>
              </span>
            </div>
          )}
          {validator.details && (
            <div className="info-item">
              <span className="info-label">Details</span>
              <span className="info-value">{validator.details}</span>
            </div>
          )}
        </div>
      </div>

      <div className="info-section">
        <h3>Status</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Status</span>
            <span className="info-value">{getStatusBadge()}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Jailed</span>
            <span className={`info-value ${validator.jailed ? 'status-jailed' : 'status-active'}`}>
              {validator.jailed ? 'Yes' : 'No'}
            </span>
          </div>
          {validator.jailed && validator.slashingInfo?.jailedUntil && (
            <div className="info-item">
              <span className="info-label">Jailed Until</span>
              <span className="info-value">{new Date(validator.slashingInfo.jailedUntil).toLocaleString()}</span>
            </div>
          )}
          {validator.slashingInfo?.tombstoned && (
            <div className="info-item">
              <span className="info-label">Tombstoned</span>
              <span className="info-value status-error">Yes (Validator is permanently banned)</span>
            </div>
          )}
        </div>
      </div>

      <div className="info-section">
        <h3>Staking</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Tokens</span>
            <span className="info-value highlight-value">{tokensFormatted} INJ</span>
          </div>
          <div className="info-item">
            <span className="info-label">Delegator Shares</span>
            <span className="info-value highlight-value">{delegatorSharesFormatted}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Min Self Delegation</span>
            <span className="info-value highlight-value">{minSelfDelegationFormatted} INJ</span>
          </div>
        </div>
      </div>

      <div className="info-section">
        <h3>Commission</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Rate</span>
            <span className="info-value highlight-value">{(parseFloat(validator.commission.rate) * 100).toFixed(2)}%</span>
          </div>
          <div className="info-item">
            <span className="info-label">Max Rate</span>
            <span className="info-value">{(parseFloat(validator.commission.maxRate) * 100).toFixed(2)}%</span>
          </div>
          <div className="info-item">
            <span className="info-label">Max Change Rate</span>
            <span className="info-value">{(parseFloat(validator.commission.maxChangeRate) * 100).toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {orchestrator && (
        <div className="info-section">
          <h3>Orchestrator</h3>
          <div className="info-grid">
            <div className="info-item info-item-full">
              <span className="info-label">Orchestrator Address</span>
              <span className="info-value address-value">{orchestrator.orchestratorAddress}</span>
            </div>
            <div className="info-item info-item-full">
              <span className="info-label">Ethereum Address</span>
              <span className="info-value address-value">{orchestrator.ethereumAddress}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
