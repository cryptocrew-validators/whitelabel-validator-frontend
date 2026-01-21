// Simple test version to check if React is working
export default function AppSimple() {
  console.log('AppSimple: Rendering')
  return (
    <div style={{ 
      padding: '2rem', 
      color: 'white', 
      background: '#242424', 
      minHeight: '100vh',
      width: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
    }}>
      <h1 style={{ color: '#4a9eff' }}>App is working!</h1>
      <p>If you see this, React is rendering correctly.</p>
      <p style={{ marginTop: '1rem', color: '#aaa' }}>
        Check the browser console for any errors.
      </p>
    </div>
  )
}
