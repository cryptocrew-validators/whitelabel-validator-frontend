import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { delegationSchema, DelegationFormData } from '../utils/validation'
import { DelegationInfo, ValidatorInfo } from '../types'

interface UndelegateFormProps {
  validatorAddress: string
  onSubmit: (data: DelegationFormData) => Promise<void>
  isSubmitting: boolean
  currentDelegation: DelegationInfo | null
  validator: ValidatorInfo | null
}

export function UndelegateForm({ validatorAddress, onSubmit, isSubmitting, currentDelegation, validator }: UndelegateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    control,
  } = useForm<DelegationFormData>({
    resolver: zodResolver(delegationSchema),
  })

  // Pre-fill validator address
  setValue('validatorAddress', validatorAddress)

  // Watch the amount field to check for min-self-delegation violation
  const amount = useWatch({ control, name: 'amount' })

  const handleMaxClick = () => {
    if (currentDelegation && currentDelegation.balance && validator) {
      // Calculate max undelegation: current delegation - min self delegation
      const currentDelegationInInj = parseFloat(currentDelegation.balance.amount) / 1e18
      const minSelfDelegationInInj = parseFloat(validator.minSelfDelegation) / 1e18
      const maxUndelegation = Math.max(0, currentDelegationInInj - minSelfDelegationInInj)
      setValue('amount', maxUndelegation.toFixed(4))
    } else if (currentDelegation && currentDelegation.balance) {
      // If no validator info, just use current delegation
      const balanceInInj = parseFloat(currentDelegation.balance.amount) / 1e18
      setValue('amount', balanceInInj.toFixed(4))
    }
  }

  // Get current delegation amount in INJ
  const currentDelegationInInj = currentDelegation && currentDelegation.balance
    ? (parseFloat(currentDelegation.balance.amount) / 1e18).toFixed(4)
    : '0.0000'

  // Calculate min self delegation in INJ
  const minSelfDelegationInInj = validator
    ? (parseFloat(validator.minSelfDelegation) / 1e18).toFixed(4)
    : '0.0000'

  // Calculate maximum allowed undelegation
  const maxUndelegationInInj = currentDelegation && validator
    ? Math.max(0, parseFloat(currentDelegationInInj) - parseFloat(minSelfDelegationInInj)).toFixed(4)
    : currentDelegationInInj

  // Check if the entered amount would violate min-self-delegation
  const amountValue = amount ? parseFloat(amount) : 0
  const wouldViolateMinSelfDelegation = currentDelegation && validator && amountValue > 0
    ? (parseFloat(currentDelegationInInj) - amountValue) < parseFloat(minSelfDelegationInInj)
    : false

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="undelegate-form">
      <h3>Undelegate</h3>

      <div className="form-group">
        <label>
          Validator Address:
          <input
            {...register('validatorAddress')}
            type="text"
            disabled
          />
        </label>
        {errors.validatorAddress && (
          <span className="error">{errors.validatorAddress.message}</span>
        )}
      </div>

      <div className="form-group">
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Amount (INJ):</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <span style={{ color: '#aaa' }}>Delegated: {currentDelegationInInj} INJ</span>
            <button
              type="button"
              onClick={handleMaxClick}
              disabled={!currentDelegation || parseFloat(currentDelegationInInj) === 0}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                backgroundColor: currentDelegation && parseFloat(currentDelegationInInj) > 0 ? '#4a9eff' : '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentDelegation && parseFloat(currentDelegationInInj) > 0 ? 'pointer' : 'not-allowed',
                opacity: currentDelegation && parseFloat(currentDelegationInInj) > 0 ? 1 : 0.5,
              }}
            >
              Max
            </button>
          </div>
        </label>
        <input {...register('amount')} type="number" step="0.001" min="0" />
        {errors.amount && (
          <span className="error">{errors.amount.message}</span>
        )}
        {wouldViolateMinSelfDelegation && (
          <div style={{ 
            marginTop: '0.5rem', 
            padding: '0.75rem', 
            backgroundColor: '#ff6b6b20', 
            border: '1px solid #ff6b6b', 
            borderRadius: '4px',
            color: '#ff6b6b'
          }}>
            <strong>⚠️ Warning:</strong> Unbonding this amount would violate the minimum self-delegation requirement.
            <br /><br />
            Current self-delegation: {currentDelegationInInj} INJ
            <br />
            Minimum self-delegation: {minSelfDelegationInInj} INJ
            <br />
            Maximum allowed undelegation: {maxUndelegationInInj} INJ
            <br /><br />
            <strong>If you proceed, the validator will be jailed.</strong>
          </div>
        )}
      </div>

      <button type="submit" disabled={isSubmitting || wouldViolateMinSelfDelegation}>
        {isSubmitting ? 'Submitting...' : 'Undelegate'}
      </button>
    </form>
  )
}
