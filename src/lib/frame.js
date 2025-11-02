import { sdk } from '@farcaster/miniapp-sdk'

export async function initializeFrame() {
  try {
    const context = await sdk.context

    if (!context || !context.user) {
      return
    }

    const user = context.user

    if (!user || !user.fid) {
      // most likely not in a mini app
      return
    }

    window.userFid = user.fid;

    // Call the ready function to remove your splash screen when in a mini app
    await sdk.actions.ready();
  } catch (error) {
    console.error('Error initializing Mini App:', error);
  }
}

/**
 * Converts ETH amount to wei (hex string format for transactions)
 * @param {number} eth - Amount in ETH
 * @returns {string} - Amount in wei as hex string
 */
function ethToWei(eth) {
  // Convert to BigInt and multiply by 10^18
  const wei = BigInt(Math.floor(eth * 1e18)).toString(16);
  return '0x' + wei;
}

/**
 * Opens Warpcast compose dialog with a specific URL and text
 * @param {string} url - The URL to share
 * @param {string} text - The text to include in the share
 * @returns {Promise<void>}
 */
export async function shareToWarpcast(url, text) {
  try {
    // Use the composeCast action from the miniapp SDK
    await sdk.actions.composeCast({
      text: text,
      embeds: [url]
    });

    console.log('Opened Warpcast compose dialog');
  } catch (error) {
    console.error('Error opening Warpcast compose:', error);
    // If mini app SDK fails, try regular window.open as fallback
    try {
      window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`, '_blank');
    } catch (fallbackError) {
      console.error('Fallback share also failed:', fallbackError);
    }
  }
}

/**
 * Mints an NFT from a collection contract
 * @param {string} contractAddress - The contract address to interact with
 * @param {string} price - The price in ETH (will be converted to Wei)
 * @param {number} quantity - Number of NFTs to mint
 * @returns {Promise<{success: boolean, txHash?: string, error?: string}>}
 */
export async function mintNFT(contractAddress, price, quantity = 1) {
  try {
    // First, try to switch to Base network if not already on it
    const chainId = await sdk.wallet.ethProvider.request({
      method: 'eth_chainId'
    });

    const chainIdDecimal = typeof chainId === 'number' ? chainId : parseInt(chainId, 16);

    // Base Mainnet chain ID is 8453 (0x2105 in hex)
    if (chainIdDecimal !== 8453) {
      console.log(`Switching to Base network from chain ID ${chainIdDecimal}`);
      await sdk.wallet.ethProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }] // Base mainnet chainId
      });
    }

    // Get the user's wallet address
    const accounts = await sdk.wallet.ethProvider.request({
      method: 'eth_requestAccounts'
    });

    if (!accounts || !accounts[0]) {
      throw new Error('No wallet connected');
    }

    const walletAddress = accounts[0];

    // Calculate the total price based on quantity
    const priceValue = parseFloat(price);
    const totalValue = priceValue * quantity;

    // Create the mint function signature (keccak256('mint()'))
    const mintFunctionSignature = '0x1249c58b';

    // Convert ETH to Wei for the transaction
    const weiValue = totalValue > 0 ? ethToWei(totalValue) : '0x0';

    // Send the transaction
    const txHash = await sdk.wallet.ethProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: walletAddress,
        to: contractAddress,
        data: mintFunctionSignature,
        value: weiValue
      }]
    });

    console.log('Mint transaction sent:', txHash);

    return {
      success: true,
      txHash: txHash
    };
  } catch (error) {
    console.error('Error minting NFT:', error);
    return {
      success: false,
      error: error.message || 'Failed to mint NFT'
    };
  }
}

export async function sendPaymentForCollection(ethPriceUSD) {
  try {
    // Target address to send payment to
    const targetAddress = '0x0db12C0A67bc5B8942ea3126a465d7a0b23126C7';

    // Hard-coded payment of $5 USD
    const paymentAmountUSD = 5;

    // Make sure ethPriceUSD is valid
    if (!ethPriceUSD || isNaN(parseFloat(ethPriceUSD)) || parseFloat(ethPriceUSD) <= 0) {
      throw new Error('Invalid ETH price');
    }

    // Calculate ETH amount based on current price
    const ethAmount = paymentAmountUSD / parseFloat(ethPriceUSD);
    console.log(`Payment: $${paymentAmountUSD} USD at ETH price $${ethPriceUSD} = ${ethAmount} ETH`);

    // First, try to switch to Base network if not already on it
    const chainId = await sdk.wallet.ethProvider.request({
      method: 'eth_chainId'
    });

    const chainIdDecimal = typeof chainId === 'number' ? chainId : parseInt(chainId, 16);

    // Base Mainnet chain ID is 8453 (0x2105 in hex)
    if (chainIdDecimal !== 8453) {
      console.log(`Switching to Base network from chain ID ${chainIdDecimal}`);
      await sdk.wallet.ethProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }] // Base mainnet chainId
      });
    }

    // Get the user's wallet address
    const accounts = await sdk.wallet.ethProvider.request({
      method: 'eth_requestAccounts'
    });

    if (!accounts || !accounts[0]) {
      throw new Error('No wallet connected');
    }

    // Convert ETH to Wei
    const weiValue = ethToWei(ethAmount);

    // Send transaction
    const txHash = await sdk.wallet.ethProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: accounts[0],
        to: targetAddress,
        value: weiValue
      }]
    });

    console.log('Payment transaction sent:', txHash);

    return {
      success: true,
      txHash: txHash
    };
  } catch (error) {
    console.error('Error sending ETH payment:', error);
    return {
      success: false,
      error: error.message || 'Failed to process payment'
    };
  }
}

/**
 * Checks if minting is available for a collection and returns total supply
 * Uses the backend API endpoint instead of direct eth_call (which miniapp SDK doesn't support)
 * @param {string} contractAddress - The contract address to interact with
 * @returns {Promise<{success: boolean, hasMintingAvailable?: boolean, totalSupply?: string, error?: string}>}
 */
export async function checkMintingAvailability(contractAddress) {
  try {
    // Call our backend API endpoint to check minting availability
    const response = await fetch(`/api/contract/check-minting?address=${contractAddress}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to check minting availability');
    }

    const data = await response.json();

    console.log('Minting availability check:', {
      hasMintingAvailable: data.hasMintingAvailable,
      totalSupply: data.totalSupply
    });

    return {
      success: data.success,
      hasMintingAvailable: data.hasMintingAvailable,
      totalSupply: data.totalSupply
    };
  } catch (error) {
    console.error('Error checking minting availability:', error);
    return {
      success: false,
      error: error.message || 'Failed to check minting availability'
    };
  }
}