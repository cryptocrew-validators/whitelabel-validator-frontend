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
        <p>Transaction pending... Waiting for block finalization...</p>
        <p style={{ fontSize: '0.9em', opacity: 0.8, marginTop: '0.5rem' }}>
          This may take a few seconds. Please wait...
        </p>
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
          {status.rawLog && (
            <details style={{ marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', color: '#888' }}>View Raw Transaction Log</summary>
              <pre style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#2a2a2a', borderRadius: '4px', fontSize: '0.85em', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'auto', maxHeight: '200px' }}>
                {status.rawLog}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }

  if (status.status === 'error' && status.error) {
    return (
      <div className="transaction-status error">
        <p><strong>Transaction failed:</strong> {status.error}</p>
        {status.rawLog && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#2a2a2a', borderRadius: '4px', fontSize: '0.9em' }}>
            <strong>Raw Transaction Log:</strong>
            <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'auto', maxHeight: '200px' }}>
              {status.rawLog}
            </pre>
          </div>
        )}
        {status.hash && (
          <div style={{ marginTop: '0.5rem' }}>
            <strong>Transaction Hash:</strong> {status.hash}
            <div style={{ marginTop: '0.5rem' }}>
              <a 
                href={getMintscanLink(status.hash, network)} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#ff6b6b', textDecoration: 'underline' }}
              >
                View on Mintscan
              </a>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
