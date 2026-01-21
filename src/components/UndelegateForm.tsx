import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { delegationSchema, DelegationFormData } from '../utils/validation'
import { DelegationInfo } from '../types'

interface UndelegateFormProps {
  validatorAddress: string
  onSubmit: (data: DelegationFormData) => Promise<void>
  isSubmitting: boolean
  currentDelegation: DelegationInfo | null
}

export function UndelegateForm({ validatorAddress, onSubmit, isSubmitting, currentDelegation }: UndelegateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<DelegationFormData>({
    resolver: zodResolver(delegationSchema),
  })

  // Pre-fill validator address
  setValue('validatorAddress', validatorAddress)

  const handleMaxClick = () => {
    if (currentDelegation && currentDelegation.balance) {
      // Convert balance from base units (1e18) to INJ
      const balanceInInj = parseFloat(currentDelegation.balance.amount) / 1e18
      setValue('amount', balanceInInj.toFixed(4))
    }
  }

  // Get current delegation amount in INJ
  const currentDelegationInInj = currentDelegation && currentDelegation.balance
    ? (parseFloat(currentDelegation.balance.amount) / 1e18).toFixed(4)
    : '0.0000'

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
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Undelegate'}
      </button>
    </form>
  )
}
