"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, arbitrum, optimism, base, polygon, sepolia, arbitrumSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { walletConnect, injected, coinbaseWallet } from "wagmi/connectors";
import { Toaster } from "react-hot-toast";
import { RainbowKitProvider, darkTheme, connectorsForWallets } from "@rainbow-me/rainbowkit";
import { 
  metaMaskWallet,
  coinbaseWallet as coinbaseWalletRainbowKit, 
  trustWallet 
} from "@rainbow-me/rainbowkit/wallets";
import { useEffect, useState } from "react";
import "@rainbow-me/rainbowkit/styles.css";

// Initialize QueryClient
const queryClient = new QueryClient();

// WalletConnect Project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

if (!projectId) {
  console.warn("⚠️ WalletConnect Project ID not set. Please add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to your .env.local file.");
}

// Supported chains
const chains = [mainnet, arbitrum, optimism, base, polygon, sepolia, arbitrumSepolia] as const;

// Configure RainbowKit wallets - only MetaMask, Coinbase Wallet, and Trust Wallet
// RainbowKit will automatically detect these wallets from the connectors in wagmi config

// Configure wagmi connectors - only include connectors for MetaMask, Coinbase Wallet, and Trust Wallet
const rainbowKitConnectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        coinbaseWalletRainbowKit,
        trustWallet,
      ],
    },
  ],
  { appName: 'Vaulto Swap', projectId }
);

// Configure wagmi
const config = createConfig({
  chains,
  connectors: [
    ...rainbowKitConnectors,
    // Keep WalletConnect connector for Web3Modal (desktop)
    walletConnect({ 
      projectId,
      metadata: {
        name: "Vaulto Swap",
        description: "Trade tokenized stocks with stablecoins",
        url: typeof window !== 'undefined' ? window.location.origin : "https://swap.vaulto.ai",
        icons: [typeof window !== 'undefined' ? `${window.location.origin}/favicon.png` : "https://swap.vaulto.ai/favicon.png"],
      },
      showQrModal: false,
    }),
  ],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://eth.llamarpc.com"),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc"),
    [optimism.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || "https://mainnet.optimism.io"),
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"),
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org"),
    [arbitrumSepolia.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc"),
  },
  ssr: true,
});

// RainbowKit theme configuration to match existing design
const rainbowKitTheme = darkTheme({
  accentColor: "#facc15", // yellow-400 (Vaulto gold)
  accentColorForeground: "#000000",
  borderRadius: "medium",
  fontStack: "system",
});

// Initialize Web3Modal for desktop (will be used conditionally)
// We initialize it at module level but it will only be used on desktop
let web3ModalInitialized = false;

function initializeWeb3Modal() {
  if (web3ModalInitialized || typeof window === "undefined") return;
  
  // Check if we're on desktop
  if (window.innerWidth >= 768) {
    try {
      createWeb3Modal({
        wagmiConfig: config,
        projectId,
        enableAnalytics: true,
        enableOnramp: true,
        themeMode: "dark",
        themeVariables: {
          "--w3m-accent": "#facc15", // yellow-400 (Vaulto gold)
        },
      });
      web3ModalInitialized = true;
    } catch (error) {
      // Web3Modal might already be initialized, ignore error
      console.warn("Web3Modal initialization:", error);
    }
  }
}

// Component to conditionally initialize Web3Modal (desktop only)
function Web3ModalInitializer() {
  useEffect(() => {
    initializeWeb3Modal();
    
    const handleResize = () => {
      if (!web3ModalInitialized && window.innerWidth >= 768) {
        initializeWeb3Modal();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return null;
}

// Client-only wrapper for mobile detection to prevent hydration mismatch
function MobileProviderWrapper({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const checkMobile = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        // Initialize Web3Modal if on desktop
        if (!mobile && !web3ModalInitialized) {
          initializeWeb3Modal();
        }
      };
      checkMobile();
      const handleResize = () => {
        checkMobile();
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // During SSR and initial render, always render desktop version to prevent hydration mismatch
  if (!mounted) {
    return (
      <>
        <Web3ModalInitializer />
        {children}
      </>
    );
  }

  // After mount, conditionally wrap with RainbowKitProvider on mobile
  if (isMobile) {
    return (
      <RainbowKitProvider 
        theme={rainbowKitTheme}
        initialChain={mainnet}
        modalSize="compact"
        appInfo={{
          appName: 'Vaulto Swap',
        }}
      >
        {children}
      </RainbowKitProvider>
    );
  }

  // Desktop: use Web3Modal
  return (
    <>
      <Web3ModalInitializer />
      {children}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  // QueryClientProvider must wrap WagmiProvider directly
  // Always render the same structure to prevent hydration mismatch
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <MobileProviderWrapper>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "rgba(15, 23, 42, 0.95)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />
        </MobileProviderWrapper>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

