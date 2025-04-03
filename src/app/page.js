import NFTCreator from '../components/NFTCreator';

export const metadata = {
  title: 'NFT Factory',
  description: 'Create your own NFT collection',
  other: {
    'fc:frame': JSON.stringify({
      version: "next",
      imageUrl: 'https://cover-art.kasra.codes/nft-factory-rectangle.png',
      button: {
        title: "Create NFT",
        action: {
          type: "launch_frame",
          name: "nft-factory",
          url: process.env.NEXT_PUBLIC_BASE_URL || 'https://nft-factory.kasra.codes',
          splashImageUrl: 'https://cover-art.kasra.codes/nft-factory-square.png',
          splashBackgroundColor: "#FFFFFF"
        }
      }
    })
  }
};

async function getEthPriceUSD() {
  try {
    const apiKey = process.env.ALCHEMY_API_KEY;
    const fetchURL = `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-symbol`;
    
    const params = new URLSearchParams();
    params.append('symbols', 'ETH');
    
    const urlWithParams = `${fetchURL}?${params.toString()}`;
    
    console.log('Fetching ETH price from:', urlWithParams);
    
    const response = await fetch(urlWithParams, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // This ensures the request is done at build time or when the page is requested
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('Alchemy API error:', await response.text());
      return null; // Return null if API fails
    }
    
    const data = await response.json();
    console.log('Alchemy API response:', JSON.stringify(data, null, 2));
    
    // Extract price based on the actual API response structure
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
    
    console.log('Extracted ETH price:', price);
    
    return price; // Return null if we can't extract the price
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    return null; // Return null if API fails
  }
}

export default async function Home() {
  const ethPrice = await getEthPriceUSD();

  return (
    <div>
      <NFTCreator ethPriceUSD={ethPrice} />
    </div>
  );
}