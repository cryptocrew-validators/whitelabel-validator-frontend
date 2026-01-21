import { TransactionStatus as TxStatus } from '../types'
import { getMintscanLink } from '../services/transactions'
import { useNetwork } from '../contexts/NetworkContext'

interface TransactionStatusProps {
  status: TxStatus
  explorerUrl?: string
}

export function TransactionStatus({ status, explorerUrl }: TransactionStatusProps) {
  const { network } = useNetwork()
  
  if (status.status === 'idle') {
    return null
  }

  if (status.status === 'pending') {
    return (
      <div className="transaction-status pending">
        <p>Transaction pending... Waiting for confirmation...</p>
      </div>
    )
  }

  if (status.status === 'success' && status.hash) {
    const mintscanLink = getMintscanLink(status.hash, network)
    
    return (
      <div className="transaction-status success">
        <p>Transaction successful!</p>
        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <strong>Transaction Hash:</strong> {status.hash}
          </div>
          <div>
            <a 
              href={mintscanLink} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#4CAF50', textDecoration: 'underline' }}
            >
              View on Mintscan
            </a>
            {explorerUrl && (
              <>
                {' | '}
                <a 
                  href={`${explorerUrl}/transaction/${status.hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#4CAF50', textDecoration: 'underline' }}
                >
                  View on Explorer
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (status.status === 'error' && status.error) {
    return (
      <div className="transaction-status error">
        <p>Transaction failed: {status.error}</p>
      </div>
    )
  }

  return null
}
