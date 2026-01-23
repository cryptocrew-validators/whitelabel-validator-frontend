import { useChain } from '@cosmos-kit/react'
import { BalanceDisplay } from './BalanceDisplay'

export function WalletConnect() {
  const { 
    disconnect, 
    isWalletConnected, 
    address, 
    status,
    openView 
  } = useChain('injective')

  const handleConnect = () => {
    // Open the wallet selection modal - this shows the proper modal UI
    // The modal will display available wallets (Keplr, Leap, Cosmostation)
    // ChainProvider automatically renders the modal when openView is called
    // According to docs, openView() takes no parameters and opens the modal
    openView()
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
    } catch (error: any) {
      console.error('Failed to disconnect wallet:', error)
      alert(`Failed to disconnect wallet: ${error.message || 'Unknown error'}`)
    }
  }

  if (isWalletConnected && address) {
    return (
      <div className="wallet-connect">
        <BalanceDisplay onDisconnect={handleDisconnect} isDisconnecting={status === 'Connecting'} />
      </div>
    )
  }

  return (
    <div className="wallet-connect">
      <button 
        onClick={handleConnect} 
        disabled={status === 'Connecting'}
      >
        {status === 'Connecting' ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  )
}
