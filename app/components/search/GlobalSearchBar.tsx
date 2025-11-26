"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useAccount } from "wagmi";
import { useChainId } from "wagmi";
import { getTokensByChain, type Token } from "@/config/tokens";
import type { LiquidityApiResponse, LiquidityTokenResult, LiquidityPoolResult } from "./types";
import { isChainSupported } from "@/lib/uniswap/subgraphs";

// Search result types
export interface SearchResult {
  id: string;
  type: "token" | "address" | "transaction" | "ai_suggestion" | "command";
  title: string;
  subtitle?: string;
  icon?: string;
  metadata?: {
    address?: string;
    symbol?: string;
    name?: string;
    chainId?: number;
    decimals?: number;
    tvlUSD?: number;
    volumeUSD?: number;
    pools?: LiquidityPoolResult[];
    isTokenizedStock?: boolean;
    ticker?: string;
    [key: string]: any;
  };
  action?: () => void;
  score?: number;
}

// Format TVL for display
function formatTVL(tvlUSD: number): string {
  if (tvlUSD >= 1e9) {
    return `$${(tvlUSD / 1e9).toFixed(2)}B`;
  } else if (tvlUSD >= 1e6) {
    return `$${(tvlUSD / 1e6).toFixed(2)}M`;
  } else if (tvlUSD >= 1e3) {
    return `$${(tvlUSD / 1e3).toFixed(2)}K`;
  }
  return `$${tvlUSD.toFixed(2)}`;
}

// Format fee tier from basis points to percentage
function formatFeeTier(feeTierBps: number): string {
  return `${(feeTierBps / 100).toFixed(2)}%`;
}

// Call Uniswap v3 liquidity API
async function fetchUniswapLiquidity(
  chainId: number,
  query: string
): Promise<LiquidityApiResponse> {
  try {
    const response = await fetch("/api/uniswap/liquidity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chainId, query }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error: ${response.status}`);
    }

    const data: LiquidityApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch Uniswap liquidity:", error);
    return {
      chainId,
      tokens: [],
      error: error instanceof Error ? error.message : "Failed to fetch liquidity data",
    };
  }
}

