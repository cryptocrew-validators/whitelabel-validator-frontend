import { useState, useEffect } from 'react'
import { useChain } from '@cosmos-kit/react'
import { ValidatorInfo } from '../components/ValidatorInfo'
import { ValidatorInfo as ValidatorInfoType, OrchestratorMapping } from '../types'
import { QueryService } from '../services/queries'
import { useNetwork } from '../contexts/NetworkContext'

export default function ValidatorStatusPage() {
  const { address } = useChain('injective')
  const { network } = useNetwork()
  const [validator, setValidator] = useState<ValidatorInfoType | null>(null)
  const [orchestrator, setOrchestrator] = useState<OrchestratorMapping | null>(null)
  const [loading, setLoading] = useState(false)
  const [validatorAddress, setValidatorAddress] = useState<string>('')

  useEffect(() => {
    if (validatorAddress) {
      loadValidatorInfo()
    }
  }, [validatorAddress, network])

  const loadValidatorInfo = async () => {
    if (!validatorAddress) return
    
    setLoading(true)
    try {
      const queryService = new QueryService(network)
      const [validatorInfo, orchestratorInfo] = await Promise.all([
        queryService.getValidator(validatorAddress),
        queryService.getOrchestratorMapping(validatorAddress),
      ])
      setValidator(validatorInfo)
      setOrchestrator(orchestratorInfo)
    } catch (error) {
      console.error('Failed to load validator info:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <h1>Validator Status</h1>
      
      <div className="form-group">
        <label>
          Validator Operator Address:
          <input
            type="text"
            value={validatorAddress}
            onChange={(e) => setValidatorAddress(e.target.value)}
            placeholder="injvaloper1..."
          />
        </label>
        <button onClick={loadValidatorInfo} disabled={!validatorAddress || loading}>
          {loading ? 'Loading...' : 'Load Validator'}
        </button>
      </div>

      {validatorAddress && (
        <ValidatorInfo
          validator={validator}
          orchestrator={orchestrator}
          loading={loading}
        />
      )}
    </div>
  )
}
