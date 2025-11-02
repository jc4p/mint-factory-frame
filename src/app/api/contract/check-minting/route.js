import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request) {
  try {
    // Get contract address from query params
    const { searchParams } = new URL(request.url);
    const contractAddress = searchParams.get('address');

    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Contract address is required' },
        { status: 400 }
      );
    }

    // Validate contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return NextResponse.json(
        { error: 'Invalid contract address format' },
        { status: 400 }
      );
    }

    // Get Alchemy API key
    const alchemyApiKey = process.env.ALCHEMY_API_KEY;
    if (!alchemyApiKey) {
      console.error('ALCHEMY_API_KEY is not defined');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Alchemy RPC endpoint for Base mainnet
    const rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;

    // Function signatures
    const mintingAvailableFunctionSignature = '0x8a2daaf7'; // keccak256('mintingAvailable()')
    const totalSupplyFunctionSignature = '0x18160ddd'; // keccak256('totalSupply()')

    // Make both RPC calls in parallel
    const [mintingAvailableResponse, totalSupplyResponse] = await Promise.all([
      fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            {
              to: contractAddress,
              data: mintingAvailableFunctionSignature
            },
            'latest'
          ]
        })
      }),
      fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_call',
          params: [
            {
              to: contractAddress,
              data: totalSupplyFunctionSignature
            },
            'latest'
          ]
        })
      })
    ]);

    if (!mintingAvailableResponse.ok || !totalSupplyResponse.ok) {
      console.error('Alchemy RPC error');
      return NextResponse.json(
        { error: 'Failed to check contract' },
        { status: 500 }
      );
    }

    const mintingAvailableData = await mintingAvailableResponse.json();
    const totalSupplyData = await totalSupplyResponse.json();

    // Check for RPC errors
    if (mintingAvailableData.error || totalSupplyData.error) {
      console.error('RPC call error:', {
        mintingError: mintingAvailableData.error,
        supplyError: totalSupplyData.error
      });
      return NextResponse.json(
        { error: 'Contract call failed' },
        { status: 500 }
      );
    }

    // Parse mintingAvailable result (bool)
    const mintingAvailableResult = mintingAvailableData.result;
    const hasMintingAvailable = mintingAvailableResult === '0x0000000000000000000000000000000000000000000000000000000000000001';

    // Parse totalSupply result (uint256)
    let totalSupply;
    try {
      const totalSupplyResult = totalSupplyData.result;
      totalSupply = BigInt(totalSupplyResult).toString();
    } catch (error) {
      console.error('Error parsing totalSupply:', error);
      totalSupply = '0';
    }

    return NextResponse.json({
      success: true,
      hasMintingAvailable,
      totalSupply
    });

  } catch (error) {
    console.error('Error checking minting availability:', error);
    return NextResponse.json(
      { error: 'Failed to check minting availability' },
      { status: 500 }
    );
  }
}
