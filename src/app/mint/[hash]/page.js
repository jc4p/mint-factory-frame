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

export async function generateMetadata({ params }) {
  const { hash } = params;
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
  const { hash } = params;
  const collection = await getCollectionData(hash);
  
  if (!collection) {
    notFound();
  }
  
  return (
    <div>
      <MintComponent collection={collection} />
    </div>
  );
}