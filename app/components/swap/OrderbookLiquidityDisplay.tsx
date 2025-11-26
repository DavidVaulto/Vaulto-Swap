"use client";

import { useState } from 'react';
import { useChainId } from 'wagmi';
import { useOrderbookLiquidity } from '@/lib/hooks/useOrderbookLiquidity';
import { formatLiquidity } from '@/lib/services/cowApi';
import { getTokensByChain, type Token } from '@/config/tokens';

/**
 * Component to display orderbook liquidity for token pairs
 * Only displays on Ethereum Mainnet
 */
export default function OrderbookLiquidityDisplay() {
  const chainId = useChainId();
  const isMainnet = chainId === 1;

  const [tokenA, setTokenA] = useState<string>('');
  const [tokenB, setTokenB] = useState<string>('');
  const [tokenASymbol, setTokenASymbol] = useState<string>('');
  const [tokenBSymbol, setTokenBSymbol] = useState<string>('');

  const { liquidity, loading, error } = useOrderbookLiquidity({
    tokenA,
    tokenB,
    refreshInterval: 10000,
    enabled: tokenA !== '' && tokenB !== '' && tokenA !== tokenB,
  });

  const tokens = getTokensByChain(chainId);

  const handleTokenASelect = (token: Token) => {
    setTokenA(token.address);
    setTokenASymbol(token.symbol);
  };

  const handleTokenBSelect = (token: Token) => {
    setTokenB(token.address);
    setTokenBSymbol(token.symbol);
  };

  // Don't show component if not on mainnet
  if (!isMainnet) {
    return null;
  }

  const hasLiquidity =
    liquidity &&
    (BigInt(liquidity.liquidityAtoB.totalLiquidity) > 0 ||
      BigInt(liquidity.liquidityBtoA.totalLiquidity) > 0);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 mt-6">
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Orderbook Liquidity
          </h3>
          {tokenA && tokenB && (
            <button
              onClick={() => {
                setTokenA('');
                setTokenB('');
                setTokenASymbol('');
                setTokenBSymbol('');
              }}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Token Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Token A Selector */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              From Token
            </label>
            <select
              value={tokenA}
              onChange={(e) => {
                const token = tokens.find((t) => t.address === e.target.value);
                if (token) handleTokenASelect(token);
              }}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400/50"
            >
              <option value="">Select a token...</option>
              {tokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          {/* Token B Selector */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              To Token
            </label>
            <select
              value={tokenB}
              onChange={(e) => {
                const token = tokens.find((t) => t.address === e.target.value);
                if (token) handleTokenBSelect(token);
              }}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400/50"
            >
              <option value="">Select a token...</option>
              {tokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Liquidity Display */}
        {tokenA && tokenB && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400"></div>
                <span className="ml-2 text-sm text-gray-400">
                  Loading liquidity...
                </span>
              </div>
            ) : error ? (
              <div className="text-sm text-red-400 py-2 flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </div>
            ) : liquidity && hasLiquidity ? (
              <div className="space-y-2">
                {/* Liquidity A → B */}
                {BigInt(liquidity.liquidityAtoB.totalLiquidity) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg border border-gray-700">
                    <span className="text-sm text-gray-400">
                      Available Liquidity:
                    </span>
                    <span className="text-sm font-medium text-white">
                      {tokenASymbol} → {tokenBSymbol}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-yellow-400">
                        {formatLiquidity(
                          liquidity.liquidityAtoB.totalLiquidity,
                          tokens.find((t) => t.address === tokenA)?.decimals ||
                            18
                        )}{' '}
                        {tokenASymbol}
                      </div>
                      <div className="text-xs text-gray-500">
                        ({liquidity.liquidityAtoB.orderCount} orders)
                      </div>
                    </div>
                  </div>
                )}

                {/* Liquidity B → A */}
                {BigInt(liquidity.liquidityBtoA.totalLiquidity) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg border border-gray-700">
                    <span className="text-sm text-gray-400">
                      Available Liquidity:
                    </span>
                    <span className="text-sm font-medium text-white">
                      {tokenBSymbol} → {tokenASymbol}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-yellow-400">
                        {formatLiquidity(
                          liquidity.liquidityBtoA.totalLiquidity,
                          tokens.find((t) => t.address === tokenB)?.decimals ||
                            18
                        )}{' '}
                        {tokenBSymbol}
                      </div>
                      <div className="text-xs text-gray-500">
                        ({liquidity.liquidityBtoA.orderCount} orders)
                      </div>
                    </div>
                  </div>
                )}

                {/* Warning for low liquidity */}
                {liquidity.liquidityAtoB.orderCount < 5 && (
                  <div className="flex items-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Low liquidity detected - proceed with caution
                  </div>
                )}
              </div>
            ) : liquidity ? (
              <div className="text-sm text-gray-400 py-2">
                No active orderbook liquidity available for this pair
              </div>
            ) : null}
          </div>
        )}

        {/* Helper Text */}
        {!tokenA || !tokenB ? (
          <p className="text-xs text-gray-500 mt-4">
            Select a token pair to view available orderbook liquidity from CoW
            Protocol on Ethereum Mainnet
          </p>
        ) : null}
      </div>
    </div>
  );
}
