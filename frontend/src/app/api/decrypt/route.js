import { initializeFheInstance, decryptMultipleHandles } from '@/lib/fhevm';

let fheInitialized = false;

export async function POST(request) {
  try {
    // Initialize FHE instance if not already done
    if (!fheInitialized) {
      console.log('API: Initializing FHE instance...');
      await initializeFheInstance({
        rpcUrl: 'https://sepolia.infura.io/v3/73c573e5a8854465ad19e8e4e7e2e20c'
      });
      fheInitialized = true;
      console.log('API: FHE instance initialized successfully.');
    } else {
      console.log('API: FHE instance already initialized.');
    }

    const { contractAddress, handles } = await request.json();
    console.log('API: Received request with contractAddress:', contractAddress, 'handles length:', handles?.length);

    if (!contractAddress || !handles || !Array.isArray(handles)) {
      console.log('API: Validation failed - missing or invalid fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: contractAddress and handles array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('API: Calling decryptMultipleHandles...');
    // Call decryption (signer not needed for publicDecrypt)
    const result = await decryptMultipleHandles(contractAddress, null, handles);
    console.log('API: Decryption successful, result keys:', Object.keys(result));

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('API: Decryption error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Decryption failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
