import {
  ChainGrpcStakingApi,
} from '@injectivelabs/sdk-ts'
import { ValidatorInfo, OrchestratorMapping, DelegationInfo, UnbondingDelegation } from '../types'
import { getInjectiveEndpoints } from './injective'
import { Network } from '../types'

export class QueryService {
  private grpcEndpoint: string

  constructor(network: Network = 'mainnet') {
    const endpoints = getInjectiveEndpoints(network)
    // gRPC APIs use the same endpoint format, but need to convert REST to gRPC
    // For Injective, gRPC endpoints are typically the same base URL
    this.grpcEndpoint = endpoints.grpc
  }

  async getValidator(validatorAddress: string): Promise<ValidatorInfo | null> {
    try {
      const stakingApi = new ChainGrpcStakingApi(this.grpcEndpoint)
      const validator = await stakingApi.fetchValidator(validatorAddress)
      
      if (!validator) {
        return null
      }
      
      return {
        operatorAddress: validator.operatorAddress,
        consensusPubkey: validator.consensusPubkey?.value || '',
        moniker: validator.description?.moniker || '',
        identity: validator.description?.identity,
        website: validator.description?.website,
        securityContact: validator.description?.securityContact,
        details: validator.description?.details,
        commission: {
          rate: validator.commission?.commissionRates?.rate || '0',
          maxRate: validator.commission?.commissionRates?.maxRate || '0',
          maxChangeRate: validator.commission?.commissionRates?.maxChangeRate || '0',
        },
        minSelfDelegation: validator.minSelfDelegation || '0',
        status: validator.status as any,
        tokens: validator.tokens || '0',
        delegatorShares: validator.delegatorShares || '0',
      }
    } catch (error) {
      console.error('Error fetching validator:', error)
      return null
    }
  }

  async getOrchestratorMapping(_validatorAddress: string): Promise<OrchestratorMapping | null> {
    try {
      // Note: The exact method for fetching orchestrator address may vary
      // This is a placeholder - adjust based on actual Injective SDK API
      // For now, return null as the method needs to be verified
      // TODO: Implement once the correct API method is confirmed
      // const peggyApi = new ChainGrpcPeggyApi(this.grpcEndpoint)
      // const response = await peggyApi.fetchOrchestratorAddresses()
      // const mapping = response.find((m: any) => m.validator === validatorAddress)
      // if (!mapping) return null
      // return {
      //   validatorAddress: mapping.validator || validatorAddress,
      //   orchestratorAddress: mapping.orchestrator || '',
      //   ethereumAddress: mapping.ethereum || '',
      // }
      return null
    } catch (error) {
      console.error('Error fetching orchestrator mapping:', error)
      return null
    }
  }

  async getDelegation(delegatorAddress: string, validatorAddress: string): Promise<DelegationInfo | null> {
    try {
      const stakingApi = new ChainGrpcStakingApi(this.grpcEndpoint)
      // fetchDelegation may take a combined address or different format
      // Using delegator address and fetching all delegations, then filtering
      const delegations = await stakingApi.fetchDelegations(delegatorAddress)
      const delegation = delegations.find((d: any) => d.validatorAddress === validatorAddress)
      
      if (!delegation) {
        return null
      }

      return {
        delegatorAddress: delegation.delegatorAddress || delegatorAddress,
        validatorAddress: delegation.validatorAddress || validatorAddress,
        shares: delegation.shares || '0',
        balance: delegation.balance || { denom: 'inj', amount: '0' },
      }
    } catch (error) {
      console.error('Error fetching delegation:', error)
      return null
    }
  }

  async getUnbondingDelegation(delegatorAddress: string, validatorAddress: string): Promise<UnbondingDelegation | null> {
    try {
      const stakingApi = new ChainGrpcStakingApi(this.grpcEndpoint)
      const unbondingDelegations = await stakingApi.fetchUnbondingDelegations(delegatorAddress)
      const unbond = unbondingDelegations.find((u: any) => u.validatorAddress === validatorAddress)
      
      if (!unbond) {
        return null
      }

      return {
        delegatorAddress: unbond.delegatorAddress || delegatorAddress,
        validatorAddress: unbond.validatorAddress || validatorAddress,
        entries: unbond.entries || [],
      }
    } catch (error) {
      console.error('Error fetching unbonding delegation:', error)
      return null
    }
  }

  async getAllValidators(): Promise<ValidatorInfo[]> {
    try {
      const stakingApi = new ChainGrpcStakingApi(this.grpcEndpoint)
      const response = await stakingApi.fetchValidators()
      
      if (!response.validators) {
        return []
      }

      return response.validators.map((validator: any) => ({
        operatorAddress: validator.operatorAddress,
        consensusPubkey: validator.consensusPubkey?.value || '',
        moniker: validator.description?.moniker || '',
        identity: validator.description?.identity,
        website: validator.description?.website,
        securityContact: validator.description?.securityContact,
        details: validator.description?.details,
        commission: {
          rate: validator.commission?.commissionRates?.rate || '0',
          maxRate: validator.commission?.commissionRates?.maxRate || '0',
          maxChangeRate: validator.commission?.commissionRates?.maxChangeRate || '0',
        },
        minSelfDelegation: validator.minSelfDelegation || '0',
        status: validator.status as any,
        tokens: validator.tokens || '0',
        delegatorShares: validator.delegatorShares || '0',
      }))
    } catch (error) {
      console.error('Error fetching validators:', error)
      return []
    }
  }
}
