import { 
  ValidatorRegistrationFormData,
  OrchestratorRegistrationFormData,
  ValidatorEditFormData,
  DelegationFormData,
} from '../utils/validation'
import type { StdFee } from '@interchainjs/types'
import type { EncodeObject } from '@cosmjs/proto-signing'
import { toValidatorOperatorAddress } from '../utils/address'

// Helper functions to create messages and fees for Cosmos Kit's signAndBroadcast
export function createValidatorMessage(
  address: string,
  data: ValidatorRegistrationFormData,
  _chainId: string
): { msg: EncodeObject; fee: StdFee } {
  // Convert consensus pubkey to proper format
  // Injective uses ed25519 for consensus keys
  let pubkeyBytes: Uint8Array
  try {
    pubkeyBytes = Uint8Array.from(atob(data.consensusPubkey), c => c.charCodeAt(0))
    if (pubkeyBytes.length !== 32) {
      throw new Error('Invalid ed25519 pubkey length. Expected 32 bytes.')
    }
  } catch (error) {
    throw new Error('Failed to decode consensus pubkey. Please ensure it is valid base64-encoded ed25519 key.')
  }

  const consensusPubkey = {
    typeUrl: '/cosmos.crypto.ed25519.PubKey',
    value: pubkeyBytes,
  }

  // Validate amounts
  const selfDelegationAmount = parseFloat(data.selfDelegation)
  const minSelfDelegationAmount = parseFloat(data.minSelfDelegation)
  
  if (isNaN(selfDelegationAmount) || selfDelegationAmount <= 0) {
    throw new Error('Self delegation amount must be a positive number')
  }
  
  if (isNaN(minSelfDelegationAmount) || minSelfDelegationAmount <= 0) {
    throw new Error('Min self delegation must be a positive number')
  }
  
  if (selfDelegationAmount < minSelfDelegationAmount) {
    throw new Error('Self delegation amount must be at least the minimum self delegation')
  }

  // Convert INJ amounts to base units (1 INJ = 10^18 base units)
  const selfDelegationBase = Math.floor(selfDelegationAmount * 1e18).toString()
  const minSelfDelegationBase = Math.floor(minSelfDelegationAmount * 1e18).toString()

  // Convert commission rates from percentage to decimal (0-100% -> 0-1)
  const commissionRate = (parseFloat(data.commissionRate) / 100).toFixed(18)
  const maxCommissionRate = (parseFloat(data.maxCommissionRate) / 100).toFixed(18)
  const maxCommissionChangeRate = (parseFloat(data.maxCommissionChangeRate) / 100).toFixed(18)

  const validatorAddress = toValidatorOperatorAddress(address)

  const msg: EncodeObject = {
    typeUrl: '/cosmos.staking.v1beta1.MsgCreateValidator',
    value: {
      description: {
        moniker: data.moniker,
        identity: data.identity || '',
        website: data.website || '',
        securityContact: data.securityContact || '',
        details: data.details || '',
      },
      commission: {
        rate: commissionRate,
        maxRate: maxCommissionRate,
        maxChangeRate: maxCommissionChangeRate,
      },
      minSelfDelegation: minSelfDelegationBase,
      delegatorAddress: address,
      validatorAddress,
      pubkey: consensusPubkey,
      value: {
        denom: 'inj',
        amount: selfDelegationBase,
      },
    },
  }

  const fee: StdFee = {
    amount: [{ denom: 'inj', amount: '500000000000000000' }], // 0.5 INJ
    gas: '200000',
  }

  return { msg, fee }
}

export function createOrchestratorMessage(
  address: string,
  data: OrchestratorRegistrationFormData,
  _chainId: string
): { msg: EncodeObject; fee: StdFee } {
  // Validate that the signer is the validator operator
  if (!address.toLowerCase().includes(data.validatorAddress.toLowerCase().substring(0, 10))) {
    throw new Error('The connected wallet must be the validator operator address')
  }

  const msg: EncodeObject = {
    typeUrl: '/injective.peggy.v1.MsgSetOrchestratorAddress',
    value: {
      validator: data.validatorAddress,
      orchestrator: data.orchestratorAddress,
      ethereum: data.ethereumAddress,
    },
  }

  const fee: StdFee = {
    amount: [{ denom: 'inj', amount: '500000000000000000' }], // 0.5 INJ
    gas: '200000',
  }

  return { msg, fee }
}

// Keep the old async functions for backward compatibility, but they now use DirectSigner
// These are kept in case we need to fall back to DirectSigner for Injective-specific handling
import { DirectSigner } from '@interchainjs/cosmos'
import { PubKey as Ed25519PubKey } from '@interchainjs/cosmos-types/cosmos/crypto/ed25519/keys'
import { Any } from '@interchainjs/cosmos-types/google/protobuf/any'

