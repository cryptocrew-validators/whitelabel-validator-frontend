/**
 * Cache for Keybase profile images
 * Uses localStorage to persist cache across sessions
 */

const CACHE_PREFIX = 'keybase_profile_'
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface CacheEntry {
  url: string
  timestamp: number
}

/**
 * Get cached profile image URL for an identity
 */
export function getCachedKeybaseImage(identity: string): string | null {
  try {
    const cacheKey = `${CACHE_PREFIX}${identity}`
    const cached = localStorage.getItem(cacheKey)
    
    if (!cached) {
      return null
    }
    
    const entry: CacheEntry = JSON.parse(cached)
    const now = Date.now()
    
    // Check if cache is expired
    if (now - entry.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(cacheKey)
      return null
    }
    
    return entry.url
  } catch (error) {
    console.error('[KeybaseCache] Error reading cache:', error)
    return null
  }
}

/**
 * Cache a profile image URL for an identity
 */
export function setCachedKeybaseImage(identity: string, url: string): void {
  try {
    const cacheKey = `${CACHE_PREFIX}${identity}`
    const entry: CacheEntry = {
      url,
      timestamp: Date.now(),
    }
    localStorage.setItem(cacheKey, JSON.stringify(entry))
  } catch (error) {
    console.error('[KeybaseCache] Error writing cache:', error)
    // If storage is full, try to clear old entries
    try {
      clearExpiredCacheEntries()
      localStorage.setItem(cacheKey, JSON.stringify(entry))
    } catch (retryError) {
      console.error('[KeybaseCache] Failed to cache after cleanup:', retryError)
    }
  }
}

/**
 * Cache that no image was found for an identity (to avoid repeated failed lookups)
 */
export function setCachedKeybaseImageNotFound(identity: string): void {
  try {
    const cacheKey = `${CACHE_PREFIX}${identity}`
    const entry: CacheEntry = {
      url: '', // Empty string indicates not found
      timestamp: Date.now(),
    }
    localStorage.setItem(cacheKey, JSON.stringify(entry))
  } catch (error) {
    console.error('[KeybaseCache] Error caching not-found:', error)
  }
}

/**
 * Check if an identity was previously marked as not found
 */
export function isKeybaseImageCachedAsNotFound(identity: string): boolean {
  const cached = getCachedKeybaseImage(identity)
  return cached === ''
}

/**
 * Clear expired cache entries
 */
function clearExpiredCacheEntries(): void {
  try {
    const now = Date.now()
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const entry: CacheEntry = JSON.parse(cached)
            if (now - entry.timestamp > CACHE_EXPIRY_MS) {
              keysToRemove.push(key)
            }
          }
        } catch (error) {
          // Invalid entry, remove it
          keysToRemove.push(key)
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (error) {
    console.error('[KeybaseCache] Error clearing expired entries:', error)
  }
}

/**
 * Load Keybase profile picture with caching
 */
export async function loadKeybasePicture(identity: string): Promise<string | null> {
  const trimmedIdentity = identity.trim()
  
  if (!trimmedIdentity) {
    return null
  }
  
  // Check cache first
  const cached = getCachedKeybaseImage(trimmedIdentity)
  if (cached !== null) {
    if (cached === '') {
      // Cached as not found
      return null
    }
    console.log('[KeybaseCache] Using cached image for identity:', trimmedIdentity)
    return cached
  }
  
  // Not in cache, fetch from API
  console.log('[KeybaseCache] Loading Keybase picture for identity:', trimmedIdentity)
  
  try {
    // For Cosmos validators, identity is typically a Keybase identity hash (16-char hex)
    // Use the lookup API with key_suffix parameter
    const lookupUrl = `https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${trimmedIdentity}&fields=pictures`
    const response = await fetch(lookupUrl)
    
    if (response.ok) {
      const data = await response.json()
      
      if (data?.status?.code === 0 && data?.them?.length > 0) {
        const user = data.them[0]
        const pictureUrl = 
          user.pictures?.primary?.url ||
          user.pictures?.primary?.basename ||
          (user.pictures?.primary && `https://keybase.io/${user.basename}/picture`)
        
        if (pictureUrl) {
          console.log('[KeybaseCache] Found Keybase picture URL:', pictureUrl)
          setCachedKeybaseImage(trimmedIdentity, pictureUrl)
          return pictureUrl
        }
      }
    }
    
    // Fallback: try direct URL for username
    const directUrl = `https://keybase.io/${trimmedIdentity}/picture`
    
    // Test if image exists by creating an image element
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        console.log('[KeybaseCache] Direct URL loaded successfully:', directUrl)
        setCachedKeybaseImage(trimmedIdentity, directUrl)
        resolve(directUrl)
      }
      img.onerror = () => {
        console.log('[KeybaseCache] No Keybase picture found for identity:', trimmedIdentity)
        setCachedKeybaseImageNotFound(trimmedIdentity)
        resolve(null)
      }
      img.src = directUrl
    })
  } catch (error) {
    console.error('[KeybaseCache] Error loading Keybase picture:', error)
    setCachedKeybaseImageNotFound(trimmedIdentity)
    return null
  }
}
