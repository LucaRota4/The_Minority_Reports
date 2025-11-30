import { useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function SepoliaNetworkGuard({ children }) {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isOnSepolia = chainId === sepolia.id;

  if (!isOnSepolia) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#E8DCC4]/20 to-white flex items-center justify-center">
        <div className="max-w-md mx-auto p-6">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="space-y-3">
                <p className="font-medium">Wrong Network</p>
                <p>Please switch to Sepolia testnet to use this application.</p>
                <Button
                  onClick={() => switchChain({ chainId: sepolia.id })}
                  className="w-full"
                  style={{ backgroundColor: '#4D89B0', color: 'white' }}
                >
                  Switch to Sepolia
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return children;
}