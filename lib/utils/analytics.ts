/**
 * Google Analytics 4 (GA4) utility functions
 * Provides type-safe wrappers for gtag event tracking
 */

// Type definitions for gtag
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Device detection utilities
export interface DeviceInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenResolution: string;
  browser: string;
  os: string;
}

/**
 * Detect device type based on screen width
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Get screen resolution as "widthxheight"
 */
function getScreenResolution(): string {
  if (typeof window === 'undefined') return 'unknown';
  return `${window.screen.width}x${window.screen.height}`;
}

/**
 * Detect browser name and version
 */
function getBrowser(): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent;
  
  if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) {
    const match = ua.match(/Chrome\/(\d+)/);
    return `Chrome ${match ? match[1] : ''}`.trim();
  }
  if (ua.includes('Firefox')) {
    const match = ua.match(/Firefox\/(\d+)/);
    return `Firefox ${match ? match[1] : ''}`.trim();
  }
  if (ua.includes('Safari') && !ua.includes('Chrome')) {
    const match = ua.match(/Version\/(\d+)/);
    return `Safari ${match ? match[1] : ''}`.trim();
  }
  if (ua.includes('Edg')) {
    const match = ua.match(/Edg\/(\d+)/);
    return `Edge ${match ? match[1] : ''}`.trim();
  }
  if (ua.includes('OPR')) {
    const match = ua.match(/OPR\/(\d+)/);
    return `Opera ${match ? match[1] : ''}`.trim();
  }
  
  return 'unknown';
}

/**
 * Detect operating system
 */
function getOS(): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent;
  
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS X') || ua.includes('Macintosh')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || (ua.includes('iPhone') || ua.includes('iPad'))) return 'iOS';
  
  return 'unknown';
}

/**
 * Get comprehensive device information
 */
export function getDeviceInfo(): DeviceInfo {
  return {
    deviceType: getDeviceType(),
    screenResolution: getScreenResolution(),
    browser: getBrowser(),
    os: getOS(),
  };
}

/**
 * Hash wallet address for privacy (simple hash, not cryptographic)
 */
export function hashAddress(address: string): string {
  if (!address) return 'unknown';
  // Simple hash for privacy - first 6 and last 4 chars
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Check if gtag is available
 */
function isGtagAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/**
 * Base event tracking function with device info
 */
function trackEvent(eventName: string, params?: Record<string, any>): void {
  if (!isGtagAvailable()) {
    console.warn('gtag is not available');
    return;
  }

  const deviceInfo = getDeviceInfo();
  
  const eventParams = {
    ...params,
    device_type: deviceInfo.deviceType,
    screen_resolution: deviceInfo.screenResolution,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    timestamp: new Date().toISOString(),
  };

  try {
    window.gtag('event', eventName, eventParams);
  } catch (error) {
    console.error('Error tracking event:', error);
  }
}

/**
 * Track wallet connection click
 */
export function trackWalletConnectClick(): void {
  trackEvent('wallet_connect_click');
}

/**
 * Track successful wallet connection
 */
export function trackWalletConnected(address: string, chainId: number, walletType?: string): void {
  trackEvent('wallet_connected', {
    wallet_address_hash: hashAddress(address),
    chain_id: chainId,
    wallet_type: walletType || 'unknown',
  });
}

/**
 * Track wallet disconnection
 */
export function trackWalletDisconnected(): void {
  trackEvent('wallet_disconnected');
}

/**
 * Track swap widget loaded
 */
export function trackSwapWidgetLoaded(chainId: number): void {
  trackEvent('swap_widget_loaded', {
    chain_id: chainId,
  });
}

/**
 * Track token selection
 */
export function trackTokenSelected(
  tokenType: 'sell' | 'buy',
  tokenSymbol: string,
  tokenAddress?: string,
  chainId?: number
): void {
  trackEvent('token_selected', {
    token_type: tokenType,
    token_symbol: tokenSymbol,
    token_address: tokenAddress || 'unknown',
    chain_id: chainId || 1,
  });
}

/**
 * Track swap amount change
 */
export function trackSwapAmountChanged(
  tokenType: 'sell' | 'buy',
  amount: string,
  tokenSymbol: string
): void {
  trackEvent('swap_amount_changed', {
    token_type: tokenType,
    amount: amount,
    token_symbol: tokenSymbol,
  });
}

/**
 * Track swap initiation
 */
export function trackSwapInitiated(
  sellToken: string,
  buyToken: string,
  sellAmount: string,
  buyAmount: string,
  chainId: number,
  walletAddress?: string
): void {
  trackEvent('swap_initiated', {
    sell_token: sellToken,
    buy_token: buyToken,
    sell_amount: sellAmount,
    buy_amount: buyAmount,
    chain_id: chainId,
    wallet_address_hash: walletAddress ? hashAddress(walletAddress) : 'unknown',
  });
}

/**
 * Track swap completion
 */
export function trackSwapCompleted(
  sellToken: string,
  buyToken: string,
  sellAmount: string,
  buyAmount: string,
  chainId: number,
  transactionHash: string,
  walletAddress?: string
): void {
  trackEvent('swap_completed', {
    sell_token: sellToken,
    buy_token: buyToken,
    sell_amount: sellAmount,
    buy_amount: buyAmount,
    chain_id: chainId,
    transaction_hash: transactionHash,
    wallet_address_hash: walletAddress ? hashAddress(walletAddress) : 'unknown',
  });
}

/**
 * Track swap failure
 */
export function trackSwapFailed(
  sellToken: string,
  buyToken: string,
  sellAmount: string,
  chainId: number,
  error?: string,
  walletAddress?: string
): void {
  trackEvent('swap_failed', {
    sell_token: sellToken,
    buy_token: buyToken,
    sell_amount: sellAmount,
    chain_id: chainId,
    error: error || 'unknown',
    wallet_address_hash: walletAddress ? hashAddress(walletAddress) : 'unknown',
  });
}

/**
 * Track chain change
 */
export function trackChainChanged(oldChainId: number, newChainId: number): void {
  trackEvent('chain_changed', {
    old_chain_id: oldChainId,
    new_chain_id: newChainId,
  });
}

/**
 * Track page view (can be called manually if needed)
 */
export function trackPageView(path?: string): void {
  if (!isGtagAvailable()) return;
  
  const deviceInfo = getDeviceInfo();
  
  try {
    window.gtag('config', 'G-Y8W2H3EQJD', {
      page_path: path || (typeof window !== 'undefined' ? window.location.pathname : '/'),
      device_type: deviceInfo.deviceType,
      screen_resolution: deviceInfo.screenResolution,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
    });
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
}

