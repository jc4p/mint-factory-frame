"use client";

import { useState, useEffect } from 'react';
import styles from './MintComponent.module.css';
import { shareToWarpcast, mintNFT } from '@/lib/frame';

export default function MintComponent({ collection }) {
  const [isMinting, setIsMinting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [mintError, setMintError] = useState(null);
  
  // Get base URL for sharing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Try to get from environment variable first
      const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      if (envBaseUrl) {
        setBaseUrl(envBaseUrl);
      } else {
        // Fall back to current origin
        setBaseUrl(window.location.origin);
      }
    }
  }, []);
  
  // Handle sharing the mint page to Warpcast
  const handleShare = async (isSuccess = false) => {
    try {
      const shareUrl = `${baseUrl}/mint/${collection.hash}`;
      // Different message based on whether we're sharing after successful mint
      const shareText = isSuccess 
        ? `I just minted "${collection.collection_name}"` 
        : `Mint "${collection.collection_name}" NFT created by @${collection.username}`;
      
      await shareToWarpcast(shareUrl, shareText);
    } catch (error) {
      console.error('Error sharing to Warpcast:', error);
      alert('Failed to share. Please try again.');
    }
  };
  
  const handleMint = async () => {
    setIsMinting(true);
    setMintError(null);
    
    try {
      // Make sure we have a contract address
      if (!collection.contract_address) {
        throw new Error('No contract address available for this collection');
      }
      
      console.log(`Minting NFT from collection ${collection.hash} at contract ${collection.contract_address}`);
      
      // Get the price from the collection (convert to ETH if needed)
      const price = collection.price || "0";
      
      // Call the mintNFT function from frame.js - always mint 1 at a time
      const result = await mintNFT(collection.contract_address, price, 1);
      
      if (result.success && result.txHash) {
        setTxHash(result.txHash);
      } else {
        throw new Error(result.error || 'Failed to mint NFT');
      }
    } catch (error) {
      console.error('Error minting NFT:', error);
      setMintError(error.message || 'Failed to mint NFT. Please try again.');
    } finally {
      setIsMinting(false);
    }
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{collection.collection_name}</h1>
        
        <div className={styles.imageContainer}>
          <img 
            src={collection.image_url} 
            alt={collection.collection_name} 
            className={styles.image}
          />
        </div>
        
        <div className={styles.info}>
          <div className={styles.titleRow}>
            <p className={styles.creator}>
              Created by <span className={styles.username}>{collection.username}</span>
            </p>
            
            <button 
              onClick={handleShare}
              className={styles.shareButton}
              title="Share to Warpcast"
            >
              Share
            </button>
          </div>
          
          <div className={styles.details}>
            {collection.max_mints && (
              <p className={styles.maxMints}>
                Limited to {collection.max_mints} mints
              </p>
            )}
            
            <p className={styles.price}>
              Price: {parseFloat(collection.price) === 0 ? 'Free' : `${collection.price} ETH`}
            </p>
          </div>
          
          {collection.contract_address && (
            <div className={styles.contractInfo}>
              <p className={styles.contractAddress}>
                Contract: <a 
                  href={`https://basescan.org/address/${collection.contract_address}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.txLink}
                >
                  {collection.contract_address.substring(0, 6)}...{collection.contract_address.substring(38)}
                </a>
              </p>
            </div>
          )}
          
          {!txHash ? (
            <div className={styles.mintControls}>
              {mintError && (
                <div className={styles.errorMessage}>
                  {mintError}
                </div>
              )}
              <button 
                onClick={handleMint} 
                disabled={isMinting}
                className={styles.mintButton}
              >
                {isMinting 
                  ? 'Minting...' 
                  : `Mint NFT${parseFloat(collection.price) > 0
                      ? ` for ${parseFloat(collection.price)} ETH`
                      : ''}`
                }
              </button>
            </div>
          ) : (
            <div className={styles.success}>
              <p className={styles.successMessage}>
                Successfully minted your NFT!
              </p>
              <p className={styles.walletMessage}>
                Check your wallet in a few minutes to see your new NFT!
              </p>
              
              <button
                onClick={() => handleShare(true)}
                className={styles.shareSuccessButton}
              >
                Share on Warpcast
              </button>
              
              <a 
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.txLink}
              >
                View transaction on Base Scan
              </a>
              
              <div className={styles.txHashDisplay}>
                Transaction: <span className={styles.txHashValue}>{txHash.substring(0, 8)}...{txHash.substring(txHash.length - 8)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}