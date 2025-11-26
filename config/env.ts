import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().min(1, "WalletConnect Project ID is required"),
  NEXT_PUBLIC_MAINNET_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_ARBITRUM_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_OPTIMISM_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_BASE_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_POLYGON_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_SEPOLIA_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL: z.string().url().optional(),
  THE_GRAPH_API_KEY: z.string().min(1, "THE_GRAPH_API_KEY is required for Uniswap subgraph queries. Get your API key from: https://thegraph.com/studio/apikeys/").optional(),
});

export function validateEnv() {
  try {
    return envSchema.parse({
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
      NEXT_PUBLIC_MAINNET_RPC_URL: process.env.NEXT_PUBLIC_MAINNET_RPC_URL,
      NEXT_PUBLIC_ARBITRUM_RPC_URL: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL,
      NEXT_PUBLIC_OPTIMISM_RPC_URL: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL,
      NEXT_PUBLIC_BASE_RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL,
      NEXT_PUBLIC_POLYGON_RPC_URL: process.env.NEXT_PUBLIC_POLYGON_RPC_URL,
      NEXT_PUBLIC_SEPOLIA_RPC_URL: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
      NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL,
      THE_GRAPH_API_KEY: process.env.THE_GRAPH_API_KEY,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid environment variables:", error.errors);
      throw new Error("Invalid environment variables");
    }
    throw error;
  }
}

export const env = validateEnv();

