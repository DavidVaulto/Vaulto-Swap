/**
 * Token Search Module
 * 
 * Searches for tokens in Uniswap v3 subgraphs by symbol or name.
 */

import { queryUniswapV3Subgraph } from './client';
import { isChainSupported, type VaultoChainId } from './subgraphs';

/**
 * GraphQL token search result from subgraph
 */
interface GraphQLToken {
  id: string; // Token address (lowercase)
  symbol: string;
  name: string;
  decimals: number;
  volumeUSD: string;
  totalValueLockedUSD: string;
}

/**
 * GraphQL response structure for token search
 */
interface TokenSearchResponse {
  tokens: GraphQLToken[];
}

/**
 * Transformed token result
 */
export interface TokenSearchResult {
  chainId: VaultoChainId;
  tokens: Array<{
    address: string; // Lowercased
    symbol: string;
    name: string;
    decimals: number;
    tvlUSD: number;
    volumeUSD: number;
  }>;
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
 * Search for tokens by symbol or name in a Uniswap v3 subgraph.
 * 
 * @param chainId - The chain ID to search on
 * @param text - The search text (symbol or name)
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of matching tokens sorted by TVL descending, or empty array on error
 */
export async function searchTokens(
  chainId: number,
  text: string,
  limit: number = 10
): Promise<TokenSearchResult> {
  // Return empty result if chain is not supported
  if (!isChainSupported(chainId)) {
    console.debug(`Chain ${chainId} is not supported for token search`);
    return {
      chainId: chainId as VaultoChainId,
      tokens: [],
    };
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      chainId: chainId as VaultoChainId,
      tokens: [],
    };
  }

  try {
    const response = await queryUniswapV3Subgraph<TokenSearchResponse>(
      chainId,
      TOKEN_SEARCH_QUERY,
      {
        text: text.trim(),
        first: Math.min(limit, 100), // Cap at 100 for safety
      }
    );

    const tokens = (response.tokens || []).map((token) => ({
      address: token.id.toLowerCase(), // Ensure lowercase
      symbol: token.symbol || '',
      name: token.name || '',
      decimals: token.decimals || 18,
      tvlUSD: parseFloat(token.totalValueLockedUSD || '0'),
      volumeUSD: parseFloat(token.volumeUSD || '0'),
    }));

    return {
      chainId: chainId as VaultoChainId,
      tokens,
    };
  } catch (error) {
    // Log error but don't throw - return empty array for graceful degradation
    console.error(`Error searching tokens on chain ${chainId}:`, error);
    return {
      chainId: chainId as VaultoChainId,
      tokens: [],
    };
  }
}

