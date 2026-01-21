import { ValidatorInfo, OrchestratorMapping, DelegationInfo, UnbondingDelegation } from '../types'
import { getChainConfig } from '../config/chains'
import { Network } from '../types'

export class QueryService {
  private restEndpoint: string

  constructor(network: Network = 'mainnet') {
    const config = getChainConfig(network)
    this.restEndpoint = config.rest
  }

  async getValidator(validatorAddress: string): Promise<ValidatorInfo | null> {
    try {
      // Use REST API: GET /cosmos/staking/v1beta1/validators/{validatorAddr}
      const url = `${this.restEndpoint}/cosmos/staking/v1beta1/validators/${validatorAddress}`
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch validator: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      const validator = data.validator
      
      if (!validator) {
        return null
      }
      
      // Extract consensus pubkey from Any type
      let consensusPubkey = ''
      if (validator.consensus_pubkey) {
        // The pubkey is in Any format: { type_url: string, value: string (base64) }
        if (validator.consensus_pubkey.value) {
          consensusPubkey = validator.consensus_pubkey.value
        }
      }
      
      return {
        operatorAddress: validator.operator_address || validatorAddress,
        consensusPubkey,
        moniker: validator.description?.moniker || '',
        identity: validator.description?.identity,
        website: validator.description?.website,
        securityContact: validator.description?.security_contact,
        details: validator.description?.details,
        commission: {
          rate: validator.commission?.commission_rates?.rate || '0',
          maxRate: validator.commission?.commission_rates?.max_rate || '0',
          maxChangeRate: validator.commission?.commission_rates?.max_change_rate || '0',
        },
        minSelfDelegation: validator.min_self_delegation || '0',
        status: validator.status || 'BOND_STATUS_UNBONDED',
        tokens: validator.tokens || '0',
        delegatorShares: validator.delegator_shares || '0',
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
      // Use REST API: GET /cosmos/staking/v1beta1/delegators/{delegatorAddr}/delegations/{validatorAddr}
      const url = `${this.restEndpoint}/cosmos/staking/v1beta1/delegators/${delegatorAddress}/delegations/${validatorAddress}`
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch delegation: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      const delegation = data.delegation_response
      
      if (!delegation) {
        return null
      }

      return {
        delegatorAddress: delegation.delegation?.delegator_address || delegatorAddress,
        validatorAddress: delegation.delegation?.validator_address || validatorAddress,
        shares: delegation.delegation?.shares || '0',
        balance: delegation.balance || { denom: 'inj', amount: '0' },
      }
    } catch (error) {
      console.error('Error fetching delegation:', error)
      return null
    }
  }

  async getUnbondingDelegation(delegatorAddress: string, validatorAddress: string): Promise<UnbondingDelegation | null> {
    try {
      // Use REST API: GET /cosmos/staking/v1beta1/delegators/{delegatorAddr}/unbonding_delegations/{validatorAddr}
      const url = `${this.restEndpoint}/cosmos/staking/v1beta1/delegators/${delegatorAddress}/unbonding_delegations/${validatorAddress}`
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch unbonding delegation: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      const unbond = data.unbond
      
      if (!unbond) {
        return null
      }

      return {
        delegatorAddress: unbond.delegator_address || delegatorAddress,
        validatorAddress: unbond.validator_address || validatorAddress,
        entries: unbond.entries?.map((entry: any) => ({
          creationHeight: entry.creation_height?.toString() || '0',
          completionTime: entry.completion_time || '',
          initialBalance: entry.initial_balance || '0',
          balance: entry.balance || '0',
        })) || [],
      }
    } catch (error) {
      console.error('Error fetching unbonding delegation:', error)
      return null
    }
  }

  async getAllValidators(): Promise<ValidatorInfo[]> {
    try {
      // Use REST API: GET /cosmos/staking/v1beta1/validators
      const url = `${this.restEndpoint}/cosmos/staking/v1beta1/validators`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch validators: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      const validators = data.validators || []
      
      return validators.map((validator: any) => {
        // Extract consensus pubkey from Any type
        let consensusPubkey = ''
        if (validator.consensus_pubkey) {
          if (validator.consensus_pubkey.value) {
            consensusPubkey = validator.consensus_pubkey.value
          }
        }
        
        return {
          operatorAddress: validator.operator_address || '',
          consensusPubkey,
          moniker: validator.description?.moniker || '',
          identity: validator.description?.identity,
          website: validator.description?.website,
          securityContact: validator.description?.security_contact,
          details: validator.description?.details,
          commission: {
            rate: validator.commission?.commission_rates?.rate || '0',
            maxRate: validator.commission?.commission_rates?.max_rate || '0',
            maxChangeRate: validator.commission?.commission_rates?.max_change_rate || '0',
          },
          minSelfDelegation: validator.min_self_delegation || '0',
          status: validator.status || 'BOND_STATUS_UNBONDED',
          tokens: validator.tokens || '0',
          delegatorShares: validator.delegator_shares || '0',
        }
      })
    } catch (error) {
      console.error('Error fetching validators:', error)
      return []
    }
  }
}
