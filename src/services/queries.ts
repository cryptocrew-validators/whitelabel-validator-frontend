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
      
      console.log('[QUERY] Raw validator data from API:', JSON.stringify(validator, null, 2))
      
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
      
      const jailed = validator.jailed === true
      const status = validator.status || 'BOND_STATUS_UNBONDED'
      
      console.log('[QUERY] Parsed validator info:', {
        operatorAddress: validator.operator_address || validatorAddress,
        jailed,
        status,
        moniker: validator.description?.moniker || '',
      })
      
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
        status: status as 'BOND_STATUS_UNBONDED' | 'BOND_STATUS_UNBONDING' | 'BOND_STATUS_BONDED',
        jailed,
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

  async getOrchestratorBySender(senderAddress: string): Promise<OrchestratorMapping | null> {
    try {
      // Try multiple possible endpoints for orchestrator queries
      // First, try the module state endpoint
      const moduleStateUrl = `${this.restEndpoint}/peggy/v1/module_state`
      const moduleStateResponse = await fetch(moduleStateUrl)
      
      if (moduleStateResponse.ok) {
        const moduleStateData = await moduleStateResponse.json()
        console.log('[QUERY] Orchestrator module state:', JSON.stringify(moduleStateData, null, 2))
        
        // Check various possible locations for orchestrator data
        const orchestrators = 
          moduleStateData.state?.orchestrators || 
          moduleStateData.orchestrators || 
          moduleStateData.state?.orchestrator_addresses ||
          []
        
        // Find the orchestrator mapping where sender matches
        const mapping = orchestrators.find((m: any) => 
          m.sender && m.sender.toLowerCase() === senderAddress.toLowerCase()
        )
        
        if (mapping) {
          console.log('[QUERY] Found orchestrator mapping in module state:', mapping)
          return {
            validatorAddress: mapping.sender || senderAddress,
            orchestratorAddress: mapping.orchestrator || '',
            ethereumAddress: mapping.eth_address || mapping.ethereum || mapping.ethereum_address || '',
          }
        }
      }
      
      // Try a direct orchestrator query endpoint
      try {
        const orchestratorUrl = `${this.restEndpoint}/peggy/v1/orchestrator/${senderAddress}`
        const orchestratorResponse = await fetch(orchestratorUrl)
        
        if (orchestratorResponse.ok) {
          const orchestratorData = await orchestratorResponse.json()
          console.log('[QUERY] Orchestrator query response:', JSON.stringify(orchestratorData, null, 2))
          
          if (orchestratorData.orchestrator || orchestratorData.eth_address) {
            return {
              validatorAddress: senderAddress,
              orchestratorAddress: orchestratorData.orchestrator || '',
              ethereumAddress: orchestratorData.eth_address || orchestratorData.ethereum || '',
            }
          }
        }
      } catch (orchestratorError) {
        console.log('[QUERY] Orchestrator endpoint not available, trying alternative...')
      }
      
      // Try querying all orchestrators and filtering
      try {
        const allOrchestratorsUrl = `${this.restEndpoint}/peggy/v1/orchestrators`
        const allOrchestratorsResponse = await fetch(allOrchestratorsUrl)
        
        if (allOrchestratorsResponse.ok) {
          const allOrchestratorsData = await allOrchestratorsResponse.json()
          console.log('[QUERY] All orchestrators response:', JSON.stringify(allOrchestratorsData, null, 2))
          
          const orchestratorsList = allOrchestratorsData.orchestrators || allOrchestratorsData || []
          const mapping = orchestratorsList.find((m: any) => 
            m.sender && m.sender.toLowerCase() === senderAddress.toLowerCase()
          )
          
          if (mapping) {
            console.log('[QUERY] Found orchestrator mapping in all orchestrators:', mapping)
            return {
              validatorAddress: mapping.sender || senderAddress,
              orchestratorAddress: mapping.orchestrator || '',
              ethereumAddress: mapping.eth_address || mapping.ethereum || mapping.ethereum_address || '',
            }
          }
        }
      } catch (allOrchestratorsError) {
        console.log('[QUERY] All orchestrators endpoint not available')
      }
      
      return null
    } catch (error) {
      console.error('Error fetching orchestrator by sender:', error)
      return null
    }
  }

  async getDelegation(delegatorAddress: string, validatorAddress: string): Promise<DelegationInfo | null> {
    try {
      // Use REST API: GET /cosmos/staking/v1beta1/validators/{validator_addr}/delegations/{delegator_addr}
      const url = `${this.restEndpoint}/cosmos/staking/v1beta1/validators/${validatorAddress}/delegations/${delegatorAddress}`
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch delegation: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('[DELEGATION] Full API response:', JSON.stringify(data, null, 2))
      
      const delegation = data.delegation_response
      
      if (!delegation) {
        console.warn('[DELEGATION] No delegation_response in API response')
        return null
      }

      // The balance should be in delegation_response.balance
      // According to Cosmos SDK REST API, the structure is:
      // {
      //   "delegation_response": {
      //     "delegation": { ... },
      //     "balance": { "denom": "...", "amount": "..." }
      //   }
      // }
      let balance = delegation.balance
      
      // Ensure balance has the correct structure
      if (balance && typeof balance === 'object') {
        // Make sure we have denom and amount
        if (!balance.denom) {
          balance.denom = 'inj'
        }
        if (!balance.amount || balance.amount === '0') {
          // If amount is missing or 0, check if it's in a different format
          console.warn('[DELEGATION] Balance amount is missing or 0, checking alternative formats')
        }
      } else {
        // Balance might be missing entirely
        console.warn('[DELEGATION] Balance not found in expected location, using default')
        balance = { denom: 'inj', amount: '0' }
      }

      // Log the balance we're using
      console.log('[DELEGATION] Parsed balance:', balance)
      console.log('[DELEGATION] Balance amount value:', balance.amount)
      console.log('[DELEGATION] Balance denom:', balance.denom)

      return {
        delegatorAddress: delegation.delegation?.delegator_address || delegatorAddress,
        validatorAddress: delegation.delegation?.validator_address || validatorAddress,
        shares: delegation.delegation?.shares || '0',
        balance: balance || { denom: 'inj', amount: '0' },
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
