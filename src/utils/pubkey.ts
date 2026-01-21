/**
 * Validates if a string is a valid base64-encoded ed25519 public key
 * ed25519 public keys are 32 bytes, so base64 encoded they should be 44 characters
 */
export function isValidEd25519Pubkey(pubkey: string): boolean {
  try {
    // Remove any whitespace
    const cleaned = pubkey.trim()
    
    // Base64 encoded 32 bytes should be 44 characters (without padding)
    // or 43-44 with padding
    if (cleaned.length < 43 || cleaned.length > 44) {
      return false
    }
    
    // Try to decode base64
    const decoded = atob(cleaned)
    
    // ed25519 public key should be exactly 32 bytes
    return decoded.length === 32
  } catch {
    return false
  }
}

/**
 * Normalizes a pubkey string by removing whitespace
 */
export function normalizePubkey(pubkey: string): string {
  return pubkey.trim().replace(/\s+/g, '')
}

/**
 * Validates and normalizes a consensus pubkey from deeplink
 */
export function parseDeeplinkPubkey(pubkey: string): { valid: boolean; normalized?: string; error?: string } {
  const normalized = normalizePubkey(pubkey)
  
  if (!normalized) {
    return { valid: false, error: 'Pubkey cannot be empty' }
  }
  
  if (!isValidEd25519Pubkey(normalized)) {
    return { valid: false, error: 'Invalid ed25519 pubkey format. Expected base64-encoded 32-byte key.' }
  }
  
  return { valid: true, normalized }
}
