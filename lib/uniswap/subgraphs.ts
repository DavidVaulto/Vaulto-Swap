/**
 * Uniswap v3 Subgraph Configuration
 * 
 * Maps chain IDs to Uniswap v3 subgraph endpoints via The Graph Network.
 * 
 * Subgraph IDs can be found at:
 * - https://thegraph.com/explorer/subgraphs?query=uniswap-v3
 * - Or via The Graph Network Explorer
 */

// Chain IDs matching wagmi chains
export enum VaultoChainId {
  ETHEREUM = 1,
  OPTIMISM = 10,
  BSC = 56,
  POLYGON = 137,
  ARBITRUM = 42161,
  AVALANCHE = 43114,
  BASE = 8453,
  CELO = 42220,
  BLAST = 81457,
  SEPOLIA = 11155111,
  ARBITRUM_SEPOLIA = 421614,
}

// Uniswap v3 Subgraph IDs from The Graph Network
// These are the standard Uniswap v3 subgraph deployment IDs
// Source: https://docs.uniswap.org/api/subgraph/overview
// Find them at: https://thegraph.com/explorer/subgraphs?query=uniswap-v3
const UNISWAP_V3_SUBGRAPH_IDS: Record<VaultoChainId, string> = {
  [VaultoChainId.ETHEREUM]: "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV", // Uniswap V3 Ethereum Mainnet
  [VaultoChainId.OPTIMISM]: "Cghf4LfVqPiFw6fp6Y5X5Ubc8UpmUhSfJL82zwiBFLaj", // Uniswap V3 Optimism
  [VaultoChainId.BSC]: "F85MNzUGYqgSHSHRGgeVMNsdnW1KtZSVgFULumXRZTw2", // Uniswap V3 BSC
  [VaultoChainId.POLYGON]: "3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm", // Uniswap V3 Polygon
  [VaultoChainId.ARBITRUM]: "3V7ZY6muhxaQL5qvntX1CFXJ32W7BxXZTGTwmpH5J4t3", // Uniswap V3 Arbitrum
  [VaultoChainId.AVALANCHE]: "GVH9h9KZ9CqheUEL93qMbq7QwgoBu32QXQDPR6bev4Eo", // Uniswap V3 Avalanche
  [VaultoChainId.BASE]: "43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG", // Uniswap V3 Base
  [VaultoChainId.CELO]: "ESdrTJ3twMwWVoQ1hUE2u7PugEHX3QkenudD6aXCkDQ4", // Uniswap V3 Celo
  [VaultoChainId.BLAST]: "2LHovKznvo8YmKC9ZprPjsYAZDCc4K5q4AYz8s3cnQn1", // Uniswap V3 Blast
  [VaultoChainId.SEPOLIA]: "", // Sepolia - no public Uniswap v3 subgraph
  [VaultoChainId.ARBITRUM_SEPOLIA]: "", // Arbitrum Sepolia - no public Uniswap v3 subgraph
};

/**
 * Get The Graph API key from environment variables
 * REQUIRED for all subgraph queries
 */
function getGraphApiKey(): string {
  const apiKey = process.env.THE_GRAPH_API_KEY;
  if (!apiKey) {
    throw new Error(
      "THE_GRAPH_API_KEY environment variable is required. " +
      "Get your API key from https://thegraph.com/studio/apikeys/ " +
      "and add it to your .env.local file."
    );
  }
  return apiKey;
}

/**
 * Build Uniswap v3 subgraph endpoint URL
 * Uses The Graph Network gateway with API key
 * Format: https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/${SUBGRAPH_ID}
 */
function buildSubgraphUrl(subgraphId: string): string {
  const apiKey = getGraphApiKey();
  return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`;
}

/**
 * Get Uniswap v3 subgraph endpoint for a chain (lazy evaluation)
 * All endpoints use The Graph Network gateway with API key from process.env.THE_GRAPH_API_KEY
 */
function getSubgraphUrl(chainId: VaultoChainId): string {
  const subgraphId = UNISWAP_V3_SUBGRAPH_IDS[chainId];
  if (!subgraphId) {
    return ""; // Not supported
  }
  return buildSubgraphUrl(subgraphId);
}

/**
 * Get Uniswap v3 subgraph endpoint for a given chain ID
 * 
 * @param chainId - The chain ID
 * @returns The subgraph endpoint URL
 * @throws Error if no subgraph is configured for the chain
 */
export function getUniswapV3SubgraphEndpoint(chainId: VaultoChainId): string {
  const url = getSubgraphUrl(chainId);
  if (!url) {
    const supportedChains = Object.keys(UNISWAP_V3_SUBGRAPH_IDS)
      .filter(k => UNISWAP_V3_SUBGRAPH_IDS[Number(k) as VaultoChainId])
      .map(k => VaultoChainId[Number(k) as VaultoChainId])
      .join(", ");
    throw new Error(
      `No Uniswap v3 subgraph configured for chainId=${chainId}. ` +
      `Supported chains: ${supportedChains}`
    );
  }
  return url;
}

/**
 * Check if a chain ID is supported for Uniswap v3 subgraph queries
 */
export function isChainSupported(chainId: number): chainId is VaultoChainId {
  return chainId in UNISWAP_V3_SUBGRAPH_IDS && !!UNISWAP_V3_SUBGRAPH_IDS[chainId as VaultoChainId];
}

