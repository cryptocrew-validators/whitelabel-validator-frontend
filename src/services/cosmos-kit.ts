import { Chain } from '@chain-registry/types'
import { getInjectiveChainConfig } from '../config/chains'

export function getChainConfig(): Chain {
  return getInjectiveChainConfig()
}
