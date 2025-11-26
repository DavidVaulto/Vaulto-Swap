/**
 * Hook for fetching and managing orderbook liquidity
 */

import { useState, useEffect, useCallback } from 'react';
import { useChainId } from 'wagmi';
import { fetchPairLiquidity, PairLiquidity } from '../services/cowApi';

interface UseOrderbookLiquidityOptions {
  tokenA?: string;
  tokenB?: string;
  refreshInterval?: number; // in milliseconds, default 10000 (10 seconds)
  enabled?: boolean;
}

export function useOrderbookLiquidity({
  tokenA,
  tokenB,
  refreshInterval = 10000,
  enabled = true,
}: UseOrderbookLiquidityOptions) {
  const chainId = useChainId();
  const [liquidity, setLiquidity] = useState<PairLiquidity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMainnet = chainId === 1;

  const fetchLiquidity = useCallback(async () => {
    if (!tokenA || !tokenB || !isMainnet || !enabled) {
      setLiquidity(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchPairLiquidity(tokenA, tokenB);
      setLiquidity(data);
      
      if (!data) {
        setError('No liquidity data available');
      }
    } catch (err) {
      console.error('Error fetching liquidity:', err);
      setError('Failed to fetch liquidity data');
      setLiquidity(null);
    } finally {
      setLoading(false);
    }
  }, [tokenA, tokenB, isMainnet, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchLiquidity();
  }, [fetchLiquidity]);

  // Auto-refresh at interval
  useEffect(() => {
    if (!enabled || !isMainnet) return;

    const interval = setInterval(() => {
      fetchLiquidity();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchLiquidity, refreshInterval, enabled, isMainnet]);

  return {
    liquidity,
    loading,
    error,
    refresh: fetchLiquidity,
    isMainnet,
  };
}
