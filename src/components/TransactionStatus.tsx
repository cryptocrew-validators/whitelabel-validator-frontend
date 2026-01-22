import { useState, useEffect } from 'react'
import { TransactionStatus as TxStatus } from '../types'
import { getMintscanLink } from '../services/transactions'
import { useNetwork } from '../contexts/NetworkContext'

interface TransactionStatusProps {
  status: TxStatus
  explorerUrl?: string
  onDismiss?: () => void
  inline?: boolean // If true, use inline layout instead of overlay
}

export function TransactionStatus({ status, explorerUrl, onDismiss, inline = false }: TransactionStatusProps) {
  const { network } = useNetwork()
  const [isVisible, setIsVisible] = useState(true)
  
  // Auto-dismiss success messages after 10 seconds
  useEffect(() => {
    if (status.status === 'success' && !status.hash) {
      // Don't auto-dismiss if there's a hash (user might want to click the link)
      return
    }
    if (status.status === 'success') {
      const timer = setTimeout(() => {
        setIsVisible(false)
        if (onDismiss) {
          setTimeout(onDismiss, 300) // Wait for animation
        }
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [status.status, status.hash, onDismiss])
  
  const handleDismiss = () => {
    setIsVisible(false)
    if (onDismiss) {
      setTimeout(onDismiss, 300) // Wait for animation
    }
  }
  
  if (status.status === 'idle' || !isVisible) {
    return null
  }

  if (status.status === 'pending') {
    return (
      <div className="transaction-status-overlay pending">
        <button className="transaction-status-close" onClick={handleDismiss} aria-label="Close">
          ×
        </button>
        <div className="transaction-status-content">
          <p style={{ margin: 0, fontWeight: 600 }}>Transaction pending...</p>
          <p style={{ fontSize: '0.9em', opacity: 0.8, marginTop: '0.5rem', margin: 0 }}>
            Waiting for block finalization...
          </p>
        </div>
      </div>
    )
  }

  if (status.status === 'success' && status.hash) {
    const mintscanLink = getMintscanLink(status.hash, network)
    
    return (
      <div className="transaction-status-overlay success">
        <button className="transaction-status-close" onClick={handleDismiss} aria-label="Close">
          ×
        </button>
        <div className="transaction-status-content">
          <p style={{ margin: 0, marginBottom: '0.75rem', fontWeight: 600 }}>Transaction successful!</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9em' }}>
            <div>
              <strong>Hash:</strong> <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{status.hash}</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a 
                href={mintscanLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="transaction-status-link"
              >
                View on Mintscan
              </a>
              {explorerUrl && (
                <a 
                  href={`${explorerUrl}/transaction/${status.hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="transaction-status-link"
                >
                  View on Explorer
                </a>
              )}
            </div>
            {status.rawLog && (
              <details style={{ marginTop: '0.5rem' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.85em' }}>View Raw Log</summary>
                <pre style={{ marginTop: '0.5rem', fontSize: '0.75em', maxHeight: '150px', overflow: 'auto' }}>{status.rawLog}</pre>
              </details>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (status.status === 'warning' && status.warning) {
    if (inline) {
      return (
        <div className="transaction-status warning" style={{ position: 'relative', paddingRight: '2.5rem' }}>
          <button 
            className="transaction-status-close-inline" 
            onClick={handleDismiss} 
            aria-label="Close"
          >
            ×
          </button>
          <p style={{ margin: 0, fontWeight: 500 }}>
            {status.warning}
          </p>
        </div>
      )
    }
    return (
      <div className="transaction-status-overlay warning">
        <button className="transaction-status-close" onClick={handleDismiss} aria-label="Close">
          ×
        </button>
        <div className="transaction-status-content">
          <p style={{ margin: 0, fontWeight: 500 }}>
            {status.warning}
          </p>
        </div>
      </div>
    )
  }

  if (status.status === 'info' && status.info) {
    if (inline) {
      return (
        <div className="transaction-status info" style={{ position: 'relative', paddingRight: '2.5rem' }}>
          <button 
            className="transaction-status-close-inline" 
            onClick={handleDismiss} 
            aria-label="Close"
          >
            ×
          </button>
          <p style={{ margin: 0 }}>
            {status.info}
          </p>
        </div>
      )
    }
    return (
      <div className="transaction-status-overlay info">
        <button className="transaction-status-close" onClick={handleDismiss} aria-label="Close">
          ×
        </button>
        <div className="transaction-status-content">
          <p style={{ margin: 0 }}>
            {status.info}
          </p>
        </div>
      </div>
    )
  }

  if (status.status === 'error' && status.error) {
    return (
      <div className="transaction-status-overlay error">
        <button className="transaction-status-close" onClick={handleDismiss} aria-label="Close">
          ×
        </button>
        <div className="transaction-status-content">
          <p style={{ margin: 0, marginBottom: '0.75rem', fontWeight: 600 }}>
            <strong>Transaction failed:</strong> {status.error}
          </p>
          {status.rawLog && (
            <details style={{ marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.85em' }}>View Raw Log</summary>
              <pre style={{ marginTop: '0.5rem', fontSize: '0.75em', maxHeight: '150px', overflow: 'auto' }}>{status.rawLog}</pre>
            </details>
          )}
          {status.hash && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.9em' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Hash:</strong> <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{status.hash}</span>
              </div>
              <a 
                href={getMintscanLink(status.hash, network)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="transaction-status-link"
              >
                View on Mintscan
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
