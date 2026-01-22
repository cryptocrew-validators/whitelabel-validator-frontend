import { createContext, useContext, ReactNode } from 'react'
import { Network } from '../types'

interface NetworkContextType {
  network: Network
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Always use mainnet - network selector removed
  const network: Network = 'mainnet'

  return (
    <NetworkContext.Provider value={{ network }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  const context = useContext(NetworkContext)
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider')
  }
  return context
}
