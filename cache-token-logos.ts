/**
 * Batch query token logos from Uniswap GraphQL API and cache the results
 * 
 * Usage:
 *   npx tsx cache-token-logos.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getTokenLogoUrl } from './query-token-logo';

// Map chainId to Uniswap chain name
const CHAIN_ID_TO_UNISWAP_CHAIN: Record<number, string> = {
  1: 'ETHEREUM',
  42161: 'ARBITRUM',
  10: 'OPTIMISM',
  8453: 'BASE',
  137: 'POLYGON',
  56: 'BSC', // Binance Smart Chain
  43114: 'AVALANCHE',
  11155111: 'SEPOLIA',
  421614: 'ARBITRUM_SEPOLIA',
};

interface TokenListItem {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

interface TokenList {
  name: string;
  version: {
    major: number;
    minor: number;
    patch: number;
  };
  timestamp: string;
  tokens: TokenListItem[];
}

interface CachedLogoResult {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  logoUrl: string | null;
  verified: boolean;
  source: 'graphql' | 'not-found' | 'cached';
  timestamp: string;
  error?: string;
}

interface LogoCache {
  version: string;
  lastUpdated: string;
  results: CachedLogoResult[];
}

const CACHE_FILE = 'token-logos-cache.json';
const DELAY_MS = 500; // Delay between requests to avoid rate limiting

/**
 * Load existing cache
 */
