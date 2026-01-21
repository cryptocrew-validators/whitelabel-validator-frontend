import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { validatorRegistrationSchema, ValidatorRegistrationFormData } from '../utils/validation'
import { useDeeplinkPubkey } from './DeeplinkHandler'

interface ValidatorRegistrationFormProps {
  onSubmit: (data: ValidatorRegistrationFormData) => Promise<void>
  isSubmitting: boolean
}

export function ValidatorRegistrationForm({ onSubmit, isSubmitting }: ValidatorRegistrationFormProps) {
  const { pubkey: deeplinkPubkey, error: deeplinkError } = useDeeplinkPubkey()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ValidatorRegistrationFormData>({
    resolver: zodResolver(validatorRegistrationSchema),
    defaultValues: {
      commissionRate: '10',
      maxCommissionRate: '20',
      maxCommissionChangeRate: '1',
      minSelfDelegation: '1',
    },
  })

  // Pre-fill pubkey from deeplink
  if (deeplinkPubkey) {
    setValue('consensusPubkey', deeplinkPubkey)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="validator-registration-form">
      <h2>Register Validator</h2>
      
      {deeplinkError && (
        <div className="error-message">
          Deeplink error: {deeplinkError}
        </div>
      )}

      <div className="form-group">
        <label>
          Consensus Pubkey (ed25519, base64):
          <input
            {...register('consensusPubkey')}
            type="text"
            placeholder="Base64-encoded ed25519 pubkey"
            disabled={!!deeplinkPubkey}
          />
          {deeplinkPubkey && (
            <small>Pre-filled from deeplink</small>
          )}
        </label>
        {errors.consensusPubkey && (
          <span className="error">{errors.consensusPubkey.message}</span>
        )}
      </div>

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

      <div className="form-group">
        <label>
          Commission Rate (%):
          <input {...register('commissionRate')} type="number" step="0.1" min="0" max="100" />
        </label>
        {errors.commissionRate && (
          <span className="error">{errors.commissionRate.message}</span>
        )}
      </div>

      <div className="form-group">
        <label>
          Max Commission Rate (%):
          <input {...register('maxCommissionRate')} type="number" step="0.1" min="0" max="100" />
        </label>
        {errors.maxCommissionRate && (
          <span className="error">{errors.maxCommissionRate.message}</span>
        )}
      </div>

      <div className="form-group">
        <label>
          Max Commission Change Rate (%):
          <input {...register('maxCommissionChangeRate')} type="number" step="0.1" min="0" max="100" />
        </label>
        {errors.maxCommissionChangeRate && (
          <span className="error">{errors.maxCommissionChangeRate.message}</span>
        )}
      </div>

      <div className="form-group">
        <label>
          Min Self Delegation (INJ):
          <input {...register('minSelfDelegation')} type="number" step="0.001" min="0" />
        </label>
        {errors.minSelfDelegation && (
          <span className="error">{errors.minSelfDelegation.message}</span>
        )}
      </div>

      <div className="form-group">
        <label>
          Self Delegation Amount (INJ):
          <input {...register('selfDelegation')} type="number" step="0.001" min="0" />
        </label>
        {errors.selfDelegation && (
          <span className="error">{errors.selfDelegation.message}</span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Register Validator'}
      </button>
    </form>
  )
}
