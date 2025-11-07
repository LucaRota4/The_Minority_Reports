'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function OnchainWalletDemo() {
  return (
    <ConnectButton />
  );
}

// Export as OnchainWallet for consistency
export { OnchainWalletDemo as OnchainWallet };