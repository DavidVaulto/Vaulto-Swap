# Token Image Loading - Quick Reference Implementation

Quick copy-paste code snippets for implementing token image loading.

## Minimal Implementation (Copy-Paste Ready)

### 1. GraphQL Query

```graphql
# graphql/token.graphql
query Token($chain: Chain!, $address: String) {
  token(chain: $chain, address: $address) {
    id
    address
    chain
    decimals
    name
    symbol
    project {
      logoUrl
    }
  }
}
```

### 2. TypeScript Types

```typescript
// types.ts
export interface CurrencyInfo {
  currency: {
    chainId: number
    address: string
    symbol?: string | null
    name?: string | null
  }
  logoUrl?: string | null
}

export enum Chain {
  ETHEREUM = 'ETHEREUM',
  POLYGON = 'POLYGON',
  ARBITRUM = 'ARBITRUM',
  OPTIMISM = 'OPTIMISM',
  BASE = 'BASE',
  // Add more as needed
}
```

### 3. Core Utility Functions

```typescript
// utils/tokenLogo.ts
/**
 * Converts currency ID to GraphQL variables
 * Format: "1-0x..." or "1" for native
 */
export function currencyIdToContractInput(currencyId: string) {
  const [chainId, address] = currencyId.split('-')
  return {
    chain: chainIdToGraphQLChain(parseInt(chainId)),
    address: address || null,
  }
}

function chainIdToGraphQLChain(chainId: number): Chain {
  const map: Record<number, Chain> = {
    1: Chain.ETHEREUM,
    137: Chain.POLYGON,
    42161: Chain.ARBITRUM,
    10: Chain.OPTIMISM,
    8453: Chain.BASE,
  }
  return map[chainId] || Chain.ETHEREUM
}

/**
 * Constructs fallback logo URL from Uniswap Assets repo
 */
export function getFallbackLogoUrl(chainId: number, address: string): string {
  const networkNames: Record<number, string> = {
    1: 'ethereum',
    137: 'polygon',
    42161: 'arbitrum',
    10: 'optimism',
    8453: 'base',
  }
  
  const networkName = networkNames[chainId] || 'ethereum'
  
  // Checksum address (simplified - use ethers.getAddress in production)
  const checksummed = address
  
  return `https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/${networkName}/assets/${checksummed}/logo.png`
}

/**
 * Converts GraphQL token to CurrencyInfo
 */
export function tokenToCurrencyInfo(token: any): CurrencyInfo {
  const chainId = graphQLChainToChainId(token.chain)
  
  return {
    currency: {
      chainId,
      address: token.address || '',
      symbol: token.symbol,
      name: token.name,
    },
    logoUrl: token.project?.logoUrl || null,
  }
}

function graphQLChainToChainId(chain: Chain): number {
  const map: Record<Chain, number> = {
    [Chain.ETHEREUM]: 1,
    [Chain.POLYGON]: 137,
    [Chain.ARBITRUM]: 42161,
    [Chain.OPTIMISM]: 10,
    [Chain.BASE]: 8453,
  }
  return map[chain] || 1
}
```

### 4. React Hook

```typescript
// hooks/useCurrencyInfo.ts
import { useQuery } from '@apollo/client'
import { useMemo } from 'react'
import { TOKEN_QUERY } from '../graphql/queries'
import { currencyIdToContractInput, tokenToCurrencyInfo, getFallbackLogoUrl } from '../utils/tokenLogo'

export function useCurrencyInfo(currencyId?: string) {
  const variables = useMemo(() => {
    if (!currencyId) return null
    return currencyIdToContractInput(currencyId)
  }, [currencyId])

  const { data, loading, error } = useQuery(TOKEN_QUERY, {
    variables: variables || { chain: Chain.ETHEREUM, address: null },
    skip: !currencyId || !variables,
  })

  const currencyInfo = useMemo(() => {
    if (!currencyId || !data?.token) return null

    const info = tokenToCurrencyInfo(data.token)
    
    // Apply fallback if no logoUrl
    if (!info.logoUrl && info.currency.address) {
      info.logoUrl = getFallbackLogoUrl(info.currency.chainId, info.currency.address)
    }

    return info
  }, [currencyId, data?.token])

  return { currencyInfo, loading, error }
}
```

