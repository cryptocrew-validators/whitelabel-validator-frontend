import { 
  ValidatorRegistrationFormData,
  OrchestratorRegistrationFormData,
  ValidatorEditFormData,
  DelegationFormData,
} from '../utils/validation'
import type { StdFee } from '@interchainjs/types'
import type { EncodeObject } from '@cosmjs/proto-signing'
import { toValidatorOperatorAddress } from '../utils/address'

// Use 'commit' mode to wait for transaction confirmation
const broadcastOptions = { mode: 'commit' as const }
const rpcErrorIndicators = ['RPC Error', 'Internal error']
const GAS_MULTIPLIER = 1.5 // Multiply estimated gas by 1.5 for safety margin

function isRpcErrorMessage(message: string) {
  return rpcErrorIndicators.some((indicator) => message.includes(indicator))
}

function extractRpcErrorDetails(error: any, fallbackMessage: string, rawMessage: string) {
  let detailedError = fallbackMessage
  let code = error?.code
  const responseData = error?.response?.data

  if (responseData) {
    try {
      const parsed = typeof responseData === 'string' ? JSON.parse(responseData) : responseData
      detailedError = parsed?.message || parsed?.error || detailedError
      if (parsed?.code && !code) {
        code = parsed.code
      }
    } catch {
      // Keep fallback message when response data isn't JSON
    }
  }

  if (error?.data?.message) {
    detailedError = error.data.message
  }

  if (error?.cause?.message) {
    detailedError = error.cause.message
  }

  const txHash =
    rawMessage.match(/0x[a-fA-F0-9]{64}/)?.[0] ||
    error?.txHash ||
    error?.transactionHash ||
    error?.data?.txHash

  return {
    detailedError,
    code,
    txHash,
  }
}

function logRpcError(error: any) {
  console.error('RPC Error details:', {
    message: error?.message,
    code: error?.code,
    data: error?.data,
    response: error?.response,
    stack: error?.stack,
    cause: error?.cause,
    txHash: error?.txHash,
    transactionHash: error?.transactionHash,
  })
}

function buildRpcErrorMessage(error: any, errorMsg: string) {
  const { detailedError, code, txHash } = extractRpcErrorDetails(error, errorMsg, errorMsg)

  if (txHash) {
    return (
      `Transaction signed and broadcast, but RPC returned an error. ` +
      `Transaction hash: ${txHash}. ` +
      `Please check your wallet or explorer to confirm the transaction status. ` +
      `Error: ${detailedError}`
    )
  }

  return (
    `RPC endpoint error during broadcast. ` +
    `The transaction may have been signed successfully. ` +
    `Please check your wallet transaction history or try again. ` +
    `Error: ${detailedError} ` +
    `(Code: ${code || 'unknown'})`
  )
}

/**
 * Estimates gas for a transaction by simulating it
 * Returns the estimated gas multiplied by GAS_MULTIPLIER for safety
 */
async function estimateGas(
  signer: any, // DirectSigner
  messages: any[]
): Promise<string> {
  try {
    // Get account info for simulation
    const account = await signer.getAccount()
    
    // Build the transaction body for simulation
    // We need to create a temporary transaction body without actually signing
    const txBody = await signer.buildTxBody({
      messages,
      memo: '',
    })
    
    // Create signer info for simulation (without actual signature)
    const signerInfo = {
      publicKey: account.pubkey,
      modeInfo: { single: { mode: 1 } }, // SIGN_MODE_DIRECT = 1
      sequence: account.sequence,
    }
    
    // Simulate the transaction
    const simulation = await signer.simulateByTxBody(txBody, [signerInfo])
    
    if (!simulation.gasInfo || !simulation.gasInfo.gasUsed) {
      throw new Error('Gas estimation failed: No gas info returned')
    }
    
    const estimatedGas = BigInt(simulation.gasInfo.gasUsed)
    const gasWithMultiplier = (estimatedGas * BigInt(Math.floor(GAS_MULTIPLIER * 100))) / BigInt(100)
    
    console.log('[GAS ESTIMATION]', {
      estimated: estimatedGas.toString(),
      withMultiplier: gasWithMultiplier.toString(),
      multiplier: GAS_MULTIPLIER,
    })
    
    return gasWithMultiplier.toString()
  } catch (error: any) {
    console.warn('[GAS ESTIMATION] Failed to estimate gas, using fallback:', error?.message)
    // Fallback to a higher default gas limit if estimation fails
    return '500000' // Higher default to avoid out-of-gas errors
  }
}

