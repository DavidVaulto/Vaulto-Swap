/**
 * Token search via Uniswap v3 subgraph
 */

import { VaultoChainId } from "./subgraphs";
import { queryUniswapV3Subgraph } from "./client";

export interface UniswapToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  tvlUSD: number;
  volumeUSD: number;
}

export interface TokenSearchResult {
  chainId: VaultoChainId;
  tokens: UniswapToken[];
}

/**
 * GraphQL query for searching tokens by symbol or name
 */
const TOKEN_SEARCH_QUERY = `
  query TokenSearch($text: String!, $first: Int!) {
    tokens(
      where: {
        or: [
          { symbol_contains_nocase: $text }
          { name_contains_nocase: $text }
        ]
      }
      orderBy: totalValueLockedUSD
      orderDirection: desc
      first: $first
    ) {
      id
      symbol
      name
      decimals
      volumeUSD
      totalValueLockedUSD
    }
  }
`;

/**
 * Search for tokens matching the given text query
 * 
 * @param chainId - The chain ID to search on
 * @param text - Search query (token symbol or name)
 * @param limit - Maximum number of results (default: 20)
 * @returns Search results with matching tokens
 */
export async function searchTokens(
  chainId: VaultoChainId,
  text: string,
  limit = 20
): Promise<TokenSearchResult> {
  if (!text.trim()) {
    return { chainId, tokens: [] };
  }

  try {
    const data = await queryUniswapV3Subgraph<{ tokens: any[] }>(
      chainId,
      TOKEN_SEARCH_QUERY,
      { text: text.trim(), first: Math.min(limit, 100) } // Cap at 100 for safety
    );

    const tokens: UniswapToken[] = (data.tokens || []).map((t) => ({
      address: (t.id || "").toLowerCase(),
      symbol: t.symbol || "",
      name: t.name || "",
      decimals: Number(t.decimals || 18),
      tvlUSD: Number(t.totalValueLockedUSD || 0),
      volumeUSD: Number(t.volumeUSD || 0),
    }));

    return { chainId, tokens };
  } catch (error) {
    // Log error but return empty results rather than throwing
    // This allows the UI to gracefully handle subgraph failures
    console.error(`Token search failed for chain ${chainId}:`, error);
    return { chainId, tokens: [] };
  }
}



