import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    // Use Pinata for pinning if JWT is available
    const pinataJwt = process.env.PINATA_JWT; // Server-side only
    if (pinataJwt) {
      const formData = new FormData();
      formData.append('file', new Blob([description], { type: 'text/plain' }), 'description.txt');

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pinataJwt}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json({ ipfsUrl: `ipfs://${result.IpfsHash}` });
      } else {
        console.error('Pinata upload failed:', response.status, await response.text());
      }
    }

    // Use Infura IPFS if credentials are available
    const infuraProjectId = process.env.NEXT_PUBLIC_INFURA_PROJECT_ID; // Can be public
    const infuraProjectSecret = process.env.INFURA_PROJECT_SECRET; // Server-side only
    if (infuraProjectId && infuraProjectSecret) {
      const formData = new FormData();
      formData.append('file', new Blob([description], { type: 'text/plain' }), 'description.txt');

      const response = await fetch(`https://ipfs.infura.io:5001/api/v0/add`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(infuraProjectId + ':' + infuraProjectSecret),
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json({ ipfsUrl: `ipfs://${result.Hash}` });
      } else {
        console.error('Infura upload failed:', response.status, await response.text());
      }
    }

    // Fallback: return a local IPFS-like URI (content won't be globally accessible)
    console.warn('No IPFS pinning service available, using local reference');
    const mockHash = 'Qm' + Math.random().toString(36).substring(2, 15);
    return NextResponse.json({ ipfsUrl: `ipfs://${mockHash}` });

  } catch (error) {
    console.error('IPFS upload error:', error);
    return NextResponse.json({ error: 'Failed to upload to IPFS' }, { status: 500 });
  }
}