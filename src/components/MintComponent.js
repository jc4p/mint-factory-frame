"use client";

import { useState, useEffect } from 'react';
import styles from './MintComponent.module.css';
import { shareToWarpcast, mintNFT, checkMintingAvailability } from '@/lib/frame';

export default function MintComponent({ collection, ethPriceUSD }) {
  const [isMinting, setIsMinting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [mintError, setMintError] = useState(null);
  const [mintingAvailable, setMintingAvailable] = useState(true);
  const [totalSupply, setTotalSupply] = useState(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(true);
  
  // Calculate USD price
  const priceInUSD = ethPriceUSD && parseFloat(collection.price) > 0 
    ? (parseFloat(collection.price) * ethPriceUSD).toFixed(2)
    : null;
  
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
  
  // Check minting availability when component loads
  useEffect(() => {    
    const checkAvailability = async () => {
      if (!collection.contract_address) return;
      
      setIsCheckingAvailability(true);
      try {
        const result = await checkMintingAvailability(collection.contract_address);
        if (result.success) {
          setMintingAvailable(result.hasMintingAvailable);
          setTotalSupply(result.totalSupply);
        } else {
          console.error('Failed to check minting availability:', result.error);
          // Default to allowing minting if check fails
          setMintingAvailable(true);
        }
      } catch (error) {
        console.error('Error checking minting availability:', error);
        // Default to allowing minting if check fails
        setMintingAvailable(true);
      } finally {
        setIsCheckingAvailability(false);
      }
    };
    
    checkAvailability();
  }, [collection.contract_address]);
  
  // Handle sharing the mint page to Warpcast
  const handleShare = async (isSuccess = false) => {
    try {
      const shareUrl = `${baseUrl}/mint/${collection.hash}`;
      // Different message based on whether we're sharing after successful mint
      const shareText = isSuccess 
        ? `I just minted "${collection.collection_name}" by @${collection.username}` 
        : `Check out @${collection.username}'s NFT Collection: "${collection.collection_name}"`;
      
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
      
      // Check if minting is still available before proceeding
      if (!mintingAvailable) {
        throw new Error('Minting is no longer available for this collection');
      }
      
      console.log(`Minting NFT from collection ${collection.hash} at contract ${collection.contract_address}`);
      
      // Get the price from the collection (convert to ETH if needed)
      const price = collection.price || "0";
      
      // Call the mintNFT function from frame.js - always mint 1 at a time
      const result = await mintNFT(collection.contract_address, price, 1);
      
      if (result.success && result.txHash) {
        setTxHash(result.txHash);
        
        // Update minting availability after successful mint
        const availabilityResult = await checkMintingAvailability(collection.contract_address);
        if (availabilityResult.success) {
          setMintingAvailable(availabilityResult.hasMintingAvailable);
          setTotalSupply(availabilityResult.totalSupply);
        }
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
  
  // Calculate minted tokens and determine if minting should be available
  const calculateMintedTokens = () => {
    if (!collection.max_mints) return { displayText: null, isSoldOut: false };
    
    // If we don't have total supply data, just show the max mints
    if (!totalSupply) return { displayText: `Limited to ${collection.max_mints} mints`, isSoldOut: false };
    
    try {
      const maxMints = parseInt(collection.max_mints);
      const currentSupply = parseInt(totalSupply);
      
      if (isNaN(maxMints) || isNaN(currentSupply)) {
        return { displayText: `Limited to ${collection.max_mints} mints`, isSoldOut: false };
      }
      
      // If max_mints is 0, it means unlimited
      if (maxMints === 0) {
        return { displayText: `${currentSupply} minted (unlimited)`, isSoldOut: false };
      }
      
      // If current supply is at or above max, consider it sold out
      if (currentSupply >= maxMints) {
        return { displayText: `${maxMints}/${maxMints} minted`, isSoldOut: true };
      }
      
      return { displayText: `${currentSupply}/${maxMints} minted`, isSoldOut: false };
    } catch (error) {
      console.error('Error calculating minted tokens:', error);
      return { displayText: `Limited to ${collection.max_mints} mints`, isSoldOut: false };
    }
  };
  
  const { displayText: mintedTokens, isSoldOut } = calculateMintedTokens();
  
  // Determine if minting should be available based on both contract status and our calculations
  const isMintingDisabled = isMinting || !mintingAvailable || isCheckingAvailability || isSoldOut;
  
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
              onClick={() => handleShare(false)}
              className={styles.shareButton}
              title="Share to Warpcast"
            >
              Share
            </button>
          </div>
          
          <div className={styles.details}>
            {collection.max_mints && collection.max_mints > 0 ? (
              <p className={styles.maxMints}>
                {mintedTokens}
              </p>
            ) : null}
            
            <p className={styles.price}>
              Price: {parseFloat(collection.price) === 0 ? 'Free' : `${parseFloat(collection.price)} ETH${priceInUSD ? ` (≈ $${priceInUSD})` : ''}`}
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
                disabled={isMintingDisabled}
                className={`${styles.mintButton} ${isMintingDisabled ? styles.disabledButton : ''}`}
              >
                {isCheckingAvailability 
                  ? 'Checking availability...' 
                  : isMinting 
                    ? 'Minting...' 
                    : isMintingDisabled 
                      ? 'Sold Out' 
                      : `Mint NFT${parseFloat(collection.price) > 0
                          ? ` for ${priceInUSD ? `$${priceInUSD}` : `${parseFloat(collection.price)} ETH`}`
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