### 5. React Component

```typescript
// components/TokenLogo.tsx
import React, { useState } from 'react'

interface TokenLogoProps {
  logoUrl?: string | null
  symbol?: string | null
  size?: number
}

export function TokenLogo({ logoUrl, symbol, size = 40 }: TokenLogoProps) {
  const [error, setError] = useState(false)
  const showFallback = !logoUrl || error

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      {showFallback ? (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: '#627EEA', // Default color
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: size / 4,
            fontWeight: 500,
          }}
        >
          {symbol?.slice(0, 3).toUpperCase() || '?'}
        </div>
      ) : (
        <img
          src={logoUrl}
          alt={symbol || 'Token'}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
          }}
          onError={() => setError(true)}
        />
      )}
    </div>
  )
}
```

### 6. Usage Example

```typescript
// Example usage
import { useCurrencyInfo } from './hooks/useCurrencyInfo'
import { TokenLogo } from './components/TokenLogo'

function TokenDisplay() {
  // USDC on Ethereum: chainId-address
  const { currencyInfo, loading } = useCurrencyInfo('1-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <TokenLogo
        logoUrl={currencyInfo?.logoUrl}
        symbol={currencyInfo?.currency.symbol}
        size={48}
      />
      <p>{currencyInfo?.currency.name}</p>
    </div>
  )
}
```

## Complete Working Example (Single File)

```typescript
// TokenImageLoader.tsx - Complete working example
import React, { useState, useMemo } from 'react'
import { useQuery, gql } from '@apollo/client'

// GraphQL Query
const TOKEN_QUERY = gql`
  query Token($chain: Chain!, $address: String) {
    token(chain: $chain, address: $address) {
      id
      address
      chain
      decimals
      name
      symbol
      project {
        logoUrl
      }
    }
  }
`

// Types
interface TokenLogoProps {
  logoUrl?: string | null
  symbol?: string | null
  size?: number
}

// Component
export function TokenLogo({ logoUrl, symbol, size = 40 }: TokenLogoProps) {
  const [error, setError] = useState(false)
  const showFallback = !logoUrl || error

  const fallbackColor = useMemo(() => {
    // Generate color from symbol
    const hash = (symbol || '').split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    const hue = Math.abs(hash) % 360
    return `hsl(${hue}, 70%, 50%)`
  }, [symbol])

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      {showFallback ? (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: fallbackColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: size / 4,
            fontWeight: 500,
          }}
        >
          {symbol?.slice(0, 3).toUpperCase() || '?'}
        </div>
      ) : (
        <img
          src={logoUrl!}
          alt={symbol || 'Token'}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
          }}
          onError={() => setError(true)}
        />
      )}
    </div>
  )
}

// Hook
export function useTokenLogo(currencyId: string) {
  const [chainId, address] = currencyId.split('-')
  
  const chainMap: Record<number, string> = {
    1: 'ETHEREUM',
    137: 'POLYGON',
    42161: 'ARBITRUM',
    10: 'OPTIMISM',
    8453: 'BASE',
  }

  const { data, loading } = useQuery(TOKEN_QUERY, {
    variables: {
      chain: chainMap[parseInt(chainId)] || 'ETHEREUM',
      address: address || null,
    },
    skip: !currencyId,
  })

  const logoUrl = useMemo(() => {
    // 1. Try GraphQL response
    if (data?.token?.project?.logoUrl) {
      return data.token.project.logoUrl
    }

    // 2. Construct fallback URL
    if (address) {
      const networkMap: Record<number, string> = {
        1: 'ethereum',
        137: 'polygon',
        42161: 'arbitrum',
        10: 'optimism',
        8453: 'base',
      }
      const network = networkMap[parseInt(chainId)] || 'ethereum'
      return `https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/${network}/assets/${address}/logo.png`
    }

    return null
  }, [data, chainId, address])

  return {
    logoUrl,
    symbol: data?.token?.symbol,
    name: data?.token?.name,
    loading,
  }
}

// Usage
export function TokenDisplay({ currencyId }: { currencyId: string }) {
  const { logoUrl, symbol, loading } = useTokenLogo(currencyId)

  if (loading) return <div>Loading...</div>

  return <TokenLogo logoUrl={logoUrl} symbol={symbol} size={48} />
}
```

