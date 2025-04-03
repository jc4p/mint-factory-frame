"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../app/page.module.css";
import { sendPaymentForCollection } from "@/lib/frame";


export default function NFTCreator({ ethPriceUSD }) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [username, setUsername] = useState("");
  const [fid, setFid] = useState("");
  const [creatorAddress, setCreatorAddress] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [price, setPrice] = useState("0.0025");
  const [walletError, setWalletError] = useState(null);
  const initialUsdPrice = ethPriceUSD ? (0.0025 * ethPriceUSD).toFixed(2) : "ETH Price Not Available";
  const [priceUSD, setPriceUSD] = useState(initialUsdPrice);
  const [showModal, setShowModal] = useState(false);
  const [showPriceShortcuts, setShowPriceShortcuts] = useState(false);
  const [maxMints, setMaxMints] = useState("");
  const [isUnlimited, setIsUnlimited] = useState(true);
  const [paymentError, setPaymentError] = useState(null);

  // For debugging
  useEffect(() => {
    console.log("Received ETH price:", ethPriceUSD);
  }, [ethPriceUSD]);

  // Effect to fetch user data from Farcaster frame or Neynar API
  useEffect(() => {
    async function fetchUserData() {
      try {
        // First try to get FID from frame context (if running in a Farcaster frame)
        if (typeof window !== 'undefined' && window.userFid) {
          const frameFid = window.userFid;
          console.log("Got FID from Frame context:", frameFid);
          
          // Fetch user details from our API endpoint using the FID
          const response = await fetch(`/api/user/${frameFid}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch user data from API');
          }
          
          const userData = await response.json();
          
          // Update state with the user data
          setFid(userData.fid.toString());
          setUsername(userData.username || '');
          
          if (userData.hasEthAddress && userData.ethAddress) {
            setCreatorAddress(userData.ethAddress);
            setWalletError(null);
          } else {
            setCreatorAddress('');
            setWalletError('No ETH wallet connected to your Farcaster account. Please connect a wallet in your Farcaster settings.');
          }
          
          setCollectionName(`${userData.username || userData.fid}'s Awesome NFT`);
          
          console.log("Set user data from API:", userData);
        } else {
          // Fallback to default values for testing/development
          console.log("No frame context available, using fallback values");
          setFid("977233");
          setUsername("jc4p");
          setCreatorAddress("0x0db12C0A67bc5B8942ea3126a465d7a0b23126C7");
          setCollectionName("jc4p's Awesome NFT");
          setWalletError(null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Set fallback values in case of error
        setFid("977233");
        setUsername("jc4p");
        setCreatorAddress("0x0db12C0A67bc5B8942ea3126a465d7a0b23126C7");
        setCollectionName("jc4p's Awesome NFT");
        setWalletError(null);
      }
    }
    
    fetchUserData();
  }, []);

  useEffect(() => {
    // Calculate USD value based on current ETH price and amount
    if (ethPriceUSD !== null && ethPriceUSD !== undefined && !isNaN(parseFloat(price))) {
      const ethPrice = Number(ethPriceUSD);
      const ethAmount = parseFloat(price);
      
      // For zero price, we'll still set a USD value but the UI will show "Free Mint"
      const usdValue = (ethAmount * ethPrice).toFixed(2);
      console.log(`Calculating: ${ethAmount} ETH * $${ethPrice} = $${usdValue}`);
      setPriceUSD(usdValue);
    } else {
      console.log("Cannot calculate USD price. ETH price:", ethPriceUSD, "ETH amount:", price);
      setPriceUSD("ETH Price Not Available");
    }
    
    // Clean up any object URLs when price changes (which happens during form submission)
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [price, ethPriceUSD, imagePreview]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Reset any previous errors
      setImageError(null);
      
      // Check if file is an image
      const fileType = file.type;
      if (!fileType.startsWith('image/')) {
        setImageError("Please upload an image file");
        return;
      }
      
      // Set the image 
      setImage(file);
      
      // For iOS compatibility, use URL.createObjectURL as primary method
      // This works better with HEIC files on iOS
      try {
        // Modern browsers, including iOS
        const objectUrl = URL.createObjectURL(file);
        setImagePreview(objectUrl);
      } catch (err) {
        // Fallback to FileReader if URL.createObjectURL fails
        console.log("Falling back to FileReader for preview");
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const toggleLimitOption = () => {
    setIsUnlimited(!isUnlimited);
    if (!isUnlimited) {
      setMaxMints("");
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset submission state
    setIsSubmitting(true);
    setSubmissionError(null);
    
    // Validation
    if (!image) {
      setImageError("Please upload an image");
      setIsSubmitting(false);
      return;
    }
    
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      setIsSubmitting(false);
      return;
    }
    
    if (!isUnlimited && (!maxMints || parseInt(maxMints) <= 0)) {
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Reset any previous payment errors
      setPaymentError(null);
      
      // First process the $10 payment
      const paymentResult = await sendPaymentForCollection(ethPriceUSD);
      
      if (!paymentResult.success) {
        setPaymentError(paymentResult.error || 'Payment failed. Please try again.');
        setIsSubmitting(false);
        throw new Error(paymentResult.error || 'Payment failed. Please try again.');
      }
      
      console.log(`Payment successful with transaction hash: ${paymentResult.txHash}`);
      
      // Update state to show collection creation status
      setIsCreatingCollection(true);
      
      // Create FormData to send to API
      const formData = new FormData();
      formData.append('image', image);
      formData.append('fid', fid);
      formData.append('creatorAddress', creatorAddress);
      formData.append('collectionName', collectionName);
      formData.append('username', username);
      formData.append('paymentTxHash', paymentResult.txHash);
      // Format price as expected by middleware (append " ether" if not zero)
      const formattedPrice = parseFloat(price) === 0 ? '0' : `${price} ether`;
      formData.append('price', formattedPrice);
      
      // Handle maxMints properly for unlimited or limited mints
      formData.append('maxMints', isUnlimited ? '0' : maxMints);
      
      // Send data to API
      const response = await fetch('/api/collections', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create collection');
      }
      
      const result = await response.json();
      console.log("Collection created:", result);
      
      // Redirect to the mint page
      window.location.href = `/mint/${result.collection.hash}`;
      
    } catch (error) {
      console.error("Error:", error);
      
      // Different error handling based on the error type
      if (paymentError) {
        setSubmissionError(paymentError);
        alert(`Payment Error: ${paymentError}`);
      } else {
        setSubmissionError(error.message || 'Failed to create collection');
        alert(`Error: ${error.message || 'Failed to create collection'}`);
      }
    } finally {
      setIsSubmitting(false);
      setIsCreatingCollection(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.titleContainer}>
          <h1 className={styles.title}>NFT Factory</h1>
          <div className={styles.headerButtons}>
            <Link 
              href="/my-collections" 
              className={styles.myCollectionsButton}
            >
              My Collections
            </Link>
            <button 
              type="button"
              className={styles.helpButton}
              onClick={() => setShowModal(true)}
              aria-label="Help"
            >
              ?
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="collection-name">Collection Name</label>
            <input
              id="collection-name"
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="Enter collection name"
              required
              className={styles.input}
            />
          </div>
          
          <div className={styles.uploadSection}>
            <div 
              className={styles.dropzone}
              onClick={(e) => {
                e.stopPropagation();
                document.getElementById("file-upload").click();
              }}
            >
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className={styles.preview} 
                />
              ) : (
                <div className={styles.uploadPrompt}>
                  <p>Click to upload an image</p>
                  <p className={styles.supportedFormats}>
                    Any static image (no GIFs)
                  </p>
                  {imageError && (
                    <p className={styles.errorMessage}>
                      {imageError}
                    </p>
                  )}
                </div>
              )}
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.fileInput}
              />
            </div>
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="price">Mint Price</label>
            <div className={styles.priceRow}>
              <div className={styles.priceInputContainer}>
                <input
                  id="price"
                  type="number"
                  step="any"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.0025"
                  required
                  className={styles.priceInput}
                />
                <div className={styles.ethLabel}>ETH</div>
              </div>
              
              <div className={styles.priceUSD}>
                {priceUSD === "ETH Price Not Available" 
                  ? priceUSD 
                  : parseFloat(price) === 0 
                    ? "Free Mint" 
                    : `≈ $${priceUSD} USD`}
              </div>
            </div>
            
            <div className={styles.shortcutsToggle}>
              <span 
                className={styles.toggleButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPriceShortcuts(!showPriceShortcuts);
                }}
              >
                {showPriceShortcuts ? "Hide price shortcuts" : "Show price shortcuts"}
              </span>
            </div>
            
            {showPriceShortcuts && (
              <>
                <div className={styles.presetLabel}>Quick options:</div>
                <div className={styles.pricePresets}>
                  <span 
                    className={styles.presetButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrice("0");
                    }}
                  >
                    Free
                  </span>
                  <span 
                    className={styles.presetButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (ethPriceUSD) {
                        // Calculate raw ETH value
                        const rawEthAmount = 5 / ethPriceUSD;
                        // Round to nearest 0.0005
                        const roundedEth = Math.round(rawEthAmount * 2000) / 2000;
                        // Allow more precision in the display
                        setPrice(roundedEth.toString());
                      }
                    }}
                  >
                    $5
                  </span>
                  <span 
                    className={styles.presetButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (ethPriceUSD) {
                        // Calculate raw ETH value
                        const rawEthAmount = 10 / ethPriceUSD;
                        // Round to nearest 0.0005
                        const roundedEth = Math.round(rawEthAmount * 2000) / 2000;
                        // Allow more precision in the display
                        setPrice(roundedEth.toString());
                      }
                    }}
                  >
                    $10
                  </span>
                </div>
              </>
            )}
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="max-mints-toggle" className={styles.checkboxLabel}>
              <input
                id="max-mints-toggle"
                type="checkbox"
                checked={!isUnlimited}
                onChange={toggleLimitOption}
                className={styles.checkbox}
              />
              Limit maximum number of mints
            </label>
          </div>
          
          {!isUnlimited && (
            <div className={styles.inputGroup}>
              <label htmlFor="max-mints">Maximum Mints</label>
              <input
                id="max-mints"
                type="number"
                min="1"
                step="1"
                value={maxMints}
                onChange={(e) => setMaxMints(e.target.value)}
                placeholder="100"
                required={!isUnlimited}
                className={styles.input}
              />
            </div>
          )}
          
          {walletError && (
            <div className={styles.errorMessage} style={{ marginBottom: '15px', color: 'red', textAlign: 'center' }}>
              {walletError}
            </div>
          )}
          
          {paymentError && (
            <div className={styles.errorMessage} style={{ marginBottom: '15px', color: 'red', textAlign: 'center' }}>
              {paymentError}
            </div>
          )}
          
          <button 
            type="submit" 
            className={styles.button}
            disabled={isSubmitting || !!walletError}
          >
            {isCreatingCollection ? 'Creating NFT Collection...' : isSubmitting ? 'Processing Payment...' : 'Create Collection ($10)'}
          </button>
          {isCreatingCollection && (
            <p className={styles.helpText} style={{ textAlign: 'center', marginTop: '10px', color: '#666' }}>
              Can take up to 30s, please don't close this page
            </p>
          )}
        </form>
        
        {showModal && (
          <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3>About NFT Factory</h3>
              <p>
                This tool is ONLY for making static image NFTs - every person gets the same image in their wallet.
              </p>
              <p>
                Creation cost is one-time $10 fee.
              </p>
              <p>
                The minting fees will be sent directly to your Warplet:
              </p>
              <p className={styles.ethAddress}>
                {creatorAddress}
              </p>
              <button 
                onClick={() => setShowModal(false)} 
                className={styles.modalCloseButton}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}