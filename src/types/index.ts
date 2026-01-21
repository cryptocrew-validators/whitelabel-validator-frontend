export interface ValidatorInfo {
  operatorAddress: string
  consensusPubkey: string
  moniker: string
  identity?: string
  website?: string
  securityContact?: string
  details?: string
  commission: {
    rate: string
    maxRate: string
    maxChangeRate: string
  }
  minSelfDelegation: string
  status: 'BOND_STATUS_UNBONDED' | 'BOND_STATUS_UNBONDING' | 'BOND_STATUS_BONDED'
  tokens: string
  delegatorShares: string
}

export interface OrchestratorMapping {
  validatorAddress: string
  orchestratorAddress: string
  ethereumAddress: string
}

export interface DelegationInfo {
  delegatorAddress: string
  validatorAddress: string
  shares: string
  balance: {
    denom: string
    amount: string
  }
}

export interface UnbondingDelegation {
  delegatorAddress: string
  validatorAddress: string
  entries: Array<{
    creationHeight: string
    completionTime: string
    initialBalance: string
    balance: string
  }>
}

export interface TransactionStatus {
  status: 'idle' | 'pending' | 'success' | 'error'
  hash?: string
  error?: string
  rawLog?: string // Raw transaction log from the chain
}

export type Network = 'mainnet' | 'testnet'

export interface ChainConfig {
  chainId: string
  rpc: string
  rest: string
  bech32Prefix: string
}
