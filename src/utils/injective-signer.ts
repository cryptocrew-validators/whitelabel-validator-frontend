// According to https://docs.hyperweb.io/interchain-js/networks/injective
// DirectSigner should be imported from @interchainjs/injective
// The package should re-export it from @interchainjs/cosmos with Injective-specific handling
import { DirectSigner as CosmosDirectSigner, createCosmosQueryClient } from '@interchainjs/cosmos'
import { createInjectiveSignerConfig } from '@interchainjs/injective'
import { OfflineSigner, OfflineDirectSigner } from '@cosmjs/proto-signing'
import { getChainConfig } from '../config/chains'
import { Network } from '../types'
import type { Encoder } from '@interchainjs/cosmos/types/signing-client'
import { BinaryWriter } from '@interchainjs/cosmos-types/binary'
import { Any } from '@interchainjs/cosmos-types/google/protobuf/any'
import { Coin } from '@interchainjs/cosmos-types/cosmos/base/v1beta1/coin'
import { Description, CommissionRates } from '@interchainjs/cosmos-types/cosmos/staking/v1beta1/staking'
import { Decimal } from '@interchainjs/math'

// Re-export DirectSigner type for consistency with @interchainjs/injective API
// This ensures we're using the Injective-compatible signer with proper type handling
export type DirectSigner = CosmosDirectSigner

/**
 * Creates an Injective DirectSigner using Cosmos Kit's offline signer
 * This properly handles Injective's EthAccount type and custom Injective types
 * 
 * Reference: https://docs.hyperweb.io/interchain-js/networks/injective
 * 
 * The DirectSigner from @interchainjs/cosmos works with Injective when properly configured
 * with Injective-specific chainId, addressPrefix, and query client.
 * 
 * Note: We use the RPC endpoint for query client creation because createCosmosQueryClient
 * needs to call /status which is an RPC method, not a REST method. The query client
 * will still work correctly for all queries.
 */