/**
 * Generates a Mintscan link for a transaction hash
 */
export function getMintscanLink(txHash: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
  const baseUrl = network === 'mainnet' 
    ? 'https://www.mintscan.io/injective'
    : 'https://testnet.mintscan.io/injective-testnet'
  return `${baseUrl}/tx/${txHash}`
}

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
    
    console.log('[PUBKEY ENCODING] Step 1 - Ed25519PubKey encoded:', {
      inputBytes: pubkeyBytes.length,
      encodedLength: encodedPubkey.length,
      encodedBase64: btoa(String.fromCharCode(...encodedPubkey)),
    })
    
    // Wrap in Any type for MsgCreateValidator (using fromPartial like the example)
    const consensusPubkey = Any.fromPartial({
      typeUrl: '/cosmos.crypto.ed25519.PubKey',
      value: encodedPubkey,
    })
    
    console.log('[PUBKEY ENCODING] Step 2 - Any wrapper created:', {
      typeUrl: consensusPubkey.typeUrl,
      valueType: consensusPubkey.value instanceof Uint8Array ? 'Uint8Array' : typeof consensusPubkey.value,
      valueLength: consensusPubkey.value instanceof Uint8Array ? consensusPubkey.value.length : 'N/A',
      valueBase64: consensusPubkey.value instanceof Uint8Array 
        ? btoa(String.fromCharCode(...consensusPubkey.value))
        : 'N/A',
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

    // Estimate gas first
    const estimatedGas = await estimateGas(signer, [msg])
    
    const fee: StdFee = {
      amount: [{ denom: 'inj', amount: '500000000000000000' }], // 0.5 INJ
      gas: estimatedGas,
    }

    // Log the message structure before encoding
    console.log('[BEFORE ENCODING] Message structure:', {
      typeUrl: msg.typeUrl,
      value: JSON.parse(JSON.stringify(msg.value, (key, value) => {
        // Convert Uint8Array and Any types for better logging
        if (value instanceof Uint8Array) {
          return {
            __type: 'Uint8Array',
            base64: btoa(String.fromCharCode(...value)),
            length: value.length,
          }
        }
        // Handle Any type specially
        if (key === 'pubkey' && value && typeof value === 'object' && 'typeUrl' in value && 'value' in value) {
          return {
            typeUrl: value.typeUrl,
            value: value.value instanceof Uint8Array
              ? {
                  __type: 'Uint8Array',
                  base64: btoa(String.fromCharCode(...value.value)),
                  length: value.value.length,
                }
              : value.value,
          }
        }
        return value
      })),
    })
    
    console.log('[BEFORE ENCODING] Fee:', fee)
    console.log('[BEFORE ENCODING] Full message object:', msg)
    
    
    try {
      // Use signAndBroadcast with 'commit' mode to wait for confirmation
      const result = await signer.signAndBroadcast(
        {
          messages: [msg],
          fee,
        },
        broadcastOptions
      )
      
      console.log('[AFTER BROADCAST] Initial result:', {
        transactionHash: result.transactionHash,
        rawResponse: result.rawResponse,
        broadcastResponse: result.broadcastResponse,
      })
      
      // For commit mode, check the broadcastResponse first
      // It contains checkTx and txResult which tell us if the transaction failed
      const broadcastResponse = result.broadcastResponse as any
      if (broadcastResponse && 'txResult' in broadcastResponse) {
        const txResult = broadcastResponse.txResult
        if (txResult && txResult.code !== 0) {
          // Transaction failed in deliverTx - extract the error log
          const errorLog = txResult.log || `Transaction failed with code ${txResult.code} (codespace: ${txResult.codespace || 'unknown'})`
          console.error('[TRANSACTION FAILED]', {
            transactionHash: result.transactionHash,
            code: txResult.code,
            codespace: txResult.codespace,
            log: txResult.log,
            gasUsed: txResult.gasUsed?.toString(),
            gasWanted: txResult.gasWanted?.toString(),
          })
          throw new Error(errorLog)
        }
      }
      
      // Wait for transaction to be finalized in a block
      // The wait() method polls until the transaction is included and returns the final TxResponse
      let txResponse
      try {
        txResponse = await result.wait(60000, 2000) // 60s timeout, poll every 2s
      } catch (waitError: any) {
        // If wait fails but we have a broadcastResponse with txResult, use that
        if (broadcastResponse && 'txResult' in broadcastResponse) {
          const txResult = broadcastResponse.txResult
          if (txResult && txResult.code !== 0) {
            const errorLog = txResult.log || `Transaction failed with code ${txResult.code}`
            throw new Error(errorLog)
          }
        }
        throw waitError
      }
      
      console.log('[AFTER FINALIZATION] Transaction finalized:', {
        transactionHash: result.transactionHash,
        code: txResponse.code,
        height: txResponse.height,
        rawLog: txResponse.rawLog,
      })
      
      // Check if transaction actually succeeded (code 0 = success)
      if (txResponse.code !== 0) {
        const errorMsg = txResponse.rawLog || `Transaction failed with code ${txResponse.code}`
        throw new Error(errorMsg)
      }
      
      return {
        ...result,
        txResponse, // Include the finalized tx response
        rawLog: txResponse.rawLog, // Include raw log for display
      }
    } catch (signError: any) {
      console.log('[SIGN/BROADCAST ERROR] Caught error:', {
        message: signError?.message,
        code: signError?.code,
        name: signError?.name,
        stack: signError?.stack,
        // Check for signed transaction bytes in various places
        txBytes: signError?.txBytes,
        signedTx: signError?.signedTx,
        transaction: signError?.transaction,
      })
      
      // If we can get the signed transaction bytes from the error, log them
      const signedTxBytes = signError?.txBytes || signError?.signedTx?.txBytes || signError?.transaction?.txBytes
      if (signedTxBytes && signedTxBytes instanceof Uint8Array) {
        const hexArray: string[] = []
        for (let i = 0; i < signedTxBytes.length; i++) {
          hexArray.push(signedTxBytes[i].toString(16).padStart(2, '0'))
        }
        console.log('[AFTER SIGNING] Signed transaction bytes:', {
          length: signedTxBytes.length,
          base64: btoa(String.fromCharCode(...signedTxBytes)),
          hex: hexArray.join('').substring(0, 200) + '...', // Truncate for readability
        })
      }
      throw signError
    }
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
    if (isRpcErrorMessage(errorMsg)) {
      // Log full error details for debugging
      logRpcError(error)
      throw new Error(buildRpcErrorMessage(error, errorMsg))
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
    // Derive validator operator address from the wallet account (same as createValidatorTransaction)
    const validatorAddress = toValidatorOperatorAddress(address)

    // MsgSetOrchestratorAddress from Peggy module
    // Note: This message type may need to be imported from Injective SDK
    const msg = {
      typeUrl: '/injective.peggy.v1.MsgSetOrchestratorAddress',
      value: {
        validator: validatorAddress, // Use derived validator operator address
        orchestrator: data.orchestratorAddress,
        ethereum: data.ethereumAddress,
      },
    }

    // Estimate gas first
    const estimatedGas = await estimateGas(signer, [msg])
    
    const fee: StdFee = {
      amount: [{ denom: 'inj', amount: '500000000000000000' }], // 0.5 INJ
      gas: estimatedGas,
    }

    const result = await signer.signAndBroadcast(
      {
        messages: [msg],
        fee,
      },
      broadcastOptions
    )
    
    // For commit mode, check the broadcastResponse first
    const broadcastResponse = result.broadcastResponse as any
    if (broadcastResponse && 'txResult' in broadcastResponse) {
      const txResult = broadcastResponse.txResult
      if (txResult && txResult.code !== 0) {
        const errorLog = txResult.log || `Transaction failed with code ${txResult.code} (codespace: ${txResult.codespace || 'unknown'})`
        throw new Error(errorLog)
      }
    }
    
    // Wait for transaction to be finalized in a block
    let txResponse
    try {
      txResponse = await result.wait(60000, 2000) // 60s timeout, poll every 2s
    } catch (waitError: any) {
      // If wait fails but we have a broadcastResponse with txResult, use that
      if (broadcastResponse && 'txResult' in broadcastResponse) {
        const txResult = broadcastResponse.txResult
        if (txResult && txResult.code !== 0) {
          const errorLog = txResult.log || `Transaction failed with code ${txResult.code}`
          throw new Error(errorLog)
        }
      }
      throw waitError
    }
    
    // Check if transaction actually succeeded (code 0 = success)
    if (txResponse.code !== 0) {
      const errorMsg = txResponse.rawLog || `Transaction failed with code ${txResponse.code}`
      throw new Error(errorMsg)
    }
    
    return {
      ...result,
      txResponse, // Include the finalized tx response
      rawLog: txResponse.rawLog, // Include raw log for display
    }
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
    if (isRpcErrorMessage(errorMsg)) {
      logRpcError(error)
      throw new Error(buildRpcErrorMessage(error, errorMsg))
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

    // Estimate gas first
    const estimatedGas = await estimateGas(signer, [msg])
    
    const fee: StdFee = {
      amount: [{ denom: 'inj', amount: '500000000000000000' }],
      gas: estimatedGas,
    }

    const result = await signer.signAndBroadcast(
      {
        messages: [msg],
        fee,
      },
      broadcastOptions
    )
    
    // For commit mode, check the broadcastResponse first
    const broadcastResponse = result.broadcastResponse as any
    if (broadcastResponse && 'txResult' in broadcastResponse) {
      const txResult = broadcastResponse.txResult
      if (txResult && txResult.code !== 0) {
        const errorLog = txResult.log || `Transaction failed with code ${txResult.code} (codespace: ${txResult.codespace || 'unknown'})`
        throw new Error(errorLog)
      }
    }
    
    // Wait for transaction to be finalized in a block
    let txResponse
    try {
      txResponse = await result.wait(60000, 2000) // 60s timeout, poll every 2s
    } catch (waitError: any) {
      // If wait fails but we have a broadcastResponse with txResult, use that
      if (broadcastResponse && 'txResult' in broadcastResponse) {
        const txResult = broadcastResponse.txResult
        if (txResult && txResult.code !== 0) {
          const errorLog = txResult.log || `Transaction failed with code ${txResult.code}`
          throw new Error(errorLog)
        }
      }
      throw waitError
    }
    
    // Check if transaction actually succeeded (code 0 = success)
    if (txResponse.code !== 0) {
      const errorMsg = txResponse.rawLog || `Transaction failed with code ${txResponse.code}`
      throw new Error(errorMsg)
    }
    
    return {
      ...result,
      txResponse, // Include the finalized tx response
      rawLog: txResponse.rawLog, // Include raw log for display
    }
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
    if (isRpcErrorMessage(errorMsg)) {
      logRpcError(error)
      throw new Error(buildRpcErrorMessage(error, errorMsg))
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

    // Estimate gas first
    const estimatedGas = await estimateGas(signer, [msg])
    
    const fee: StdFee = {
      amount: [{ denom: 'inj', amount: '500000000000000000' }],
      gas: estimatedGas,
    }

    const result = await signer.signAndBroadcast(
      {
        messages: [msg],
        fee,
      },
      broadcastOptions
    )
    
    // For commit mode, check the broadcastResponse first
    const broadcastResponse = result.broadcastResponse as any
    if (broadcastResponse && 'txResult' in broadcastResponse) {
      const txResult = broadcastResponse.txResult
      if (txResult && txResult.code !== 0) {
        const errorLog = txResult.log || `Transaction failed with code ${txResult.code} (codespace: ${txResult.codespace || 'unknown'})`
        throw new Error(errorLog)
      }
    }
    
    // Wait for transaction to be finalized in a block
    let txResponse
    try {
      txResponse = await result.wait(60000, 2000) // 60s timeout, poll every 2s
    } catch (waitError: any) {
      // If wait fails but we have a broadcastResponse with txResult, use that
      if (broadcastResponse && 'txResult' in broadcastResponse) {
        const txResult = broadcastResponse.txResult
        if (txResult && txResult.code !== 0) {
          const errorLog = txResult.log || `Transaction failed with code ${txResult.code}`
          throw new Error(errorLog)
        }
      }
      throw waitError
    }
    
    // Check if transaction actually succeeded (code 0 = success)
    if (txResponse.code !== 0) {
      const errorMsg = txResponse.rawLog || `Transaction failed with code ${txResponse.code}`
      throw new Error(errorMsg)
    }
    
    return {
      ...result,
      txResponse, // Include the finalized tx response
      rawLog: txResponse.rawLog, // Include raw log for display
    }
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
    if (isRpcErrorMessage(errorMsg)) {
      logRpcError(error)
      throw new Error(buildRpcErrorMessage(error, errorMsg))
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

    // Estimate gas first
    const estimatedGas = await estimateGas(signer, [msg])
    
    const fee: StdFee = {
      amount: [{ denom: 'inj', amount: '500000000000000000' }],
      gas: estimatedGas,
    }

    const result = await signer.signAndBroadcast(
      {
        messages: [msg],
        fee,
      },
      broadcastOptions
    )
    
    // For commit mode, check the broadcastResponse first
    const broadcastResponse = result.broadcastResponse as any
    if (broadcastResponse && 'txResult' in broadcastResponse) {
      const txResult = broadcastResponse.txResult
      if (txResult && txResult.code !== 0) {
        const errorLog = txResult.log || `Transaction failed with code ${txResult.code} (codespace: ${txResult.codespace || 'unknown'})`
        throw new Error(errorLog)
      }
    }
    
    // Wait for transaction to be finalized in a block
    let txResponse
    try {
      txResponse = await result.wait(60000, 2000) // 60s timeout, poll every 2s
    } catch (waitError: any) {
      // If wait fails but we have a broadcastResponse with txResult, use that
      if (broadcastResponse && 'txResult' in broadcastResponse) {
        const txResult = broadcastResponse.txResult
        if (txResult && txResult.code !== 0) {
          const errorLog = txResult.log || `Transaction failed with code ${txResult.code}`
          throw new Error(errorLog)
        }
      }
      throw waitError
    }
    
    // Check if transaction actually succeeded (code 0 = success)
    if (txResponse.code !== 0) {
      const errorMsg = txResponse.rawLog || `Transaction failed with code ${txResponse.code}`
      throw new Error(errorMsg)
    }
    
    return {
      ...result,
      txResponse, // Include the finalized tx response
      rawLog: txResponse.rawLog, // Include raw log for display
    }
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
    if (isRpcErrorMessage(errorMsg)) {
      logRpcError(error)
      throw new Error(buildRpcErrorMessage(error, errorMsg))
    }
    throw error
  }
}
