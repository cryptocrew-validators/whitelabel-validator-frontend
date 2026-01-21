import {
  ChainRestAuthApi,
  ChainRestTendermintApi,
  TxRestApi,
} from '@injectivelabs/sdk-ts'
import { MAINNET_CONFIG, TESTNET_CONFIG } from '../config/chains'
import { Network as AppNetwork } from '../types'

// Network enum removed - use AppNetwork type directly

export function getInjectiveEndpoints(network: AppNetwork = 'mainnet') {
  const config = network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG
  // Use specific gRPC endpoint for mainnet, derive for testnet
  const grpcEndpoint = network === 'mainnet' 
    ? 'grpc.injective-main-eu1.ccvalidators.com:443'
    : config.rest.replace('/lcd', '/grpc').replace('lcd.', 'grpc.')
  return {
    rpc: config.rpc,
    rest: config.rest,
    grpc: grpcEndpoint,
  }
}

export class InjectiveService {
  private chainId: string
  private restEndpoint: string

  constructor(network: AppNetwork = 'mainnet') {
    const config = network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG
    this.chainId = config.chainId
    this.restEndpoint = config.rest
  }

  getChainId(): string {
    return this.chainId
  }

  getRestEndpoint(): string {
    return this.restEndpoint
  }

  async getAccount(address: string) {
    const authApi = new ChainRestAuthApi(this.restEndpoint)
    return authApi.fetchAccount(address)
  }

  async getLatestBlock() {
    const tendermintApi = new ChainRestTendermintApi(this.restEndpoint)
    return tendermintApi.fetchLatestBlock()
  }

  async broadcastTransaction(txRaw: any) {
    const txApi = new TxRestApi(this.restEndpoint)
    return txApi.broadcast(txRaw)
  }
}
