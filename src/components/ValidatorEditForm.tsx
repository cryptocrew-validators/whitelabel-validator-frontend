import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { validatorEditSchema, ValidatorEditFormData } from '../utils/validation'
import { ValidatorInfo } from '../types'

interface ValidatorEditFormProps {
  validator: ValidatorInfo
  onSubmit: (data: ValidatorEditFormData) => Promise<void>
  isSubmitting: boolean
}

export function ValidatorEditForm({ validator, onSubmit, isSubmitting }: ValidatorEditFormProps) {
  // Convert commission rate from decimal (0-1) to percentage (0-100) for display
  const commissionRatePercent = validator.commission.rate 
    ? (parseFloat(validator.commission.rate) * 100).toFixed(2)
    : '0'
  const maxChangeRatePercent = validator.commission.maxChangeRate
    ? (parseFloat(validator.commission.maxChangeRate) * 100).toFixed(2)
    : '0'

  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
  } = useForm<ValidatorEditFormData>({
    resolver: zodResolver(validatorEditSchema),
    defaultValues: {
      moniker: validator.moniker,
      identity: validator.identity,
      website: validator.website,
      securityContact: validator.securityContact,
      details: validator.details,
      commissionRate: commissionRatePercent,
    },
  })

  const handleFormSubmit = (data: ValidatorEditFormData) => {
    const submission: ValidatorEditFormData = {
      ...data,
      commissionRate: dirtyFields.commissionRate ? data.commissionRate : undefined,
    }

    return onSubmit(submission)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="validator-edit-form">
      <div className="form-section">
        <h3>Update Validator Information</h3>
        
        <div className="form-group">
        <label>
          Moniker:
          <input {...register('moniker')} type="text" />
        </label>
        {errors.moniker && (
          <span className="error">{errors.moniker.message}</span>
        )}
      </div>

      <div className="form-group">
        <label>
          Identity (optional):
          <input {...register('identity')} type="text" />
        </label>
        {errors.identity && (
          <span className="error">{errors.identity.message}</span>
        )}
      </div>

      <div className="form-group">
        <label>
          Website (optional):
          <input {...register('website')} type="url" />
        </label>
        {errors.website && (
          <span className="error">{errors.website.message}</span>
        )}
      </div>

      <div className="form-group">
        <label>
          Security Contact (optional):
          <input {...register('securityContact')} type="email" />
        </label>
        {errors.securityContact && (
          <span className="error">{errors.securityContact.message}</span>
        )}
      </div>

      <div className="form-group">
        <label>
          Details (optional):
          <textarea {...register('details')} rows={3} />
        </label>
        {errors.details && (
          <span className="error">{errors.details.message}</span>
        )}
      </div>
      </div>

      <div className="form-section">
        <h3>Update Commission Settings</h3>
        
        <div className="form-group">
          <label>
            Commission Rate (%):
            <input {...register('commissionRate')} type="number" step="0.1" min="0" max="100" />
            <small>Current: {commissionRatePercent}%</small>
            <small>Max change rate: {maxChangeRatePercent}%</small>
          </label>
          {errors.commissionRate && (
            <span className="error">{errors.commissionRate.message}</span>
          )}
        </div>
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Update Validator'}
      </button>
    </form>
  )
}
