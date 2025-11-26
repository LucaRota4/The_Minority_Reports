import { initializeFheInstance, createEncryptedInput, createEncryptedPercentages } from '@/lib/fhevm';

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

    const { proposalAddress, userAddress, voteType, choiceIndex, percentages } = await request.json();
    console.log('API: Received request:', { proposalAddress, userAddress, voteType, choiceIndex, percentages });

    if (!proposalAddress || !userAddress || voteType === undefined) {
      console.log('API: Validation failed - missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: proposalAddress, userAddress, and voteType' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let result;
    if (voteType === 0 || voteType === 1) {
      // Non-weighted or weighted single choice
      if (choiceIndex === undefined) {
        console.log('API: Validation failed - choiceIndex required for vote types 0 and 1');
        return new Response(
          JSON.stringify({ error: 'choiceIndex is required for vote types 0 and 1' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log('API: Creating encrypted input for single choice vote...');
      result = await createEncryptedInput(proposalAddress, userAddress, choiceIndex);
      console.log('API: Encrypted input created successfully');

    } else if (voteType === 2) {
      // Weighted fractional
      if (!percentages || !Array.isArray(percentages)) {
        console.log('API: Validation failed - percentages array required for vote type 2');
        return new Response(
          JSON.stringify({ error: 'percentages array is required for vote type 2' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log('API: Creating encrypted percentages for fractional vote...');
      result = await createEncryptedPercentages(proposalAddress, userAddress, percentages);
      console.log('API: Encrypted percentages created successfully');

    } else {
      console.log('API: Validation failed - unsupported vote type:', voteType);
      return new Response(
        JSON.stringify({ error: 'Unsupported vote type. Must be 0, 1, or 2' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('API: Encryption successful, returning result');
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('API: Encryption error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Encryption failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
