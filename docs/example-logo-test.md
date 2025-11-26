# Example Test: Finding Logo URL for Token `0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8`

This document provides a complete, step-by-step example of how to find a token logo URL following Uniswap's implementation pattern. This can be used as a reference for another AI or developer.

## Test Case

- **Token Address**: `0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8`
- **Chain ID**: `1` (Ethereum Mainnet)
- **Expected Result**: Logo URL from Uniswap Assets repository

## Step-by-Step Process

### Step 1: Identify Token Information

```typescript
const TOKEN_ADDRESS = '0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8'
const CHAIN_ID = 1 // Ethereum Mainnet
```

**Notes:**
- The address format (`0x` + 40 hex characters) indicates an EVM-compatible chain
- If chain is unknown, default to Ethereum Mainnet (chain ID 1) for EVM addresses
- For Solana addresses, use chain ID 501 (devnet) or 101 (mainnet)

### Step 2: Map Chain ID to Network Name

```typescript
const CHAIN_NETWORK_NAMES: Record<number, string> = {
  1: 'ethereum',      // Ethereum Mainnet
  137: 'polygon',     // Polygon
  42161: 'arbitrum',  // Arbitrum One
  10: 'optimism',     // Optimism
  8453: 'base',       // Base
  // ... other chains
}

const networkName = CHAIN_NETWORK_NAMES[CHAIN_ID] || 'ethereum'
// Result: 'ethereum'
```

**Critical:** The network name must match the directory structure in the Uniswap Assets repository:
- Check: https://github.com/Uniswap/assets/tree/master/blockchains
- Common names: `ethereum`, `polygon`, `arbitrum`, `optimism`, `base`, `celo`, `bsc`, `avalanche`, `blast`, `zora`, `zksync`, `solana`

### Step 3: Checksum the Address (EIP-55)

```typescript
import { getAddress } from '@ethersproject/address'

const checksummedAddress = getAddress(TOKEN_ADDRESS)
// Result: '0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8'
```

**Important:**
- Addresses in the Uniswap Assets repository are stored with EIP-55 checksumming (mixed case)
- The `getAddress()` function from ethers.js automatically checksums addresses
- Original address: `0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8`
- Checksummed: `0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8` (already checksummed)

### Step 4: Try GraphQL API First (Primary Source)

```typescript
// GraphQL Query
const query = `
  query Token($chain: Chain!, $address: String) {
    token(chain: $chain, address: $address) {
      project {
        logoUrl
      }
    }
  }
`

// Query Variables
const variables = {
  chain: 'ETHEREUM',  // GraphQL Chain enum
  address: '0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8'
}

// Execute Query
const response = await apolloClient.query({ query, variables })

// Extract logoUrl
const logoUrl = response.data?.token?.project?.logoUrl
```

**Result:** `null` or `undefined` (token may not be in GraphQL database yet)

**Priority Order:**
1. ✅ `token.project.logoUrl` (or `token.project.logo.url` if using newer schema)
2. ⬇️ Fallback to constructed URL (Step 5)

### Step 5: Construct Fallback URL (Secondary Source)

If GraphQL doesn't return a logoUrl, construct the URL from Uniswap Assets repository:

```typescript
function constructLogoUrl(chainId: number, address: string): string {
  const networkName = CHAIN_NETWORK_NAMES[chainId] || 'ethereum'
  const checksummedAddress = getAddress(address)
  
  return `https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/${networkName}/assets/${checksummedAddress}/logo.png`
}

const logoUrl = constructLogoUrl(1, '0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8')
```

**Result:**
```
https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8/logo.png
```

### Step 6: URL Format Breakdown

The constructed URL follows this pattern:

```
https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/{networkName}/assets/{checksummedAddress}/logo.png
```

**For our example:**
- Base URL: `https://raw.githubusercontent.com/Uniswap/assets/master`
- Network: `ethereum`
- Address: `0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8`
- Filename: `logo.png`

**Final URL:**
```
https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8/logo.png
```

### Step 7: Verify URL Exists

To verify the logo exists at this URL:

1. **Check GitHub Repository:**
   - Navigate to: https://github.com/Uniswap/assets/tree/master/blockchains/ethereum/assets/0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8
   - Look for `logo.png` file

2. **Direct URL Access:**
   - Open: https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8/logo.png
   - If 404, the logo doesn't exist in the repository yet

3. **Fallback Behavior:**
   - If URL returns 404, show visual fallback (colored circle with token symbol initials)