export async function createValidatorTransaction(
  signer: DirectSigner,
  address: string,
  data: ValidatorRegistrationFormData,
  _chainId: string
) {
  try {
    // Convert consensus pubkey to proper format
    // Injective uses ed25519 for consensus keys
    let pubkeyBytes: Uint8Array
    try {
      pubkeyBytes = Uint8Array.from(atob(data.consensusPubkey), c => c.charCodeAt(0))
      if (pubkeyBytes.length !== 32) {
        throw new Error('Invalid ed25519 pubkey length. Expected 32 bytes.')
      }
    } catch (error) {
      throw new Error('Failed to decode consensus pubkey. Please ensure it is valid base64-encoded ed25519 key.')
    }

    // Pack ed25519 consensus pubkey into Any (following the example pattern)
    const pubkeyMessage = Ed25519PubKey.fromPartial({ key: pubkeyBytes })
    const encodedPubkey = Ed25519PubKey.encode(pubkeyMessage).finish()
    
    // Wrap in Any type for MsgCreateValidator (using fromPartial like the example)
    const consensusPubkey = Any.fromPartial({
      typeUrl: '/cosmos.crypto.ed25519.PubKey',
      value: encodedPubkey,
    })

    // Validate amounts
    const selfDelegationAmount = parseFloat(data.selfDelegation)
    const minSelfDelegationAmount = parseFloat(data.minSelfDelegation)
    
    if (isNaN(selfDelegationAmount) || selfDelegationAmount <= 0) {
      throw new Error('Self delegation amount must be a positive number')
    }
    
    if (isNaN(minSelfDelegationAmount) || minSelfDelegationAmount <= 0) {
      throw new Error('Min self delegation must be a positive number')
    }
    
    if (selfDelegationAmount < minSelfDelegationAmount) {
      throw new Error('Self delegation amount must be at least the minimum self delegation')
    }

    // Convert INJ amounts to base units (1 INJ = 10^18 base units)
    const selfDelegationBase = Math.floor(selfDelegationAmount * 1e18).toString()
    const minSelfDelegationBase = Math.floor(minSelfDelegationAmount * 1e18).toString()

    // Convert commission rates from percentage to decimal (0-100% -> 0-1)
    const commissionRate = (parseFloat(data.commissionRate) / 100).toFixed(18)
    const maxCommissionRate = (parseFloat(data.maxCommissionRate) / 100).toFixed(18)
    const maxCommissionChangeRate = (parseFloat(data.maxCommissionChangeRate) / 100).toFixed(18)

    // Build MsgCreateValidator
    // The DirectSigner will encode this using the registered encoders
    const validatorAddress = toValidatorOperatorAddress(address)

    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgCreateValidator',
      value: {
        description: {
          moniker: data.moniker,
          identity: data.identity || '',
          website: data.website || '',
          securityContact: data.securityContact || '',
          details: data.details || '',
        },
        commission: {
          rate: commissionRate,
          maxRate: maxCommissionRate,
          maxChangeRate: maxCommissionChangeRate,
        },
        minSelfDelegation: minSelfDelegationBase,
        delegatorAddress: address,
        validatorAddress,
        pubkey: consensusPubkey,
        value: {
          denom: 'inj',
          amount: selfDelegationBase,
        },
      },
    }

    const fee: StdFee = {
      amount: [{ denom: 'inj', amount: '500000000000000000' }], // 0.5 INJ
      gas: '200000',
    }

    // Log the message structure before signing for debugging
    console.log('Message to sign:', JSON.stringify(msg, null, 2))
    
    // Use signAndBroadcast with explicit broadcast options
    // Try 'async' mode first, which is more reliable for RPC endpoints
    const result = await signer.signAndBroadcast(
      {
        messages: [msg],
        fee,
      },
      {
        mode: 'async', // Use async mode for better RPC compatibility
      }
    )
    
    // Return the result which includes transactionHash
    return result
  } catch (error: any) {
    // Enhance error messages
    const errorMsg = error?.message || String(error) || ''
    
    // Check if user rejected the transaction
    if (errorMsg.includes('Request rejected') || errorMsg.includes('User rejected')) {
      throw new Error('Transaction was rejected. Please approve the transaction in your wallet.')
    }
    
    // Check for specific blockchain errors
    if (errorMsg.includes('insufficient funds')) {
      throw new Error('Insufficient balance. Please ensure you have enough INJ for self-delegation and transaction fees.')
    }
    if (errorMsg.includes('validator already exists')) {
      throw new Error('A validator with this operator address already exists.')
    }
    if (errorMsg.includes('invalid pubkey')) {
      throw new Error('Invalid consensus pubkey format. Please verify the pubkey is correct.')
    }
    
    // For RPC errors, provide helpful message
    // The transaction might have been signed but broadcast failed
    if (errorMsg.includes('RPC Error') || errorMsg.includes('Internal error')) {
      // Log full error details for debugging
      console.error('RPC Error details:', {
        message: error?.message,
        code: error?.code,
        data: error?.data,
        response: error?.response,
        stack: error?.stack,
        // Try to extract more details from nested errors
        cause: error?.cause,
        // Check for transaction hash in various places
        txHash: error?.txHash,
        transactionHash: error?.transactionHash,
      })
      
      // Try to extract more detailed error message from response
      let detailedError = errorMsg
      if (error?.response?.data) {
        try {
          const responseData = typeof error.response.data === 'string' 
            ? JSON.parse(error.response.data) 
            : error.response.data
          detailedError = responseData?.message || responseData?.error || detailedError
          console.error('RPC Response data:', responseData)
        } catch (e) {
          console.error('RPC Response data (raw):', error.response.data)
        }
      }
      
      // Check if error has transaction hash (some errors include it)
      const txHashMatch = errorMsg.match(/0x[a-fA-F0-9]{64}/) || 
                         error?.txHash || 
                         error?.transactionHash ||
                         error?.data?.txHash
      if (txHashMatch) {
        throw new Error(
          `Transaction signed and broadcast, but RPC returned an error. ` +
          `Transaction hash: ${txHashMatch}. ` +
          `Please check your wallet or explorer to confirm the transaction status. ` +
          `Error: ${detailedError}`
        )
      }
      throw new Error(
        `RPC endpoint error during broadcast. ` +
        `The transaction may have been signed successfully. ` +
        `Please check your wallet transaction history or try again. ` +
        `Error: ${detailedError} ` +
        `(Code: ${error?.code || 'unknown'})`
      )
    }
    
    // Re-throw other errors as-is
    throw error
  }
}

