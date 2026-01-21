import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { delegationSchema, DelegationFormData } from '../utils/validation'

interface UndelegateFormProps {
  validatorAddress: string
  onSubmit: (data: DelegationFormData) => Promise<void>
  isSubmitting: boolean
}

export function UndelegateForm({ validatorAddress, onSubmit, isSubmitting }: UndelegateFormProps) {
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
        <label>
          Amount (INJ):
          <input {...register('amount')} type="number" step="0.001" min="0" />
        </label>
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
