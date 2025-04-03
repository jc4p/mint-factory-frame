/**
 * Utility functions for interacting with the Neynar API
 */

/**
 * Fetch user data from Neynar API based on FID
 * @param {string|number} fid - The Farcaster ID to look up
 * @returns {Promise<Object>} - User data including username and primary ETH address
 */
export async function getUserByFid(fid) {
  try {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      throw new Error('NEYNAR_API_KEY environment variable is not set');
    }

    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Neynar API error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.users || data.users.length === 0) {
      throw new Error(`No user found with FID: ${fid}`);
    }

    const user = data.users[0];
    
    // First try to get the primary ETH address
    let ethAddress = user.verified_addresses?.primary?.eth_address;
    
    // If no primary, try the first verified ETH address
    if (!ethAddress && user.verified_addresses?.eth_addresses?.length > 0) {
      ethAddress = user.verified_addresses.eth_addresses[0];
    }
        
    return {
      fid: user.fid,
      username: user.username,
      hasEthAddress: !!ethAddress,
      ethAddress: ethAddress,
      displayName: user.display_name,
      pfpUrl: user.pfp_url
    };
  } catch (error) {
    console.error('Error fetching user data from Neynar:', error);
    throw error;
  }
}