import { sql } from '@vercel/postgres';
import { notFound } from 'next/navigation';
import MintComponent from '@/components/MintComponent';

export const dynamic = 'force-dynamic';

async function getCollectionData(hash) {
  try {
    const result = await sql`
      SELECT * FROM collections
      WHERE hash = ${hash}
    `;
    
    if (result.rowCount === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching collection:', error);
    return null;
  }
}

async function getEthPriceUSD() {
  try {
    const apiKey = process.env.ALCHEMY_API_KEY;
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
    
    console.log('Alchemy ETH price:', price);
    
    return price;
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { hash } = (await params);
  const collection = await getCollectionData(hash);
  
  if (!collection) {
    return {};
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nft-factory.kasra.codes';
  
  return {
    title: `Mint ${collection.collection_name}`,
    description: `Mint NFTs from ${collection.collection_name} by ${collection.username}`,
    other: {
      'fc:frame': JSON.stringify({
        version: "next",
        imageUrl: collection.frame_image_url || collection.image_url,
        button: {
          title: "Mint NFT",
          action: {
            type: "launch_frame",
            name: `Mint ${collection.collection_name}`,
            url: `${baseUrl}/mint/${hash}`,
            splashImageUrl: 'https://cover-art.kasra.codes/nft-factory-square.png',
            splashBackgroundColor: "#FFFFFF"
          }
        }
      })
    }
  };
}

export default async function MintPage({ params }) {
  const { hash } = (await params);
  const collection = await getCollectionData(hash);
  const ethPrice = await getEthPriceUSD();
  
  if (!collection) {
    notFound();
  }
  
  return (
    <div>
      <MintComponent collection={collection} ethPriceUSD={ethPrice} />
    </div>
  );
}