export default function GlobalSearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { address } = useAccount();
  const chainId = useChainId();

  // Convert LiquidityTokenResult to SearchResult
  const liquidityTokenToSearchResult = useCallback(
    (token: LiquidityTokenResult): SearchResult => {
      // Get top pool by TVL
      const topPool = token.pools && token.pools.length > 0 
        ? token.pools.reduce((max, pool) => 
            pool.tvlUSD > max.tvlUSD ? pool : max
          )
        : null;

      return {
        id: `uniswap-token-${token.address}`,
        type: "token" as const,
        title: token.symbol,
        subtitle: token.name,
        metadata: {
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          chainId: chainId,
          tvlUSD: token.tvlUSD,
          volumeUSD: token.volumeUSD,
          pools: token.pools,
          topPool: topPool, // Store top pool for easy access
        },
        action: () => {
          // Handle token selection
          console.log("Selected token:", token);
          // TODO: Navigate to swap with this token or trigger token selection callback
          setIsOpen(false);
          setQuery("");
        },
      };
    },
    [chainId]
  );

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearchError(null);
      return;
    }

    setIsLoading(true);
    setSearchError(null);

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const searchResults: SearchResult[] = [];

    try {
      // 1. Check if query is an address first (don't search API for addresses)
      if (/^0x[a-fA-F0-9]{40}$/.test(searchQuery.trim())) {
        searchResults.push({
          id: `address-${searchQuery}`,
          type: "address",
          title: searchQuery.slice(0, 6) + "..." + searchQuery.slice(-4),
          subtitle: "View address",
          metadata: {
            address: searchQuery,
          },
          action: () => {
            // Navigate to address view
            const explorerUrl = chainId === 1 
              ? `https://etherscan.io/address/${searchQuery}`
              : `https://explorer.arbitrum.io/address/${searchQuery}`; // Default to Arbitrum for other chains
            window.open(explorerUrl, "_blank");
            setIsOpen(false);
            setQuery("");
          },
        });
        setResults(searchResults);
        setIsLoading(false);
        return;
      }

      // 2. Call Uniswap v3 liquidity API if chain is supported
      if (isChainSupported(chainId)) {
        const apiResponse = await fetchUniswapLiquidity(chainId, searchQuery.trim());
        
        if (apiResponse.error) {
          setSearchError(apiResponse.error);
        }

        // Convert API tokens to search results
        const uniswapTokens = apiResponse.tokens.map(liquidityTokenToSearchResult);
        searchResults.push(...uniswapTokens);
      }

      // 3. Fallback to local token search for unsupported chains or as supplement
      const localTokens = getTokensByChain(chainId);
      const localTokenMatches = localTokens
        .filter((token) => {
          const queryLower = searchQuery.toLowerCase();
          return (
            token.symbol.toLowerCase().includes(queryLower) ||
            token.name.toLowerCase().includes(queryLower) ||
            token.address.toLowerCase().includes(queryLower) ||
            (token.ticker && token.ticker.toLowerCase().includes(queryLower))
          );
        })
        .slice(0, 5) // Limit to avoid duplicates
        .filter((token) => {
          // Filter out tokens already in results from API
          return !searchResults.some(
            (result) => result.metadata?.address?.toLowerCase() === token.address.toLowerCase()
          );
        })
        .map((token) => ({
          id: `local-token-${token.address}`,
          type: "token" as const,
          title: token.symbol,
          subtitle: token.name,
          icon: token.logoURI,
          metadata: {
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            chainId: chainId,
            isTokenizedStock: token.isTokenizedStock,
            ticker: token.ticker,
          },
          action: () => {
            console.log("Selected token:", token);
            setIsOpen(false);
            setQuery("");
          },
        }));

      searchResults.push(...localTokenMatches);

      // 4. Add command suggestions for very short queries
      if (searchQuery.length < 2) {
        searchResults.push(
          {
            id: "cmd-swap",
            type: "command",
            title: "Swap tokens",
            subtitle: "Start a token swap",
            action: () => {
              document.getElementById("swap-widget")?.scrollIntoView({ behavior: "smooth" });
              setIsOpen(false);
              setQuery("");
            },
          },
          {
            id: "cmd-holdings",
            type: "command",
            title: "View holdings",
            subtitle: "Check your portfolio",
            action: () => {
              window.open("https://holdings.vaulto.ai", "_blank");
              setIsOpen(false);
              setQuery("");
            },
          }
        );
      }

      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
      setSearchError(error instanceof Error ? error.message : "Search failed");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [chainId, liquidityTokenToSearchResult]);

  // Debounced search with 400ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }

      // Escape to close
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }

      // Arrow keys navigation
      if (isOpen && results.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (results[selectedIndex]) {
            results[selectedIndex].action?.();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const getResultIcon = (result: SearchResult) => {
    if (result.icon) {
      return (
        <div className="relative w-10 h-10 flex-shrink-0 rounded-full overflow-hidden bg-gray-800/50 border border-gray-700/50 flex items-center justify-center">
          <Image
            src={result.icon}
            alt={result.title}
            width={40}
            height={40}
            className="rounded-full object-cover w-full h-full"
            unoptimized
          />
        </div>
      );
    }

    // Default icons based on type
    switch (result.type) {
      case "token":
        return (
          <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
      case "address":
        return (
          <div className="w-6 h-6 rounded-full bg-purple-400/20 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        );
      case "command":
        return (
          <div className="w-6 h-6 rounded-full bg-blue-400/20 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  // Get top pool display text
  const getTopPoolText = (result: SearchResult): string | null => {
    if (result.type !== "token" || !result.metadata?.pools || result.metadata.pools.length === 0) {
      return null;
    }
    
    // Get top pool by TVL
    const pools = result.metadata.pools as LiquidityPoolResult[];
    const topPool = pools.reduce((max, pool) => 
      pool.tvlUSD > max.tvlUSD ? pool : max
    );
    
    if (!topPool) return null;

    const feeTier = formatFeeTier(topPool.feeTierBps);
    const poolTvl = formatTVL(topPool.tvlUSD);
    return `${topPool.token0.symbol}/${topPool.token1.symbol} • ${feeTier} • ${poolTvl} TVL`;
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div
        className={`
          relative flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5
          bg-gray-800/50 border rounded-lg
          transition-all duration-200
          ${isOpen 
            ? "border-yellow-400/60 bg-gray-800/80 shadow-lg shadow-yellow-400/20" 
            : "border-gray-700/50 hover:border-gray-600/50"
          }
        `}
        onClick={() => setIsOpen(true)}
      >
        {/* Search Icon */}
        <svg
          className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search tokens, addresses..."
          className="flex-1 bg-transparent text-white placeholder-gray-400 text-sm md:text-base outline-none"
        />

        {/* Keyboard Shortcut Hint */}
        {!isOpen && (
          <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-gray-700/50 rounded border border-gray-600/50">
            <kbd className="text-xs text-gray-400 font-mono">⌘</kbd>
            <kbd className="text-xs text-gray-400 font-mono">K</kbd>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto"
        >
          {/* Loading State */}
          {isLoading && query.trim() && (
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Searching...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {searchError && !isLoading && (
            <div className="p-4 text-center">
              <p className="text-sm text-red-400">Error: {searchError}</p>
              <p className="text-xs text-gray-500 mt-1">
                Try searching again or check your connection
              </p>
            </div>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && (
            <div className="p-2">
              {results.map((result, index) => {
                const topPoolText = getTopPoolText(result);
                const tvlUSD = result.metadata?.tvlUSD;
                
                return (
                  <button
                    key={result.id}
                    onClick={() => result.action?.()}
                    className={`
                      w-full flex items-start gap-3 px-3 py-3 rounded-lg
                      transition-all duration-150
                      ${
                        index === selectedIndex
                          ? "bg-yellow-400/10 border border-yellow-400/30"
                          : "hover:bg-gray-800/50 border border-transparent"
                      }
                    `}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {/* Icon/Logo */}
                    <div className="flex-shrink-0 mt-0.5">{getResultIcon(result)}</div>

                    {/* Content */}
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm md:text-base font-semibold text-white">
                          {result.title}
                        </span>
                        {tvlUSD !== undefined && tvlUSD > 0 && (
                          <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded whitespace-nowrap">
                            {formatTVL(tvlUSD)} TVL
                          </span>
                        )}
                        {result.type === "token" && result.metadata?.isTokenizedStock && (
                          <span className="px-1.5 py-0.5 text-xs bg-yellow-400/20 text-yellow-400 rounded whitespace-nowrap">
                            Stock
                          </span>
                        )}
                      </div>
                      {result.subtitle && (
                        <p className="text-xs md:text-sm text-gray-400 mt-0.5">
                          {result.subtitle}
                        </p>
                      )}
                      {result.metadata?.address && result.type === "token" && (
                        <p className="text-xs text-gray-500 mt-0.5 font-mono">
                          {result.metadata.address.slice(0, 6)}...{result.metadata.address.slice(-4)}
                        </p>
                      )}
                      {topPoolText && (
                        <p className="text-xs text-gray-400 mt-1.5 italic">
                          Top pool: {topPoolText}
                        </p>
                      )}
                      {result.type === "token" && result.metadata?.ticker && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Ticker: {result.metadata.ticker}
                        </p>
                      )}
                    </div>

                    {/* Action Indicator */}
                    <div className="flex-shrink-0 mt-0.5">
                      <svg
                        className="w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !searchError && results.length === 0 && query.trim() && (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-400">No tokens or pools found</p>
              <p className="text-xs text-gray-500 mt-1">
                Try searching for a token symbol, name, or address
              </p>
            </div>
          )}

          {/* Initial State */}
          {!isLoading && !searchError && results.length === 0 && !query.trim() && (
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
              <div className="space-y-1">
                <div className="text-xs text-gray-400 px-2 py-1">
                  • Search for tokens by symbol or name
                </div>
                <div className="text-xs text-gray-400 px-2 py-1">
                  • Enter an address to view on explorer
                </div>
                <div className="text-xs text-gray-400 px-2 py-1">
                  • View TVL and pool information
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
