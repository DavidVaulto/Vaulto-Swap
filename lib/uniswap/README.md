# Uniswap v3 Subgraph Integration

This module provides integration with Uniswap v3 subgraphs across multiple chains, enabling token search and pool discovery for the Vaulto Swap interface.

## Setup

### 1. Environment Variables

Add the following to your `.env.local` file:

```bash
# The Graph API Key (optional for mainnet, required for other chains)
# Get your API key from: https://thegraph.com/studio/apikeys/
THE_GRAPH_API_KEY=your_api_key_here
```

**Note:** For Ethereum mainnet, the integration will fall back to the public hosted service endpoint if no API key is provided. For other chains (Arbitrum, Base, Optimism, Polygon), an API key is required.

### 2. Configure Subgraph IDs

Update the subgraph IDs in `lib/uniswap/subgraphs.ts` for the chains you want to support:

1. Visit [The Graph Explorer](https://thegraph.com/explorer/subgraphs?query=uniswap-v3)
2. Find the Uniswap v3 subgraph for each chain
3. Copy the subgraph ID (Qm... hash)
4. Update `UNISWAP_V3_SUBGRAPH_IDS` in `subgraphs.ts`

Example:
```typescript
const UNISWAP_V3_SUBGRAPH_IDS: Record<VaultoChainId, string> = {
  [VaultoChainId.ETHEREUM]: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
  [VaultoChainId.ARBITRUM]: "your-arbitrum-subgraph-id-here",
  // ... etc
};
```

## Usage

### API Endpoint

The main entry point is the API endpoint at `/api/uniswap/liquidity`.

#### POST Request

```typescript
const response = await fetch('/api/uniswap/liquidity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chainId: 1, // Ethereum mainnet
    query: 'USDC' // Token symbol or name
  })
});

const data = await response.json();
// {
//   chainId: 1,
//   tokens: [
//     {
//       address: "0x...",
//       symbol: "USDC",
//       name: "USD Coin",
//       decimals: 6,
//       tvlUSD: 123456789,
//       volumeUSD: 987654321,
//       pools: [...]
//     }
//   ]
// }
```

#### GET Request

```typescript
const response = await fetch('/api/uniswap/liquidity?chainId=1&query=USDC');
const data = await response.json();
```

### Direct Library Usage

You can also use the library functions directly:

```typescript
import { searchTokens, getPoolsForToken, VaultoChainId } from '@/lib/uniswap';

// Search for tokens
const searchResult = await searchTokens(VaultoChainId.ETHEREUM, 'USDC', 10);

// Get pools for a token
const poolsResult = await getPoolsForToken(
  VaultoChainId.ETHEREUM,
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC address
  50
);
```

## API Response Format

### Token with Pools

```typescript
interface TokenWithPools {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  tvlUSD: number;        // Total value locked in USD
  volumeUSD: number;    // Volume in USD
  pools: Array<{
    poolAddress: string;
    feeTierBps: number;  // Fee tier in basis points (500 = 0.05%)
    tvlUSD: number;
    volumeUSD: number;
    token0: {
      address: string;
      symbol: string;
      name: string;
      decimals: number;
    };
    token1: {
      address: string;
      symbol: string;
      name: string;
      decimals: number;
    };
  }>;
}
```

## Integration with GlobalSearchBar

The GlobalSearchBar can call the API endpoint to enrich search results with Uniswap v3 data:

```typescript
// In GlobalSearchBar component
const searchUniswapTokens = async (query: string) => {
  const chainId = useChainId(); // Get current chain from wagmi
  const response = await fetch('/api/uniswap/liquidity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chainId, query })
  });
  
  const { tokens } = await response.json();
  
  // Merge with local token results
  // Display TVL badges, pool information, etc.
};
```

## Error Handling

All functions handle errors gracefully:
- Subgraph query failures return empty results rather than throwing
- API endpoint returns error messages in the response body
- Invalid chain IDs are validated before making requests

## Supported Chains

Currently configured:
- ✅ Ethereum Mainnet (1) - Works with or without API key
- ⚠️ Optimism (10) - Requires API key and subgraph ID
- ⚠️ Polygon (137) - Requires API key and subgraph ID
- ⚠️ Arbitrum (42161) - Requires API key and subgraph ID
- ⚠️ Base (8453) - Requires API key and subgraph ID
- ❌ Sepolia (11155111) - Not supported
- ❌ Arbitrum Sepolia (421614) - Not supported

## Rate Limits

- **Hosted Service (mainnet, no API key):** ~100 requests/minute
- **The Graph Network (with API key):** Depends on your plan, typically much higher

## Testing

To test the integration:

1. Start your dev server: `npm run dev`
2. Test the API endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/uniswap/liquidity \
     -H "Content-Type: application/json" \
     -d '{"chainId": 1, "query": "USDC"}'
   ```

## Next Steps

1. Update subgraph IDs for all supported chains
2. Integrate API endpoint into GlobalSearchBar component
3. Add TVL/volume badges to search results
4. Use pool information in swap UI for routing
5. Add caching layer for frequently queried tokens



