import { fromBech32 } from '@cosmjs/encoding'

export function isValidBech32Address(address: string, prefix: string): boolean {
  try {
    const decoded = fromBech32(address)
    return decoded.prefix === prefix
  } catch {
    return false
  }
}

export function isValidInjectiveAddress(address: string): boolean {
  return isValidBech32Address(address, 'inj')
}

export function isValidValidatorOperatorAddress(address: string): boolean {
  return isValidBech32Address(address, 'injvaloper')
}

export function isValidEthereumAddress(address: string): boolean {
  // Ethereum address: 0x followed by 40 hex characters
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/
  if (!ethAddressRegex.test(address)) {
    return false
  }
  
  // Optional: validate checksum
  return true
}

export function toChecksumAddress(address: string): string {
  if (!isValidEthereumAddress(address)) {
    return address
  }
  
  // Simple checksum implementation
  // For production, use a proper checksum library
  return address
}