function loadCache(): LogoCache {
  if (existsSync(CACHE_FILE)) {
    try {
      const content = readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Failed to load cache: ${error}`);
    }
  }
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    results: [],
  };
}

/**
 * Save cache to file
 */
function saveCache(cache: LogoCache): void {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

/**
 * Check if a token result is already cached
 */
function isCached(
  cache: LogoCache,
  chainId: number,
  address: string
): CachedLogoResult | null {
  const normalizedAddress = address.toLowerCase();
  return (
    cache.results.find(
      (r) =>
        r.chainId === chainId &&
        r.address.toLowerCase() === normalizedAddress
    ) || null
  );
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verify if a URL is accessible
 */
async function verifyUrlExists(url: string): Promise<{ exists: boolean; status?: number }> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return {
      exists: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      exists: false,
    };
  }
}

/**
 * Query logo for a single token
 */
async function queryTokenLogo(
  token: TokenListItem
): Promise<CachedLogoResult> {
  // First, check if token already has a logoURI
  if (token.logoURI) {
    const verified = await verifyUrlExists(token.logoURI);
    return {
      chainId: token.chainId,
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      logoUrl: token.logoURI,
      verified: verified.exists,
      source: 'cached',
      timestamp: new Date().toISOString(),
    };
  }

  // Try to query from Uniswap API
  const chainName = CHAIN_ID_TO_UNISWAP_CHAIN[token.chainId];
  
  if (!chainName) {
    return {
      chainId: token.chainId,
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      logoUrl: null,
      verified: false,
      source: 'not-found',
      timestamp: new Date().toISOString(),
      error: `Unsupported chain ID: ${token.chainId}`,
    };
  }

  try {
    const result = await getTokenLogoUrl(token.address, chainName);
    
    return {
      chainId: token.chainId,
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      logoUrl: result.logoUrl,
      verified: result.verified,
      source: result.source,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    // If Uniswap query fails, return null but don't fail completely
    return {
      chainId: token.chainId,
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      logoUrl: null,
      verified: false,
      source: 'not-found',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Load token list from file or URL
 */
async function loadTokenList(source?: string): Promise<TokenList> {
  // If source is provided and looks like a URL, fetch it
  if (source && (source.startsWith('http://') || source.startsWith('https://'))) {
    console.log(`🌐 Fetching token list from: ${source}`);
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch token list: HTTP ${response.status}`);
    }
    return await response.json();
  }

  // Otherwise, try to load from file
  const tokenListPath = source || 'public/token-list.json';
  if (!existsSync(tokenListPath)) {
    throw new Error(`Token list not found: ${tokenListPath}`);
  }

  const tokenListContent = readFileSync(tokenListPath, 'utf-8');
  return JSON.parse(tokenListContent);
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(80));
  console.log('TOKEN LOGO CACHING SCRIPT');
  console.log('='.repeat(80));
  console.log();

  // Get source from command line args or use default
  const args = process.argv.slice(2);
  const source = args[0];

  // Load token list
  let tokenList: TokenList;
  try {
    tokenList = await loadTokenList(source);
  } catch (error) {
    console.error(`❌ Error loading token list:`);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error(`   ${String(error)}`);
    }
    if (!source) {
      console.error('\nUsage: npx tsx cache-token-logos.ts [source]');
      console.error('  source: Path to token-list.json file or URL to token list');
      console.error('  Example: npx tsx cache-token-logos.ts https://vaulto.dev/api/token-list/');
    }
    process.exit(1);
  }

  console.log(`📋 Loaded ${tokenList.tokens.length} tokens from token list`);
  console.log();

  // Load existing cache
  const cache = loadCache();
  console.log(`💾 Loaded ${cache.results.length} cached results`);
  console.log();

  // Process tokens
  const tokensToProcess: TokenListItem[] = [];
  const tokensSkipped: TokenListItem[] = [];

  for (const token of tokenList.tokens) {
    const cached = isCached(cache, token.chainId, token.address);
    if (cached) {
      tokensSkipped.push(token);
    } else {
      tokensToProcess.push(token);
    }
  }

  console.log(`⏭️  Skipping ${tokensSkipped.length} already cached tokens`);
  console.log(`🔄 Processing ${tokensToProcess.length} tokens`);
  console.log();

  if (tokensToProcess.length === 0) {
    console.log('✅ All tokens are already cached!');
    console.log(`📊 Cache file: ${CACHE_FILE}`);
    process.exit(0);
  }

  // Process tokens with delay
  let successCount = 0;
  let errorCount = 0;
  let foundCount = 0;
  let notFoundCount = 0;

  for (let i = 0; i < tokensToProcess.length; i++) {
    const token = tokensToProcess[i];
    const progress = `[${i + 1}/${tokensToProcess.length}]`;

    console.log(
      `${progress} Querying ${token.symbol} (${token.name}) on chain ${token.chainId}...`
    );

    const result = await queryTokenLogo(token);

    // Update cache
    const existingIndex = cache.results.findIndex(
      (r) =>
        r.chainId === result.chainId &&
        r.address.toLowerCase() === result.address.toLowerCase()
    );

    if (existingIndex >= 0) {
      cache.results[existingIndex] = result;
    } else {
      cache.results.push(result);
    }

    // Update stats
    if (result.error) {
      errorCount++;
      console.log(`   ❌ Error: ${result.error}`);
    } else if (result.logoUrl) {
      foundCount++;
      successCount++;
      const verified = result.verified ? '✅' : '⚠️';
      console.log(`   ${verified} Logo URL: ${result.logoUrl}`);
    } else {
      notFoundCount++;
      console.log(`   ⚠️  No logo URL found`);
    }

    // Save cache after each token (in case of interruption)
    cache.lastUpdated = new Date().toISOString();
    saveCache(cache);

    // Delay between requests (except for the last one)
    if (i < tokensToProcess.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // Final summary
  console.log();
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total tokens: ${tokenList.tokens.length}`);
  console.log(`Already cached: ${tokensSkipped.length}`);
  console.log(`Processed: ${tokensToProcess.length}`);
  console.log(`✅ Logos found: ${foundCount}`);
  console.log(`⚠️  Logos not found: ${notFoundCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log();
  console.log(`💾 Cache saved to: ${CACHE_FILE}`);
  console.log(`📊 Total cached entries: ${cache.results.length}`);
  console.log('='.repeat(80));
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Fatal error:');
    console.error(error);
    process.exit(1);
  });
}

export { loadCache, saveCache };

