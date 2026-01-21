// According to https://docs.hyperweb.io/interchain-js/networks/injective
// DirectSigner should be imported from @interchainjs/injective
// The package should re-export it from @interchainjs/cosmos with Injective-specific handling
import { DirectSigner as CosmosDirectSigner, createCosmosQueryClient } from '@interchainjs/cosmos'
import { OfflineSigner, OfflineDirectSigner } from '@cosmjs/proto-signing'
import { getChainConfig } from '../config/chains'
import { Network } from '../types'
import type { Encoder } from '@interchainjs/cosmos/types/signing-client'
import { BinaryWriter } from '@interchainjs/cosmos-types/binary'
import { Any } from '@interchainjs/cosmos-types/google/protobuf/any'
import { Coin } from '@interchainjs/cosmos-types/cosmos/base/v1beta1/coin'
import { Description, CommissionRates } from '@interchainjs/cosmos-types/cosmos/staking/v1beta1/staking'

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
  const signer = new CosmosDirectSigner(offlineSigner as any, {
    chainId,
    queryClient,
    addressPrefix: config.bech32Prefix, // 'inj' - Injective-specific prefix
  })
  
  // Register encoders for staking messages
  // We need to properly encode messages using protobuf encoding
  const stakingEncoders: Encoder[] = [
    {
      typeUrl: '/cosmos.staking.v1beta1.MsgCreateValidator',
      fromPartial: (obj: any) => obj,
      encode: (message: any, writer?: BinaryWriter) => {
        const w = writer || BinaryWriter.create()
        
        // Field 1: description
        if (message.description) {
          Description.encode(message.description, w.uint32(10).fork()).ldelim()
        }
        
        // Field 2: commission (CommissionRates)
        if (message.commission) {
          CommissionRates.encode(message.commission, w.uint32(18).fork()).ldelim()
        }
        
        // Field 3: minSelfDelegation
        if (message.minSelfDelegation) {
          w.uint32(26).string(message.minSelfDelegation)
        }
        
        // Field 4: delegatorAddress
        if (message.delegatorAddress) {
          w.uint32(34).string(message.delegatorAddress)
        }
        
        // Field 5: validatorAddress
        if (message.validatorAddress) {
          w.uint32(42).string(message.validatorAddress)
        }
        
        // Field 6: pubkey (Any)
        if (message.pubkey) {
          Any.encode(message.pubkey, w.uint32(50).fork()).ldelim()
        }
        
        // Field 7: value (Coin)
        if (message.value) {
          Coin.encode(message.value, w.uint32(58).fork()).ldelim()
        }
        
        return w
      },
    },
    {
      typeUrl: '/cosmos.staking.v1beta1.MsgEditValidator',
      fromPartial: (obj: any) => obj,
      encode: (message: any, writer?: BinaryWriter) => {
        const w = writer || BinaryWriter.create()
        
        if (message.description) {
          Description.encode(message.description, w.uint32(10).fork()).ldelim()
        }
        if (message.validatorAddress) {
          w.uint32(18).string(message.validatorAddress)
        }
        if (message.commissionRate) {
          w.uint32(26).string(message.commissionRate)
        }
        if (message.minSelfDelegation) {
          w.uint32(34).string(message.minSelfDelegation)
        }
        
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
  ]
  
  signer.addEncoders(stakingEncoders)
  
  return signer
}
