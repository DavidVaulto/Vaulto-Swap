# Uniswap v3 Subgraph - Available Data for Each Token

## 📊 Complete Data Breakdown

### **Token-Level Data** (per token)

#### **Basic Token Information**
1. **`address`** (id) - Token contract address (lowercase)
2. **`symbol`** - Token symbol (e.g., "USDC", "WETH")
3. **`name`** - Full token name (e.g., "USD Coin", "Wrapped Ether")
4. **`decimals`** - Number of decimals (typically 18, but USDC uses 6)

#### **Financial Metrics**
5. **`tvlUSD`** (totalValueLockedUSD) - Total Value Locked in USD across all pools
6. **`volumeUSD`** - Trading volume in USD

#### **Additional Token Fields Available** (not currently used, but available in subgraph)
- `whitelistPools` - Pools this token is in (if whitelisted)
- `tokenDayData` - Daily price/volume data
- `totalSupply` - Total token supply
- `derivedETH` - Price in ETH
- `derivedUSD` - Price in USD (if available)

---

### **Pool-Level Data** (per pool for each token)

#### **Pool Identification**
1. **`poolAddress`** (id) - Pool contract address
2. **`feeTierBps`** (feeTier) - Fee tier in basis points
   - `100` = 0.01%
   - `500` = 0.05%
   - `3000` = 0.3%
   - `10000` = 1%

#### **Pool Financial Metrics**
3. **`tvlUSD`** (totalValueLockedUSD) - Total Value Locked in USD
4. **`volumeUSD`** - Trading volume in USD for this pool
5. **`liquidity`** - Total liquidity (as string, can be very large number)

#### **Price & Trading Data**
6. **`sqrtPrice`** - Current square root price (used for price calculations)
7. **`tick`** - Current tick (price position in the pool)
   - `null` if pool is inactive
   - Used for precise price calculations

#### **Pool Token Information**
8. **`token0`** - First token in the pair
   - `address` - Token address
   - `symbol` - Token symbol
   - `name` - Token name
   - `decimals` - Token decimals

9. **`token1`** - Second token in the pair
   - `address` - Token address
   - `symbol` - Token symbol
   - `name` - Token name
   - `decimals` - Token decimals

#### **Additional Pool Fields Available** (not currently used, but available in subgraph)
- `poolHourData` - Hourly price/volume data
- `poolDayData` - Daily price/volume data
- `mints` - Mint events (adding liquidity)
- `burns` - Burn events (removing liquidity)
- `swaps` - Swap transactions
- `createdAtTimestamp` - When pool was created
- `createdAtBlockNumber` - Block number when pool was created
- `liquidityProviderCount` - Number of unique liquidity providers
- `txCount` - Total transaction count
- `feeGrowthGlobal0X128` - Fee growth for token0
- `feeGrowthGlobal1X128` - Fee growth for token1
- `token0Price` - Current price of token0 in terms of token1
- `token1Price` - Current price of token1 in terms of token0
- `observationIndex` - Oracle observation index

---

## 📦 Current API Response Structure

### **Full Response Shape:**

```typescript
{
  chainId: number,  // e.g., 1 for Ethereum
  tokens: [
    {
      // Token Basic Info
      address: string,      // "0x..."
      symbol: string,       // "USDC"
      name: string,         // "USD Coin"
      decimals: number,     // 6
      
      // Token Financials
      tvlUSD: number,       // Total TVL across all pools
      volumeUSD: number,    // Total volume
      
      // Pool Data (array of pools)
      pools: [
        {
          poolAddress: string,      // Pool contract address
          feeTierBps: number,       // 500 = 0.05%
          tvlUSD: number,           // Pool-specific TVL
          volumeUSD: number,        // Pool-specific volume
          
          // Token Pair Info
          token0: {
            address: string,
            symbol: string,
            name: string,
            decimals: number
          },
          token1: {
            address: string,
            symbol: string,
            name: string,
            decimals: number
          }
          
          // Additional pool data available but not currently returned:
          // liquidity: string,
          // sqrtPrice: string,
          // tick: number | null
        }
      ]
    }
  ]
}
```

---

## 🔍 What We're Currently Using

### **In GlobalSearchBar:**
- ✅ Token symbol (displayed as title)
- ✅ Token name (displayed as subtitle)
- ✅ Token address (shortened display)
- ✅ Token TVL (green badge)
- ✅ Top pool info (token0/token1, fee tier, pool TVL)

### **What We're NOT Currently Using (but available):**
- ⚠️ Token volumeUSD
- ⚠️ Pool volumeUSD
- ⚠️ Pool liquidity
- ⚠️ Pool sqrtPrice & tick (for price calculations)
- ⚠️ All historical data (day/hour data)
- ⚠️ Pool transaction counts
- ⚠️ Liquidity provider counts
- ⚠️ Price data (token0Price, token1Price)

---

## 💡 Potential Enhancements

### **Price Data**
- Current price of token (from pools)
- Price charts (using poolDayData)
- Price change over time

### **Liquidity Metrics**
- Individual pool liquidity amounts
- Liquidity distribution across fee tiers
- Liquidity provider participation

### **Volume Analytics**
- 24h volume (from volumeUSD)
- Volume trends (from poolDayData)
- Most active pools

### **Pool Comparison**
- Compare fee tiers (0.01%, 0.05%, 0.3%, 1%)
- Compare liquidity across pools
- Best pools for swaps (lowest slippage)

---

## 📝 Summary

**Currently Available Per Token:**
- ✅ 4 basic fields (address, symbol, name, decimals)
- ✅ 2 financial metrics (tvlUSD, volumeUSD)
- ✅ Array of pools (up to 10 per token)

**Currently Available Per Pool:**
- ✅ 4 pool identifiers (address, fee tier, token0, token1)
- ✅ 2 financial metrics (tvlUSD, volumeUSD)
- ✅ 3 additional fields (liquidity, sqrtPrice, tick) - available but not returned in API

**Total: 6 token fields + (4 pool fields × up to 10 pools) = ~46 data points per token**

