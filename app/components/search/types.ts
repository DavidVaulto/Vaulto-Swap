/**
 * Types for Uniswap v3 liquidity API responses
 */

export interface LiquidityPoolResult {
  poolAddress: string;
  feeTierBps: number; // Fee tier in basis points (e.g., 500 = 0.05%)
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
}

export interface LiquidityTokenResult {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  tvlUSD: number;
  volumeUSD: number;
  pools: LiquidityPoolResult[];
}

export interface LiquidityApiResponse {
  chainId: number;
  tokens: LiquidityTokenResult[];
  error?: string;
}