## Complete Implementation Example

```typescript
import { getAddress } from '@ethersproject/address'

// Configuration
const CHAIN_NETWORK_NAMES: Record<number, string> = {
  1: 'ethereum',
  137: 'polygon',
  42161: 'arbitrum',
  10: 'optimism',
  8453: 'base',
}

// Main function
async function getTokenLogoUrl(
  chainId: number,
  address: string,
  graphQLClient?: any
): Promise<string | null> {
  // Step 1: Try GraphQL API
  if (graphQLClient) {
    try {
      const { data } = await graphQLClient.query({
        query: TOKEN_QUERY,
        variables: {
          chain: chainIdToGraphQLChain(chainId),
          address,
        },
      })
      
      if (data?.token?.project?.logoUrl) {
        return data.token.project.logoUrl
      }
    } catch (error) {
      console.warn('GraphQL query failed, using fallback:', error)
    }
  }
  
  // Step 2: Construct fallback URL
  const networkName = CHAIN_NETWORK_NAMES[chainId] || 'ethereum'
  const checksummedAddress = getAddress(address)
  
  return `https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/${networkName}/assets/${checksummedAddress}/logo.png`
}

// Usage
const logoUrl = await getTokenLogoUrl(
  1, // Ethereum Mainnet
  '0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8'
)

console.log('Logo URL:', logoUrl)
// Output: https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8/logo.png
```

## Test Results

When running the test script (`test-token-logo-example.ts`), the output shows:

```
================================================================================
TOKEN LOGO URL LOOKUP PROCESS
================================================================================

Token Address: 0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8
Chain ID: 1
Network: ethereum

--- Step 1: Querying GraphQL API ---
❌ No logo URL from GraphQL API (using fallback)

--- Step 2: Constructing Fallback URL ---
Original Address: 0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8
Checksummed Address: 0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8
✅ Constructed Fallback URL: https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8/logo.png

================================================================================
RESULT
================================================================================

✅ Final Logo URL: https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8/logo.png
```

## Key Takeaways

1. **Always checksum addresses** - Use `ethers.getAddress()` or similar
2. **Network name mapping is critical** - Must match Uniswap Assets repo structure
3. **GraphQL is primary source** - Always try GraphQL API first
4. **Fallback URL construction** - Use when GraphQL doesn't return logoUrl
5. **Handle 404 errors** - Show visual fallback if URL doesn't exist

## Visual Fallback (If URL Doesn't Exist)

If the constructed URL returns 404, implement a visual fallback:

```typescript
function TokenLogo({ logoUrl, symbol, onError }) {
  const [error, setError] = useState(false)
  
  if (!logoUrl || error) {
    // Show colored circle with symbol initials
    return (
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        backgroundColor: generateColorFromSymbol(symbol),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 10,
      }}>
        {symbol?.slice(0, 3).toUpperCase() || '?'}
      </div>
    )
  }
  
  return (
    <img
      src={logoUrl}
      alt={symbol}
      onError={() => setError(true)}
    />
  )
}
```

## Testing Checklist

- [x] Address is properly formatted (0x + 40 hex chars)
- [x] Chain ID is correctly mapped to network name
- [x] Address is checksummed (EIP-55)
- [x] URL format matches Uniswap Assets repository structure
- [x] GraphQL query attempted first (if available)
- [x] Fallback URL constructed correctly
- [x] Error handling for missing logos

## Next Steps for Another AI

1. **Run the test script** to see the process in action
2. **Verify the URL** by checking if it exists in the repository
3. **Implement in your application** using the code examples
4. **Test with other token addresses** to ensure it works across chains
5. **Add error handling** for cases where logos don't exist

## Additional Examples

### Example 2: USDC on Ethereum
```typescript
const logoUrl = await getTokenLogoUrl(
  1, // Ethereum
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC
)
// Result: https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png
```

### Example 3: USDC on Polygon
```typescript
const logoUrl = await getTokenLogoUrl(
  137, // Polygon
  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' // USDC
)
// Result: https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/polygon/assets/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174/logo.png
```

### Example 4: USDC on Base
```typescript
const logoUrl = await getTokenLogoUrl(
  8453, // Base
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC
)
// Result: https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/base/assets/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/logo.png
```

---

**Note:** This example demonstrates the complete process. The actual logo may or may not exist at the constructed URL. Always implement proper error handling and visual fallbacks.
