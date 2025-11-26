# Instructions for Implementing Token Image Loading

This document provides instructions for another AI or developer to implement token image loading functionality based on Uniswap's implementation.

## Files Created

Three documentation files have been created:

1. **TOKEN_IMAGE_IMPLEMENTATION_GUIDE.md** - Comprehensive guide with:
   - Complete architecture explanation
   - Step-by-step implementation instructions
   - Full code examples with explanations
   - Type definitions
   - Component implementations
   - Testing strategies

2. **TOKEN_IMAGE_QUICK_REFERENCE.md** - Quick reference with:
   - Copy-paste ready code snippets
   - Minimal working examples
   - Network name mappings
   - Common issues and solutions

3. **IMPLEMENTATION_INSTRUCTIONS.md** (this file) - Overview and usage guide

## How Token Image Loading Works

### Flow Overview

```
User Request → Currency ID (e.g., "1-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
    ↓
Convert to GraphQL Variables { chain: "ETHEREUM", address: "0x..." }
    ↓
Execute GraphQL Query → Get token.project.logoUrl
    ↓
If logoUrl exists → Use it
    ↓
If not → Construct URL: https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/{network}/assets/{address}/logo.png
    ↓
If still no URL → Show fallback (colored circle with symbol initials)
```

### Key Components

1. **GraphQL Query** - Fetches token data including `project.logoUrl`
2. **Data Transformation** - Converts GraphQL response to `CurrencyInfo` type
3. **Fallback URL Construction** - Builds URL from Uniswap Assets repository
4. **Image Component** - Displays logo with error handling and visual fallback

## Implementation Steps

### For Another AI/Developer

1. **Read the Comprehensive Guide First**
   - Start with `TOKEN_IMAGE_IMPLEMENTATION_GUIDE.md`
   - Understand the architecture section
   - Review the data models

2. **Set Up Prerequisites**
   - Install GraphQL client (Apollo Client, React Query, etc.)
   - Set up GraphQL endpoint connection
   - Install address checksumming library (ethers.js)

3. **Implement Core Utilities**
   - `currencyIdToContractInput` - Convert currency ID to GraphQL variables
   - `gqlTokenToCurrencyInfo` - Transform GraphQL response
   - `getTokenLogoUrl` - Construct fallback URLs
   - Chain info and network name mapping

4. **Create GraphQL Query**
   - Define token query with `project.logoUrl` field
   - Set up query execution hook

5. **Build Components**
   - `TokenLogo` component with fallback UI
   - `CurrencyLogo` wrapper component

6. **Test Implementation**
   - Test with known tokens (USDC, DAI, etc.)
   - Verify fallback mechanisms work
   - Test error handling

### Quick Start (Using Quick Reference)

If you need a working implementation quickly:

1. Copy the "Complete Working Example" from `TOKEN_IMAGE_QUICK_REFERENCE.md`
2. Install dependencies: `npm install @apollo/client graphql ethers`
3. Replace GraphQL endpoint URL with your API
4. Adjust chain mappings to match your supported chains
5. Test with a known token address

## Key Implementation Details

### Currency ID Format

Currency IDs follow the format: `{chainId}-{address}` or `{chainId}` for native tokens

Examples:
- `1-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` - USDC on Ethereum
- `137-0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` - USDC on Polygon
- `1` - Native ETH on Ethereum

### GraphQL Query Variables

```typescript
{
  chain: "ETHEREUM",  // GraphQL Chain enum
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"  // Token address or null for native
}
```

### Logo URL Priority

1. **GraphQL API** - `token.project.logoUrl` (or `token.project.logo.url` if using newer schema)
2. **Constructed URL** - Built from Uniswap Assets repository
3. **Local Assets** - For special cases (native currencies)
4. **Visual Fallback** - Colored circle with token symbol initials

### Network Name Mapping

Critical for fallback URL construction. Must match Uniswap Assets repository structure:

```typescript
{
  1: 'ethereum',
  137: 'polygon',
  42161: 'arbitrum',
  10: 'optimism',
  8453: 'base',
  // ... etc
}
```

