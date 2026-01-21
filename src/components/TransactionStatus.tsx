import { TransactionStatus as TxStatus } from '../types'

interface TransactionStatusProps {
  status: TxStatus
  explorerUrl?: string
}

export function TransactionStatus({ status, explorerUrl }: TransactionStatusProps) {
  if (status.status === 'idle') {
    return null
  }

  if (status.status === 'pending') {
    return (
      <div className="transaction-status pending">
        <p>Transaction pending...</p>
      </div>
    )
  }

  if (status.status === 'success' && status.hash) {
    return (
      <div className="transaction-status success">
        <p>Transaction successful!</p>
        {explorerUrl && status.hash && (
          <a 
            href={`${explorerUrl}/transaction/${status.hash}`} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            View on Explorer
          </a>
        )}
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
