import { Network } from '../types'

interface NetworkSelectorProps {
  network: Network
  onNetworkChange: (network: Network) => void
}

export function NetworkSelector({ network, onNetworkChange }: NetworkSelectorProps) {
  return (
    <div className="network-selector">
      <label>
        Network:
        <select 
          value={network} 
          onChange={(e) => onNetworkChange(e.target.value as Network)}
        >
          <option value="mainnet">Mainnet (injective-1)</option>
          <option value="testnet">Testnet (injective-888)</option>
        </select>
      </label>
    </div>
  )
}