export async function createInjectiveSigner(
  offlineSigner: OfflineSigner | OfflineDirectSigner,
  chainId: string,
  network: Network
): Promise<CosmosDirectSigner> {
  const config = getChainConfig(network)
  
  // Create query client for Injective
  // Use RPC endpoint for query client creation because createCosmosQueryClient
  // needs to call /status which is an RPC method (not available on REST endpoints)
  // The query client will still work with REST endpoints for actual queries
  // Note: If broadcastTxSync fails, we may need to use sign + broadcast separately
  const queryClient = await createCosmosQueryClient(config.rpc)
  
  // Create DirectSigner with proper Injective configuration
  // Using Injective-specific chainId and addressPrefix ensures proper type handling
  // This signer will correctly handle Injective's EthAccount type
  // Type assertion: offlineSigner from getOfflineSignerDirect() is compatible with DirectSigner
  const signerConfig = createInjectiveSignerConfig({
    chainId,
    queryClient,
    addressPrefix: config.bech32Prefix, // 'inj' - Injective-specific prefix
  })
  const signer = new CosmosDirectSigner(offlineSigner as any, signerConfig)
  
  // Register encoders for staking messages
  // We need to properly encode messages using protobuf encoding
  const stakingEncoders: Encoder[] = [
    {
      typeUrl: '/cosmos.staking.v1beta1.MsgCreateValidator',
      fromPartial: (obj: any) => obj,
      encode: (message: any, writer?: BinaryWriter) => {
        console.log('[ENCODER] Encoding MsgCreateValidator:', {
          typeUrl: '/cosmos.staking.v1beta1.MsgCreateValidator',
          message: JSON.parse(JSON.stringify(message, (_key, value) => {
            // Convert Uint8Array to base64 for logging
            if (value instanceof Uint8Array) {
              return {
                __type: 'Uint8Array',
                base64: btoa(String.fromCharCode(...value)),
                length: value.length,
              }
            }
            return value
          })),
        })
        
        const w = writer || BinaryWriter.create()
        
        // Field 1: description
        if (message.description) {
          console.log('[ENCODER] Encoding description:', message.description)
          Description.encode(message.description, w.uint32(10).fork()).ldelim()
        }
        
        // Field 2: commission (CommissionRates)
        if (message.commission) {
          console.log('[ENCODER] Encoding commission:', message.commission)
          CommissionRates.encode(message.commission, w.uint32(18).fork()).ldelim()
        }
        
        // Field 3: minSelfDelegation
        if (message.minSelfDelegation) {
          console.log('[ENCODER] Encoding minSelfDelegation:', message.minSelfDelegation)
          w.uint32(26).string(message.minSelfDelegation)
        }
        
        // Field 4: delegatorAddress
        if (message.delegatorAddress) {
          console.log('[ENCODER] Encoding delegatorAddress:', message.delegatorAddress)
          w.uint32(34).string(message.delegatorAddress)
        }
        
        // Field 5: validatorAddress
        if (message.validatorAddress) {
          console.log('[ENCODER] Encoding validatorAddress:', message.validatorAddress)
          w.uint32(42).string(message.validatorAddress)
        }
        
        // Field 6: pubkey (Any)
        if (message.pubkey) {
          console.log('[ENCODER] Encoding pubkey:', {
            typeUrl: message.pubkey.typeUrl,
            value: message.pubkey.value instanceof Uint8Array 
              ? {
                  __type: 'Uint8Array',
                  base64: btoa(String.fromCharCode(...message.pubkey.value)),
                  length: message.pubkey.value.length,
                }
              : message.pubkey.value,
          })
          Any.encode(message.pubkey, w.uint32(50).fork()).ldelim()
        }
        
        // Field 7: value (Coin)
        if (message.value) {
          console.log('[ENCODER] Encoding value:', message.value)
          Coin.encode(message.value, w.uint32(58).fork()).ldelim()
        }
        
        const encoded = w.finish()
        console.log('[ENCODER] Encoded message bytes:', {
          length: encoded.length,
          base64: btoa(String.fromCharCode(...encoded)),
          hex: Array.from(encoded).map(b => b.toString(16).padStart(2, '0')).join(''),
        })
        
        return w
      },
    },
    {
      typeUrl: '/cosmos.staking.v1beta1.MsgEditValidator',
      fromPartial: (obj: any) => obj,
      encode: (message: any, writer?: BinaryWriter) => {
        console.log('[ENCODER] Encoding MsgEditValidator:', {
          typeUrl: '/cosmos.staking.v1beta1.MsgEditValidator',
          message,
        })
        
        const w = writer || BinaryWriter.create()
        
        // Field 1: description (Description)
        if (message.description) {
          console.log('[ENCODER] Encoding description:', message.description)
          Description.encode(message.description, w.uint32(10).fork()).ldelim()
        }
        
        // Field 2: validator_address (string)
        if (message.validatorAddress) {
          console.log('[ENCODER] Encoding validatorAddress:', message.validatorAddress)
          w.uint32(18).string(message.validatorAddress)
        }
        
        // Field 3: commission_rate (Dec) - optional
        // Commission rate must be encoded as Decimal atomics (18 decimal places)
        if (message.commissionRate !== undefined && message.commissionRate !== null && message.commissionRate !== '') {
          console.log('[ENCODER] Encoding commissionRate:', message.commissionRate)
          // Convert decimal string to atomics format (e.g., "0.11" -> "110000000000000000")
          const commissionRateAtomics = Decimal.fromUserInput(message.commissionRate, 18).atomics
          console.log('[ENCODER] Commission rate atomics:', commissionRateAtomics)
          w.uint32(26).string(commissionRateAtomics)
        }
        
        // Field 4: min_self_delegation (string) - optional
        if (message.minSelfDelegation !== undefined && message.minSelfDelegation !== null && message.minSelfDelegation !== '') {
          console.log('[ENCODER] Encoding minSelfDelegation:', message.minSelfDelegation)
          w.uint32(34).string(message.minSelfDelegation)
        }
        
        const encoded = w.finish()
        console.log('[ENCODER] Encoded MsgEditValidator bytes:', {
          length: encoded.length,
          base64: btoa(String.fromCharCode(...encoded)),
          hex: Array.from(encoded).map(b => b.toString(16).padStart(2, '0')).join(''),
        })
        
        return w
      },
    },
    {
      typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
      fromPartial: (obj: any) => obj,
      encode: (message: any, writer?: BinaryWriter) => {
        const w = writer || BinaryWriter.create()
        
        if (message.delegatorAddress) {
          w.uint32(10).string(message.delegatorAddress)
        }
        if (message.validatorAddress) {
          w.uint32(18).string(message.validatorAddress)
        }
        if (message.amount) {
          Coin.encode(message.amount, w.uint32(26).fork()).ldelim()
        }
        
        return w
      },
    },
    {
      typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
      fromPartial: (obj: any) => obj,
      encode: (message: any, writer?: BinaryWriter) => {
        const w = writer || BinaryWriter.create()
        
        if (message.delegatorAddress) {
          w.uint32(10).string(message.delegatorAddress)
        }
        if (message.validatorAddress) {
          w.uint32(18).string(message.validatorAddress)
        }
        if (message.amount) {
          Coin.encode(message.amount, w.uint32(26).fork()).ldelim()
        }
        
        return w
      },
    },
    {
      typeUrl: '/injective.peggy.v1.MsgSetOrchestratorAddresses',
      fromPartial: (obj: any) => obj,
      encode: (message: any, writer?: BinaryWriter) => {
        console.log('[ENCODER] Encoding MsgSetOrchestratorAddresses:', {
          typeUrl: '/injective.peggy.v1.MsgSetOrchestratorAddresses',
          message,
        })
        
        const w = writer || BinaryWriter.create()
        
        // Field 1: sender (string)
        if (message.sender) {
          console.log('[ENCODER] Encoding sender:', message.sender)
          w.uint32(10).string(message.sender)
        }
        // Field 2: orchestrator (string)
        if (message.orchestrator) {
          console.log('[ENCODER] Encoding orchestrator:', message.orchestrator)
          w.uint32(18).string(message.orchestrator)
        }
        // Field 3: ethAddress (string)
        if (message.ethAddress) {
          console.log('[ENCODER] Encoding ethAddress:', message.ethAddress)
          w.uint32(26).string(message.ethAddress)
        }
        
        const encoded = w.finish()
        console.log('[ENCODER] Encoded MsgSetOrchestratorAddresses bytes:', {
          length: encoded.length,
          base64: btoa(String.fromCharCode(...encoded)),
          hex: Array.from(encoded).map(b => b.toString(16).padStart(2, '0')).join(''),
        })
        
        return w
      },
    },
    {
      typeUrl: '/cosmos.slashing.v1beta1.MsgUnjail',
      fromPartial: (obj: any) => obj,
      encode: (message: any, writer?: BinaryWriter) => {
        console.log('[ENCODER] Encoding MsgUnjail:', {
          typeUrl: '/cosmos.slashing.v1beta1.MsgUnjail',
          message,
        })
        
        const w = writer || BinaryWriter.create()
        
        // Field 1: validatorAddr (string)
        if (message.validatorAddr) {
          console.log('[ENCODER] Encoding validatorAddr:', message.validatorAddr)
          w.uint32(10).string(message.validatorAddr)
        }
        
        const encoded = w.finish()
        console.log('[ENCODER] Encoded MsgUnjail bytes:', {
          length: encoded.length,
          base64: btoa(String.fromCharCode(...encoded)),
          hex: Array.from(encoded).map(b => b.toString(16).padStart(2, '0')).join(''),
        })
        
        return w
      },
    },
  ]
  
  signer.addEncoders(stakingEncoders)
  
  return signer
}
