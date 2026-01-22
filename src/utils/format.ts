/**
 * Format a token amount from its smallest unit (with decimals) to a human-readable string
 * @param amount - The amount as a string (e.g., "1000000000000000000" for 1 INJ with 18 decimals)
 * @param decimals - Number of decimal places (default: 18 for INJ)
 * @param displayDecimals - Number of decimal places to display (default: 4)
 * @returns Formatted string (e.g., "1.0000")
 */
export function formatTokenAmount(amount: string, decimals: number = 18, displayDecimals: number = 4): string {
  if (!amount || amount === '0') {
    return '0'
  }

  // Handle decimal strings (e.g., "110000000000000000.000000000000000000")
  // Extract just the integer part before the decimal point
  let amountStr = amount.trim()
  if (amountStr.includes('.')) {
    const parts = amountStr.split('.')
    amountStr = parts[0] // Take only the integer part
    // If there's a fractional part, we could handle it, but for token amounts
    // the API typically returns the full amount in the integer part
  }

  // Convert string to BigInt for precision
  const amountBigInt = BigInt(amountStr)
  const divisor = BigInt(10 ** decimals)
  
  // Calculate integer and fractional parts
  const integerPart = amountBigInt / divisor
  const fractionalPart = amountBigInt % divisor
  
  if (fractionalPart === BigInt(0)) {
    return integerPart.toString()
  }
  
  // Convert fractional part to decimal string with padding to full decimals
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
  
  // Take the first displayDecimals digits (this gives us the most significant digits)
  const displayFractional = fractionalStr.substring(0, displayDecimals)
  
  // Remove trailing zeros
  const trimmedFractional = displayFractional.replace(/0+$/, '')
  
  if (trimmedFractional === '') {
    return integerPart.toString()
  }
  
  return `${integerPart}.${trimmedFractional}`
}
