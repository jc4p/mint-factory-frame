/**
 * Generates ERC721 compatible metadata for an NFT
 * 
 * @param {Object} collection - The collection data
 * @param {string} tokenId - The token ID (position in collection)
 * @returns {Object} - The NFT metadata
 */
export function generateNftMetadata(collection, tokenId) {
  // Convert tokenId to number and format it
  const tokenNumber = parseInt(tokenId);
  
  return {
    name: `${collection.collection_name} #${tokenNumber}`,
    description: `NFT from ${collection.collection_name}`,
    image: collection.image_url,
    external_url: `${process.env.NEXT_PUBLIC_BASE_URL}/tokens/${collection.hash}/${tokenId}`,
    attributes: [
      {
        trait_type: "Creator",
        value: collection.username
      },
      {
        trait_type: "Collection",
        value: collection.collection_name
      },
      {
        trait_type: "Token Number",
        value: tokenNumber
      }
    ]
  };
}