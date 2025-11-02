import NFTCreator from '../components/NFTCreator';
import { getEthPriceUSD } from '@/lib/ethPrice';

export const dynamic = 'force-dynamic';

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
          name: "NFT Factory",
          url: process.env.NEXT_PUBLIC_BASE_URL || 'https://nft-factory.kasra.codes',
          splashImageUrl: 'https://cover-art.kasra.codes/nft-factory-square.png',
          splashBackgroundColor: "#FFFFFF"
        }
      }
    })
  }
};

export default async function Home() {
  const ethPrice = await getEthPriceUSD();

  return (
    <div>
      <NFTCreator ethPriceUSD={ethPrice} />
    </div>
  );
}