# Token Image Loading Implementation Guide

This guide provides complete instructions for implementing token image/logo loading functionality similar to Uniswap's implementation. This can be used by another AI or developer to replicate the functionality in a different application.

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [GraphQL Setup](#graphql-setup)
4. [Data Models](#data-models)
5. [Core Implementation](#core-implementation)
6. [Component Implementation](#component-implementation)
7. [Fallback Mechanisms](#fallback-mechanisms)
8. [Complete Code Examples](#complete-code-examples)
9. [Step-by-Step Implementation](#step-by-step-implementation)

---

## Overview

The token image loading system retrieves token logos from multiple sources with a priority order:
1. **GraphQL API** - Primary source (`project.logoUrl` or `project.logo.url`)
2. **Uniswap Assets Repository** - Fallback URL construction
3. **Local Assets** - Special cases (native currencies, wrapped tokens)
4. **Generated Fallback** - Colored circle with token symbol initials

### Key Components
- GraphQL query to fetch token data
- Data transformation layer
- Currency info type with logoUrl field
- Image component with fallback handling
- Network name mapping for URL construction

---

## Architecture

```
┌─────────────────┐
│   Component     │
│  (TokenLogo)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CurrencyInfo   │
│   (logoUrl)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│ GraphQL Query   │─────▶│  GraphQL API     │
│  (useTokenQuery) │      │  (project.logoUrl)│
└────────┬────────┘      └──────────────────┘
         │
         ▼
┌─────────────────┐
│ Transform Data  │
│ (gqlTokenTo...) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Fallback URL   │─────▶│ Uniswap Assets   │
│  Construction   │      │  GitHub Repo      │
└─────────────────┘      └──────────────────┘
```

---

## GraphQL Setup

### 1. GraphQL Query Definition

Create a GraphQL query file (`token.graphql`):

```graphql
query Token($chain: Chain!, $address: String) {
  token(chain: $chain, address: $address) {
    id
    address
    chain
    decimals
    name
    symbol
    standard
    project {
      id
      name
      logoUrl
      isSpam
      safetyLevel
      tokens {
        chain
        address
      }
    }
    feeData {
      buyFeeBps
      sellFeeBps
    }
    protectionInfo {
      result
      attackTypes
    }
    isBridged
    bridgedWithdrawalInfo {
      chain
      provider
      url
    }
  }
}
```

**Alternative (if using newer schema with Image type):**
```graphql
query Token($chain: Chain!, $address: String) {
  token(chain: $chain, address: $address) {
    id
    address
    chain
    decimals
    name
    symbol
    standard
    project {
      id
      name
      logo {
        url
      }
      logoUrl  # Fallback for deprecated field
      isSpam
      safetyLevel
      tokens {
        chain
        address
      }
    }
    feeData {
      buyFeeBps
      sellFeeBps
    }
    protectionInfo {
      result
      attackTypes
    }
    isBridged
    bridgedWithdrawalInfo {
      chain
      provider
      url
    }
  }
}
```

### 2. GraphQL Types

```typescript
// GraphQL API types
export enum Chain {
  ETHEREUM = 'ETHEREUM',
  POLYGON = 'POLYGON',
  ARBITRUM = 'ARBITRUM',
  OPTIMISM = 'OPTIMISM',
  BASE = 'BASE',
  CELO = 'CELO',
  BNB = 'BNB',
  AVALANCHE = 'AVALANCHE',
  BLAST = 'BLAST',
  ZORA = 'ZORA',
  ZKSYNC = 'ZKSYNC',
  SOLANA = 'SOLANA',
  // ... other chains
}

export interface ContractInput {
  chain: Chain
  address?: string | null
}

export interface TokenProject {
  id: string
  name?: string | null
  logoUrl?: string | null
  logo?: {
    url?: string | null
  } | null
  isSpam?: boolean | null
  safetyLevel?: SafetyLevel | null
  tokens?: Array<{
    chain: Chain
    address: string
  }> | null
}

export interface Token {
  id: string
  address: string
  chain: Chain
  decimals: number
  name?: string | null
  symbol?: string | null
  standard?: string | null
  project?: TokenProject | null
  feeData?: {
    buyFeeBps?: number | null
    sellFeeBps?: number | null
  } | null
  protectionInfo?: {
    result?: string | null
    attackTypes?: string[] | null
  } | null
  isBridged?: boolean | null
  bridgedWithdrawalInfo?: {
    chain?: Chain | null
    provider?: string | null
    url?: string | null
  } | null
}

export interface TokenQuery {
  token?: Token | null
}

export interface TokenQueryVariables {
  chain: Chain
  address?: string | null
}
```

---

## Data Models

### 1. CurrencyInfo Type

```typescript
// types/CurrencyInfo.ts
export interface CurrencyInfo {
  currency: Currency
  currencyId: string
  logoUrl?: string | null
  safetyInfo?: SafetyInfo | null
  isSpam?: boolean | null
  isBridged?: boolean | null
  bridgedWithdrawalInfo?: BridgedWithdrawalInfo | null
}

export interface Currency {
  chainId: number
  address: string
  decimals: number
  symbol?: string | null
  name?: string | null
  isNative: boolean
  isToken: boolean
}

export interface SafetyInfo {
  tokenList: string
  protectionResult: string
}

export interface BridgedWithdrawalInfo {
  chain: Chain
  provider?: string | null
  url?: string | null
}
```

### 2. Chain Info Type

```typescript
// types/ChainInfo.ts
export interface ChainInfo {
  id: number
  assetRepoNetworkName?: string | null  // e.g., 'ethereum', 'base', 'polygon'
  nativeCurrency: {
    logo: string | ImageSourcePropType
  }
  // ... other chain properties
}

// Network name mapping
export const CHAIN_NETWORK_NAMES: Record<number, string> = {
  1: 'ethereum',      // Ethereum Mainnet
  137: 'polygon',      // Polygon
  42161: 'arbitrum',   // Arbitrum One
  10: 'optimism',      // Optimism
  8453: 'base',        // Base
  42220: 'celo',       // Celo
  56: 'bsc',           // BNB Smart Chain
  43114: 'avalanche',  // Avalanche
  81457: 'blast',      // Blast
  7777777: 'zora',     // Zora
  324: 'zksync',       // zkSync Era
  501: 'solana',       // Solana
  // Add other chains as needed
}
```

---

## Core Implementation

### 1. Currency ID to Contract Input Converter

```typescript
// utils/currencyIdToContractInput.ts

import { Chain } from './types/GraphQL'
import { ChainInfo } from './types/ChainInfo'

/**
 * Converts a currency ID (format: "CHAIN-ADDRESS" or "CHAIN" for native)
 * to GraphQL ContractInput format
 */
export function currencyIdToContractInput(currencyId: string): {
  chain: Chain
  address?: string | null
} {
  const parts = currencyId.split('-')
  const chainId = parseInt(parts[0], 10)
  const address = parts.length > 1 ? parts[1] : null

  return {
    chain: chainIdToGraphQLChain(chainId),
    address: address || null,
  }
}

/**
 * Converts chain ID to GraphQL Chain enum
 */
function chainIdToGraphQLChain(chainId: number): Chain {
  const chainMap: Record<number, Chain> = {
    1: Chain.ETHEREUM,
    137: Chain.POLYGON,
    42161: Chain.ARBITRUM,
    10: Chain.OPTIMISM,
    8453: Chain.BASE,
    42220: Chain.CELO,
    56: Chain.BNB,
    43114: Chain.AVALANCHE,
    81457: Chain.BLAST,
    7777777: Chain.ZORA,
    324: Chain.ZKSYNC,
    501: Chain.SOLANA,
    // Add other chains
  }
  return chainMap[chainId] || Chain.ETHEREUM
}
```

### 2. GraphQL Token to CurrencyInfo Converter

```typescript
// utils/gqlTokenToCurrencyInfo.ts

import { Token } from './types/GraphQL'
import { CurrencyInfo, Currency, SafetyInfo } from './types/CurrencyInfo'
import { chainIdToGraphQLChain, graphQLChainToChainId } from './chainUtils'

/**
 * Converts GraphQL Token response to CurrencyInfo
 */
export function gqlTokenToCurrencyInfo(token: Token): CurrencyInfo | null {
  const { name, chain, address, decimals, symbol, project, feeData, protectionInfo, isBridged, bridgedWithdrawalInfo } = token
  
  const chainId = graphQLChainToChainId(chain)

  // Build Currency object
  const currency: Currency = {
    chainId,
    address: address || '',
    decimals,
    symbol: symbol || null,
    name: name || null,
    isNative: !address || address === 'NATIVE',
    isToken: !!address && address !== 'NATIVE',
  }

  // Extract logo URL (prefer logo.url, fallback to logoUrl)
  const logoUrl = project?.logo?.url ?? project?.logoUrl ?? null

  // Build safety info
  const safetyInfo: SafetyInfo | null = project?.safetyLevel
    ? {
        tokenList: 'DEFAULT',
        protectionResult: protectionInfo?.result || 'BENIGN',
      }
    : null

  // Build CurrencyInfo
  return {
    currency,
    currencyId: buildCurrencyId(chainId, address || 'NATIVE'),
    logoUrl,
    safetyInfo,
    isSpam: project?.isSpam ?? false,
    isBridged: isBridged ?? false,
    bridgedWithdrawalInfo: bridgedWithdrawalInfo || null,
  }
}

/**
 * Builds a currency ID from chain ID and address
 */
function buildCurrencyId(chainId: number, address: string): string {
  return address === 'NATIVE' ? `${chainId}` : `${chainId}-${address}`
}

/**
 * Converts GraphQL Chain enum to chain ID
 */
function graphQLChainToChainId(chain: Chain): number {
  const chainMap: Record<Chain, number> = {
    [Chain.ETHEREUM]: 1,
    [Chain.POLYGON]: 137,
    [Chain.ARBITRUM]: 42161,
    [Chain.OPTIMISM]: 10,
    [Chain.BASE]: 8453,
    [Chain.CELO]: 42220,
    [Chain.BNB]: 56,
    [Chain.AVALANCHE]: 43114,
    [Chain.BLAST]: 81457,
    [Chain.ZORA]: 7777777,
    [Chain.ZKSYNC]: 324,
    [Chain.SOLANA]: 501,
    // Add other chains
  }
  return chainMap[chain] || 1
}
```

### 3. Fallback URL Construction

```typescript
// utils/getTokenLogoUrl.ts

import { ChainInfo, CHAIN_NETWORK_NAMES } from './types/ChainInfo'
import { getValidAddress } from './addressUtils'

/**
 * Constructs a token logo URL from Uniswap Assets repository
 * Format: https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/{networkName}/assets/{address}/logo.png
 */
export function getTokenLogoUrl(
  chainId: number,
  address: string,
  chainInfo?: ChainInfo
): string | undefined {
  // Get network name from chain info or fallback map
  const networkName = chainInfo?.assetRepoNetworkName || CHAIN_NETWORK_NAMES[chainId] || 'ethereum'

  // Validate and checksum address
  const checksummedAddress = getValidAddress(address, chainId)
  if (!checksummedAddress) {
    return undefined
  }

  // Special cases (if needed)
  if (chainId === 42220 && address === '0x471EcE3750Da237f93B8E339c536989b8978a438') {
    // Celo wrapped token - use local asset
    return '/assets/celo-logo.png' // or your local asset path
  }

  // Construct URL
  return `https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/${networkName}/assets/${checksummedAddress}/logo.png`
}

/**
 * Validates and checksums an Ethereum address
 */
function getValidAddress(address: string, chainId: number): string | null {
  if (!address || address === 'NATIVE') {
    return null
  }

  // Basic validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return null
  }

  // For EVM chains, checksum the address
  // Use ethers.js or similar library
  try {
    // Example using ethers (install: npm install ethers)
    const { getAddress } = require('ethers')
    return getAddress(address) // This checksums the address
  } catch {
    return address // Return as-is if checksumming fails
  }
}
```

### 4. Hook for Fetching Currency Info

```typescript
// hooks/useCurrencyInfo.ts

import { useQuery } from '@apollo/client' // or your GraphQL client
import { useMemo } from 'react'
import { TOKEN_QUERY, TokenQuery, TokenQueryVariables } from './graphql/queries'
import { currencyIdToContractInput } from './utils/currencyIdToContractInput'
import { gqlTokenToCurrencyInfo } from './utils/gqlTokenToCurrencyInfo'
import { CurrencyInfo } from './types/CurrencyInfo'
import { getTokenLogoUrl } from './utils/getTokenLogoUrl'
import { getChainInfo } from './utils/chainInfo'

/**
 * Hook to fetch currency/token information including logo URL
 */
export function useCurrencyInfo(
  currencyId?: string,
  options?: {
    refetch?: boolean
    skip?: boolean
  }
): {
  currencyInfo: CurrencyInfo | null
  loading: boolean
  error?: Error
} {
  // Convert currency ID to GraphQL variables
  const variables = useMemo(() => {
    if (!currencyId) return null
    return currencyIdToContractInput(currencyId)
  }, [currencyId])

  // Execute GraphQL query
  const { data, loading, error } = useQuery<TokenQuery, TokenQueryVariables>(
    TOKEN_QUERY,
    {
      variables: variables || { chain: Chain.ETHEREUM, address: null },
      skip: !currencyId || !variables || options?.skip,
      fetchPolicy: options?.refetch ? 'cache-and-network' : 'cache-first',
    }
  )

  // Transform GraphQL response to CurrencyInfo
  const currencyInfo = useMemo(() => {
    if (!currencyId || !data?.token) {
      return null
    }

    // Convert GraphQL token to CurrencyInfo
    const info = gqlTokenToCurrencyInfo(data.token)
    if (!info) {
      return null
    }

    // If logoUrl is missing, try to construct fallback URL
    if (!info.logoUrl && info.currency.address && info.currency.address !== 'NATIVE') {
      const chainInfo = getChainInfo(info.currency.chainId)
      const fallbackUrl = getTokenLogoUrl(
        info.currency.chainId,
        info.currency.address,
        chainInfo
      )
      if (fallbackUrl) {
        info.logoUrl = fallbackUrl
      }
    }

    return info
  }, [currencyId, data?.token])

  return {
    currencyInfo,
    loading,
    error: error as Error | undefined,
  }
}
```

---

## Component Implementation

### 1. Token Logo Component

```typescript
// components/TokenLogo.tsx

import React, { useState, useMemo } from 'react'
import { Image, View, Text, StyleSheet, ActivityIndicator } from 'react-native' // or your UI library

interface TokenLogoProps {
  logoUrl?: string | null
  symbol?: string | null
  name?: string | null
  size?: number
  chainId?: number
  showNetworkLogo?: boolean
}

export function TokenLogo({
  logoUrl,
  symbol,
  name,
  size = 40,
  chainId,
  showNetworkLogo = true,
}: TokenLogoProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  // Generate fallback background color from token name/symbol
  const fallbackColor = useMemo(() => {
    const seed = name || symbol || ''
    return generateColorFromSeed(seed)
  }, [name, symbol])

  // Generate fallback text color (contrast)
  const fallbackTextColor = useMemo(() => {
    return getContrastColor(fallbackColor)
  }, [fallbackColor])

  // Handle image load
  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  // Handle image error
  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  // Show fallback if no URL or error
  const showFallback = !logoUrl || imageError

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* White background circle (for non-testnet tokens) */}
      {!isTestnetChain(chainId) && (
        <View
          style={[
            styles.background,
            {
              width: size * 0.96,
              height: size * 0.96,
              borderRadius: size / 2,
            },
          ]}
        />

      {/* Token Image or Fallback */}
      {showFallback ? (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: fallbackColor,
            },
          ]}
        >
          <Text
            style={[
              styles.fallbackText,
              {
                fontSize: size / 4,
                color: fallbackTextColor,
              },
            ]}
          >
            {symbol?.slice(0, 3).toUpperCase() || '?'}
          </Text>
        </View>
      ) : (
        <>
          {imageLoading && (
            <View style={styles.loader}>
              <ActivityIndicator size="small" />
            </View>
          )}
          <Image
            source={{ uri: logoUrl! }}
            style={[
              styles.image,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
            onLoad={handleImageLoad}
            onError={handleImageError}
            resizeMode="cover"
          />
        </>
      )}

      {/* Network logo badge (for non-mainnet chains) */}
      {showNetworkLogo && chainId && chainId !== 1 && (
        <View style={styles.networkBadge}>
          <NetworkLogo chainId={chainId} size={size * 0.4} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  background: {
    position: 'absolute',
    backgroundColor: 'white',
    top: '2%',
    left: '2%',
  },
  image: {
    zIndex: 1,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  fallbackText: {
    fontWeight: '500',
    textAlign: 'center',
  },
  loader: {
    position: 'absolute',
    zIndex: 0,
  },
  networkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -3,
    zIndex: 2,
  },
})

// Helper functions
function generateColorFromSeed(seed: string): string {
  // Simple hash-based color generation
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const hue = hash % 360
  return `hsl(${hue}, 70%, 50%)`
}

function getContrastColor(backgroundColor: string): string {
  // Simple contrast calculation (you may want to use a library)
  // For simplicity, return white or black based on brightness
  return '#FFFFFF' // or calculate based on background
}

function isTestnetChain(chainId?: number): boolean {
  const testnetChainIds = [5, 11155111, 97, 80001] // Goerli, Sepolia, BSC Testnet, Mumbai
  return chainId ? testnetChainIds.includes(chainId) : false
}
```

### 2. Currency Logo Component (Wrapper)

```typescript
// components/CurrencyLogo.tsx

import React from 'react'
import { TokenLogo } from './TokenLogo'
import { CurrencyInfo } from '../types/CurrencyInfo'

interface CurrencyLogoProps {
  currencyInfo?: CurrencyInfo | null
  size?: number
  hideNetworkLogo?: boolean
}

export function CurrencyLogo({
  currencyInfo,
  size = 40,
  hideNetworkLogo = false,
}: CurrencyLogoProps) {
  if (!currencyInfo) {
    return null
  }

  const { currency, logoUrl } = currencyInfo
  const { chainId, symbol, name } = currency

  return (
    <TokenLogo
      logoUrl={logoUrl}
      symbol={symbol}
      name={name}
      chainId={chainId}
      size={size}
      showNetworkLogo={!hideNetworkLogo}
    />
  )
}
```

### 3. Usage Example

```typescript
// Example usage in a component
import { useCurrencyInfo } from './hooks/useCurrencyInfo'
import { CurrencyLogo } from './components/CurrencyLogo'

function TokenDisplay({ currencyId }: { currencyId: string }) {
  const { currencyInfo, loading } = useCurrencyInfo(currencyId)

  if (loading) {
    return <ActivityIndicator />
  }

  return (
    <View>
      <CurrencyLogo currencyInfo={currencyInfo} size={48} />
      <Text>{currencyInfo?.currency.symbol}</Text>
      <Text>{currencyInfo?.currency.name}</Text>
    </View>
  )
}
```

---

## Fallback Mechanisms

### Priority Order

1. **GraphQL API `project.logoUrl`** (or `project.logo.url`)
2. **Constructed Uniswap Assets URL** (if address is valid)
3. **Local assets** (for special cases like native currencies)
4. **Generated fallback** (colored circle with symbol initials)

### Implementation

```typescript
// utils/getLogoUrlWithFallback.ts

import { CurrencyInfo } from './types/CurrencyInfo'
import { getTokenLogoUrl } from './getTokenLogoUrl'
import { getChainInfo } from './chainInfo'
import { getNativeCurrencyLogo } from './nativeCurrency'

/**
 * Gets logo URL with all fallbacks applied
 */
export function getLogoUrlWithFallback(
  currencyInfo: CurrencyInfo
): string | null {
  const { currency, logoUrl } = currencyInfo

  // 1. Use GraphQL logoUrl if available
  if (logoUrl) {
    return logoUrl
  }

  // 2. For native currencies, use chain-specific logo
  if (currency.isNative) {
    const chainInfo = getChainInfo(currency.chainId)
    return chainInfo?.nativeCurrency.logo || null
  }

  // 3. Construct fallback URL from Uniswap Assets repo
  if (currency.address && currency.address !== 'NATIVE') {
    const chainInfo = getChainInfo(currency.chainId)
    const fallbackUrl = getTokenLogoUrl(
      currency.chainId,
      currency.address,
      chainInfo
    )
    if (fallbackUrl) {
      return fallbackUrl
    }
  }

  // 4. Return null (component will show generated fallback)
  return null
}
```

---

## Complete Code Examples

### Example 1: Full Implementation File Structure

```
src/
├── types/
│   ├── CurrencyInfo.ts
│   ├── ChainInfo.ts
│   └── GraphQL.ts
├── graphql/
│   ├── queries.ts
│   └── token.graphql
├── utils/
│   ├── currencyIdToContractInput.ts
│   ├── gqlTokenToCurrencyInfo.ts
│   ├── getTokenLogoUrl.ts
│   └── chainInfo.ts
├── hooks/
│   └── useCurrencyInfo.ts
└── components/
    ├── TokenLogo.tsx
    └── CurrencyLogo.tsx
```

### Example 2: Complete Hook Implementation

```typescript
// hooks/useCurrencyInfo.ts (Complete)

import { useQuery } from '@apollo/client'
import { useMemo } from 'react'
import { gql } from '@apollo/client'
import { TOKEN_QUERY } from '../graphql/queries'
import { currencyIdToContractInput } from '../utils/currencyIdToContractInput'
import { gqlTokenToCurrencyInfo } from '../utils/gqlTokenToCurrencyInfo'
import { getLogoUrlWithFallback } from '../utils/getLogoUrlWithFallback'
import { CurrencyInfo } from '../types/CurrencyInfo'

const TOKEN_QUERY = gql`
  query Token($chain: Chain!, $address: String) {
    token(chain: $chain, address: $address) {
      id
      address
      chain
      decimals
      name
      symbol
      standard
      project {
        id
        name
        logoUrl
        isSpam
        safetyLevel
      }
      isBridged
    }
  }
`

export function useCurrencyInfo(
  currencyId?: string,
  options?: { refetch?: boolean; skip?: boolean }
) {
  const variables = useMemo(() => {
    if (!currencyId) return null
    return currencyIdToContractInput(currencyId)
  }, [currencyId])

  const { data, loading, error } = useQuery(TOKEN_QUERY, {
    variables: variables || { chain: 'ETHEREUM', address: null },
    skip: !currencyId || !variables || options?.skip,
    fetchPolicy: options?.refetch ? 'cache-and-network' : 'cache-first',
  })

  const currencyInfo = useMemo(() => {
    if (!currencyId || !data?.token) return null

    const info = gqlTokenToCurrencyInfo(data.token)
    if (!info) return null

    // Apply fallback logo URL if needed
    if (!info.logoUrl) {
      const fallbackUrl = getLogoUrlWithFallback(info)
      if (fallbackUrl) {
        info.logoUrl = fallbackUrl
      }
    }

    return info
  }, [currencyId, data?.token])

  return { currencyInfo, loading, error }
}
```

---

## Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
npm install @apollo/client graphql
# or
npm install @tanstack/react-query graphql-request
# For address checksumming:
npm install ethers
# or
npm install @ethersproject/address
```

### Step 2: Set Up GraphQL Client

```typescript
// apollo/client.ts
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'

const httpLink = createHttpLink({
  uri: 'https://api.uniswap.org/v1/graphql', // Replace with your GraphQL endpoint
})

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
})
```

### Step 3: Create Type Definitions

Create all type files as shown in the [Data Models](#data-models) section.

### Step 4: Implement Utility Functions

1. `currencyIdToContractInput.ts` - Convert currency ID to GraphQL variables
2. `gqlTokenToCurrencyInfo.ts` - Transform GraphQL response
3. `getTokenLogoUrl.ts` - Construct fallback URLs
4. `chainInfo.ts` - Chain information and network name mapping

### Step 5: Create GraphQL Query

Create the GraphQL query file and generate types (if using codegen).

### Step 6: Implement Hook

Create `useCurrencyInfo.ts` hook that:
- Accepts currency ID
- Executes GraphQL query
- Transforms response
- Applies fallbacks

### Step 7: Create Components

1. `TokenLogo.tsx` - Core logo component with fallback UI
2. `CurrencyLogo.tsx` - Wrapper component

### Step 8: Test Implementation

```typescript
// Test example
function TestComponent() {
  // Test with USDC on Ethereum
  const { currencyInfo, loading } = useCurrencyInfo('1-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
  
  console.log('Logo URL:', currencyInfo?.logoUrl)
  // Should output: https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png
  
  return <CurrencyLogo currencyInfo={currencyInfo} />
}
```

---

## Additional Considerations

### 1. Error Handling

```typescript
// Add error handling in components
if (error) {
  console.error('Failed to load token:', error)
  // Show error state or fallback
}
```

### 2. Caching Strategy

- Use GraphQL cache for token data
- Consider image caching (React Native ImageCache, or browser cache)
- Cache chain info lookups

### 3. Performance Optimization

- Memoize expensive calculations
- Use React.memo for logo components
- Lazy load images
- Preload common token logos

### 4. Testing

```typescript
// Example test
describe('useCurrencyInfo', () => {
  it('should fetch token logo from GraphQL', async () => {
    const { result } = renderHook(() => useCurrencyInfo('1-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'))
    
    await waitFor(() => {
      expect(result.current.currencyInfo?.logoUrl).toBeDefined()
    })
  })
})
```

### 5. Network Name Mapping

Ensure your `CHAIN_NETWORK_NAMES` map matches Uniswap Assets repository structure:
- Check: https://github.com/Uniswap/assets/tree/master/blockchains
- Common names: `ethereum`, `polygon`, `arbitrum`, `optimism`, `base`, `celo`, `bsc`, `avalanche`, `blast`, `zora`, `zksync`, `solana`

---

## Summary

This implementation provides:
1. ✅ GraphQL integration for token data
2. ✅ Automatic logo URL extraction
3. ✅ Fallback URL construction from Uniswap Assets repo
4. ✅ Component with visual fallback (colored circle)
5. ✅ Support for multiple chains
6. ✅ Error handling and loading states
7. ✅ Type-safe implementation

The system prioritizes GraphQL API responses but gracefully falls back to constructed URLs and visual fallbacks when needed.

