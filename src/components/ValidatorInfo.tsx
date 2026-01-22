import { ValidatorInfo as ValidatorInfoType, OrchestratorMapping } from '../types'
import { formatTokenAmount } from '../utils/format'

interface ValidatorInfoProps {
  validator: ValidatorInfoType | null
  orchestrator: OrchestratorMapping | null
  loading: boolean
}

export function ValidatorInfo({ validator, orchestrator, loading }: ValidatorInfoProps) {
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

  return (
    <>
      <div className="info-section" style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
        <h3>Basic Info</h3>
        <p><strong>Moniker:</strong> {validator.moniker}</p>
        <p><strong>Operator Address:</strong> {validator.operatorAddress}</p>
        {validator.identity && <p><strong>Identity:</strong> {validator.identity}</p>}
        {validator.website && <p><strong>Website:</strong> <a href={validator.website} target="_blank" rel="noopener noreferrer">{validator.website}</a></p>}
        {validator.details && <p><strong>Details:</strong> {validator.details}</p>}
      </div>

      <div className="info-section" style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
        <h3>Status</h3>
        <p><strong>Status:</strong> {validator.status}</p>
        <p><strong>Jailed:</strong> {validator.jailed ? 'Yes' : 'No'}</p>
        {validator.jailed && validator.slashingInfo?.jailedUntil && (
          <p><strong>Jailed Until:</strong> {new Date(validator.slashingInfo.jailedUntil).toLocaleString()}</p>
        )}
        {validator.slashingInfo?.tombstoned && (
          <p style={{ color: '#ff6b6b' }}><strong>Tombstoned:</strong> Yes (Validator is permanently banned)</p>
        )}
      </div>

      <div className="info-section" style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
        <h3>Staking</h3>
        <p><strong>Tokens:</strong> {tokensFormatted} INJ</p>
        <p><strong>Delegator Shares:</strong> {delegatorSharesFormatted}</p>
        <p><strong>Min Self Delegation:</strong> {minSelfDelegationFormatted} INJ</p>
      </div>

      <div className="info-section" style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
        <h3>Commission</h3>
        <p><strong>Rate:</strong> {(parseFloat(validator.commission.rate) * 100).toFixed(2)}%</p>
        <p><strong>Max Rate:</strong> {(parseFloat(validator.commission.maxRate) * 100).toFixed(2)}%</p>
        <p><strong>Max Change Rate:</strong> {(parseFloat(validator.commission.maxChangeRate) * 100).toFixed(2)}%</p>
      </div>

      {orchestrator && (
        <div className="info-section" style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
          <h3>Orchestrator</h3>
          <p style={{ marginTop: '0.5rem' }}>
            <strong>Orchestrator Address:</strong>
            <br />
            <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{orchestrator.orchestratorAddress}</span>
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            <strong>Ethereum Address:</strong>
            <br />
            <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{orchestrator.ethereumAddress}</span>
          </p>
        </div>
      )}
    </>
  )
}
