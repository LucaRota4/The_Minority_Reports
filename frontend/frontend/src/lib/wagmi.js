import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, arbitrum, optimism, base, polygon, bsc, sepolia } from 'wagmi/chains';
import { http } from 'wagmi';
import {
  metaMaskWallet,
  rainbowWallet,
  coinbaseWallet,
  walletConnectWallet,
  trustWallet,
  rabbyWallet,
  ledgerWallet,
  frameWallet,
} from '@rainbow-me/rainbowkit/wallets';

// Removed the duplicate createConfig block

// Get project ID from environment (you'll need to create this)
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

export const config = getDefaultConfig({
  appName: 'Aequilibra',
  projectId,
  chains: [sepolia, mainnet, arbitrum, optimism, base, polygon, bsc],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),  // Your Infura endpoint for Sepolia
    // Add transports for other chains if needed, e.g.:
    // [mainnet.id]: http('https://mainnet.infura.io/v3/YOUR_INFURA_ID'),
    // [arbitrum.id]: http('https://arbitrum-one.publicnode.com'),  // Example for Arbitrum
  },
  wallets: [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        rainbowWallet,
        //coinbaseWallet,
        // walletConnectWallet, // Temporarily disabled - requires valid project ID
      ],
    },
    {
      groupName: 'More',
      wallets: [
        trustWallet,
        rabbyWallet,
        ledgerWallet,
        frameWallet,
      ],
    },
  ],
});

// ...existing code for supportedChains...