## Network Name Reference

```typescript
// Complete network name mapping
export const NETWORK_NAMES: Record<number, string> = {
  // EVM Chains
  1: 'ethereum',           // Ethereum Mainnet
  5: 'goerli',             // Goerli Testnet
  11155111: 'sepolia',     // Sepolia Testnet
  137: 'polygon',          // Polygon
  80001: 'mumbai',         // Mumbai Testnet
  42161: 'arbitrum',       // Arbitrum One
  421613: 'arbitrum-goerli', // Arbitrum Goerli
  10: 'optimism',          // Optimism
  420: 'optimism-goerli',  // Optimism Goerli
  8453: 'base',            // Base
  84531: 'base-goerli',    // Base Goerli
  42220: 'celo',           // Celo
  44787: 'celo-alfajores', // Celo Alfajores
  56: 'bsc',               // BNB Smart Chain
  97: 'bsc-testnet',       // BSC Testnet
  43114: 'avalanche',      // Avalanche C-Chain
  43113: 'avalanche-fuji', // Avalanche Fuji
  81457: 'blast',          // Blast
  168587773: 'blast-sepolia', // Blast Sepolia
  7777777: 'zora',         // Zora
  324: 'zksync',           // zkSync Era
  280: 'zksync-goerli',    // zkSync Goerli
  
  // Solana
  501: 'solana',           // Solana (devnet)
  101: 'solana',           // Solana Mainnet
  102: 'solana',           // Solana Testnet
  103: 'solana',           // Solana Devnet
}
```

## Address Checksumming

```typescript
// utils/address.ts
import { getAddress } from 'ethers' // npm install ethers

export function checksumAddress(address: string): string {
  try {
    return getAddress(address) // Automatically checksums
  } catch {
    return address // Return as-is if invalid
  }
}

// Usage in getFallbackLogoUrl
export function getFallbackLogoUrl(chainId: number, address: string): string {
  const networkName = NETWORK_NAMES[chainId] || 'ethereum'
  const checksummed = checksumAddress(address)
  return `https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/${networkName}/assets/${checksummed}/logo.png`
}
```

## Testing Examples

```typescript
// Test cases
const testCases = [
  {
    currencyId: '1-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
    expectedLogo: 'https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png'
  },
  {
    currencyId: '137-0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
    expectedLogo: 'https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/polygon/assets/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174/logo.png'
  },
  {
    currencyId: '8453-0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
    expectedLogo: 'https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/base/assets/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/logo.png'
  },
]
```

## Common Issues & Solutions

### Issue: GraphQL query returns null
**Solution**: Check that:
- Chain enum matches your GraphQL schema
- Address is checksummed correctly
- Token exists on the chain

### Issue: Image fails to load
**Solution**: 
- Check CORS settings
- Verify URL is accessible
- Implement error handling with fallback

### Issue: Wrong network name in URL
**Solution**: 
- Verify `NETWORK_NAMES` mapping matches Uniswap Assets repo
- Check: https://github.com/Uniswap/assets/tree/master/blockchains

### Issue: Address not checksummed
**Solution**: 
- Use `ethers.getAddress()` or similar
- Ensure address format is `0x` + 40 hex characters

