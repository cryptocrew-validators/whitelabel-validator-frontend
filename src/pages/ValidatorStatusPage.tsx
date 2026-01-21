import { useState, useEffect } from 'react'
import { useChain } from '@cosmos-kit/react'
import { ValidatorInfo } from '../components/ValidatorInfo'
import { ValidatorInfo as ValidatorInfoType, OrchestratorMapping } from '../types'
import { QueryService } from '../services/queries'
import { useNetwork } from '../contexts/NetworkContext'
import { toValidatorOperatorAddress } from '../utils/address'

export default function ValidatorStatusPage() {
  const { address } = useChain('injective')
  const { network } = useNetwork()
  const [validator, setValidator] = useState<ValidatorInfoType | null>(null)
  const [orchestrator, setOrchestrator] = useState<OrchestratorMapping | null>(null)
  const [loading, setLoading] = useState(false)
  const [validatorAddress, setValidatorAddress] = useState<string>('')

  useEffect(() => {
    if (address) {
      loadValidator()
    }
  }, [address, network])

  const loadValidator = async () => {
    if (!address) return
    
    setLoading(true)
    try {
      const queryService = new QueryService(network)
      // Derive validator operator address from wallet account (same as createValidatorTransaction)
      const derivedValidatorAddress = toValidatorOperatorAddress(address)
      const [validatorInfo, orchestratorInfo] = await Promise.all([
        queryService.getValidator(derivedValidatorAddress),
        queryService.getOrchestratorMapping(derivedValidatorAddress),
      ])
      
      if (validatorInfo) {
        setValidator(validatorInfo)
        setValidatorAddress(derivedValidatorAddress)
      } else {
        setValidator(null)
        setValidatorAddress('')
      }
      setOrchestrator(orchestratorInfo)
    } catch (error) {
      console.error('Failed to load validator info:', error)
      setValidator(null)
      setValidatorAddress('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <h1>Validator Status</h1>
      
      {!address ? (
        <div className="error-message">
          Please connect your wallet to view validator status.
        </div>
      ) : loading ? (
        <div>Loading validator information...</div>
      ) : !validator ? (
        <div className="error-message">
          No validator found for the connected wallet. Please ensure you're connected with a validator operator wallet that has registered a validator.
        </div>
      ) : (
        <>
          <div className="info-section" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
            <h3>Validator Operator Address</h3>
            <p style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{validator.operatorAddress}</p>
          </div>
          <ValidatorInfo
            validator={validator}
            orchestrator={orchestrator}
            loading={false}
          />
        </>
      )}
    </div>
  )
}
