import { ValidatorInfo as ValidatorInfoType, OrchestratorMapping } from '../types'

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

  return (
    <div className="validator-info">
      <h2>Validator Information</h2>
      
      <div className="info-section">
        <h3>Basic Info</h3>
        <p><strong>Moniker:</strong> {validator.moniker}</p>
        <p><strong>Operator Address:</strong> {validator.operatorAddress}</p>
        <p><strong>Status:</strong> {validator.status}</p>
        {validator.identity && <p><strong>Identity:</strong> {validator.identity}</p>}
        {validator.website && <p><strong>Website:</strong> <a href={validator.website} target="_blank" rel="noopener noreferrer">{validator.website}</a></p>}
        {validator.details && <p><strong>Details:</strong> {validator.details}</p>}
      </div>

      <div className="info-section">
        <h3>Staking</h3>
        <p><strong>Tokens:</strong> {validator.tokens} INJ</p>
        <p><strong>Delegator Shares:</strong> {validator.delegatorShares}</p>
        <p><strong>Min Self Delegation:</strong> {validator.minSelfDelegation} INJ</p>
      </div>

      <div className="info-section">
        <h3>Commission</h3>
        <p><strong>Rate:</strong> {(parseFloat(validator.commission.rate) * 100).toFixed(2)}%</p>
        <p><strong>Max Rate:</strong> {(parseFloat(validator.commission.maxRate) * 100).toFixed(2)}%</p>
        <p><strong>Max Change Rate:</strong> {(parseFloat(validator.commission.maxChangeRate) * 100).toFixed(2)}%</p>
      </div>

      {orchestrator && (
        <div className="info-section">
          <h3>Orchestrator</h3>
          <p><strong>Orchestrator Address:</strong> {orchestrator.orchestratorAddress}</p>
          <p><strong>Ethereum Address:</strong> {orchestrator.ethereumAddress}</p>
        </div>
      )}
    </div>
  )
}