export async function registerOrchestratorTransaction(
  signer: DirectSigner,
  address: string,
  data: OrchestratorRegistrationFormData,
  _chainId: string
) {
  try {
    // Validate that the signer is the validator operator
    if (!address.toLowerCase().includes(data.validatorAddress.toLowerCase().substring(0, 10))) {
      throw new Error('The connected wallet must be the validator operator address')
    }

    // MsgSetOrchestratorAddress from Peggy module
    // Note: This message type may need to be imported from Injective SDK
    const msg = {
      typeUrl: '/injective.peggy.v1.MsgSetOrchestratorAddress',
      value: {
        validator: data.validatorAddress,
        orchestrator: data.orchestratorAddress,
        ethereum: data.ethereumAddress,
      },
    }

    const fee: StdFee = {
      amount: [{ denom: 'inj', amount: '500000000000000000' }], // 0.5 INJ
      gas: '200000',
    }

    return await signer.signAndBroadcast({
      messages: [msg],
      fee,
    })
  } catch (error: any) {
    // Enhance error messages
    const errorMsg = error?.message || String(error) || ''
    if (errorMsg.includes('Request rejected') || errorMsg.includes('User rejected')) {
      throw new Error('Transaction was rejected. Please approve the transaction in your wallet.')
    }
    if (errorMsg.includes('insufficient funds')) {
      throw new Error('Insufficient balance. Please ensure you have enough INJ for transaction fees.')
    }
    if (errorMsg.includes('orchestrator address already set')) {
      throw new Error('Orchestrator address has already been registered and cannot be changed.')
    }
    if (errorMsg.includes('unauthorized')) {
      throw new Error('You are not authorized to register orchestrator for this validator.')
    }
    if (errorMsg.includes('RPC Error') || errorMsg.includes('Internal error')) {
      throw new Error('RPC endpoint error during broadcast. The transaction may have been signed successfully. Please check your wallet transaction history or try again.')
    }
    throw error
  }
}

