import { useState } from 'react'
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
  const [warningDismissed, setWarningDismissed] = useState(false)
  
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
    if (currentDelegation && currentDelegation.balance) {
      // Set to full delegation amount (allow unbonding all)
      const balanceInInj = parseFloat(currentDelegation.balance.amount) / 1e18
      setValue('amount', balanceInInj.toFixed(4))
      setWarningDismissed(false) // Show warning when MAX is clicked
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

      <div className="form-section">
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
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>Delegated: {currentDelegationInInj} INJ</span>
            <button
              type="button"
              onClick={handleMaxClick}
              disabled={!currentDelegation || parseFloat(currentDelegationInInj) === 0}
              className="max-button-link"
            >
              MAX
            </button>
          </span>
        </label>
        <input {...register('amount')} type="number" step="0.001" min="0" />
        {errors.amount && (
          <span className="error">{errors.amount.message}</span>
        )}
        {wouldViolateMinSelfDelegation && !warningDismissed && (
          <div className="warning-box undelegate-warning" style={{ marginTop: '0.75rem', position: 'relative', paddingRight: '2.5rem' }}>
            <button 
              className="transaction-status-close-inline" 
              onClick={() => setWarningDismissed(true)} 
              aria-label="Close"
            >
              ×
            </button>
            <strong>Warning:</strong> Unbonding this amount would violate the minimum self-delegation requirement.
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
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Undelegate'}
      </button>
    </form>
  )
}
