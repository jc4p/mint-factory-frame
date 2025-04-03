import UserCollections from '@/components/UserCollections';

export const metadata = {
  title: 'My Collections - NFT Factory',
  description: 'View all your created NFT collections',
};

export default function MyCollectionsPage() {
  return (
    <div>
      <UserCollections />
    </div>
  );
}