Verify against: https://github.com/Uniswap/assets/tree/master/blockchains

### Fallback URL Format

```
https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/{networkName}/assets/{checksummedAddress}/logo.png
```

Where:
- `networkName` - From chain info (e.g., 'ethereum', 'base')
- `checksummedAddress` - EIP-55 checksummed address (mixed case)

## Testing Checklist

- [ ] GraphQL query executes successfully
- [ ] Logo URL extracted from GraphQL response
- [ ] Fallback URL constructed correctly for missing logos
- [ ] Address checksumming works correctly
- [ ] Image loads and displays
- [ ] Error handling shows fallback UI
- [ ] Multiple chains supported
- [ ] Native currency logos work
- [ ] Component handles loading states
- [ ] Component handles error states

## Common Token Addresses for Testing

```typescript
// Ethereum Mainnet
USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'

// Polygon
USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'

// Base
USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// Arbitrum
USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
```

## Integration Points

### With Existing Token System

If you already have a token/currency system:

1. **Map your token format to Currency ID**
   ```typescript
   function yourTokenToCurrencyId(token: YourToken): string {
     return `${token.chainId}-${token.address}`
   }
   ```

2. **Use CurrencyInfo in your components**
   ```typescript
   const { currencyInfo } = useCurrencyInfo(yourTokenToCurrencyId(token))
   // Use currencyInfo.logoUrl in your UI
   ```

### With Different GraphQL Schema

If your GraphQL schema differs:

1. **Map your fields to expected structure**
   ```typescript
   function adaptYourTokenToStandard(token: YourToken): Token {
     return {
       project: {
         logoUrl: token.logo || token.imageUrl || null
       }
       // ... map other fields
     }
   }
   ```

2. **Adjust transformation function**
   - Modify `gqlTokenToCurrencyInfo` to match your schema
   - Update type definitions

## Performance Considerations

1. **Caching**
   - GraphQL responses are cached by Apollo Client
   - Consider image caching (browser cache or React Native ImageCache)
   - Cache chain info lookups

2. **Optimization**
   - Memoize expensive calculations
   - Use React.memo for logo components
   - Lazy load images
   - Preload common token logos

3. **Error Handling**
   - Implement retry logic for failed image loads
   - Cache failed URLs to avoid repeated requests
   - Show fallback immediately on error

## Troubleshooting

### GraphQL Query Returns Null

- Verify chain enum matches your schema
- Check address format (should be checksummed)
- Ensure token exists on the specified chain
- Check GraphQL endpoint URL and authentication

### Image Fails to Load

- Verify URL is accessible (check CORS)
- Check network name mapping is correct
- Verify address is checksummed correctly
- Ensure fallback UI displays correctly

### Wrong Logo Displayed

- Check currency ID format is correct
- Verify chain ID mapping
- Ensure address matches expected token
- Check GraphQL response data

### Performance Issues

- Implement image caching
- Use lazy loading for off-screen images
- Memoize component renders
- Optimize GraphQL query (only request needed fields)

## Next Steps

1. Review `TOKEN_IMAGE_IMPLEMENTATION_GUIDE.md` for detailed implementation
2. Use `TOKEN_IMAGE_QUICK_REFERENCE.md` for quick code snippets
3. Test with known token addresses
4. Integrate with your existing token system
5. Add error handling and loading states
6. Optimize for performance

## Additional Resources

- Uniswap Assets Repository: https://github.com/Uniswap/assets
- GraphQL Best Practices: https://graphql.org/learn/
- EIP-55 Address Checksumming: https://eips.ethereum.org/EIPS/eip-55
- Apollo Client Documentation: https://www.apollographql.com/docs/react/

## Support

If implementing this in another application:

1. Ensure GraphQL endpoint is accessible
2. Verify chain support matches your needs
3. Adjust network name mappings for your chains
4. Test thoroughly with real token addresses
5. Implement proper error boundaries

---

**Note**: This implementation is based on Uniswap's codebase. Adapt the code to match your application's architecture, framework, and requirements.

