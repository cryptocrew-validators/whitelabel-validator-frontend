import { z } from 'zod'
import { isValidInjectiveAddress, isValidEthereumAddress, isValidValidatorOperatorAddress } from './address'
import { isValidEd25519Pubkey } from './pubkey'

export const consensusPubkeySchema = z.string().refine(
  (val) => isValidEd25519Pubkey(val),
  { message: 'Invalid ed25519 consensus pubkey format' }
)

export const injectiveAddressSchema = z.string().refine(
  (val) => isValidInjectiveAddress(val),
  { message: 'Invalid Injective address format' }
)

export const validatorOperatorAddressSchema = z.string().refine(
  (val) => isValidValidatorOperatorAddress(val),
  { message: 'Invalid validator operator address format' }
)

export const ethereumAddressSchema = z.string().refine(
  (val) => isValidEthereumAddress(val),
  { message: 'Invalid Ethereum address format' }
)

export const amountSchema = z.string().refine(
  (val) => {
    const num = parseFloat(val)
    return !isNaN(num) && num > 0
  },
  { message: 'Amount must be a positive number' }
)

export const commissionRateSchema = z.string().refine(
  (val) => {
    const num = parseFloat(val)
    return !isNaN(num) && num >= 0 && num <= 100
  },
  { message: 'Commission rate must be between 0 and 100%' }
)

export const validatorRegistrationSchema = z.object({
  consensusPubkey: consensusPubkeySchema,
  moniker: z.string().min(1, 'Moniker is required'),
  identity: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  securityContact: z.string().email('Invalid email').optional().or(z.literal('')),
  details: z.string().optional(),
  commissionRate: commissionRateSchema,
  maxCommissionRate: commissionRateSchema,
  maxCommissionChangeRate: commissionRateSchema,
  minSelfDelegation: amountSchema,
  selfDelegation: amountSchema,
})

export const orchestratorRegistrationSchema = z.object({
  validatorAddress: validatorOperatorAddressSchema,
  orchestratorAddress: injectiveAddressSchema,
  ethereumAddress: ethereumAddressSchema,
})

export const validatorEditSchema = z.object({
  moniker: z.string().min(1, 'Moniker is required'),
  identity: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  securityContact: z.string().email('Invalid email').optional().or(z.literal('')),
  details: z.string().optional(),
  commissionRate: commissionRateSchema.optional(),
})

export const delegationSchema = z.object({
  validatorAddress: validatorOperatorAddressSchema,
  amount: amountSchema,
})

export type ValidatorRegistrationFormData = z.infer<typeof validatorRegistrationSchema>
export type OrchestratorRegistrationFormData = z.infer<typeof orchestratorRegistrationSchema>
export type ValidatorEditFormData = z.infer<typeof validatorEditSchema>
export type DelegationFormData = z.infer<typeof delegationSchema>
