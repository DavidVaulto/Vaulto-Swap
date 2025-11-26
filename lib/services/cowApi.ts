/**
 * CoW Protocol API Service
 * Fetches orderbook liquidity from CoW Protocol for Ethereum Mainnet
 */

export interface CowOrder {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  validTo: number;
  appData: string;
  feeAmount: string;
  kind: string;
  partiallyFillable: boolean;
  sellTokenBalance: string;
  buyTokenBalance: string;
  status: string;
  creationDate: string;
  class: string;
  owner: string;
  uid: string;
}

export interface LiquidityData {
  totalLiquidity: string;
  orderCount: number;
  direction: 'sell' | 'buy';
}

export interface PairLiquidity {
  tokenA: string;
  tokenB: string;
  liquidityAtoB: LiquidityData;
  liquidityBtoA: LiquidityData;
  timestamp: number;
}

const COW_API_BASE = 'https://api.cow.fi/mainnet/api/v1';

/**
 * Fetches open orders for a token pair
 */
export async function fetchOrders(
  sellToken: string,
  buyToken: string
): Promise<CowOrder[]> {
  try {
    const url = `${COW_API_BASE}/orders?sellToken=${sellToken}&buyToken=${buyToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: CowOrder[] = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching orders from CoW Protocol:', error);
    return [];
  }
}

/**
 * Calculates total liquidity for a set of orders
 */
export function calculateLiquidity(orders: CowOrder[]): LiquidityData {
  const totalLiquidity = orders.reduce((sum, order) => {
    return sum + BigInt(order.sellAmount || '0');
  }, BigInt(0));

  return {
    totalLiquidity: totalLiquidity.toString(),
    orderCount: orders.length,
    direction: 'sell' as const,
  };
}

/**
 * Fetches liquidity for both directions of a token pair
 */
export async function fetchPairLiquidity(
  tokenA: string,
  tokenB: string
): Promise<PairLiquidity | null> {
  try {
    // Fetch orders in both directions
    const [ordersAtoB, ordersBtoA] = await Promise.all([
      fetchOrders(tokenA, tokenB),
      fetchOrders(tokenB, tokenA),
    ]);

    // Calculate liquidity for each direction
    const liquidityAtoB = calculateLiquidity(ordersAtoB);
    const liquidityBtoA = calculateLiquidity(ordersBtoA);

    return {
      tokenA,
      tokenB,
      liquidityAtoB,
      liquidityBtoA,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error fetching pair liquidity:', error);
    return null;
  }
}

/**
 * Formats liquidity amount with appropriate decimals
 */
export function formatLiquidity(amount: string, decimals: number = 6): string {
  const bigAmount = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const wholePart = bigAmount / divisor;
  const fractionalPart = bigAmount % divisor;

  if (fractionalPart === BigInt(0)) {
    return wholePart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.replace(/\.?0+$/, '');

  return `${wholePart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${trimmedFractional}`;
}


