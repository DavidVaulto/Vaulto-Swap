/**
 * Fetch pools for tokens via Uniswap v3 subgraph
 */

import { VaultoChainId } from "./subgraphs";
import { queryUniswapV3Subgraph } from "./client";

export interface UniswapPoolToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface UniswapPool {
  poolAddress: string;
  chainId: VaultoChainId;
  feeTierBps: number; // Fee tier in basis points (e.g., 500 = 0.05%)
  liquidity: string; // Total liquidity as string (can be very large)
  sqrtPrice: string; // Current sqrt price
  tick: number | null; // Current tick
  tvlUSD: number; // Total value locked in USD
  volumeUSD: number; // Volume in USD
  token0: UniswapPoolToken;
  token1: UniswapPoolToken;
}

export interface TokenPoolsResult {
  chainId: VaultoChainId;
  tokenAddress: string;
  pools: UniswapPool[];
}

/**
 * GraphQL query for fetching pools that include a specific token
 */
const POOLS_FOR_TOKEN_QUERY = `
  query PoolsForToken($token: String!, $first: Int!) {
    pools(
      where: {
        or: [
          { token0: $token }
          { token1: $token }
        ]
      }
      orderBy: totalValueLockedUSD
      orderDirection: desc
      first: $first
    ) {
      id
      feeTier
      liquidity
      sqrtPrice
      tick
      totalValueLockedUSD
      volumeUSD
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
    }
  }
`;

/**
 * Get pools for a given token address
 * 
 * @param chainId - The chain ID
 * @param tokenAddress - The token address (will be lowercased)
 * @param limit - Maximum number of pools to return (default: 50)
 * @returns Pools that include the token, ordered by TVL descending
 */
export async function getPoolsForToken(
  chainId: VaultoChainId,
  tokenAddress: string,
  limit = 50
): Promise<TokenPoolsResult> {
  const token = tokenAddress.toLowerCase();

  try {
    const data = await queryUniswapV3Subgraph<{ pools: any[] }>(
      chainId,
      POOLS_FOR_TOKEN_QUERY,
      { token, first: Math.min(limit, 100) } // Cap at 100 for safety
    );

    const pools: UniswapPool[] = (data.pools || []).map((p) => ({
      poolAddress: (p.id || "").toLowerCase(),
      chainId,
      feeTierBps: Number(p.feeTier || 0),
      liquidity: p.liquidity || "0",
      sqrtPrice: p.sqrtPrice || "0",
      tick: p.tick != null ? Number(p.tick) : null,
      tvlUSD: Number(p.totalValueLockedUSD || 0),
      volumeUSD: Number(p.volumeUSD || 0),
      token0: {
        address: (p.token0?.id || "").toLowerCase(),
        symbol: p.token0?.symbol || "",
        name: p.token0?.name || "",
        decimals: Number(p.token0?.decimals || 18),
      },
      token1: {
        address: (p.token1?.id || "").toLowerCase(),
        symbol: p.token1?.symbol || "",
        name: p.token1?.name || "",
        decimals: Number(p.token1?.decimals || 18),
      },
    }));

    return {
      chainId,
      tokenAddress: token,
      pools,
    };
  } catch (error) {
    // Log error but return empty pools rather than throwing
    // This allows the UI to gracefully handle subgraph failures
    console.error(`Pool fetch failed for token ${tokenAddress} on chain ${chainId}:`, error);
    return {
      chainId,
      tokenAddress: token,
      pools: [],
    };
  }
}



