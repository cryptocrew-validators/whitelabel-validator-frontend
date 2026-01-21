import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { delegationSchema, DelegationFormData } from '../utils/validation'

interface DelegateFormProps {
  validatorAddress: string
  onSubmit: (data: DelegationFormData) => Promise<void>
  isSubmitting: boolean
  availableBalance: string
}

export function DelegateForm({ validatorAddress, onSubmit, isSubmitting, availableBalance }: DelegateFormProps) {
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
    // Convert balance from base units (1e18) to INJ, leave some for fees (0.01 INJ)
    const balanceInInj = parseFloat(availableBalance) / 1e18
    const maxAmount = Math.max(0, balanceInInj - 0.01).toFixed(4)
    setValue('amount', maxAmount)
  }

  const availableBalanceInInj = (parseFloat(availableBalance) / 1e18).toFixed(4)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="delegate-form">
      <h3>Delegate</h3>

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
            <span style={{ color: '#aaa' }}>Available: {availableBalanceInInj} INJ</span>
            <button
              type="button"
              onClick={handleMaxClick}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                backgroundColor: '#4a9eff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
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
        {isSubmitting ? 'Submitting...' : 'Delegate'}
      </button>
    </form>
  )
}
