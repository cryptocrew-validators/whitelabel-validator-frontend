import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { ChainProvider } from '@cosmos-kit/react'
import { SignerOptions } from '@cosmos-kit/core'
import { Chain } from '@chain-registry/types'
import { GasPrice } from '@cosmjs/stargate'
import { useState, useEffect } from 'react'
import ValidatorRegistrationPage from './pages/ValidatorRegistrationPage'
import ValidatorEditPage from './pages/ValidatorEditPage'
import DelegationPage from './pages/DelegationPage'
import ValidatorStatusPage from './pages/ValidatorStatusPage'
import OrchestratorRegistrationPage from './pages/OrchestratorRegistrationPage'
import UnjailPage from './pages/UnjailPage'
import { getInjectiveChainConfig } from './config/chains'
import { WalletConnect } from './components/WalletConnect'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NetworkProvider, useNetwork } from './contexts/NetworkContext'
import './App.css'

function AppContent() {
  console.log('App: Component rendering')
  const { network } = useNetwork()
  const [wallets, setWallets] = useState<any[]>([])
  const [walletsLoading, setWalletsLoading] = useState(true)
  
  useEffect(() => {
    // Lazy load wallets to avoid polyfill issues during initial load
    const loadWallets = async () => {
      try {
        console.log('App: Loading wallets...')
        const [
          { wallets: keplrWallets },
          { wallets: leapWallets },
          { wallets: cosmostationWallets },
        ] = await Promise.all([
          import('@cosmos-kit/keplr'),
          import('@cosmos-kit/leap'),
          import('@cosmos-kit/cosmostation'),
        ])
        // Combine all wallets
        const allWalletsRaw = [
          ...keplrWallets,
          ...leapWallets,
          ...cosmostationWallets,
        ]
        
        console.log('App: All wallets before filtering:', allWalletsRaw.map(w => ({
          name: w.walletInfo?.name,
          prettyName: w.walletInfo?.prettyName,
          mode: w.walletInfo?.mode
        })))
        
        // Filter to only extension wallets (exclude mobile wallets that require WalletConnect)
        const allWallets = allWalletsRaw.filter((wallet) => {
          const walletName = wallet.walletInfo?.name || ''
          const walletPrettyName = wallet.walletInfo?.prettyName || ''
          
          // Exclude mobile wallets and MetaMask snap
          const isExcluded = 
            walletName.toLowerCase().includes('mobile') ||
            walletPrettyName.toLowerCase().includes('mobile') ||
            walletPrettyName.includes('MetaMask') ||
            walletName.toLowerCase().includes('snap')
          
          return !isExcluded
        })
        
        // If filtering removed all wallets, use all wallets (fallback)
        const finalWallets = allWallets.length > 0 ? allWallets : allWalletsRaw
        
        console.log('App: Final wallets:', finalWallets.map(w => ({
          name: w.walletInfo?.name,
          prettyName: w.walletInfo?.prettyName,
        })))
        console.log('App: Wallets loaded:', finalWallets.length)
        setWallets(finalWallets)
      } catch (error) {
        console.error('App: Error loading wallets:', error)
        // Continue with empty wallets array
        setWallets([])
      } finally {
        setWalletsLoading(false)
      }
    }
    loadWallets()
  }, [])
  
  
  try {
    console.log('App: Getting chain config for network:', network)
    const injectiveChain = getInjectiveChainConfig(network)
    console.log('App: Chain config:', injectiveChain)
    
    if (walletsLoading) {
      return (
        <div style={{ padding: '2rem', color: 'white', background: '#242424', minHeight: '100vh' }}>
          <h1>Loading wallets...</h1>
        </div>
      )
    }
    
    console.log('App: Rendering ChainProvider for network:', network)
    
    // Configure signer options for Injective
    const signerOptions: SignerOptions = {
      signingStargate: (chain: string | Chain) => {
        const chainName = typeof chain === 'string' ? chain : chain.chain_name
        if (chainName === 'injective') {
          return {
            gasPrice: GasPrice.fromString('500000000inj'), // 0.5 INJ per gas unit
          } as any
        }
        return undefined
      },
      preferredSignType: (chain: string | Chain) => {
        // Injective uses direct (protobuf) signing for custom types
        const chainName = typeof chain === 'string' ? chain : chain.chain_name
        if (chainName === 'injective') {
          return 'direct'
        }
        return 'amino'
      },
    }
    
    return (
      <ErrorBoundary>
        <ChainProvider
          key={network} // Force remount when network changes
          chains={[injectiveChain]}
          assetLists={[]}
          wallets={wallets}
          throwErrors={false}
          logLevel="NONE"
          signerOptions={signerOptions}
          walletConnectOptions={{
            signClient: {
              projectId: 'placeholder-project-id', // Required but not used for extension wallets
            },
          }}
          endpointOptions={{
            isLazy: true, // Skip endpoint validation to avoid "All promises were rejected" errors
            endpoints: {
              injective: {
                rpc: network === 'mainnet' 
                  ? ['https://rpc.injective-main-eu1.ccvalidators.com:443']
                  : ['https://testnet.tm.injective.dev'],
                rest: network === 'mainnet'
                  ? ['https://rest.injective-main-eu1.ccvalidators.com:443']
                  : ['https://testnet.lcd.injective.dev'],
                isLazy: true,
              },
            },
          }}
        >
          <BrowserRouter>
            <div className="app">
              <nav className="navigation">
                <Link to="/" className="logo-link">
                  <img src={`${import.meta.env.BASE_URL}ccvalidators_logo.png`} alt="CryptoCrew Validators" className="logo-image" />
                </Link>
                <Link to="/">Register Validator</Link>
                <Link to="/orchestrator">Register Orchestrator</Link>
                <Link to="/edit">Edit Validator</Link>
                <Link to="/delegation">Delegation</Link>
                <Link to="/unjail">Unjail</Link>
                <Link to="/status">Status</Link>
                <div className="wallet-section">
                  <WalletConnect />
                </div>
              </nav>
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<ValidatorRegistrationPage />} />
                  <Route path="/register" element={<ValidatorRegistrationPage />} />
                  <Route path="/orchestrator" element={<OrchestratorRegistrationPage />} />
                  <Route path="/edit" element={<ValidatorEditPage />} />
                  <Route path="/delegation" element={<DelegationPage />} />
                  <Route path="/unjail" element={<UnjailPage />} />
                  <Route path="/status" element={<ValidatorStatusPage />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </ChainProvider>
      </ErrorBoundary>
    )
  } catch (error: any) {
    console.error('App initialization error:', error)
    return (
      <ErrorBoundary>
        <div style={{ padding: '2rem', color: '#ff6b6b' }}>
          <h1>Failed to initialize app</h1>
          <p>{error?.message || 'Unknown error'}</p>
          <pre>{error?.stack}</pre>
        </div>
      </ErrorBoundary>
    )
  }
}

function App() {
  return (
    <NetworkProvider>
      <AppContent />
    </NetworkProvider>
  )
}

export default App
