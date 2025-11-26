/**
 * API endpoint for Uniswap v3 liquidity data
 * 
 * Provides token search with pool information for the GlobalSearchBar and Swap UI
 */

import { NextRequest, NextResponse } from "next/server";
import { VaultoChainId, isChainSupported } from "@/lib/uniswap/subgraphs";
import { searchTokens } from "@/lib/uniswap/tokenSearch";
import { getPoolsForToken } from "@/lib/uniswap/pools";

export interface TokenWithPools {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  tvlUSD: number;
  volumeUSD: number;
  pools: Array<{
    poolAddress: string;
    feeTierBps: number;
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

export interface LiquidityApiResponse {
  chainId: number;
  tokens: TokenWithPools[];
  error?: string;
}

/**
 * POST /api/uniswap/liquidity
 * 
 * Request body:
 * {
 *   chainId: number,
 *   query: string
 * }
 * 
 * Response:
 * {
 *   chainId: number,
 *   tokens: TokenWithPools[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId, query } = body;

    // Validate chainId
    if (typeof chainId !== "number") {
      return NextResponse.json(
        { error: "chainId must be a number" },
        { status: 400 }
      );
    }

    if (!isChainSupported(chainId)) {
      return NextResponse.json(
        {
          error: `Chain ${chainId} is not supported for Uniswap v3 queries`,
          chainId,
          tokens: [],
        } as LiquidityApiResponse,
        { status: 400 }
      );
    }

    // Validate query
    if (typeof query !== "string") {
      return NextResponse.json(
        { error: "query must be a string" },
        { status: 400 }
      );
    }

    // Search tokens
    const searchResult = await searchTokens(
      chainId as VaultoChainId,
      query,
      10 // Limit to top 10 tokens for pool enrichment
    );

    if (searchResult.tokens.length === 0) {
      return NextResponse.json({
        chainId,
        tokens: [],
      } as LiquidityApiResponse);
    }

    // Sort by TVL and take top 5-10 for pool enrichment
    const sortedTokens = searchResult.tokens
      .sort((a, b) => b.tvlUSD - a.tvlUSD)
      .slice(0, 10);

    // Fetch pools for each token in parallel
    const tokensWithPools = await Promise.all(
      sortedTokens.map(async (token) => {
        try {
          const poolsResult = await getPoolsForToken(
            chainId as VaultoChainId,
            token.address,
            10 // Top 10 pools per token
          );

          // Transform pools to match API response format
          const pools = poolsResult.pools.map((pool) => ({
            poolAddress: pool.poolAddress,
            feeTierBps: pool.feeTierBps,
            tvlUSD: pool.tvlUSD,
            volumeUSD: pool.volumeUSD,
            token0: {
              address: pool.token0.address,
              symbol: pool.token0.symbol,
              name: pool.token0.name,
              decimals: pool.token0.decimals,
            },
            token1: {
              address: pool.token1.address,
              symbol: pool.token1.symbol,
              name: pool.token1.name,
              decimals: pool.token1.decimals,
            },
          }));

          return {
            ...token,
            pools,
          } as TokenWithPools;
        } catch (error) {
          // If pool fetch fails for a token, return token without pools
          console.error(
            `Failed to fetch pools for token ${token.address}:`,
            error
          );
          return {
            ...token,
            pools: [],
          } as TokenWithPools;
        }
      })
    );

    const response: LiquidityApiResponse = {
      chainId,
      tokens: tokensWithPools,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Uniswap liquidity API error:", error);

    // Don't leak internal error details in production
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      {
        error: errorMessage,
        chainId: 0,
        tokens: [],
      } as LiquidityApiResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/uniswap/liquidity
 * 
 * Query parameters:
 * - chainId: number
 * - query: string
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chainIdParam = searchParams.get("chainId");
    const query = searchParams.get("query");

    if (!chainIdParam) {
      return NextResponse.json(
        { error: "chainId query parameter is required" },
        { status: 400 }
      );
    }

    if (!query) {
      return NextResponse.json(
        { error: "query parameter is required" },
        { status: 400 }
      );
    }

    const chainId = parseInt(chainIdParam, 10);

    if (isNaN(chainId)) {
      return NextResponse.json(
        { error: "chainId must be a valid number" },
        { status: 400 }
      );
    }

    // Reuse POST handler logic
    const body = { chainId, query };
    const mockRequest = {
      json: async () => body,
    } as NextRequest;

    return POST(mockRequest);
  } catch (error) {
    console.error("Uniswap liquidity API error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      {
        error: errorMessage,
        chainId: 0,
        tokens: [],
      } as LiquidityApiResponse,
      { status: 500 }
    );
  }
}



