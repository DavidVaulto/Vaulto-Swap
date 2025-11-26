/**
 * Generic GraphQL client for Uniswap v3 subgraphs
 */

import { VaultoChainId, getUniswapV3SubgraphEndpoint } from "./subgraphs";

export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
  }>;
}

/**
 * Query Uniswap v3 subgraph with GraphQL
 * 
 * @param chainId - The chain ID to query
 * @param query - GraphQL query string
 * @param variables - Optional query variables
 * @returns The response data
 * @throws Error if the request fails or contains GraphQL errors
 */
export async function queryUniswapV3Subgraph<T>(
  chainId: VaultoChainId,
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const endpoint = getUniswapV3SubgraphEndpoint(chainId);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      // Add timeout for server-side requests
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      throw new Error(
        `Uniswap subgraph HTTP error: ${res.status} ${res.statusText}. ${errorText}`
      );
    }

    const json: GraphQLResponse<T> = await res.json();

    if (json.errors && json.errors.length > 0) {
      const errorMessages = json.errors.map((e) => e.message).join(", ");
      throw new Error(
        `Uniswap subgraph GraphQL error: ${errorMessages}. ` +
        `Query: ${query.substring(0, 100)}...`
      );
    }

    if (!json.data) {
      throw new Error("Uniswap subgraph returned no data");
    }

    return json.data;
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw with more context
      throw new Error(
        `Failed to query Uniswap v3 subgraph for chain ${chainId}: ${error.message}`
      );
    }
    throw error;
  }
}



