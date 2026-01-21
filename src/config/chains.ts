import { Chain } from '@chain-registry/types'
import { Network, ChainConfig } from '../types'

export const MAINNET_CONFIG: ChainConfig = {
  chainId: 'injective-1',
  rpc: 'https://rpc.injective-main-eu1.ccvalidators.com:443',
  rest: 'https://rest.injective-main-eu1.ccvalidators.com:443',
  bech32Prefix: 'inj',
}

export const TESTNET_CONFIG: ChainConfig = {
  chainId: 'injective-888',
  rpc: 'https://testnet.tm.injective.dev',
  rest: 'https://testnet.lcd.injective.dev',
  bech32Prefix: 'inj',
}

export function getChainConfig(network: Network): ChainConfig {
  return network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG
}

export function getInjectiveChainConfig(network: Network = 'mainnet'): Chain {
  const config = network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG
  
  return {
    chain_name: 'injective',
    status: network === 'mainnet' ? 'live' : 'live',
    network_type: network,
    pretty_name: network === 'mainnet' ? 'Injective' : 'Injective Testnet',
    chain_id: config.chainId,
    bech32_prefix: config.bech32Prefix,
    daemon_name: 'injectived',
    node_home: '$HOME/.injectived',
    slip44: 60, // Ethereum coin type
    fees: {
      fee_tokens: [
        {
          denom: 'inj',
          fixed_min_gas_price: 500000000,
          low_gas_price: 500000000,
          average_gas_price: 700000000,
          high_gas_price: 900000000,
        },
      ],
    },
    staking: {
      staking_tokens: [
        {
          denom: 'inj',
        },
      ],
    },
    apis: {
      rpc: [
        {
          address: config.rpc,
        },
      ],
      rest: [
        {
          address: config.rest,
        },
      ],
      grpc: network === 'mainnet' ? [
        {
          address: 'grpc.injective-main-eu1.ccvalidators.com:443',
        },
      ] : undefined,
    },
    explorers: [
      {
        kind: 'injectiveprotocol',
        url: network === 'mainnet' 
          ? 'https://explorer.injective.network'
          : 'https://testnet.explorer.injective.network',
        tx_page: network === 'mainnet'
          ? 'https://explorer.injective.network/transaction/${txHash}'
          : 'https://testnet.explorer.injective.network/transaction/${txHash}',
      },
    ],
  } as Chain
}
