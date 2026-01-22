import { useState, useEffect } from 'react'
import { useChain } from '@cosmos-kit/react'
import { TransactionStatus } from '../components/TransactionStatus'
import { TransactionStatus as TxStatus, ValidatorInfo } from '../types'
import { unjailTransaction } from '../services/transactions'
import { QueryService } from '../services/queries'
import { useNetwork } from '../contexts/NetworkContext'
import { createInjectiveSigner } from '../utils/injective-signer'
import { toValidatorOperatorAddress } from '../utils/address'

export default function UnjailPage() {
  const { address, getOfflineSignerDirect, chain } = useChain('injective')
  const { network } = useNetwork()
  const [txStatus, setTxStatus] = useState<TxStatus>({ status: 'idle' })
  const [validatorAddress, setValidatorAddress] = useState<string>('')
  const [validator, setValidator] = useState<ValidatorInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (address) {
      loadValidator()
    }
  }, [address, network])

  const loadValidator = async () => {
    if (!address) return
    
    setLoading(true)
    try {
      const queryService = new QueryService(network)
      // Derive validator operator address from wallet account
      const derivedValidatorAddress = toValidatorOperatorAddress(address)
      const validatorInfo = await queryService.getValidator(derivedValidatorAddress)
      
      if (validatorInfo) {
        setValidator(validatorInfo)
        setValidatorAddress(derivedValidatorAddress)
      } else {
        setValidator(null)
        setValidatorAddress('')
      }
    } catch (error) {
      console.error('Failed to load validator:', error)
      setValidator(null)
      setValidatorAddress('')
    } finally {
      setLoading(false)
    }
  }

  const handleUnjail = async () => {
    if (!address || !getOfflineSignerDirect) {
      setTxStatus({ status: 'error', error: 'Wallet not connected' })
      return
    }

    if (!validatorAddress) {
      setTxStatus({ status: 'error', error: 'Validator address not found' })
      return
    }

    try {
      setTxStatus({ status: 'pending' })
      
      // Get direct offline signer from Cosmos Kit for protobuf signing
      const offlineSigner = getOfflineSignerDirect()
      if (!offlineSigner) {
        throw new Error('Failed to get offline signer')
      }
      
      const signer = await createInjectiveSigner(offlineSigner, chain.chain_id, network)
      
      const result = await unjailTransaction(signer, validatorAddress, chain.chain_id)
      
      // Only proceed if transaction succeeded (code 0)
      if (result.transactionHash) {
        setTxStatus({ 
          status: 'success', 
          hash: result.transactionHash,
          rawLog: (result as any).rawLog,
        })
        
        // Reload validator info to check if status changed
        await loadValidator()
      } else {
        throw new Error('Transaction completed but no transaction hash was returned')
      }
    } catch (error: any) {
      console.error('Unjail error:', error)
      // Try to extract raw log from error if available
      const rawLog = error?.rawLog || error?.txResponse?.rawLog || error?.txResult?.log
      setTxStatus({ 
        status: 'error', 
        error: error.message || 'Failed to unjail validator',
        rawLog: rawLog,
      })
    }
  }

  const explorerUrl = chain.explorers?.[0]?.url || (network === 'mainnet' 
    ? 'https://explorer.injective.network' 
    : 'https://testnet.explorer.injective.network')

  return (
    <div className="page">
      <h1>Unjail Validator</h1>
      
      {!address ? (
        <div className="error-message">
          Please connect your wallet to unjail a validator.
        </div>
      ) : loading ? (
        <div>Loading validator information...</div>
      ) : !validator ? (
        <div className="error-message">
          No validator found for the connected wallet. Please ensure you're connected with a validator operator wallet that has registered a validator.
        </div>
      ) : (
        <>
          <div className="info-section" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
            <h3>Validator Operator Address</h3>
            <p style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{validator.operatorAddress}</p>
          </div>

          <div className="info-section" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
            <h3>Validator Status</h3>
            <p>Status: {validator.status}</p>
            <p>Moniker: {validator.moniker || 'N/A'}</p>
          </div>

          {validator.status === 'BOND_STATUS_JAILED' ? (
            <div className="form-section" style={{ padding: '1.5rem', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
              <h3>Unjail Validator</h3>
              <p style={{ marginBottom: '1rem', color: '#aaa' }}>
                Your validator is currently jailed. Click the button below to unjail it.
              </p>
              <button
                onClick={handleUnjail}
                disabled={txStatus.status === 'pending'}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: txStatus.status === 'pending' ? '#666' : '#4a9eff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: txStatus.status === 'pending' ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {txStatus.status === 'pending' ? 'Unjailing...' : 'Unjail Validator'}
              </button>
            </div>
          ) : (
            <div className="info-section" style={{ padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
              <p style={{ color: '#4CAF50' }}>
                Your validator is not jailed. Unjail is only available for jailed validators.
              </p>
            </div>
          )}

          <TransactionStatus 
            status={txStatus} 
            explorerUrl={explorerUrl}
          />
        </>
      )}
    </div>
  )
}