export async function editValidatorTransaction(
  signer: DirectSigner,
  _address: string,
  data: ValidatorEditFormData,
  validatorAddress: string,
  _chainId: string
) {
  try {
    // Validate and convert commission rate if provided (percentage to decimal)
    let commissionRate: string | undefined
    if (data.commissionRate !== undefined) {
      const ratePercent = parseFloat(data.commissionRate)
      if (isNaN(ratePercent) || ratePercent < 0 || ratePercent > 100) {
        throw new Error('Commission rate must be between 0 and 100%')
      }
      commissionRate = (ratePercent / 100).toFixed(18)
    }

    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgEditValidator',
      value: {
        description: {
          moniker: data.moniker,
          identity: data.identity || '',
          website: data.website || '',
          securityContact: data.securityContact || '',
          details: data.details || '',
        },
        commissionRate: commissionRate,
        validatorAddress: validatorAddress,
      },
    }

    const fee: StdFee = {
      amount: [{ denom: 'inj', amount: '500000000000000000' }],
      gas: '200000',
    }

    return await signer.signAndBroadcast({
      messages: [msg],
      fee,
    })
  } catch (error: any) {
    // Enhance error messages
    const errorMsg = error?.message || String(error) || ''
    if (errorMsg.includes('Request rejected') || errorMsg.includes('User rejected')) {
      throw new Error('Transaction was rejected. Please approve the transaction in your wallet.')
    }
    if (errorMsg.includes('insufficient funds')) {
      throw new Error('Insufficient balance. Please ensure you have enough INJ for transaction fees.')
    }
    if (errorMsg.includes('commission rate change too high')) {
      throw new Error('Commission rate change exceeds the maximum allowed change rate.')
    }
    if (errorMsg.includes('unauthorized')) {
      throw new Error('You are not authorized to edit this validator.')
    }
    if (errorMsg.includes('RPC Error') || errorMsg.includes('Internal error')) {
      throw new Error('RPC endpoint error during broadcast. The transaction may have been signed successfully. Please check your wallet transaction history or try again.')
    }
    throw error
  }
}

export async function delegateTransaction(
  signer: DirectSigner,
  address: string,
  data: DelegationFormData,
  _chainId: string
) {
  try {
    // Validate amount
    const amount = parseFloat(data.amount)
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Delegation amount must be a positive number')
    }

    // Convert INJ amount to base units (1 INJ = 10^18 base units)
    const amountBase = Math.floor(amount * 1e18).toString()

    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
      value: {
        delegatorAddress: address,
        validatorAddress: data.validatorAddress,
        amount: {
          denom: 'inj',
          amount: amountBase,
        },
      },
    }

    const fee: StdFee = {
      amount: [{ denom: 'inj', amount: '500000000000000000' }],
      gas: '200000',
    }

    return await signer.signAndBroadcast({
      messages: [msg],
      fee,
    })
  } catch (error: any) {
    // Enhance error messages
    const errorMsg = error?.message || String(error) || ''
    if (errorMsg.includes('Request rejected') || errorMsg.includes('User rejected')) {
      throw new Error('Transaction was rejected. Please approve the transaction in your wallet.')
    }
    if (errorMsg.includes('insufficient funds')) {
      throw new Error('Insufficient balance. Please ensure you have enough INJ for delegation and transaction fees.')
    }
    if (errorMsg.includes('validator not found')) {
      throw new Error('Validator not found. Please verify the validator address is correct.')
    }
    if (errorMsg.includes('RPC Error') || errorMsg.includes('Internal error')) {
      throw new Error('RPC endpoint error during broadcast. The transaction may have been signed successfully. Please check your wallet transaction history or try again.')
    }
    throw error
  }
}

export async function undelegateTransaction(
  signer: DirectSigner,
  address: string,
  data: DelegationFormData,
  _chainId: string
) {
  try {
    // Validate amount
    const amount = parseFloat(data.amount)
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Undelegation amount must be a positive number')
    }

    // Convert INJ amount to base units (1 INJ = 10^18 base units)
    const amountBase = Math.floor(amount * 1e18).toString()

    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
      value: {
        delegatorAddress: address,
        validatorAddress: data.validatorAddress,
        amount: {
          denom: 'inj',
          amount: amountBase,
        },
      },
    }

    const fee: StdFee = {
      amount: [{ denom: 'inj', amount: '500000000000000000' }],
      gas: '200000',
    }

    return await signer.signAndBroadcast({
      messages: [msg],
      fee,
    })
  } catch (error: any) {
    // Enhance error messages
    const errorMsg = error?.message || String(error) || ''
    if (errorMsg.includes('Request rejected') || errorMsg.includes('User rejected')) {
      throw new Error('Transaction was rejected. Please approve the transaction in your wallet.')
    }
    if (errorMsg.includes('insufficient funds')) {
      throw new Error('Insufficient balance. Please ensure you have enough INJ for transaction fees.')
    }
    if (errorMsg.includes('insufficient delegation')) {
      throw new Error('Insufficient delegation. You cannot undelegate more than you have delegated.')
    }
    if (errorMsg.includes('validator not found')) {
      throw new Error('Validator not found. Please verify the validator address is correct.')
    }
    if (errorMsg.includes('RPC Error') || errorMsg.includes('Internal error')) {
      throw new Error('RPC endpoint error during broadcast. The transaction may have been signed successfully. Please check your wallet transaction history or try again.')
    }
    throw error
  }
}
