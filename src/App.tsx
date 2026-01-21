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
import { getInjectiveChainConfig } from './config/chains'
import { WalletConnect } from './components/WalletConnect'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NetworkProvider, useNetwork } from './contexts/NetworkContext'
import { NetworkSelector } from './components/NetworkSelector'
import './App.css'

function AppContent() {
  console.log('App: Component rendering')
  const { network, setNetwork } = useNetwork()
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
  
  useEffect(() => {
    // Reload wallets when network changes (though wallets should work for both)
    console.log('App: Network changed to:', network)
  }, [network])
  
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
      signingStargate: (chain: Chain) => {
        if (chain.chain_name === 'injective') {
          return {
            gasPrice: GasPrice.fromString('500000000inj'), // 0.5 INJ per gas unit
          }
        }
        return undefined
      },
      preferredSignType: (chain: Chain) => {
        // Injective uses direct (protobuf) signing for custom types
        if (chain.chain_name === 'injective') {
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
          modalTheme={{
            lightMode: {},
            darkMode: {
              modal: {
                background: '#1a1a1a',
              },
              overlay: {
                background: 'rgba(0, 0, 0, 0.7)',
              },
            },
          }}
        >
          <BrowserRouter>
            <div className="app">
              <nav className="navigation">
                <Link to="/">Register</Link>
                <Link to="/edit">Edit</Link>
                <Link to="/delegation">Delegation</Link>
                <Link to="/status">Status</Link>
                <div className="wallet-section">
                  <NetworkSelector network={network} onNetworkChange={setNetwork} />
                  <WalletConnect />
                </div>
              </nav>
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<ValidatorRegistrationPage />} />
                  <Route path="/register" element={<ValidatorRegistrationPage />} />
                  <Route path="/edit" element={<ValidatorEditPage />} />
                  <Route path="/delegation" element={<DelegationPage />} />
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
