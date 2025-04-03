/**
 * Utility functions for fetching and caching ETH price
 */

// Namespace for KV keys
const NAMESPACE = 'nft-factory';
// Cache key for ETH price in KV
const ETH_PRICE_CACHE_KEY = `${NAMESPACE}:eth_price_cache`;
// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Cache the KV URL to avoid rebuilding it on every request
let cachedKVUrl = null;
async function getKVUrl(path) {
  if (!cachedKVUrl) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const namespaceId = process.env.CLOUDFLARE_KV_BINDING;
    cachedKVUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
  }
  return `${cachedKVUrl}${path}`;
}

/**
 * Fetches the current ETH price from Alchemy API
 * @returns {Promise<number|null>} The ETH price in USD or null if fetch fails
 */
async function fetchEthPriceFromAlchemy() {
  try {
    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) {
      console.error('ALCHEMY_API_KEY is not defined');
      return null;
    }

    const fetchURL = `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-symbol`;
    
    const params = new URLSearchParams();
    params.append('symbols', 'ETH');
    
    const urlWithParams = `${fetchURL}?${params.toString()}`;
        
    const response = await fetch(urlWithParams, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('Alchemy API error:', await response.text());
      return null;
    }
    
    const data = await response.json();
    
    let price = null;
    
    if (data && data.data && Array.isArray(data.data)) {
      const ethData = data.data.find(item => item.symbol === 'ETH');
      if (ethData && ethData.prices && Array.isArray(ethData.prices)) {
        const usdPrice = ethData.prices.find(price => price.currency === 'usd');
        if (usdPrice && usdPrice.value) {
          price = parseFloat(usdPrice.value);
        }
      }
    }
    
    console.log('Fetched ETH price from Alchemy:', price);
    
    return price;
  } catch (error) {
    console.error('Error fetching ETH price from Alchemy:', error);
    return null;
  }
}

/**
 * Gets the ETH price from cache or fetches it from Alchemy if cache is expired
 * @returns {Promise<number|null>} The ETH price in USD or null if fetch fails
 */
export async function getEthPriceUSD() {
  // Check if we're in a Cloudflare environment with KV binding
  if (process.env.CLOUDFLARE_KV_BINDING && process.env.CLOUDFLARE_KV_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
    try {
      // Try to get the cached price
      const url = await getKVUrl(`/values/${ETH_PRICE_CACHE_KEY}`);
      const cachedData = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_KV_TOKEN}`
        }
      });
      
      if (cachedData.ok) {
        const data = await cachedData.json();
        
        try {
          // The data appears to be directly the cached object, not wrapped in result
          if (data && data.price && data.timestamp) {
            // Check if the cache is still valid (less than 5 minutes old)
            if (Date.now() - data.timestamp < CACHE_DURATION) {
              console.log('Using cached ETH price:', data.price);
              return data.price;
            } else {
              console.log('Cache expired, fetching new price');
            }
          } else if (data && data.result) {
            // Handle original API response structure if that's what we're getting
            const cachedPrice = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
            if (cachedPrice.timestamp && (Date.now() - cachedPrice.timestamp < CACHE_DURATION)) {
              console.log('Using cached ETH price (from result):', cachedPrice.price);
              return cachedPrice.price;
            }
          }
        } catch (parseError) {
          console.error('Error parsing cached price:', parseError);
        }
      } else {
        console.log('No valid cache found, status:', cachedData.status);
      }
      
      // If we don't have a valid cache, fetch a new price
      const price = await fetchEthPriceFromAlchemy();
      
      if (price !== null) {
        // Cache the new price
        const putUrl = await getKVUrl(`/values/${ETH_PRICE_CACHE_KEY}`);
        const cacheResponse = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_KV_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            price,
            timestamp: Date.now()
          })
        });
        
        if (cacheResponse.ok) {
          console.log('Cached new ETH price:', price);
        } else {
          console.error('Failed to cache ETH price:', await cacheResponse.text());
        }
      }
      
      return price;
    } catch (error) {
      console.error('Error with Cloudflare KV:', error);
      // Fall back to direct fetch if KV fails
      return fetchEthPriceFromAlchemy();
    }
  } else {
    // If not in Cloudflare environment, just fetch directly
    console.log('No Cloudflare KV binding, fetching ETH price directly');
    return fetchEthPriceFromAlchemy();
  }
} 