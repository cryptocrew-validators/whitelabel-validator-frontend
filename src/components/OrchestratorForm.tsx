import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { orchestratorRegistrationSchema, OrchestratorRegistrationFormData } from '../utils/validation'
import { useChain } from '@cosmos-kit/react'
import { toValidatorOperatorAddress } from '../utils/address'
import { useEffect } from 'react'

interface OrchestratorFormProps {
  onSubmit: (data: OrchestratorRegistrationFormData) => Promise<void>
  isSubmitting: boolean
}

export function OrchestratorForm({ onSubmit, isSubmitting }: OrchestratorFormProps) {
  const { address } = useChain('injective')
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<OrchestratorRegistrationFormData>({
    resolver: zodResolver(orchestratorRegistrationSchema),
  })

  // Derive validator operator address from connected wallet (same as createValidatorTransaction)
  useEffect(() => {
    if (address) {
      const validatorAddress = toValidatorOperatorAddress(address)
      setValue('validatorAddress', validatorAddress)
    }
  }, [address, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="orchestrator-form">
      <h2>Register Orchestrator Address</h2>
      
      <div className="warning-box">
        <strong>⚠️ WARNING: This operation is IRREVERSIBLE</strong>
        <p>Once you register the orchestrator address and Ethereum address, you cannot change them. Please verify all addresses are correct before submitting.</p>
      </div>

      <div className="form-section">
        <h3>Orchestrator Addresses</h3>
        
        <div className="form-group">
        <label>
          Validator Operator Address:
          <input
            {...register('validatorAddress')}
            type="text"
            placeholder="injvaloper1..."
            readOnly
            style={{ backgroundColor: '#2a2a2a', cursor: 'not-allowed', color: '#fff' }}
          />
          <small>Derived from your connected wallet address</small>
        </label>
        {errors.validatorAddress && (
          <span className="error">{errors.validatorAddress.message}</span>
        )}
      </div>

      <div className="form-group">
        <label>
          Orchestrator Injective Address:
          <input
            {...register('orchestratorAddress')}
            type="text"
            placeholder="inj1..."
          />
          <small>Can be the same as validator address or a separate address</small>
        </label>
        {errors.orchestratorAddress && (
          <span className="error">{errors.orchestratorAddress.message}</span>
        )}
      </div>

      <div className="form-group">
        <label>
          Ethereum Address:
          <input
            {...register('ethereumAddress')}
            type="text"
            placeholder="0x..."
          />
        </label>
        {errors.ethereumAddress && (
          <span className="error">{errors.ethereumAddress.message}</span>
        )}
        </div>
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Register Orchestrator'}
      </button>
    </form>
  )
}
